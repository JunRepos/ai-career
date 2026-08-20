/* ═══════════════════════════════════════
   firebase.js — Firebase 초기화 & DB 헬퍼

   Firebase 연결과 데이터 CRUD 함수들입니다.
   새로운 데이터 종류를 추가할 때 여기에 load/save 함수를 만드세요.
═══════════════════════════════════════ */

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.database();
const storage = firebase.storage();

// ── 네트워크 상태 감지 ──
let IS_ONLINE = navigator.onLine;

window.addEventListener('online', () => {
  IS_ONLINE = true;
  toast('네트워크가 복구됐습니다.', 'ok');
});
window.addEventListener('offline', () => {
  IS_ONLINE = false;
  toast('네트워크 연결이 끊겼습니다. 일부 기능이 제한됩니다.', 'err');
});

// Firebase 연결 상태 감지 (초기 로드 시 false가 잠깐 나오므로 3초 후부터 감지)
let _fbConnReady = false;
setTimeout(() => { _fbConnReady = true; }, 3000);
db.ref('.info/connected').on('value', snap => {
  if(_fbConnReady && snap.val() === false && IS_ONLINE){
    toast('서버 연결이 불안정합니다.', 'err');
  }
});

// 현재 활성 반 ID
const CID = () => (IS_TC ? TC_CLS : SEL_CLS)?.id;

// 선생님 인증 정보 가져오기
async function getAuth(){
  const s = await db.ref('auth/teacher').get();
  return s.exists() ? s.val() : null;
}

// ── 궁금증 개수 (홈 화면용) ──
//   궁금증을 비공개로 전환하면서 홈 화면의 공개 카운트를 제거.
//   로그아웃 상태 브라우저가 전체 글을 내려받지 않도록 더 이상 fetch 하지 않음.
async function loadPostCounts(){
  CLASSES.forEach(c => { POST_COUNTS[c.id] = 0; });
}

// ── 공지사항 ──
async function loadNotices(cid){
  const s = await db.ref(`notices/${cid}`).get();
  if(!s.exists()){ NOTICES = []; return; }
  NOTICES = Object.entries(s.val()).map(([id, v]) => ({id, ...v}))
    .sort((a, b) => {
      if(a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

// ── 과제 ──
async function loadAssignments(cid){
  const s = await db.ref(`assignments/${cid}`).get();
  if(!s.exists()){ ASSIGNMENTS = []; return; }
  ASSIGNMENTS = Object.entries(s.val()).map(([id, v]) => ({id, ...v}))
    .sort((a, b) => a.dueDate && b.dueDate
      ? a.dueDate.localeCompare(b.dueDate)
      : b.createdAt.localeCompare(a.createdAt));
}

// ── 과제 학생 다운로드 잠금 토글 ──
// assignments/{cid}/{aid}/studentDownloadLocked : bool
async function setAssignDownloadLock(cid, aid, on){
  await db.ref(`assignments/${cid}/${aid}/studentDownloadLocked`).set(!!on);
}

// ── 궁금증 글 ──
//   학생은 본인이 남긴 글만 메모리에 보관 → 다른 학생 글이 화면·콘솔에 노출되지 않음.
//   (선생님은 전체. 네트워크 레벨 완전 차단은 Firebase 규칙 재게시 필요 — 메모 참고)
async function loadPosts(cid){
  const s = await db.ref(`posts/${cid}`).get();
  if(!s.exists()){ POSTS = []; return; }
  let arr = Object.entries(s.val()).map(([id, v]) => ({id, ...v}));
  if(!IS_TC && ST_USER?.number) arr = arr.filter(p => p.authorId === ST_USER.number);
  POSTS = arr.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

// ── 선생님 공유 파일 ──
async function loadTcFiles(cid){
  const s = await db.ref(`teacherFiles/${cid}`).get();
  if(!s.exists()){ TC_FILES = []; return; }
  TC_FILES = Object.entries(s.val()).map(([id, v]) => ({id, ...v}))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

// ── 학생 목록 ──
async function loadStudents(cid){
  const s = await db.ref(`students/${cid}`).get();
  if(!s.exists()){ STUDENTS = []; return; }
  STUDENTS = Object.entries(s.val()).map(([num, v]) => ({number: num, ...v}))
    .sort((a, b) => a.number.localeCompare(b.number));
}

// ── 출결 (특정 날짜) ──
async function loadAttendance(cid, date){
  const s = await db.ref(`attendance/${cid}/${date}`).get();
  ATTENDANCE = s.exists() ? s.val() : {};
}

// ── 출결 (월 단위, 학생 이력용) ──
async function loadAttendanceMonth(cid, ym){
  const s = await db.ref(`attendance/${cid}`).get();
  AT_MONTH_DATA = {};
  if(!s.exists()) return;
  Object.entries(s.val()).forEach(([date, recs]) => {
    if(date.startsWith(ym)) AT_MONTH_DATA[date] = recs;
  });
}

// ── 출결 저장 ──
async function saveAttendance(cid, date, num, status, reason){
  const rec = {status, updatedAt: new Date().toISOString()};
  if(reason) rec.reason = reason; else rec.reason = null;
  await db.ref(`attendance/${cid}/${date}/${num}`).set(rec);
  if(!ATTENDANCE[num]) ATTENDANCE[num] = {};
  ATTENDANCE[num] = rec;
}

// ── 과제 제출 현황 ──
async function loadSubmissions(cid, aid){
  const s = await db.ref(`submissions/${cid}/${aid}`).get();
  SUBMISSIONS[aid] = s.exists() ? s.val() : {};
}

// ── OJ 문제 목록 ──
async function loadOJProblems(cid){
  const s = await db.ref(`problems/${cid}`).get();
  if(!s.exists()){ OJ_PROBLEMS = []; return; }
  OJ_PROBLEMS = Object.entries(s.val()).map(([id, v]) => {
    const tcs = v.testCases ? Object.entries(v.testCases).map(([tid, tc]) => ({id: tid, ...tc}))
      .sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
    const obj = {id, ...v, testCases: tcs};
    // 메타 인코딩 디코드 — description 앞쪽의 HTML 주석들을 떼어내 필드로 복원
    // (DB 스키마 변경 없이 동작 — Firebase 규칙 재게시 불필요)
    //   <!-- visual:위젯ID -->        → obj.visualType
    //   <!-- starter:base64인코딩 -->  → obj.starterCode (멀티라인 코드)
    if(typeof obj.description === 'string'){
      let s = obj.description;
      while(true){
        let m;
        if((m = s.match(/^\s*<!--\s*visual:([\w-]+)\s*-->\s*\n?/))){
          obj.visualType = m[1];
          s = s.slice(m[0].length);
          continue;
        }
        if((m = s.match(/^\s*<!--\s*starter:([A-Za-z0-9+/=]+)\s*-->\s*\n?/))){
          try { obj.starterCode = decodeURIComponent(escape(atob(m[1]))); }
          catch(e){ obj.starterCode = ''; }
          s = s.slice(m[0].length);
          continue;
        }
        break;
      }
      obj.description = s;
    }
    return obj;
  }).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  // 정렬: createdAt 오름차순 — 등록한 순서대로 학생에게 보임 (Problem 1, 2, 3...)
  // 선생님이 ↑↓ 버튼으로 순서 바꾸면 두 문제의 createdAt 을 swap (DB 스키마 그대로)
}

// ── OJ 제출 현황 ──
async function loadOJSubmissions(cid, pid){
  const s = await db.ref(`ojSubmissions/${cid}/${pid}`).get();
  OJ_SUBMISSIONS[pid] = s.exists() ? s.val() : {};
}

// ── OJ 작성 중 코드 자동 저장 (학생) ──
async function loadOJDraft(cid, pid, studentNum){
  const s = await db.ref(`ojDrafts/${cid}/${pid}/${studentNum}`).get();
  return s.exists() ? s.val() : null;  // {code, updatedAt}
}

async function saveOJDraft(cid, pid, studentNum, code){
  await db.ref(`ojDrafts/${cid}/${pid}/${studentNum}`).set({
    code: code || '',
    updatedAt: new Date().toISOString()
  });
}

// ── 노트북 목록 ──
async function loadNotebooks(cid){
  const s = await db.ref(`notebooks/${cid}`).get();
  if(!s.exists()){ NOTEBOOKS = []; return; }
  NOTEBOOKS = Object.entries(s.val()).map(([id, v]) => ({id, ...v}))
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

// ── 노트북 학생 진행 상황 (셀 편집/추가/삭제) ──
async function loadNotebookProgress(cid, nbId, studentNum){
  const s = await db.ref(`notebookProgress/${cid}/${nbId}/${studentNum}`).get();
  return s.exists() ? s.val() : null;
}

async function saveNotebookProgress(cid, nbId, studentNum, cells){
  // cells 배열을 그대로 저장 (source/type/id만 포함)
  const sanitized = (cells || []).map(c => ({
    id: c.id || '',
    type: c.type || 'code',
    source: c.source || ''
  }));
  await db.ref(`notebookProgress/${cid}/${nbId}/${studentNum}`).set({
    cells: sanitized,
    updatedAt: new Date().toISOString()
  });
}

async function deleteNotebookProgress(cid, nbId, studentNum){
  await db.ref(`notebookProgress/${cid}/${nbId}/${studentNum}`).remove();
}

// 노트북 전체 학생 진도 로드 (선생님용)
async function loadAllNotebookProgress(cid, nbId){
  const s = await db.ref(`notebookProgress/${cid}/${nbId}`).get();
  return s.exists() ? s.val() : {};
}

// ── 미션 (게임 실습) ──
async function loadMissions(cid){
  const s = await db.ref(`missions/${cid}`).get();
  if(!s.exists()){ MISSIONS = []; return; }
  MISSIONS = Object.entries(s.val()).map(([id, v]) => ({id, ...v}))
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

async function saveMission(cid, missionId, data){
  await db.ref(`missions/${cid}/${missionId}`).set(data);
}

async function deleteMission(cid, missionId){
  await db.ref(`missions/${cid}/${missionId}`).remove();
  await db.ref(`missionProgress/${cid}/${missionId}`).remove().catch(() => {});
}

async function loadMissionProgress(cid, mid, studentNum){
  const s = await db.ref(`missionProgress/${cid}/${mid}/${studentNum}`).get();
  return s.exists() ? s.val() : null;
}

// 학생의 모든 미션 진도를 한 번에 로드 — 그리드 카드의 진행률 바에 사용.
// 결과: { [missionId]: { [stepId]: {passed, ...} } } (없으면 빈 객체)
async function loadAllMissionProgress(cid, studentNum){
  if(!cid || !studentNum) return {};
  const result = {};
  for(const m of MISSIONS){
    try {
      const prog = await loadMissionProgress(cid, m.id, studentNum);
      result[m.id] = prog?.stepPass || {};
    } catch(_e){ result[m.id] = {}; }
  }
  return result;
}

async function saveMissionProgress(cid, mid, studentNum, stepPass){
  await db.ref(`missionProgress/${cid}/${mid}/${studentNum}`).set({
    stepPass, updatedAt: new Date().toISOString()
  });
}

// ── 진도 계획 (선생님 전용, 전역 하나) ──
async function loadCurriculum(){
  const s = await db.ref('curriculum/plan').get();
  CURRICULUM = s.exists() ? s.val() : null;
  // sessions는 Firebase에서 객체로 올 수 있으니 배열로 정규화
  if(CURRICULUM?.sessions){
    for(const cid of Object.keys(CURRICULUM.sessions)){
      const v = CURRICULUM.sessions[cid];
      if(v && !Array.isArray(v)) CURRICULUM.sessions[cid] = Object.values(v);
    }
  }
  if(CURRICULUM?.topics && !Array.isArray(CURRICULUM.topics)){
    CURRICULUM.topics = Object.values(CURRICULUM.topics);
  }
}

async function saveCurriculum(data){
  await db.ref('curriculum/plan').set({
    ...data,
    updatedAt: new Date().toISOString()
  });
}

// ── 코드 읽기 (Code Reading) ──
//   ⚠️ 새 기능이므로 Firebase 규칙이 아직 게시 안 된 환경에선
//   PERMISSION_DENIED 가 날 수 있음. 다른 기능 막히지 않도록 안전 처리.
async function loadCodeReadings(cid){
  try {
    const s = await db.ref(`codeReadings/${cid}`).get();
    if(!s.exists()){ CR_READINGS = []; return; }
    CR_READINGS = Object.entries(s.val()).map(([id, v]) => ({id, ...v}))
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  } catch(err){
    console.warn('[코드 읽기] 데이터 로드 실패 (Firebase 규칙 미게시일 수 있음):', err.message || err);
    CR_READINGS = [];
  }
}

async function saveCodeReading(cid, rdId, data){
  await db.ref(`codeReadings/${cid}/${rdId}`).set(data);
}

async function deleteCodeReading(cid, rdId){
  await db.ref(`codeReadings/${cid}/${rdId}`).remove();
  await db.ref(`codeReadingProgress/${cid}/${rdId}`).remove().catch(() => {});
}

async function loadCodeReadingProgress(cid, rdId, studentNum){
  try {
    const s = await db.ref(`codeReadingProgress/${cid}/${rdId}/${studentNum}`).get();
    return s.exists() ? s.val() : null;
  } catch(err){
    console.warn('[코드 읽기 진도] 로드 실패:', err.message || err);
    return null;
  }
}

async function saveCodeReadingProgress(cid, rdId, studentNum, data){
  await db.ref(`codeReadingProgress/${cid}/${rdId}/${studentNum}`).set({
    ...data,
    updatedAt: new Date().toISOString()
  });
}

async function loadAllCodeReadingProgress(cid, rdId){
  try {
    const s = await db.ref(`codeReadingProgress/${cid}/${rdId}`).get();
    return s.exists() ? s.val() : {};
  } catch(err){
    console.warn('[코드 읽기 진도] 전체 로드 실패:', err.message || err);
    return {};
  }
}

// ── 📝 수행평가 (Assessment) — PET병 챌린지 ──
//   active/{cid}            : bool — 선생님이 켜야 학생에게 응시 노출
//   submissions/{cid}/{학번} : { stage, a[], b{}, blanks{}, submittedAt }
//   scores/{cid}/{학번}      : { a, b, c, d, comment, scoredAt }
async function loadAsmtActive(cid){
  try {
    const s = await db.ref(`assessment/active/${cid}`).get();
    const on = s.exists() ? !!s.val() : false;
    ASMT_ACTIVE[cid] = on;
    return on;
  } catch(err){
    console.warn('[수행평가] active 로드 실패 (규칙 미게시일 수 있음):', err.message || err);
    ASMT_ACTIVE[cid] = false;
    return false;
  }
}

async function setAsmtActive(cid, on){
  await db.ref(`assessment/active/${cid}`).set(!!on);
  ASMT_ACTIVE[cid] = !!on;
}

// 수행평가 안내(연습) 탭 노출 토글 — assessment/guideActive/{cid}
async function loadAsmtGuideActive(cid){
  try {
    const s = await db.ref(`assessment/guideActive/${cid}`).get();
    const on = s.exists() ? !!s.val() : false;
    AG_ACTIVE[cid] = on;
    return on;
  } catch(err){
    console.warn('[수행평가 안내] active 로드 실패 (규칙 미게시일 수 있음):', err.message || err);
    AG_ACTIVE[cid] = false;
    return false;
  }
}
async function setAsmtGuideActive(cid, on){
  await db.ref(`assessment/guideActive/${cid}`).set(!!on);
  AG_ACTIVE[cid] = !!on;
}

async function loadAsmtSubmission(cid, studentNum){
  try {
    const s = await db.ref(`assessment/submissions/${cid}/${studentNum}`).get();
    return s.exists() ? s.val() : null;
  } catch(err){
    console.warn('[수행평가] 제출 로드 실패:', err.message || err);
    return null;
  }
}

// 부분 저장(1단계 넘어갈 때) / 최종 제출 모두 set (전체 덮어쓰기)
async function saveAsmtSubmission(cid, studentNum, data){
  await db.ref(`assessment/submissions/${cid}/${studentNum}`).set({
    ...data,
    updatedAt: new Date().toISOString()
  });
}

async function loadAllAsmtSubmissions(cid){
  try {
    const s = await db.ref(`assessment/submissions/${cid}`).get();
    return s.exists() ? s.val() : {};
  } catch(err){
    console.warn('[수행평가] 전체 제출 로드 실패:', err.message || err);
    return {};
  }
}

async function loadAllAsmtScores(cid){
  try {
    const s = await db.ref(`assessment/scores/${cid}`).get();
    return s.exists() ? s.val() : {};
  } catch(err){
    console.warn('[수행평가] 점수 로드 실패:', err.message || err);
    return {};
  }
}

async function saveAsmtScore(cid, studentNum, score){
  await db.ref(`assessment/scores/${cid}/${studentNum}`).set({
    ...score,
    scoredAt: new Date().toISOString()
  });
}

// ── 🏆 점수 관리 — 확장 점수(빅데이터/AI) & 공개 토글 ──
//   scoresExt/{cid}/{학번}/{asmtId} : { ..parts.., comment, scoredAt }
//   published/{cid}/{asmtId}        : bool
async function loadAsmtScoreExt(cid, studentNum, asmtId){
  try {
    const s = await db.ref(`assessment/scoresExt/${cid}/${studentNum}/${asmtId}`).get();
    return s.exists() ? s.val() : null;
  } catch(err){
    console.warn('[수행평가] ext 점수 로드 실패:', err.message || err);
    return null;
  }
}

async function saveAsmtScoreExt(cid, studentNum, asmtId, score){
  await db.ref(`assessment/scoresExt/${cid}/${studentNum}/${asmtId}`).set({
    ...score,
    scoredAt: new Date().toISOString()
  });
}

async function loadAllAsmtScoresExt(cid, asmtId){
  // { [학번]: score } 형태로 반환 (해당 수행평가만)
  try {
    const s = await db.ref(`assessment/scoresExt/${cid}`).get();
    if(!s.exists()) return {};
    const out = {};
    const raw = s.val();
    Object.entries(raw).forEach(([snum, perAsmt]) => {
      if(perAsmt && perAsmt[asmtId]) out[snum] = perAsmt[asmtId];
    });
    return out;
  } catch(err){
    console.warn('[수행평가] ext 전체 점수 로드 실패:', err.message || err);
    return {};
  }
}

async function loadAsmtPublished(cid){
  // { bigdata, petbottle, aicode } — 누락된 항목은 false 기본값
  try {
    const s = await db.ref(`assessment/published/${cid}`).get();
    const v = s.exists() ? s.val() : {};
    return { bigdata: !!v.bigdata, petbottle: !!v.petbottle, aicode: !!v.aicode };
  } catch(err){
    console.warn('[수행평가] 공개 상태 로드 실패:', err.message || err);
    return { bigdata: false, petbottle: false, aicode: false };
  }
}

async function setAsmtPublished(cid, asmtId, on){
  await db.ref(`assessment/published/${cid}/${asmtId}`).set(!!on);
}

// 영역별 사유 공개 토글 (점수 공개와 별개, 기본값 false)
async function loadAsmtReasonsPublished(cid){
  try {
    const s = await db.ref(`assessment/reasonsPublished/${cid}`).get();
    const v = s.exists() ? s.val() : {};
    return { bigdata: !!v.bigdata, petbottle: !!v.petbottle, aicode: !!v.aicode };
  } catch(err){
    console.warn('[수행평가] 사유 공개 상태 로드 실패:', err.message || err);
    return { bigdata: false, petbottle: false, aicode: false };
  }
}

async function setAsmtReasonsPublished(cid, asmtId, on){
  await db.ref(`assessment/reasonsPublished/${cid}/${asmtId}`).set(!!on);
}

// 학생용: 내 점수 전부 한 번에 (3개 수행평가)
async function loadMyAsmtScores(cid, studentNum){
  // PET병(legacy) + 빅데이터/AI(ext) 합쳐서 반환
  const [legacy, big, ai] = await Promise.all([
    db.ref(`assessment/scores/${cid}/${studentNum}`).get().then(s => s.exists() ? s.val() : null).catch(() => null),
    loadAsmtScoreExt(cid, studentNum, 'bigdata'),
    loadAsmtScoreExt(cid, studentNum, 'aicode'),
  ]);
  return { petbottle: legacy, bigdata: big, aicode: ai };
}

// ── 🤖 AI 코딩 (자유 실습 메뉴) ──
// active/{cid} : bool — 선생님이 켜야 학생에게 노출
// sessions/{cid}/{학번} : { messages, code, turnCount, brief, runsLog, reflect, done, challengeUsed, tcNote, updatedAt }
//   tcNote 는 선생님 전용 키워드 메모 — 학생 저장은 update() 라 지워지지 않음
async function loadAicActive(cid){
  try {
    const s = await db.ref(`aicode/active/${cid}`).get();
    const on = s.exists() ? !!s.val() : false;
    AIC_ACTIVE[cid] = on;
    return on;
  } catch(err){
    console.warn('[AI코딩] active 로드 실패 (규칙 미게시일 수 있음):', err.message || err);
    AIC_ACTIVE[cid] = false;
    return false;
  }
}

async function setAicActive(cid, on){
  await db.ref(`aicode/active/${cid}`).set(!!on);
  AIC_ACTIVE[cid] = !!on;
}

async function loadAicSession(cid, studentNum){
  try {
    const s = await db.ref(`aicode/sessions/${cid}/${studentNum}`).get();
    return s.exists() ? s.val() : null;
  } catch(err){
    console.warn('[AI코딩] 세션 로드 실패:', err.message || err);
    return null;
  }
}

async function saveAicSession(cid, studentNum, data){
  // set() 대신 update(): 전달하지 않은 키(선생님 메모 tcNote 등)를 보존.
  // 값이 null 인 키는 삭제됨(RTDB 규칙) — 새로 시작 시 의도적으로 null 을 넘겨 비움.
  await db.ref(`aicode/sessions/${cid}/${studentNum}`).update({
    ...data,
    updatedAt: new Date().toISOString()
  });
}

// 선생님: 학생별 세특 키워드 메모 (해당 키만 갱신)
async function saveAicTcNote(cid, studentNum, note){
  await db.ref(`aicode/sessions/${cid}/${studentNum}/tcNote`).set(note || null);
}

async function loadAllAicSessions(cid){
  try {
    const s = await db.ref(`aicode/sessions/${cid}`).get();
    return s.exists() ? s.val() : {};
  } catch(err){
    console.warn('[AI코딩] 전체 세션 로드 실패:', err.message || err);
    return {};
  }
}

// ── AI 학습지 ──
//   aiactivity/active/{cid}                    : bool — 메뉴 노출 토글
//   aiactivity/submissions/{cid}/{actId}/{학번} : { answers, updatedAt }
async function loadAiaActive(cid){
  try {
    const s = await db.ref(`aiactivity/active/${cid}`).get();
    const on = s.exists() ? !!s.val() : false;
    AIA_ACTIVE[cid] = on;
    return on;
  } catch(err){
    console.warn('[AI학습지] active 로드 실패:', err.message || err);
    AIA_ACTIVE[cid] = false;
    return false;
  }
}

async function setAiaActive(cid, on){
  await db.ref(`aiactivity/active/${cid}`).set(!!on);
  AIA_ACTIVE[cid] = !!on;
}

// ── 📝 ML 수행평가 응시(노출) 토글 ──
//   새 Firebase 규칙 없이: submissions 하위(쓰기 허용)에 토글 저장.
//   학번 폴더(mlassess)와 형제라 학생 제출 목록과 충돌 없음.
async function loadMlaActive(cid){
  try {
    const s = await db.ref(`aiactivity/submissions/${cid}/mlassessActive`).get();
    const on = s.exists() ? !!s.val() : false;
    MLA_ACTIVE[cid] = on;
    return on;
  } catch(err){
    console.warn('[ML수행평가] active 로드 실패:', err.message || err);
    MLA_ACTIVE[cid] = false;
    return false;
  }
}
async function setMlaActive(cid, on){
  await db.ref(`aiactivity/submissions/${cid}/mlassessActive`).set(!!on);
  MLA_ACTIVE[cid] = !!on;
}

// ── 📝 ML 수행평가 — 상황·안내·학생용 루브릭 편집본(config) ──
//   submissions 하위(쓰기 허용)에 저장 → 새 Firebase 규칙 불필요.
async function loadMlaConfig(cid){
  try {
    const s = await db.ref(`aiactivity/submissions/${cid}/mlassessConfig`).get();
    MLA_CONFIG[cid] = s.exists() ? (s.val() || {}) : {};
  } catch(err){
    console.warn('[ML수행평가] config 로드 실패:', err.message || err);
    MLA_CONFIG[cid] = {};
  }
  return MLA_CONFIG[cid];
}
async function setMlaConfig(cid, cfg){
  const payload = { ...(cfg || {}), updatedAt: new Date().toISOString() };
  await db.ref(`aiactivity/submissions/${cid}/mlassessConfig`).set(payload);
  MLA_CONFIG[cid] = payload;
  return payload;
}

/* ── 선생님이 직접 만든 학습지 ──
   저장: aiactivity/submissions/{cid}/customActivities/{actId}
     (이미 쓰기가 열려 있는 가지라 보안 규칙을 다시 배포할 필요가 없습니다)
   문항 이미지는 Storage 의 teacherFiles/{cid}/... 아래에 올립니다. */
async function loadCustomActivities(cid){
  AIA_CUSTOM = [];
  try {
    const s = await db.ref(`aiactivity/submissions/${cid}/customActivities`).get();
    if(!s.exists()) return;
    AIA_CUSTOM = Object.entries(s.val() || {})
      .map(([id, v]) => ({
        id,
        title: v.title || '제목 없음',
        subtitle: v.subtitle || '학습지',
        intro: v.intro || '',
        custom: true,
        createdAt: v.createdAt || '',
        questions: Object.entries(v.questions || {})
          .map(([qid, q]) => ({ id: qid, ...q }))
          .sort((a, b) => (a.order || 0) - (b.order || 0)),
      }))
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  } catch(err){
    console.warn('[학습지] 목록 로드 실패:', err.message || err);
  }
}

/* 학습지별 열기/닫기 — 반 전체 토글 대신 학습지 하나하나를 열고 닫습니다.
   "이번 시간엔 이거" 를 한 번 눌러 학생 홈에 띄우는 게 목적. */
async function loadActivityOpen(cid){
  AIA_OPEN = {};
  try {
    const s = await db.ref(`aiactivity/submissions/${cid}/activityOpen`).get();
    if(s.exists()) AIA_OPEN = s.val() || {};
  } catch(err){
    console.warn('[학습지] 열림 상태 로드 실패:', err.message || err);
  }
}

async function setActivityOpen(cid, actId, on){
  await db.ref(`aiactivity/submissions/${cid}/activityOpen/${actId}`).set(!!on);
  AIA_OPEN[actId] = !!on;
}

async function saveCustomActivity(cid, actId, data){
  await db.ref(`aiactivity/submissions/${cid}/customActivities/${actId}`).set(data);
}

async function deleteCustomActivity(cid, actId){
  await db.ref(`aiactivity/submissions/${cid}/customActivities/${actId}`).remove();
  // 학생 답안도 함께 정리 (활동이 사라지면 답안만 남아 있을 이유가 없음)
  await db.ref(`aiactivity/submissions/${cid}/${actId}`).remove().catch(() => {});
  await db.ref(`aiactivity/submissions/${cid}/activityOpen/${actId}`).remove().catch(() => {});
}

/* ── 기본 학습지 숨기기 ──
   코드에 박아둔 학습지(1·2차시)는 앱 안에서 지울 수 없습니다. 지워도 앱을
   업데이트하면 되살아나니까요. 대신 '이 반에서 안 쓴다' 고 표시해 둡니다.
   되돌릴 수 있고, 학생 답안은 건드리지 않습니다.
     aiactivity/submissions/{cid}/activityHidden/{actId} : true */
async function loadActivityHidden(cid){
  AIA_HIDDEN = {};
  try {
    const s = await db.ref(`aiactivity/submissions/${cid}/activityHidden`).get();
    if(s.exists()) AIA_HIDDEN = s.val() || {};
  } catch(err){
    console.warn('[학습지] 숨김 상태 로드 실패:', err.message || err);
  }
}

async function setActivityHidden(cid, actId, on){
  const ref = db.ref(`aiactivity/submissions/${cid}/activityHidden/${actId}`);
  if(on) await ref.set(true); else await ref.remove();
  if(on) AIA_HIDDEN[actId] = true; else delete AIA_HIDDEN[actId];
  // 숨기면 학생 화면에서도 내려갑니다
  if(on) await setActivityOpen(cid, actId, false);
}

// 문항 이미지 업로드 — 규칙이 열려 있는 teacherFiles 경로 사용
async function uploadActivityImage(cid, file){
  const path = `teacherFiles/${cid}/activity-${genId()}/${file.name}`;
  const url = await uploadFile(file, path);
  return { url, path };
}

async function loadAiaSubmission(cid, actId, studentNum){
  try {
    const s = await db.ref(`aiactivity/submissions/${cid}/${actId}/${studentNum}`).get();
    return s.exists() ? s.val() : null;
  } catch(err){
    console.warn('[AI학습지] 제출 로드 실패:', err.message || err);
    return null;
  }
}

async function saveAiaSubmission(cid, actId, studentNum, answers, opts){
  // opts.submit === true 면 제출 시각(submittedAt) 갱신, 아니면 기존 submittedAt 보존(자동저장).
  const ref = db.ref(`aiactivity/submissions/${cid}/${actId}/${studentNum}`);
  const now = new Date().toISOString();
  const payload = { answers: answers || {}, updatedAt: now };
  if(opts && opts.submit){
    payload.submittedAt = now;
  } else {
    // 기존 submittedAt 보존
    const cur = await ref.get();
    if(cur.exists() && cur.val()?.submittedAt) payload.submittedAt = cur.val().submittedAt;
  }
  await ref.set(payload);
  return payload;
}

async function loadAllAiaSubmissions(cid, actId){
  try {
    const s = await db.ref(`aiactivity/submissions/${cid}/${actId}`).get();
    return s.exists() ? s.val() : {};
  } catch(err){
    console.warn('[AI학습지] 전체 제출 로드 실패:', err.message || err);
    return {};
  }
}

// ── 🤖 기계학습 체험 ──
//   ml/active/{cid} : bool — 메뉴 노출 토글 (상태는 모두 클라이언트, 저장 없음)
async function loadMlActive(cid){
  try {
    const s = await db.ref(`ml/active/${cid}`).get();
    const on = s.exists() ? !!s.val() : false;
    ML_ACTIVE[cid] = on;
    return on;
  } catch(err){
    console.warn('[기계학습] active 로드 실패:', err.message || err);
    ML_ACTIVE[cid] = false;
    return false;
  }
}

async function setMlActive(cid, on){
  await db.ref(`ml/active/${cid}`).set(!!on);
  ML_ACTIVE[cid] = !!on;
}

// 강화학습 설명 텍스트 (선생님 편집 → 학생 표시)
async function loadMlRlDesc(cid){
  try {
    const s = await db.ref(`ml/rlDesc/${cid}`).get();
    const v = s.exists() ? String(s.val() || '') : '';
    ML_RL_DESC[cid] = v;
    return v;
  } catch(err){
    console.warn('[기계학습] rlDesc 로드 실패:', err.message || err);
    ML_RL_DESC[cid] = '';
    return '';
  }
}

async function setMlRlDesc(cid, text){
  await db.ref(`ml/rlDesc/${cid}`).set(String(text || ''));
  ML_RL_DESC[cid] = String(text || '');
}

// ── 📚 단원 콘텐츠 (단원별 수업자료/실습 항목) ──
//   aiactivity/submissions/{cid}/unitContent/{unitKey}/{section}/{itemId}
//   쓰기 허용된 aiactivity/submissions 하위라 Firebase 규칙 재게시 불필요.
async function loadUnitContent(cid){
  UNIT_CONTENT = {};
  // 단원·섹션 골격은 항상 만들어 둠 (없어도 빈 배열)
  for(const u of assignUnits()) UNIT_CONTENT[u.key] = { material: [], practice: [] };
  try {
    const s = await db.ref(`aiactivity/submissions/${cid}/unitContent`).get();
    if(!s.exists()) return;
    const raw = s.val() || {};
    for(const u of assignUnits()){
      const uu = raw[u.key] || {};
      ['material', 'practice'].forEach(sec => {
        const items = uu[sec] || {};
        UNIT_CONTENT[u.key][sec] = Object.entries(items)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      });
    }
  } catch(err){
    console.warn('[단원] 콘텐츠 로드 실패:', err.message || err);
  }
}

async function saveUnitItem(cid, unitKey, section, itemId, data){
  await db.ref(`aiactivity/submissions/${cid}/unitContent/${unitKey}/${section}/${itemId}`).set(data);
}

async function deleteUnitItem(cid, unitKey, section, itemId){
  await db.ref(`aiactivity/submissions/${cid}/unitContent/${unitKey}/${section}/${itemId}`).remove();
}

// 항목 순서 ▲▼ — 인접 항목의 createdAt 만 swap (다른 탭과 동일 패턴)
async function moveUnitItem(cid, unitKey, section, itemId, direction){
  const items = (UNIT_CONTENT[unitKey] && UNIT_CONTENT[unitKey][section]) || [];
  return _moveItemBy(`aiactivity/submissions/${cid}/unitContent/${unitKey}/${section}`, items, itemId, direction);
}

// ── 반 전체 데이터 로드 ──
async function loadAllClassData(cid){
  await Promise.all([
    loadNotices(cid),
    loadAssignments(cid),
    loadPosts(cid),
    loadTcFiles(cid),
    loadStudents(cid),
    loadOJProblems(cid),
    loadNotebooks(cid),
    loadMissions(cid),
    loadCodeReadings(cid),
    loadAsmtActive(cid),
    loadAsmtGuideActive(cid),
    loadAicActive(cid),
    loadAiaActive(cid),
    loadMlActive(cid),
    loadMlaActive(cid),
    loadUnitContent(cid),
    loadCustomActivities(cid),
    loadActivityOpen(cid),
    loadActivityHidden(cid),
    loadDecks(cid)
  ]);

  // 이번 시간에 열어둔 자료가 무엇인지 먼저 확인해야 메모를 제대로 찾습니다.
  try {
    const s = await db.ref(`slides/${cid}/live`).get();
    SLIDE_LIVE = s.exists() ? s.val() : { on: false, page: 0, deckId: null };
  } catch(err){
    console.warn('[슬라이드] 상태 로드 실패:', err.message || err);
    SLIDE_LIVE = { on: false, page: 0, deckId: null };
  }
  syncCurrentDeck();
  if(ST_USER) await loadMyNotes(cid, ST_USER.number);

  // 슬라이드 같이 보기 — 선생님이 넘기면 학생 화면이 따라오도록 구독.
  // 넘어가기 직전에 쓰던 메모를 먼저 저장해서 내용이 날아가지 않게 합니다.
  let _lastPage = SLIDE_LIVE.page ?? null;
  let _lastDeck = SLIDE_LIVE.deckId || null;
  watchLive(cid, live => {
    // 단원에서 자료를 열어보는 중인 학생은 건드리지 않습니다 (읽던 쪽·메모가 튀지 않게)
    const readingUnitDeck = !!SLIDE_VIEW_DECK;

    // 선생님이 다른 수업자료로 바꾸면 그 자료의 메모로 갈아끼웁니다
    if(live.deckId !== _lastDeck){
      _lastDeck = live.deckId || null;
      _lastPage = null;
      syncCurrentDeck();
      if(!readingUnitDeck){
        if(typeof _slFlushNote === 'function') _slFlushNote();
        SLIDE_MYPAGE = 0; SLIDE_FOLLOW = true; SLIDE_SHOW_ALL = false;
        if(ST_USER) loadMyNotes(cid, ST_USER.number).then(() => {
          if(VIEW === 'student' || VIEW === 'teacher') render();
        });
      }
    }
    if(!readingUnitDeck && _lastPage !== null && live.page !== _lastPage){
      if(typeof _slFlushNote === 'function') _slFlushNote();
      if(typeof _slSyncGame === 'function') _slSyncGame(_lastPage, live.page);
    }
    _lastPage = live.page;
    if(VIEW === 'student' || VIEW === 'teacher') render();
  });
}

// ── 레거시 게시물 (이전 버전 호환) ──
async function loadLegacyPosts(){
  const s = await db.ref('posts').get();
  if(!s.exists()) return [];
  const val = s.val(), out = [];
  Object.entries(val).forEach(([k, v]) => {
    if(!KNOWN_CLS.has(k) && v && 'title' in v) out.push({id: k, ...v});
  });
  return out.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

// ── 일반 순서 변경 헬퍼 (▲▼ 버튼용) ──
//   인접한 두 아이템의 정렬 키(createdAt 또는 uploadedAt) 만 swap
//   DB 스키마 변경 없이 모든 탭에서 재사용
//   items: 정렬된 배열 (loadXxx 결과), id: 이동시킬 아이템의 id
//   direction: 'up' | 'down'
async function _moveItemBy(dbPath, items, id, direction){
  const idx = items.findIndex(it => it.id === id);
  if(idx < 0) return false;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if(swapIdx < 0 || swapIdx >= items.length) return false;
  const a = items[idx], b = items[swapIdx];
  // 정렬 키 자동 감지: createdAt 우선, 없으면 uploadedAt
  const keyName = a.createdAt !== undefined ? 'createdAt'
                : a.uploadedAt !== undefined ? 'uploadedAt'
                : null;
  if(!keyName || !a[keyName] || !b[keyName]) return false;
  await Promise.all([
    db.ref(`${dbPath}/${a.id}/${keyName}`).set(b[keyName]),
    db.ref(`${dbPath}/${b.id}/${keyName}`).set(a[keyName])
  ]);
  return true;
}

/* ── 파일 업로드 (진행률 표시 지원) ──
   ⚠ 2026-08-20: 17장짜리 자료를 올리다 마지막 한 장에서 영원히 멈춘 일이 있었습니다.
     Firebase 는 네트워크가 막히면 실패하지 않고 그냥 '대기'합니다(HANDOFF 1번).
     그래서 진행이 멈춘 걸 직접 감시해서 끊고, 몇 번 다시 시도합니다.
       · 30초 동안 보낸 바이트가 한 톨도 안 늘면 → 멈춘 것으로 보고 취소
       · getDownloadURL 도 20초 제한 (여기서도 멈출 수 있음)
       · 최대 3번까지 다시 시도 (학교망이 잠깐 흔들리는 경우가 많아서)
     그래도 안 되면 오류를 던집니다 — 조용히 매달려 있는 것보다 낫습니다. */
const UPLOAD_STALL_MS = 30000;   // 이만큼 진행이 없으면 멈춘 것으로 판단
const UPLOAD_URL_MS   = 20000;   // 주소 받아오기 제한
const UPLOAD_TRIES    = 3;

function _uploadOnce(file, path, progFill, progPct){
  return new Promise((resolve, reject) => {
    const task = storage.ref(path).put(file);
    let moved = 0;              // 마지막으로 진행이 있었던 시각
    let timer = null;
    const stop = () => { if(timer){ clearInterval(timer); timer = null; } };

    const watchdog = () => {
      if(Date.now() - moved < UPLOAD_STALL_MS) return;
      stop();
      try { task.cancel(); } catch(e){}
      reject(new Error('업로드가 ' + (UPLOAD_STALL_MS / 1000) + '초 동안 멈췄습니다'));
    };

    moved = Date.now();
    timer = setInterval(watchdog, 2000);

    task.on('state_changed',
      snap => {
        moved = Date.now();     // 진행이 있으면 시계를 다시 감음
        const p = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
        if(progFill) progFill.style.width = p + '%';
        if(progPct) progPct.textContent = p + '%';
      },
      err => { stop(); reject(err); },
      () => {
        stop();
        // 업로드는 끝났어도 주소 받아오다 멈출 수 있어 여기도 제한을 둡니다
        withTimeout(storage.ref(path).getDownloadURL(), UPLOAD_URL_MS, '파일 주소')
          .then(resolve, reject);
      });
  });
}

async function uploadFile(file, path, progFill, progPct){
  let lastErr = null;
  for(let attempt = 1; attempt <= UPLOAD_TRIES; attempt++){
    try {
      return await _uploadOnce(file, path, progFill, progPct);
    } catch(err){
      lastErr = err;
      // 취소는 우리가 건 것이므로 재시도 대상. 마지막 판이면 그대로 실패.
      if(attempt < UPLOAD_TRIES){
        console.warn(`[업로드] ${path} ${attempt}번째 실패 — 다시 시도합니다:`, err.message || err);
        if(progPct) progPct.textContent = `다시 시도 ${attempt + 1}/${UPLOAD_TRIES}...`;
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }
  }
  throw new Error(`"${file.name}" 올리기 실패 (${UPLOAD_TRIES}번 시도) — ` + (lastErr?.message || lastErr));
}

/* ═══════════════════════════════════════
   🖥️ 수업자료 슬라이드 — 선생님 화면을 학생과 같이 보기

   수업자료는 차시마다 하나씩 쌓입니다. 여러 개를 올려두고,
   그중 '이번 시간에 볼 것' 하나만 골라서 학생에게 엽니다.

     slides/{cid}/decks/{deckId} : { id, title, updatedAt, images:[{name,url,path}] }
     slides/{cid}/live           : { on, page, deckId, updatedAt }
     slides/{cid}/notes/{deckId}/{학번}/{페이지}  : 메모 (자료별로 따로)

   ⚠ 예전에는 자료가 반당 하나뿐이라 slides/{cid}/deck 에 바로 넣었습니다.
     그 자료를 잃지 않도록 loadDecks() 가 발견하면 decks 목록에 얹어서
     같이 보여줍니다 (레거시는 id 가 'legacy').

   학생 쪽은 live 를 실시간 구독해서, 선생님이 넘기면 바로 따라 넘어갑니다.
═══════════════════════════════════════ */

const LEGACY_DECK_ID = 'legacy';

// 저장된 자료 하나를 화면이 쓰는 모양으로 정리 (images 가 없으면 빈 배열)
function _normalizeDeck(id, v){
  if(!v) return null;
  const deck = { ...v, id };
  if(!Array.isArray(deck.images)) deck.images = [];
  return deck;
}

/* 반의 수업자료 목록 전체 — 최근에 만든 것이 위로 */
async function loadDecks(cid){
  SLIDE_DECKS = [];
  try {
    const [multi, legacy] = await Promise.all([
      db.ref(`slides/${cid}/decks`).get(),
      db.ref(`slides/${cid}/deck`).get(),      // 예전 방식으로 올린 자료
    ]);

    if(multi.exists()){
      SLIDE_DECKS = Object.entries(multi.val() || {})
        .map(([id, v]) => _normalizeDeck(id, v))
        .filter(Boolean);
    }
    // 예전 자료가 남아 있으면 목록 맨 뒤에 합쳐서 계속 쓸 수 있게
    if(legacy.exists()){
      const old = _normalizeDeck(LEGACY_DECK_ID, legacy.val());
      if(old && old.images.length){
        if(!old.title) old.title = '이전에 올린 수업자료';
        SLIDE_DECKS.push(old);
      }
    }
    SLIDE_DECKS.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  } catch(err){
    console.warn('[슬라이드] 목록 로드 실패:', err.message || err);
    SLIDE_DECKS = [];
  }
  return SLIDE_DECKS;
}

// 지금 열려 있는(=이번 시간에 볼) 자료. live.deckId 가 가리키는 것.
function deckById(id){
  return SLIDE_DECKS.find(d => d.id === id) || null;
}

/* SLIDE_DECK(지금 보는 자료)을 live.deckId 기준으로 다시 맞춥니다.
   deckId 가 없던 시절 데이터는 자료가 하나뿐이었으니 그 하나를 씁니다. */
function syncCurrentDeck(){
  const id = SLIDE_LIVE?.deckId;
  SLIDE_DECK = id ? deckById(id)
             : (SLIDE_DECKS.length === 1 ? SLIDE_DECKS[0] : null);
  return SLIDE_DECK;
}

async function saveDeck(cid, deck){
  const id = deck.id || genId();
  const path = id === LEGACY_DECK_ID ? `slides/${cid}/deck` : `slides/${cid}/decks/${id}`;
  const {id: _drop, ...body} = deck;
  await db.ref(path).set(body);

  const merged = { ...body, id };
  // 지금 보고 있는 반이 아닐 때(여러 반에 한꺼번에 올릴 때)는 화면 상태를 건드리지 않습니다.
  if(cid === CID()){
    const i = SLIDE_DECKS.findIndex(d => d.id === id);
    if(i >= 0) SLIDE_DECKS[i] = merged; else SLIDE_DECKS.unshift(merged);
    if(SLIDE_DECK?.id === id || !SLIDE_DECK) SLIDE_DECK = merged;
  }
  return merged;
}

// 수업자료 하나 삭제 — 그림 파일·메모까지 같이 정리
async function deleteDeck(cid, deckId){
  const deck = deckById(deckId);
  if(deck?.images) for(const im of deck.images){
    if(im.path) await storage.ref(im.path).delete().catch(() => {});
  }
  const path = deckId === LEGACY_DECK_ID ? `slides/${cid}/deck` : `slides/${cid}/decks/${deckId}`;
  await db.ref(path).remove();
  await db.ref(`slides/${cid}/notes/${deckId}`).remove().catch(() => {});

  SLIDE_DECKS = SLIDE_DECKS.filter(d => d.id !== deckId);
  // 지우는 자료를 지금 열어둔 상태였다면 같이 보기도 끕니다
  if(SLIDE_LIVE?.deckId === deckId || SLIDE_DECK?.id === deckId){
    await setLive(cid, { on: false, page: 0, deckId: null });
    SLIDE_DECK = null;
  }
}

/* 선생님: 같이 보기 켜기/끄기, 페이지 넘기기, 볼 자료 고르기
   deckId 를 넘기면 그 자료로 바꾸고 첫 장부터 시작합니다. */
async function setLive(cid, patch){
  const cur = SLIDE_LIVE || { on: false, page: 0, deckId: null };
  const next = {
    on: !!cur.on,
    page: cur.page || 0,
    deckId: cur.deckId || null,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await db.ref(`slides/${cid}/live`).set(next);
  SLIDE_LIVE = next;
  syncCurrentDeck();
}

/* 이번 시간에 볼 자료 고르기 — 고르면 첫 장으로 맞춥니다.
   같이 보기가 켜져 있으면 학생 화면도 바로 이 자료로 넘어갑니다. */
async function pickDeck(cid, deckId){
  await setLive(cid, { deckId: deckId || null, page: 0 });
  if(ST_USER) await loadMyNotes(cid, ST_USER.number);
}

/* 실시간 구독 — 선생님이 넘기면 0.1~0.3초 안에 학생 화면이 따라옵니다.
   반을 옮기거나 로그아웃할 때 반드시 unwatchLive() 로 정리합니다. */
function watchLive(cid, onChange){
  unwatchLive();
  const ref = db.ref(`slides/${cid}/live`);
  const cb = ref.on('value', snap => {
    SLIDE_LIVE = snap.exists() ? snap.val() : { on: false, page: 0 };
    if(onChange) onChange(SLIDE_LIVE);
  }, err => console.warn('[슬라이드] 구독 실패:', err.message || err));
  SLIDE_WATCH = { ref, cb };
}

function unwatchLive(){
  if(SLIDE_WATCH){
    try { SLIDE_WATCH.ref.off('value', SLIDE_WATCH.cb); } catch(e){}
    SLIDE_WATCH = null;
  }
}

/* ── 슬라이드 메모 (학생이 장마다 남기는 필기) ──
   slides/{cid}/notes/{자료id}/{학번}/{페이지} = '메모'
   자료마다 따로 저장합니다. 1차시 메모가 2차시 자료에 딸려오지 않게.
   장별로도 따로라서 선생님이 넘겨도 섞이거나 사라지지 않습니다. */

/* 지금 보고 있는 자료 id — 메모를 어디에 넣을지 정합니다.
   단원에서 연 자료(SLIDE_VIEW_DECK)가 우선입니다. 그래야 수업 시간에 쓴 필기와
   나중에 단원에서 열어 쓴 필기가 같은 곳에 쌓입니다. */
function _noteDeckId(){
  return SLIDE_VIEW_DECK || SLIDE_LIVE?.deckId || SLIDE_DECK?.id || LEGACY_DECK_ID;
}

async function loadMyNotes(cid, snum){
  SLIDE_NOTES = {};
  if(!snum) return;
  const did = _noteDeckId();
  try {
    const s = await db.ref(`slides/${cid}/notes/${did}/${snum}`).get();
    if(s.exists()) SLIDE_NOTES = s.val() || {};
  } catch(err){ console.warn('[슬라이드] 메모 로드 실패:', err.message || err); }
}

async function saveNote(cid, snum, page, text){
  if(!snum) return;
  const ref = db.ref(`slides/${cid}/notes/${_noteDeckId()}/${snum}/${page}`);
  if((text || '').trim()) await ref.set(text);
  else await ref.remove();          // 다 지우면 빈 값이 남지 않게
  SLIDE_NOTE_SAVED = new Date().toISOString();
}

// 선생님: 지금 자료에 반 전체가 적은 메모 (누가 어느 장에 뭘 적었는지)
async function loadAllNotes(cid){
  try {
    const s = await db.ref(`slides/${cid}/notes/${_noteDeckId()}`).get();
    SLIDE_NOTE_ALL = s.exists() ? (s.val() || {}) : {};
  } catch(err){
    console.warn('[슬라이드] 전체 메모 로드 실패:', err.message || err);
    SLIDE_NOTE_ALL = {};
  }
  return SLIDE_NOTE_ALL;
}

/* ── 실습 점수 (식물 물 주기 등) ──
   slides/{cid}/scores/{게임id}/{학번} = { name, best, plays, updatedAt }
   최고점만 남깁니다 — 여러 번 도전해도 기록은 하나. */
async function loadGameScores(cid, gameId){
  gameId = gameId || 'plant-water';
  try {
    const s = await db.ref(`slides/${cid}/scores/${gameId}`).get();
    return s.exists() ? (s.val() || {}) : {};
  } catch(err){
    console.warn('[실습] 점수 로드 실패:', err.message || err);
    return {};
  }
}

async function saveGameScore(cid, snum, name, score, gameId){
  gameId = gameId || 'plant-water';
  const ref = db.ref(`slides/${cid}/scores/${gameId}/${snum}`);
  const cur = await ref.get();
  const prev = cur.exists() ? cur.val() : null;
  const best = Math.max(score, prev?.best ?? -9999);
  await ref.set({
    name: name || snum,
    best,
    plays: (prev?.plays || 0) + 1,
    updatedAt: new Date().toISOString(),
  });
  return best;
}
