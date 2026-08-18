/* ═══════════════════════════════════════
   views/student.js — 학생 대시보드

   학생이 로그인한 뒤 보는 모든 탭 화면:
   공지, 과제, 게시판, 파일, 출결, 내 현황
═══════════════════════════════════════ */

// ── 사이드바 네비 정의 ──
// 정보반 17개 평면 탭을 5개 그룹으로 묶어 좌측 세로 네비로 렌더.
// 각 그룹: { label, items:[{key,ico,label,badge?}] } — label 없으면 그룹 헤더 숨김(홈).
// 토글(active 노드)로 켜진 항목만 노출. 그룹 안 항목이 0개면 그룹 자체를 안 그림.
function _stNavGroups(){
  const isInfo = (SEL_CLS?.type || 'normal') === 'info';
  const cid = SEL_CLS?.id;
  const on = m => isInfo && m[cid];

  // 평가 그룹은 활성화된 것만 노출 — 진행 중일 때만 그룹이 나타남(시즌성).
  //   수행평가 = 실제 응시(ASMT) 또는 연습 안내(AG) 중 하나라도 켜지면 노출(안에서 모드 전환).
  const asmtItems = [];
  if(on(ASMT_ACTIVE) || on(AG_ACTIVE)) asmtItems.push({key:'asmt',     ico:'📝', label:'수행평가'});
  if(on(MLA_ACTIVE))                   asmtItems.push({key:'mlassess', ico:'🧪', label:'ML 수행평가'});

  // 최상단 — 나의 포트폴리오 (차시별로 내가 한 활동 모아보기)
  const groups = [{ items:[
    {key:'portfolio', ico:'🗂️', label:'나의 포트폴리오'},
    {key:'dashboard', ico:'🏠', label:'홈'},
  ]}];

  if(isSubjectCls(SEL_CLS)){
    // 교과반(인공지능 기초·진로·정보): 수업을 단원별(Ⅰ~Ⅳ)로 분리한 '수업' 그룹.
    //   정보반은 노트북·미션·OJ·퀴즈·AI코딩·기계학습·AI활동지가 각 단원 '실습'의
    //   앱연결로만 노출됨(글로벌 실습·AI 탐구 그룹 없앰).
    const units = assignUnits();
    groups.push({ label:'학급', items:[
      {key:'notice', ico:'📢', label:'공지'},
    ]});
    if(units.length){
      groups.push({ label:'수업', items: units.map(u => ({key:'unit-'+u.key, ico:u.roman, label:u.label})) });
      // 인공지능 기초: 과제 제출을 단원과 별개로 한눈에 (정보반은 단원 안 앱연결로 도달)
      if(!isInfo) groups.push({ items:[{key:'assign', ico:'📝', label:'과제 제출'}] });
    }
    // 진로는 학습지(활동지)로만 운영 — '수업' 메뉴를 쓰지 않습니다.
    // 다시 쓰려면 위 else 자리에 assign 항목을 넣으면 됩니다.
    // 활동지 — 선생님이 '학생에게 보내기' 한 것이 있을 때만
    if(!isInfo && aiaOpenFor(SEL_CLS).length){
      groups.push({ items:[{key:'aia', ico:'📋', label:'활동지'}] });
    }
    // 수업자료 — 올라온 슬라이드가 있을 때만. 같이 보는 중이면 초록 점
    if(_slideCount()){
      groups.push({ dot: !!SLIDE_LIVE?.on, items:[{key:'slides', ico:'🖥️', label:'수업자료'}] });
    }
    // 평가 그룹: 진행 중인 항목이 하나라도 있을 때만 노출(시즌성). 점은 항상 진행 중 의미.
    if(asmtItems.length) groups.push({ label:'평가', dot:true, items: asmtItems });
    // 내 점수 (정보반 — 공개된 수행평가 점수)
    if(isInfo) groups.push({ items:[{key:'myscore', ico:'📊', label:'내 점수'}] });
  } else {
    // 일반반: 수업 단일 탭 유지
    groups.push({ label:'학급', items:[
      {key:'notice', ico:'📢', label:'공지'},
      {key:'assign', ico:'📖', label:'수업'},
    ]});
  }
  return groups;
}

// 사이드바 HTML (학생·선생님 공용) — activeKey/setter/toggle만 갈아끼움
function _navSidebar(groups, collapsed, activeKey, setter, toggleFn){
  const rows = groups.map(g => {
    const head = g.label
      ? `<div class="side-group-label${collapsed ? ' side-dot-only' : ''}">${g.dot ? '<span class="side-dot"></span>' : ''}${collapsed ? '' : esc(g.label)}</div>`
      : '';
    const items = g.items.map(it => {
      const active = activeKey === it.key ? ' active' : '';
      const badge = it.badge ? `<span class="side-badge">${esc(it.badge)}</span>` : '';
      const title = collapsed ? ` title="${esc(it.label)}"` : '';
      return `<button class="side-item${active}" onclick="${setter}('${it.key}')"${title}>
        <span class="side-ico">${it.ico}</span>${collapsed ? '' : `<span class="side-label">${esc(it.label)}</span>${badge}`}
      </button>`;
    }).join('');
    return head + items;
  }).join('');

  return `<nav class="sidebar">
    <div class="side-top">
      <button class="side-collapse" onclick="${toggleFn}()" title="${collapsed ? '메뉴 펼치기' : '메뉴 접기'}">${collapsed ? '»' : '«'}</button>
    </div>
    ${rows}
  </nav>`;
}

// 학생 사이드바
function _stSidebar(groups, collapsed){
  return _navSidebar(groups, collapsed, ST_TAB, 'setST', 'toggleStNav');
}

// 구버전 탭 키 → 통합 탭 키 정규화 (저장된 세션/이전 링크 호환)
function _stNormalizeTab(){
  if(ST_TAB === 'oj'){ ST_TAB = 'practice'; ST_PRACTICE_SUB = 'oj'; }
  else if(ST_TAB === 'coderead'){ ST_TAB = 'practice'; ST_PRACTICE_SUB = 'quiz'; }
  else if(ST_TAB === 'mine' || ST_TAB === 'me'){ ST_TAB = 'myscore'; } // 내현황·나 삭제 → 내 점수로
  else if(ST_TAB === 'attend'){ ST_TAB = 'dashboard'; } // 내 출결 삭제 → 홈
  else if(ST_TAB === 'asmt-guide'){ ST_TAB = 'asmt'; ASMT_MODE = 'guide'; }
  // 정보반의 옛 '수업' 단일 탭 → 첫 단원
  if(ST_TAB === 'assign' && (SEL_CLS?.type || 'normal') === 'info') ST_TAB = 'unit-' + assignUnits()[0].key;
  // 다른 과목의 단원 탭이 남아 있으면(반을 바꿔 로그인한 경우) 이 과목 첫 단원으로.
  // 단원을 안 쓰는 과목이면 '수업' 탭으로.
  if(ST_TAB.indexOf('unit-') === 0 && !assignUnit(ST_TAB.slice(5))){
    ST_TAB = assignUnits().length ? 'unit-' + assignUnits()[0].key : 'dashboard';
  }
  // 진로는 '수업' 탭을 안 쓰므로 홈으로
  if(ST_TAB === 'assign' && isSubjectCls(SEL_CLS) && !assignUnits().length) ST_TAB = 'dashboard';
  // 일반반은 내 점수가 없으니 홈으로
  if(ST_TAB === 'myscore' && (SEL_CLS?.type || 'normal') !== 'info') ST_TAB = 'dashboard';
}

// 본문 탭 내용
function _stTabBody(){
  if     (ST_TAB === 'slides')    return vStSlides();
  else if(ST_TAB === 'portfolio') return vStPortfolio();
  else if(ST_TAB === 'dashboard') return vStDashboard();
  else if(ST_TAB === 'notice')  return vStNotice();
  else if(ST_TAB === 'assign')  return vStAssign();
  else if(ST_TAB === 'board')   return vStBoard();
  else if(ST_TAB === 'attend')  return vStAttend();
  else if(ST_TAB.indexOf('unit-') === 0) return vStUnit(ST_TAB.slice(5));
  else if(ST_TAB === 'notebook')return vStNotebook();
  else if(ST_TAB === 'mission') return vStMission();
  else if(ST_TAB === 'practice')return vStPractice();
  else if(ST_TAB === 'aicode')  return vStAiCode();
  else if(ST_TAB === 'aia')     return vStAiActivity();
  else if(ST_TAB === 'ml')      return vStMl();
  else if(ST_TAB === 'asmt')    return vStAsmt();
  else if(ST_TAB === 'mlassess')return vStMlAssess();
  else if(ST_TAB === 'myscore') return vStMyScore();
  return '';
}

// 본문을 넓게(IDE형) 쓰는 탭 — 좁은 탭은 가운데 정렬로 가독성 유지
function _stWideTab(){
  if(ST_TAB === 'notebook' || ST_TAB === 'mission') return true;
  if(ST_TAB === 'practice' && ST_PRACTICE_SUB === 'oj') return true;
  if(ST_TAB === 'practice' && ST_PRACTICE_SUB === 'quiz' && CR_VIEW === 'solve') return true;
  if(ST_TAB === 'asmt' && ASMT_MODE === 'guide' && AG_STAGE === 2) return true;
  if(ST_TAB === 'asmt' && ASMT_MODE === 'real' && ASMT_STAGE === 2) return true;
  if(ST_TAB === 'aicode' && AIC_VIEW === 'chat') return true;
  return false;
}

// 사이드바 자동 접힘 탭 (전체화면 IDE) — 사용자 토글보다 우선
function _stAutoCollapse(){
  return ST_TAB === 'notebook' || ST_TAB === 'mission';
}

function toggleStNav(){
  ST_NAV_COLLAPSED = !ST_NAV_COLLAPSED;
  render();
}

// 앱연결로 단원에서 연 기능 → 단원으로 복귀
function returnToUnit(){
  if(!UNIT_RETURN) return;
  const { unitKey, section } = UNIT_RETURN;
  UNIT_RETURN = null;
  ST_TAB = 'unit-' + unitKey;
  ST_UNIT_SEC = section || 'material';
  VIEW = 'student';
  render();
}

// 학생 대시보드 메인 — 본문만 반환 (내비는 드로어가 담당, 셸은 render.js)
function vStudent(){
  _stNormalizeTab();
  // 단원 화면에 와 있으면 복귀 마커는 의미 없으니 해제
  if(ST_TAB.indexOf('unit-') === 0) UNIT_RETURN = null;
  const backBar = UNIT_RETURN
    ? `<div class="unit-return-bar" onclick="returnToUnit()">← ${esc((assignUnit(UNIT_RETURN.unitKey) || {}).label || '단원')}(으)로 돌아가기</div>`
    : '';
  return backBar + _stTabBody();
}

// 작은 밑줄형 하위탭 바
function _subTabs(tabs, cur, fn){
  return `<div class="prac-subtabs">${tabs.map(t =>
    `<button class="prac-subtab${cur === t.key ? ' active' : ''}" onclick="${fn}('${t.key}')">${t.label}</button>`
  ).join('')}</div>`;
}

// ── 💻 문제풀이 (OJ + 퀴즈 통합) ──
function vStPractice(){
  const sub = ST_PRACTICE_SUB === 'quiz' ? 'quiz' : 'oj';
  // 퀴즈 풀이 중에는 하위탭 바 숨김(집중) — 퀴즈 화면 자체에 뒤로가기 있음
  if(sub === 'quiz' && CR_VIEW === 'solve') return vStCodeRead();
  const bar = _subTabs([{key:'oj', label:'💻 OJ'}, {key:'quiz', label:'🧩 퀴즈'}], sub, 'setPracticeSub');
  return bar + (sub === 'oj' ? vStOJ() : vStCodeRead());
}
function setPracticeSub(s){
  ST_PRACTICE_SUB = s;
  if(s === 'quiz'){
    CR_VIEW = 'list'; CR_SEL = null; CR_LAST_RESULT = null; CR_CLOZE_ANSWERS = null; CR_BUG_SEL = null;
    // 진도 미로드 시(예: 구버전 세션 복원) 1회 로드
    if(SEL_CLS && ST_USER && !Object.keys(CR_PROGRESS || {}).length){
      _loadCrProgress().then(render);
    }
  }
  render();
}

// 퀴즈(코드 읽기) 본인 진도 일괄 로드 — 목록 표시용
async function _loadCrProgress(){
  await loadCodeReadings(SEL_CLS.id);
  CR_PROGRESS = {};
  for(const r of CR_READINGS){
    const p = await loadCodeReadingProgress(SEL_CLS.id, r.id, ST_USER.number);
    if(p){
      if(!CR_PROGRESS[r.id]) CR_PROGRESS[r.id] = {};
      CR_PROGRESS[r.id][ST_USER.number] = p;
    }
  }
}

// ── 📊 내 점수 — 공개된 수행평가 점수 로드 ──
function _loadMyScores(){
  MY_SCORES = null; MY_SCORES_PUB = null; MY_REASONS_PUB = null;
  render();
  Promise.all([
    loadAsmtPublished(SEL_CLS.id),
    loadAsmtReasonsPublished(SEL_CLS.id),
    loadMyAsmtScores(SEL_CLS.id, ST_USER.number),
  ]).then(([pub, rpub, scores]) => {
    MY_SCORES_PUB = pub; MY_REASONS_PUB = rpub; MY_SCORES = scores;
    if(ST_TAB === 'myscore') render();
  });
}

// ── 📝 수행평가 (실제 응시 + 연습 안내 통합) ──
function vStAsmt(){
  const cid = SEL_CLS?.id;
  const real = !!ASMT_ACTIVE[cid], guide = !!AG_ACTIVE[cid];
  if(real && guide){
    const mode = ASMT_MODE === 'guide' ? 'guide' : 'real';
    const bar = _subTabs([{key:'real', label:'📝 실제 응시'}, {key:'guide', label:'📖 연습'}], mode, 'setAsmtMode');
    return bar + (mode === 'guide' ? vStAsmtGuide() : vStAssessment());
  }
  if(guide && !real) return vStAsmtGuide();   // 연습만 열린 상태
  return vStAssessment();                       // 실제만(또는 둘 다 꺼짐 → 안내 카드)
}
function setAsmtMode(m){
  ASMT_MODE = m;
  if(m === 'guide'){ // 연습은 매번 새로 시작(제출·저장 없음)
    AG_STAGE = 1; AG_ANS = { a: '', b: {}, blanks: {} };
    AG_RUN = null; AG_TEST = null; AG_RUNNING = false; AG_STDIN = '';
  }
  render();
}

function setST(t){
  UNIT_RETURN = null;  // 사이드바로 이동하면 단원 복귀 마커 해제
  ST_TAB = t;
  if(t.indexOf('unit-') === 0){
    ST_UNIT_SEC = 'material';  // 단원 진입 시 항상 수업 자료부터
    render();
  } else if(t === 'attend' && SEL_CLS){
    const ym = new Date().toISOString().slice(0, 7);
    loadAttendanceMonth(SEL_CLS.id, ym).then(render);
  } else if(t === 'practice' && SEL_CLS && ST_USER){
    // 문제풀이(OJ+퀴즈) — OJ는 반 로드 시 이미 적재됨, 퀴즈 진도만 로드
    OJ_SEL_PROB = null; OJ_RUN_RESULTS = null; OJ_SUBMIT_RESULTS = null;
    CR_VIEW = 'list'; CR_SEL = null; CR_LAST_RESULT = null; CR_CLOZE_ANSWERS = null; CR_BUG_SEL = null;
    render();                       // OJ 하위탭은 즉시 표시
    _loadCrProgress().then(render); // 퀴즈 진도 로드 후 갱신
  } else if(t === 'aicode' && SEL_CLS && ST_USER){
    // AI 코딩 탭 — active + 저장 세션 로드 후 적절한 화면 결정
    _aicResetState();
    Promise.all([
      loadAicActive(SEL_CLS.id),
      loadAicSession(SEL_CLS.id, ST_USER.number)
    ]).then(([_active, s]) => {
      _aicApplySession(s);  // 모든 저장 필드 복원 — 누락 시 다음 저장 때 유실됨
      AIC_VIEW = _aicInitialStudentView(s);
      render();
    });
  } else if(t === 'asmt' && SEL_CLS && ST_USER){
    // 수행평가(실제 응시 + 연습 통합) — 모드 기본값 + 연습 상태 초기화 + 내 제출 로드
    ASMT_MODE = ASMT_ACTIVE[SEL_CLS.id] ? 'real' : 'guide';
    AG_STAGE = 1; AG_ANS = { a: '', b: {}, blanks: {} };
    AG_RUN = null; AG_TEST = null; AG_RUNNING = false; AG_STDIN = '';
    ASMT_ANS = { a: '', b: {}, blanks: {} };
    ASMT_STAGE = 1;
    ASMT_VIEW = 'exam';
    ASMT_RUN = null;
    ASMT_TEST = null;
    ASMT_RUNNING = false;
    loadAsmtSubmission(SEL_CLS.id, ST_USER.number).then(sub => {
      ASMT_SUB = sub;
      if(sub){
        ASMT_ANS = { a: sub.a || '', b: sub.b || {}, blanks: sub.blanks || {} };
        if(sub.submittedAt){ ASMT_VIEW = 'done'; }
        else if(sub.stage === 2){ ASMT_STAGE = 2; }
      }
      render();
    });
  } else if(t === 'aia' && SEL_CLS && ST_USER){
    // AI 활동지 — active 확인 + 목록으로 초기화
    AIA_VIEW = 'list';
    AIA_SEL = null;
    AIA_ANSWERS = {};
    AIA_SUB = null;
    AIA_SAVING = false;
    loadAiaActive(SEL_CLS.id).then(() => render());
  } else if(t === 'mlassess' && SEL_CLS && ST_USER){
    // 📝 ML 수행평가 — 내 응시 기록 로드
    MLA_ANSWERS = {}; MLA_SUB = null; MLA_SAVING = null; MLA_LOADING = true;
    if(MLA_SAVE_TIMER){ clearTimeout(MLA_SAVE_TIMER); MLA_SAVE_TIMER = null; }
    render();
    Promise.all([
      loadAiaSubmission(SEL_CLS.id, 'mlassess', ST_USER.number),
      loadMlaConfig(SEL_CLS.id),
    ]).then(([sub]) => {
      MLA_SUB = sub;
      if(sub && sub.answers) MLA_ANSWERS = { ...sub.answers };
      MLA_LOADING = false;
      render();
    }).catch(() => { MLA_LOADING = false; render(); });
  } else if(t === 'ml' && SEL_CLS && ST_USER){
    // 🤖 기계학습 체험 — active 확인 + 상태 초기화
    ML_TAB = 'supervised';
    ML_SUP_PHASE = 'pick'; ML_SUP_DATASET = null; ML_SUP_TRAIN_DATA = null; ML_SUP_TEST_DATA = null;
    ML_SUP_TRAINED = false; ML_SUP_TEST_IDX = 0; ML_SUP_TEST_RESULTS = []; ML_SUP_LAST_RESULT = null;
    ML_UN_PHASE = 'pick'; ML_UN_DATASET = null; ML_UN_DATA = null; ML_UN_KMEANS = null; ML_UN_REVEAL = false;
    if(ML_UN_AUTO_TIMER){ clearInterval(ML_UN_AUTO_TIMER); ML_UN_AUTO_TIMER = null; }
    Promise.all([loadMlActive(SEL_CLS.id), loadMlRlDesc(SEL_CLS.id)]).then(() => render());
  } else if(t === 'myscore' && SEL_CLS && ST_USER){
    // 📊 내 점수 — 공개 토글 + 사유 공개 + 내 점수 로드 (내부에서 render)
    _loadMyScores();
  } else if(t === 'mission' && SEL_CLS && ST_USER){
    // 미션 그리드 카드의 진행률 표시용 — 한 번에 로드
    MISSION_VIEW = 'list';
    SEL_MISSION = null;
    MISSION_PROGRESS_ALL = null;
    render(); // 일단 빈 진행률로 렌더
    loadAllMissionProgress(SEL_CLS.id, ST_USER.number).then(prog => {
      MISSION_PROGRESS_ALL = prog;
      if(ST_TAB === 'mission' && MISSION_VIEW === 'list') render();
    });
  } else {
    render();
  }
}

// 단원 카드 비주얼 (이모지·색) — key 는 constants.js 의 SUBJECT_UNITS 단원 key
const DASH_UNIT_VIS = {
  // 정보
  computing:   { emoji: '🖥️', color: '#3B82F6' },
  bigdata:     { emoji: '📊', color: '#10B981' },
  programming: { emoji: '💻', color: '#8B5CF6' },
  ai:          { emoji: '🤖', color: '#EC4899' },
  // 인공지능 기초
  'aib-understand': { color: '#6366F1' },
  'aib-learning':   { emoji: '📈', color: '#10B981' },
  'aib-impact':     { emoji: '⚖️', color: '#F59E0B' },
  'aib-project':    { emoji: '🛠️', color: '#EC4899' },
  // 진로와 직업
  'car-self':    { emoji: '🪞', color: '#8B5CF6' },
  'car-world':   { emoji: '🏢', color: '#3B82F6' },
  'car-explore': { emoji: '🔍', color: '#10B981' },
  'car-design':  { emoji: '🧭', color: '#F59E0B' },
};

// ── 📊 내 점수 — 대시보드용 lazy 로드 (한 번만 트리거, 완료 시 재렌더) ──
let _dashScoreLoading = false;
function _ensureMyScores(){
  if(MY_SCORES != null || _dashScoreLoading) return;
  if(!SEL_CLS || !ST_USER) return;
  _dashScoreLoading = true;
  Promise.all([
    loadAsmtPublished(SEL_CLS.id),
    loadAsmtReasonsPublished(SEL_CLS.id),
    loadMyAsmtScores(SEL_CLS.id, ST_USER.number),
  ]).then(([pub, rpub, scores]) => {
    MY_SCORES_PUB = pub; MY_REASONS_PUB = rpub; MY_SCORES = scores;
    _dashScoreLoading = false;
    if(ST_TAB === 'dashboard' || ST_TAB === 'myscore') render();
  }).catch(() => { _dashScoreLoading = false; });
}

// ── 대시보드 홈 탭 ──
function vStDashboard(){
  const isInfo = (SEL_CLS?.type || 'normal') === 'info';

  // ① 최근 공지 배너 (고정 우선·최신)
  const n = NOTICES[0];
  const noticeBanner = n
    ? `<div class="dash-notice" onclick="setST('notice')">
        <div class="dash-notice-ico">${n.isPinned ? '📌' : '📢'}</div>
        <div class="dash-notice-body">
          <div class="dash-notice-label">${n.isPinned ? '고정 공지' : '최근 공지'}</div>
          <div class="dash-notice-title">${esc(n.title)}</div>
          ${n.content ? `<div class="dash-notice-text">${esc(n.content)}</div>` : ''}
        </div>
        <div class="dash-notice-go">전체 보기 →</div>
      </div>`
    : `<div class="dash-notice" onclick="setST('notice')">
        <div class="dash-notice-ico">📢</div>
        <div class="dash-notice-body"><div class="dash-notice-title">아직 등록된 공지가 없어요</div></div>
        <div class="dash-notice-go">공지 →</div>
      </div>`;

  const qnaCard = '';

  // ③ 단원 카드 (교과반: 2×2) / 일반반: 수업 바로가기
  let unitsBlock = '';
  if(isSubjectCls(SEL_CLS) && assignUnits().length){
    const cards = assignUnits().map(u => {
      const vis = DASH_UNIT_VIS[u.key] || { emoji: '📚', color: '#6366F1' };
      const list = ASSIGNMENTS.filter(a => a.unit === u.key || !a.unit);
      const done = list.filter(a => SUBMISSIONS[a.id] && SUBMISSIONS[a.id][ST_USER?.number]).length;
      const meta = list.length ? `수업 ${list.length}개 · 제출 ${done}/${list.length}` : '수업 준비 중';
      return `<div class="dash-unit" onclick="setST('unit-${u.key}')">
        <div class="dash-unit-top" style="background:${vis.color}">
          ${_dotGrid(u.key)}
          <div class="dash-unit-roman">${u.roman}</div>
        </div>
        <div>
          <div class="dash-unit-label">${esc(u.label)}</div>
          <div class="dash-unit-meta">${meta}</div>
        </div>
      </div>`;
    }).join('');
    unitsBlock = `<div class="dash-sec-label">📚 수업 단원</div><div class="dash-units">${cards}</div>`;
  } else if(!isSubjectCls(SEL_CLS)){
    // 일반 학급만 — 진로처럼 '수업'을 안 쓰는 교과반은 아무것도 안 붙임
    unitsBlock = `<div class="dash-cta" onclick="setST('assign')">📖 수업 보러 가기 →</div>`;
  }

  // ④ 내 점수 (정보반만)
  let scoreBlock = '';
  if(isInfo){
    _ensureMyScores();
    let body;
    if(MY_SCORES == null){
      body = `<div class="dash-score-loading">⏳ 점수 불러오는 중...</div>`;
    } else {
      const pub = MY_SCORES_PUB || {};
      let sum = 0, max = 0, cnt = 0;
      for(const a of ASMT_LIST){
        if(pub[a.id]){ const t = _scTotal(a, MY_SCORES[a.id]); if(t != null){ sum += t; max += a.total; cnt++; } }
      }
      body = cnt
        ? `<div class="dash-score-num">${_scRound(sum)}<span class="dash-score-max">/${max}</span></div>
           <div class="dash-score-cap">공개된 ${cnt}개 수행평가 합계 (전체 만점 ${ASMT_TOTAL_ALL}점)</div>`
        : `<div class="dash-score-num muted">–</div>
           <div class="dash-score-cap">아직 공개된 점수가 없어요. 선생님이 채점·공개하면 여기서 볼 수 있어요.</div>`;
    }
    scoreBlock = `<div class="dash-sec-label">📊 내 점수</div>
      <div class="dash-score" onclick="setST('myscore')">
        <div class="dash-score-head"><span>수행평가 점수</span><span class="dash-score-go">자세히 →</span></div>
        ${body}
      </div>`;
  }

  // ⓪ 이번 시간 활동 — 선생님이 열어둔 활동지로 홈에서 바로 진입
  const openActs = aiaOpenFor(SEL_CLS);
  const nowBlock = openActs.length ? `
    <div class="now-label">이번 시간 활동</div>
    <div class="now-grid">${openActs.map(a => {
      const st = PF_ACTS[ST_USER?.number]?.[a.id];
      const wrote = st && Object.values(st.answers || {}).some(v =>
        typeof v === 'string' ? v.trim() : (v && (Array.isArray(v) ? v.length : Object.keys(v).length)));
      const state = st?.submittedAt ? '제출 완료' : wrote ? '작성 중' : '아직 작성 전';
      return `<button class="now-card" data-action="aia-pick" data-aid="${esc(a.id)}">
        <div class="now-card-sub">${esc(a.subtitle || '활동지')}</div>
        <div class="now-card-title">${esc(a.title)}</div>
        <div class="now-card-foot"><span>문항 ${(a.questions || []).length}개 · ${state}</span><span class="now-card-go">바로 쓰기 →</span></div>
      </button>`;
    }).join('')}</div>` : '';

  // 선생님이 '같이 보기'를 켜면 홈 맨 위에 바로 들어가는 배너
  const liveBanner = (SLIDE_LIVE?.on && _slideCount())
    ? `<button class="sl-livebar" onclick="setST('slides')">
         <span class="sl-live"><i></i>지금 수업 중</span>
         <span class="sl-livebar-t">${esc(SLIDE_DECK?.title || '수업자료')} · ${(SLIDE_LIVE.page || 0) + 1}장</span>
         <span class="sl-livebar-go">같이 보기 →</span>
       </button>`
    : '';

  return `
    ${liveBanner}
    ${nowBlock}
    <div class="dash-greeting">
      <div class="dash-hello">안녕하세요, <strong>${esc(ST_USER?.name)}</strong>님! 👋</div>
      <div class="dash-class">${esc(SEL_CLS?.emoji)} ${esc(SEL_CLS?.label)}</div>
    </div>
    ${noticeBanner}
    ${unitsBlock}
    ${scoreBlock}
  `;
}

/* ── 🗂️ 나의 포트폴리오 ──────────────────────────────────────
   차시(수업) 순서대로 "이 시간에 내가 무엇을 했는지"를 모아 보여줍니다.
   새로 저장하는 데이터는 없고, 이미 있는 수업·제출물·궁금증을 엮기만 합니다.
     차시 = assignments 를 수업 날짜(classDate) 오름차순으로 번호 매김
     내 활동 = submissions/{반}/{수업}/{내 학번}
─────────────────────────────────────────────────────────── */
function vStPortfolio(){
  return _pfBody(ST_USER?.number, { clickable: true });
}

// 포트폴리오 본문 — 학생 본인(clickable)과 선생님의 학생별 열람(비클릭)이 함께 씁니다.
function _pfBody(me, opts = {}){
  const clickable = opts.clickable !== false;

  // 차시 정렬 — 수업 날짜 기준, 없으면 등록순
  const sessions = [...ASSIGNMENTS].sort((a, b) => {
    const da = a.classDate || a.createdAt?.slice(0, 10) || '9999';
    const db = b.classDate || b.createdAt?.slice(0, 10) || '9999';
    return da.localeCompare(db);
  });

  const doneCnt = sessions.filter(a => SUBMISSIONS[a.id]?.[me]).length;
  const withDue = sessions.filter(a => a.dueDate).length;
  const pct = withDue ? Math.round(doneCnt / withDue * 100) : 0;

  const stats = `<div class="pf-stats">
    ${_pfStat(sessions.length, '차시')}
    ${_pfStat(doneCnt, '제출한 활동')}
    ${_pfStat(withDue ? pct + '%' : '–', '제출률')}
  </div>`;

  // 활동지(오리엔테이션 등)는 수업 목록과 별개로 저장되므로 따로 읽어옵니다
  const acts = _pfActivities(me);

  if(!sessions.length){
    return stats + acts + emptyBox('🗂️', '아직 수업이 등록되지 않았어요. 수업이 시작되면 여기에 차시별 기록이 쌓입니다.');
  }

  const items = sessions.map((a, i) => {
    const sub = SUBMISSIONS[a.id]?.[me];
    const u = a.unit ? assignUnit(a.unit) : null;
    const dateDisp = a.classDate ? fmtDay(a.classDate) : '날짜 미정';
    const overdue = !sub && a.dueDate && isPastDue(a.dueDate);

    // 이 차시에 내가 남긴 흔적
    let act;
    if(sub){
      const files = sub.files && sub.files.length ? sub.files : (sub.fileName ? [{name: sub.fileName}] : []);
      const names = files.map(f => esc(f.name)).join(', ');
      act = `<div class="pf-act done">
        <div class="pf-act-line"><b>제출 완료</b> · ${fmtDt(sub.uploadedAt)}${sub.resubCount ? ` · ${sub.resubCount}번 다시 냄` : ''}</div>
        ${names ? `<div class="pf-files">📎 ${names}</div>` : ''}
        ${sub.memo ? `<div class="pf-memo">“${esc(sub.memo)}”</div>` : ''}
      </div>`;
    } else if(overdue){
      act = `<div class="pf-act miss"><div class="pf-act-line">제출하지 않음 · 마감 ${fmtDay(a.dueDate)}</div></div>`;
    } else if(a.dueDate){
      act = `<div class="pf-act todo"><div class="pf-act-line">아직 제출 전 · 마감 ${fmtDay(a.dueDate)}</div></div>`;
    } else {
      act = `<div class="pf-act none"><div class="pf-act-line">제출물이 없는 활동</div></div>`;
    }

    const state = sub ? 'done' : overdue ? 'miss' : 'todo';
    // 선생님 열람 모드에서는 수업 상세로 넘어가지 않게 클릭을 뺍니다(학생 화면 전용 흐름이라)
    const click = clickable ? ` data-action="pick-assign" data-aid="${a.id}"` : ' data-static="1"';
    return `<div class="pf-item ${state}"${click}>
      <div class="pf-rail"><span class="pf-no">${i + 1}</span></div>
      <div class="pf-card">
        <div class="pf-meta">${esc(dateDisp)}${u ? ` · <span class="pf-unit">${u.roman}. ${esc(u.label)}</span>` : ''}</div>
        <div class="pf-title">${esc(a.title)}</div>
        ${act}
      </div>
    </div>`;
  }).join('');

  const qna = '';

  return stats + acts + `<div class="pf-sec">차시별 기록</div><div class="pf-line">${items}</div>` + qna;
}

/* 활동지 기록 — aiactivity/submissions 에 따로 저장돼 있어서 포트폴리오에서 lazy 로드.
   PF_ACTS[학번][활동id] 에 캐시하고, 다 읽으면 한 번 다시 그립니다. */
let PF_ACTS = {};
let _pfActsLoading = null;
function _pfActivities(snum){
  const cid = (IS_TC ? TC_CLS : SEL_CLS)?.id;
  const list = aiaListFor(IS_TC ? TC_CLS : SEL_CLS);
  if(!cid || !snum || !list.length) return '';

  const cache = PF_ACTS[snum];
  if(!cache){
    // 아직 안 읽었으면 한 번만 읽고 다시 렌더
    if(_pfActsLoading !== snum){
      _pfActsLoading = snum;
      Promise.all(list.map(a => loadAiaSubmission(cid, a.id, snum)))
        .then(res => {
          PF_ACTS[snum] = Object.fromEntries(list.map((a, i) => [a.id, res[i]]));
          _pfActsLoading = null;
          if((IS_TC ? TC_TAB : ST_TAB) === 'portfolio') render();
        })
        .catch(() => { _pfActsLoading = null; });
    }
    return `<div class="pf-sec">활동지</div><div class="pf-act-load">불러오는 중…</div>`;
  }

  const rows = list.map(a => {
    const sub = cache[a.id];
    const done = !!sub?.submittedAt;
    const wrote = sub && Object.values(sub.answers || {}).some(v =>
      typeof v === 'string' ? v.trim() : (v && (Array.isArray(v) ? v.length : Object.keys(v).length)));
    const state = done ? 'done' : wrote ? 'todo' : 'miss';
    const note = done ? `제출 완료 · ${fmtDt(sub.submittedAt)}`
               : wrote ? `작성 중 · 마지막 저장 ${fmtDt(sub.updatedAt)}`
               : '아직 작성하지 않음';
    return `<div class="pf-item ${state}" data-static="1">
      <div class="pf-rail"><span class="pf-no">${a.icon || '📋'}</span></div>
      <div class="pf-card">
        <div class="pf-meta">${esc(a.subtitle || '활동')}</div>
        <div class="pf-title">${esc(a.title)}</div>
        <div class="pf-act ${state === 'done' ? 'done' : state === 'todo' ? 'todo' : 'miss'}">
          <div class="pf-act-line">${esc(note)}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<div class="pf-sec">활동지</div><div class="pf-line">${rows}</div>`;
}

function _pfStat(num, label){
  return `<div class="pf-stat"><div class="pf-stat-num">${esc(String(num))}</div><div class="pf-stat-label">${esc(label)}</div></div>`;
}

// 포트폴리오를 평문으로 — 선생님이 세특 근거로 옮겨 적을 때 씁니다.
function _pfPlainText(snum){
  const st = STUDENTS.find(s => s.number === snum);
  const sessions = [...ASSIGNMENTS].sort((a, b) =>
    (a.classDate || a.createdAt?.slice(0,10) || '9999').localeCompare(b.classDate || b.createdAt?.slice(0,10) || '9999'));

  const lines = [`${TC_CLS?.label || ''} ${snum} ${st?.name || ''}`, ''];
  sessions.forEach((a, i) => {
    const sub = SUBMISSIONS[a.id]?.[snum];
    const u = a.unit ? assignUnit(a.unit) : null;
    lines.push(`${i + 1}차시 (${a.classDate || '날짜 미정'})${u ? ` [${u.label}]` : ''} ${a.title}`);
    if(sub){
      const files = sub.files && sub.files.length ? sub.files : (sub.fileName ? [{name: sub.fileName}] : []);
      lines.push(`  - 제출: ${fmtDt(sub.uploadedAt)}${files.length ? ` / ${files.map(f => f.name).join(', ')}` : ''}`);
      if(sub.memo) lines.push(`  - 학생 메모: ${sub.memo}`);
    } else {
      lines.push(`  - 미제출`);
    }
  });

  return lines.join('\n');
}

// ── 공지 탭 ──
function vStNotice(){
  if(!NOTICES.length) return emptyBox('📢','등록된 공지가 없습니다.');
  return NOTICES.map(n => noticeCard(n, false)).join('');
}

// ── 수업 탭 (날짜별 오름차순, 월별 접기/펼치기) ──
//   unitKey 지정 시 그 단원으로 태그된 수업 + 아직 단원 미지정인 수업을 함께 표시
//   (선생님이 태그하기 전엔 모든 단원에 보여 기존 수업이 사라지지 않게 함)
function vStAssign(unitKey){
  const u = unitKey ? assignUnit(unitKey) : null;
  const head = u ? `<div class="sec-title" style="margin-bottom:10px">${u.roman}. ${esc(u.label)}</div>` : '';
  const src = u ? ASSIGNMENTS.filter(a => a.unit === unitKey || !a.unit) : ASSIGNMENTS;
  if(!src.length) return head + emptyBox('📖', u ? '이 단원에 등록된 수업이 없습니다.' : '등록된 수업이 없습니다.');

  // 수업 날짜(classDate) 기준 오름차순 정렬, 없으면 createdAt 사용
  const sorted = [...src].sort((a, b) => {
    const da = a.classDate || a.createdAt?.slice(0, 10) || '';
    const db = b.classDate || b.createdAt?.slice(0, 10) || '';
    return da.localeCompare(db);
  });

  // 월별 그룹핑
  const months = {};
  sorted.forEach(a => {
    const dateStr = a.classDate || a.createdAt?.slice(0, 10) || '';
    const ym = dateStr.slice(0, 7) || '미정';
    if(!months[ym]) months[ym] = [];
    months[ym].push(a);
  });

  // 현재 월 계산
  const curYM = new Date().toISOString().slice(0, 7);

  return head + Object.entries(months).map(([ym, items]) => {
    const label = ym === '미정' ? '날짜 미정' : ym.replace('-', '년 ') + '월';
    const isOpen = ym === curYM || ym === '미정';
    return `<div class="month-group${isOpen ? '' : ' collapsed'}">
      <div class="month-header" onclick="this.parentElement.classList.toggle('collapsed')">
        <span class="month-arrow">▼</span>
        <span class="month-label">${label}</span>
        <span class="month-count">${items.length}개</span>
      </div>
      <div class="month-body pl-grid">
        ${items.map(a => {
          const done = SUBMISSIONS[a.id] && SUBMISSIONS[a.id][ST_USER.number];
          const dateDisp = a.classDate ? fmtDay(a.classDate) : '';
          const unmarked = u && !a.unit ? ` <span class="chip chip-gray" style="font-size:10px">단원 미지정</span>` : '';
          return `<div class="list-row click" data-action="pick-assign" data-aid="${a.id}">
            <div class="row-icon">📖</div>
            <div class="row-info">
              <div class="row-title">${esc(a.title)}${unmarked}</div>
              <div class="row-meta">${dateDisp ? `📅 ${dateDisp}` : ''}${a.dueDate ? ` · 마감: ${fmtDay(a.dueDate)}` : ''}</div>
              ${a.dueDate ? `<div class="sbar"><div class="sbar-fill" style="width:${done ? 100 : 0}%"></div></div>` : ''}
            </div>
            <div class="row-right">
              ${a.dueDate ? dday(a.dueDate) : ''}
              ${done ? `<span class="chip chip-green">✓ 제출완료</span>`
                    : a.dueDate && isPastDue(a.dueDate) ? `<span class="chip chip-red">미제출</span>`
                    : a.dueDate ? `<span class="chip chip-gray">미제출</span>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

// ── 궁금증 게시판 탭 (학생: 내 궁금증만 — 친구에겐 안 보임) ──
function vStBoard(){
  const btn = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
    <button class="btn-p btn-sm" data-action="new-post">+ 궁금증 남기기</button></div>`;
  const intro = `<div class="box-info" style="margin-bottom:10px">💡 여기 남긴 궁금증은 <b>선생님만</b> 봐요. 다른 친구들에게는 보이지 않아요. 아래는 <b>내가 남긴 궁금증</b>이에요.</div>`;
  const mine = POSTS.filter(p => p.authorId === ST_USER?.number);
  if(!mine.length) return btn + intro + emptyBox('❓','아직 남긴 궁금증이 없어요.');
  return btn + intro + `<div class="pl-grid">` + mine.map(p => {
    const hasFile = p.fileName && p.fileName.length;
    const answered = p.answer && p.answer.length;
    return `<div class="list-row click" data-action="pick-post" data-pid="${p.id}">
      <div class="row-icon">${answered ? '💬' : '❓'}</div>
      <div class="row-info">
        <div class="row-title">${esc(p.title)}${hasFile ? ' 📎' : ''}</div>
        <div class="row-meta">${fmtDt(p.uploadedAt)}</div>
      </div>
      <div class="row-right">
        ${answered ? `<span class="chip chip-green">✓ 답변완료</span>` : `<span class="chip chip-gray">답변대기</span>`}
      </div>
    </div>`;
  }).join('') + `</div>`;
}

// ── 출결 탭 ──
function vStAttend(){
  const myRecs = Object.entries(AT_MONTH_DATA)
    .sort(([a],[b]) => b.localeCompare(a))
    .map(([date, recs]) => ({date, rec: recs[ST_USER?.number] || null}));

  let cntOk = 0, cntLate = 0, cntAbs = 0;
  myRecs.forEach(({rec}) => {
    if(!rec) return;
    if(rec.status === '출석') cntOk++;
    else if(rec.status === '지각') cntLate++;
    else if(rec.status === '결석') cntAbs++;
  });

  const histRows = myRecs.filter(({rec}) => rec).map(({date, rec}) => {
    const chip = rec.status === '출석'
      ? `<span class="at-chip-ok">출석</span>`
      : rec.status === '지각'
      ? `<span class="at-chip-late">지각${rec.reason ? ' (' + esc(rec.reason) + ')' : ''}</span>`
      : `<span class="at-chip-abs">결석${rec.reason ? ' (' + esc(rec.reason) + ')' : ''}</span>`;
    return `<div class="at-hist-row">
      <div class="at-hist-date">${date.slice(5).replace('-','/')}</div>
      <div style="flex:1">${chip}</div>
    </div>`;
  }).join('');

  return `
    <div class="at-summary">
      <div class="at-stat ok"><div class="at-stat-num">${cntOk}</div><div class="at-stat-label">출석</div></div>
      <div class="at-stat warn"><div class="at-stat-num">${cntLate}</div><div class="at-stat-label">지각</div></div>
      <div class="at-stat bad"><div class="at-stat-num">${cntAbs}</div><div class="at-stat-label">결석</div></div>
    </div>
    <div class="section">
      <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px">이번 달 출결 기록</div>
      ${histRows || emptyBox('🗓️','이번 달 출결 기록이 없습니다.')}
    </div>`;
}

// ── 내 현황 탭 ──
function vStMine(){
  const myAssigns = ASSIGNMENTS.map(a => {
    const done = SUBMISSIONS[a.id] && SUBMISSIONS[a.id][ST_USER.number];
    return `<div class="list-row${done ? ' click' : ''}${done ? '" data-action="view-my-sub" data-aid="' + a.id + '"' : ''}">
      <div class="row-icon">📖</div>
      <div class="row-info">
        <div class="row-title">${esc(a.title)}</div>
        <div class="row-meta">${a.dueDate ? `마감: ${fmtDay(a.dueDate)}` : '마감 없음'}</div>
      </div>
      <div class="row-right">
        ${done ? `<span class="chip chip-green">✓ 제출완료</span><span style="font-size:11px;color:var(--text3)">${fmtDt(done.uploadedAt)}</span>`
              : `<span class="chip chip-gray">미제출</span>`}
      </div>
    </div>`;
  }).join('');

  const myPosts = POSTS.filter(p => p.authorId === ST_USER?.number);
  const myPostsHtml = myPosts.length
    ? myPosts.map(p => `<div class="list-row click" data-action="pick-post" data-pid="${p.id}">
        <div class="row-icon">${fIcon(p.fileName)}</div>
        <div class="row-info"><div class="row-title">${esc(p.title)}</div><div class="row-meta">${fmtDt(p.uploadedAt)} · ${fmtSz(p.fileSize)}</div></div>
        <div class="row-right"><span class="chip chip-purple">내 글</span></div>
      </div>`).join('')
    : emptyBox('📋','내가 올린 게시물이 없습니다.');

  const submitted = ASSIGNMENTS.filter(a => SUBMISSIONS[a.id] && SUBMISSIONS[a.id][ST_USER?.number]).length;
  const total = ASSIGNMENTS.length;

  return `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">전체 수업</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--ok)">${submitted}</div><div class="stat-label">제출 완료</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--danger)">${total - submitted}</div><div class="stat-label">미제출</div></div>
      <div class="stat-card"><div class="stat-num">${myPosts.length}</div><div class="stat-label">내 게시물</div></div>
    </div>
    <div class="section">
      <div class="sec-title">📖 수업 현황</div>
      ${myAssigns || emptyBox('📖','수업이 없습니다.')}
    </div>
    <div class="section">
      <div class="sec-title">📋 내 게시물</div>
      ${myPostsHtml}
    </div>`;
}
