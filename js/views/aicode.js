/* ═══════════════════════════════════════
   views/aicode.js — 🤖 AI 코딩 (자유 실습 메뉴)

   학생이 진로/관심사 관련 Python 프로그램을 AI(Gemini)와 대화하며
   만들어보는 자유 실습 메뉴. 수행평가와 분리된 독립 기능.

   - 선생님이 on/off 토글로 노출 제어 (aicode/active/{cid})
   - 학생별 세션 저장 → 로그아웃·새로고침 후 이어하기 (aicode/sessions/{cid}/{학번})
   - 백엔드: Cloudflare Worker (AIC_WORKER_URL) → Gemini 2.5 Flash
   - 평가가 아니므로 제출·채점 없음. 코드 직접 실행(▶)만 지원.
═══════════════════════════════════════ */

// ══════════════════════════════════════
//  학생 뷰
// ══════════════════════════════════════

// 탭 진입 시 세션 상태로 첫 화면 결정
function _aicInitialStudentView(sess){
  if(sess && Array.isArray(sess.messages) && sess.messages.length) return 'chat';
  return 'entry';
}

function vStAiCode(){
  const active = SEL_CLS ? AIC_ACTIVE[SEL_CLS.id] : false;
  if(!active) return emptyBox('🔒', 'AI 코딩 메뉴가 아직 열려있지 않아요. 선생님 안내를 기다려주세요.');

  if(AIC_VIEW === 'chat')     return vStAicChat();
  if(AIC_VIEW === 'brief')    return vStAicBrief();
  if(AIC_VIEW === 'reflect')  return vStAicReflect();
  return vStAicEntry();
}

// ── 학생: 설계 브리프 (AI에게 시키기 전, 내가 먼저 설계) ──
//   AIC_BRIEF_EDITING=true 면 채팅 도중 수정 모드 — 대화·코드는 유지됨
function vStAicBrief(){
  const b = AIC_BRIEF || {};
  const editing = AIC_BRIEF_EDITING;
  const btns = editing
    ? `<button class="btn-sm" data-action="aic-brief-cancel">← 취소</button>
       <button class="btn-p btn-sm" data-action="aic-brief-submit">설계 저장 · 채팅으로 →</button>`
    : `<button class="btn-sm" data-action="aic-brief-skip">설계 없이 바로 채팅</button>
       <button class="btn-p btn-sm" data-action="aic-brief-submit">설계 완료 · AI와 시작 →</button>`;
  return `
    <div class="asmt-entry-wrap">
      <div class="asmt-hero">
        <div class="asmt-hero-title">📝 ${editing ? '내 설계 다듬기' : '먼저, 내 프로그램을 설계해요'}</div>
        <div class="asmt-hero-sub">${editing
          ? '설계를 고쳐도 <b>대화와 코드는 그대로</b> 남아요.'
          : 'AI에게 시키기 전에 <b>내가 무엇을 만들지</b> 먼저 정해봐요.<br>또렷이 적을수록 AI가 더 잘 도와줘요.'}</div>
      </div>
      <div class="section aic-brief">
        <div class="field"><label>① 만들고 싶은 프로그램 (한 줄)</label>
          <input id="aicb-problem" type="text" maxlength="120" autocomplete="off" placeholder="예: 증상을 입력하면 예방 수칙을 알려주는 프로그램" value="${esc(b.problem || '')}"/></div>
        <div class="field"><label>② 왜 만들고 싶나요? <span class="aic-opt">(내가 겪은 불편함, 궁금했던 것)</span></label>
          <textarea id="aicb-why" rows="2" maxlength="200" placeholder="예: 감기에 걸렸을 때 어떻게 해야 할지 매번 검색하는 게 불편해서">${esc(b.why || '')}</textarea></div>
        <div class="field"><label>③ 내 진로·관심과 어떻게 연결되나요? <span class="aic-opt">(선택)</span></label>
          <input id="aicb-connect" type="text" maxlength="120" autocomplete="off" placeholder="예: 의학에 관심이 있어서" value="${esc(b.connect || '')}"/></div>
        <div class="field"><label>④ 무엇을 입력받고, 무엇을 출력하나요?</label>
          <input id="aicb-io" type="text" maxlength="160" autocomplete="off" placeholder="예: 증상(입력) → 예방 수칙(출력)" value="${esc(b.io || '')}"/></div>
        <div class="field"><label>⑤ 어떤 판단이나 반복이 필요할까요? <span class="aic-opt">(선택)</span></label>
          <input id="aicb-ctrl" type="text" maxlength="160" autocomplete="off" placeholder="예: 증상에 따라 다른 안내(조건), 종료까지 계속 묻기(반복)" value="${esc(b.ctrl || '')}"/></div>
        <div id="aicb-err" class="err"></div>
        <div class="aic-brief-btns">${btns}</div>
      </div>
      <div class="asmt-entry-note">💡 ①만 적어도 시작할 수 있어요. 나머지는 AI와 이야기하며 채워도 돼요.</div>
    </div>
  `;
}

// ── 학생: 완성 기록 (성찰) — 프로그램을 완성하며 과정을 내 언어로 남김 ──
function vStAicReflect(){
  const r = AIC_REFLECT || {};
  return `
    <div class="asmt-entry-wrap">
      <div class="asmt-hero">
        <div class="asmt-hero-title">🏁 내 프로그램 완성 기록</div>
        <div class="asmt-hero-sub">만든 과정을 <b>내 언어로</b> 남겨요.<br>이 기록은 선생님이 확인해요.</div>
      </div>
      <div class="section aic-brief">
        <div class="field"><label>① 프로그램 이름</label>
          <input id="aicr-name" type="text" maxlength="60" autocomplete="off" placeholder="예: 증상별 건강 도우미" value="${esc(r.name || '')}"/></div>
        <div class="field"><label>② 한 줄 소개 <span class="aic-opt">(선택)</span></label>
          <input id="aicr-intro" type="text" maxlength="120" autocomplete="off" placeholder="예: 증상을 입력하면 단계별 대처법을 알려주는 프로그램" value="${esc(r.intro || '')}"/></div>
        <div class="field"><label>③ 만들면서 가장 고민했던 부분은? 어떻게 해결했나요?</label>
          <textarea id="aicr-hard" rows="3" maxlength="500" placeholder="예: 숫자가 아닌 값을 입력하면 오류가 나서, 조건문으로 걸러내는 방법을 물어보고 고쳤다">${esc(r.hard || '')}</textarea></div>
        <div class="field"><label>④ 만들면서 새로 알게 된 것은? (개념·원리)</label>
          <textarea id="aicr-learned" rows="3" maxlength="500" placeholder="예: while문으로 프로그램을 계속 돌리다가 조건이 맞으면 break로 빠져나올 수 있다는 것">${esc(r.learned || '')}</textarea></div>
        <div class="field"><label>⑤ 더 발전시키고 싶은 점 <span class="aic-opt">(선택)</span></label>
          <textarea id="aicr-next" rows="2" maxlength="300" placeholder="예: 증상 여러 개를 한 번에 입력받아 종합 안내를 해주고 싶다">${esc(r.next || '')}</textarea></div>
        <div id="aicr-err" class="err"></div>
        <div class="aic-brief-btns">
          <button class="btn-sm" data-action="aic-reflect-back">← 채팅으로</button>
          <button class="btn-p btn-sm" data-action="aic-reflect-submit">🏁 완성 기록 저장</button>
        </div>
      </div>
      <div class="asmt-entry-note">💡 저장 후에도 채팅을 이어가거나 기록을 다시 고칠 수 있어요.</div>
    </div>
  `;
}

function vStAicEntry(){
  const hasSession = AIC_MESSAGES.length > 0 || AIC_CODE;
  const resumeBanner = hasSession ? `
    <div class="asmt-resume-banner">
      <span>📌 이전에 만들던 프로그램이 있어요</span>
      <button class="btn-p btn-sm" data-action="aic-resume">이어서 하기</button>
    </div>` : '';

  return `
    <div class="asmt-entry-wrap">
      ${resumeBanner}
      <div class="asmt-hero">
        <div class="asmt-hero-title">🤖 AI와 함께 만드는 나만의 프로그램</div>
        <div class="asmt-hero-sub">
          진로나 관심사와 관련된 작은 Python 프로그램을<br>
          AI와 대화하며 직접 만들어봅니다.
        </div>
      </div>

      <div class="asmt-cards" style="justify-content:center">
        <button class="asmt-card asmt-card-a" data-action="aic-begin">
          <div class="asmt-card-icon">✏️</div>
          <div class="asmt-card-title">제가 만들어볼래요</div>
          <div class="asmt-card-desc">만들고 싶은 프로그램을<br>AI에게 직접 설명할게요.</div>
        </button>
      </div>

      <div class="asmt-entry-note">
        💡 무엇을 만들지 떠오르지 않으면, 채팅창에 관심 분야(예: 의학, 게임, 운동)를 적고 AI에게 물어봐도 좋아요.
      </div>
    </div>
  `;
}

// ── 학생: 채팅 화면 (좌 채팅 / 우 코드 패널 + 실행) ──
function vStAicChat(){
  const turnLeft = Math.max(0, AIC_TURN_LIMIT - AIC_TURN_COUNT);
  const isLimit = turnLeft <= 0;

  const messages = AIC_MESSAGES.map(m => {
    if(m.role === 'user'){
      return `<div class="asmt-msg asmt-msg-user">
        <div class="asmt-msg-bubble">${esc(m.content)}</div>
      </div>`;
    }
    const rendered = _renderAicAssistant(m.content);
    return `<div class="asmt-msg asmt-msg-ai">
      <div class="asmt-msg-avatar">🤖</div>
      <div class="asmt-msg-bubble">${rendered}</div>
    </div>`;
  }).join('');

  const loadingBubble = AIC_LOADING ? `
    <div class="asmt-msg asmt-msg-ai">
      <div class="asmt-msg-avatar">🤖</div>
      <div class="asmt-msg-bubble asmt-msg-loading">
        <span></span><span></span><span></span>
      </div>
    </div>` : '';

  // 실행 결과 블록 (실시간 입력칸은 #aic-run-area 에 직접 append)
  let runBlock = '';
  if(AIC_RUNNING){
    runBlock = `<div class="asmt-mod-run-loading">⏳ 실행 중... (input()이 있으면 아래에 입력칸이 떠요. 첫 실행은 10~15초)</div>`;
  } else if(AIC_RUN_RESULT){
    const r = AIC_RUN_RESULT;
    runBlock = `<div class="asmt-mod-run-result ${r.success ? 'ok' : 'err'}">
      <div class="asmt-mod-run-head">${r.success ? '✅ 실행 결과' : '⚠️ 실행 오류'}</div>
      ${r.output ? `<pre class="asmt-mod-run-out">${esc(r.output)}</pre>` : ''}
      ${r.error ? `<pre class="asmt-mod-run-err">${esc(r.error)}</pre>` : ''}
    </div>`;
  }

  const codePanel = AIC_CODE
    ? `<div class="asmt-code-head">
         <span>💻 AI가 만든 코드 (${AIC_CODE.split('\n').length}줄)</span>
         <button class="btn-sm" data-action="aic-copy-code">📋 복사</button>
       </div>
       <pre class="asmt-code-body"><code>${esc(AIC_CODE)}</code></pre>
       <div class="aic-run-box">
         <div class="aic-run-toolbar">
           <button class="btn-p btn-sm" data-action="aic-run" ${AIC_RUNNING ? 'disabled' : ''}>${AIC_RUNNING ? '⏳ 실행 중' : '▶ 실행'}</button>
           <span class="aic-run-hint">input()이 있으면 실행 중에 입력칸이 떠요</span>
         </div>
         <div id="aic-run-area">${runBlock}</div>
       </div>`
    : `<div class="asmt-code-empty">
         <div class="asmt-code-empty-icon">💻</div>
         <div class="asmt-code-empty-msg">AI에게 만들고 싶은 프로그램을 설명해주세요.<br>코드가 만들어지면 여기에 표시돼요.</div>
       </div>`;

  // 내 설계 칩 — 클릭하면 설계를 보고 고칠 수 있음 (없으면 적기 유도)
  const briefChip = AIC_BRIEF?.problem
    ? `<button class="aic-brief-chip" data-action="aic-brief-edit" title="클릭해서 설계를 보거나 고칠 수 있어요">📝 내 설계: ${esc(AIC_BRIEF.problem)} <span class="aic-chip-edit">수정</span></button>`
    : `<button class="aic-brief-chip aic-brief-chip-empty" data-action="aic-brief-edit" title="만들 프로그램을 설계로 남겨두면 좋아요">📝 내 설계 적기 — 무엇을, 왜 만드는지 남겨봐요</button>`;

  // 확장 도전 카드 — 코드가 생긴 뒤, 한 걸음 더 (학생이 직접 다듬어 전송)
  const challenge = (AIC_CODE && !isLimit) ? `
    <div class="aic-chal">
      <div class="aic-chal-head">🚀 한 걸음 더 — 골라서 이어가 보세요</div>
      <div class="aic-chal-cards">
        <button class="aic-chal-card" data-action="aic-challenge" data-prompt="잘못된 값을 입력하면 다시 입력하도록 막고 싶어. 어떤 경우를 걸러야 할지 내가 먼저 생각해볼게 — 힌트만 줘.">🧪 잘못된 입력 막기</button>
        <button class="aic-chal-card" data-action="aic-challenge" data-prompt="조건을 하나 더 넣고 싶어.    인 경우에    하도록 하고 싶은데, 어떻게 짜면 좋을지 같이 생각해보자.">🔧 조건 하나 더</button>
        <button class="aic-chal-card" data-action="aic-challenge" data-prompt="이 문제를 살짝 바꿔서    도 풀 수 있을까? 먼저 어떻게 접근하면 좋을지 나한테 물어봐줘.">🌱 문제 바꿔보기</button>
      </div>
    </div>` : '';

  const inputDisabled = AIC_LOADING || isLimit;
  const placeholder = isLimit
    ? `대화 한도(${AIC_TURN_LIMIT}회)를 모두 사용했어요. "새로 시작"으로 다시 만들 수 있어요.`
    : AIC_LOADING
      ? 'AI가 답변 중이에요...'
      : (AIC_MESSAGES.length === 0
          ? '어떤 프로그램을 만들어볼까요? (예: 학생 점수 평균을 구하는 프로그램)'
          : '메시지를 입력하세요... (Enter로 전송, Shift+Enter 줄바꿈)');

  return `
    <div class="asmt-chat-wrap">
      <div class="asmt-chat-bar">
        <button class="btn-sm" data-action="aic-back-entry">← 처음으로</button>
        <div class="asmt-chat-bar-stats">
          <span class="asmt-turn-chip${turnLeft <= 5 ? ' warn' : ''}">대화 ${AIC_TURN_COUNT}/${AIC_TURN_LIMIT}</span>
          ${AIC_CODE ? (AIC_DONE
            ? `<button class="btn-sm aic-done-chip" data-action="aic-reflect-open" title="완성 기록을 보거나 고칠 수 있어요">🏁 완성됨 · 기록 보기</button>`
            : `<button class="btn-p btn-sm" data-action="aic-reflect-open" title="프로그램이 완성됐다면 마무리 기록을 남겨요">🏁 완성하기</button>`) : ''}
          <button class="btn-sm" data-action="aic-restart" title="대화와 코드를 모두 지우고 새 프로그램을 만들어요">🔄 새로 시작</button>
        </div>
      </div>

      ${briefChip}
      <div class="asmt-chat-split">
        <div class="asmt-chat-left">
          <div class="asmt-msg-list" id="aic-msg-list">
            ${messages || '<div class="asmt-msg-empty">AI에게 첫 메시지를 보내보세요 👇</div>'}
            ${loadingBubble}
          </div>
          <div class="asmt-input-row">
            <textarea
              id="aic-input"
              class="asmt-input"
              rows="2"
              placeholder="${esc(placeholder)}"
              ${inputDisabled ? 'disabled' : ''}
            ></textarea>
            <button class="btn-p asmt-send-btn" data-action="aic-send" ${inputDisabled ? 'disabled' : ''}>전송</button>
          </div>
        </div>

        <div class="asmt-chat-right">${codePanel}${challenge}</div>
      </div>
    </div>
  `;
}

// AI 응답 텍스트에서 코드 펜스 제거 + 마크다운 렌더
function _renderAicAssistant(text){
  if(!text) return '';
  const stripped = text.replace(/```[\w-]*\n[\s\S]*?```/g, '*(코드는 오른쪽 패널을 확인해주세요 →)*');
  if(typeof marked !== 'undefined'){
    return marked.parse(stripped);
  }
  return esc(stripped).replace(/\n/g, '<br>');
}

// AI 응답에서 첫 번째 python 코드 블록 추출 (자유 실습이라 주석은 보존)
function _extractAicCode(text){
  if(!text) return null;
  const m = text.match(/```(?:python|py)?\n([\s\S]*?)```/);
  if(!m) return null;
  return m[1].replace(/\n$/, '');
}

// ══════════════════════════════════════
//  선생님 뷰
// ══════════════════════════════════════

function vTcAiCode(){
  if(!TC_CLS) return emptyBox('👆','관리할 반을 먼저 선택하세요.');
  if(AIC_VIEW === 'student' && AIC_TC_SEL_SNUM) return vTcAicStudent();
  return vTcAicManage();
}

function vTcAicManage(){
  const cid = TC_CLS.id;
  const active = !!AIC_ACTIVE[cid];
  const sessions = AIC_ALL_SESSIONS || {};

  const usedCount = STUDENTS.filter(st => {
    const s = sessions[st.number];
    return s && ((s.messages?.length || 0) > 0 || s.code);
  }).length;

  const toggle = `
    <div class="asmt-phase-seg">
      <button class="asmt-phase-btn ${!active ? 'on' : ''}" data-action="aic-set-active" data-on="0">🔒 닫기</button>
      <button class="asmt-phase-btn ${active ? 'on prep' : ''}" data-action="aic-set-active" data-on="1">🤖 열기</button>
    </div>`;

  const stuRows = STUDENTS.map(st => {
    const s = sessions[st.number] || null;
    const turns = s?.turnCount || 0;
    const hasCode = !!(s && s.code);
    const updatedAt = s?.updatedAt ? fmtDt(s.updatedAt) : '-';
    const canView = !!(s && ((s.messages?.length || 0) > 0 || s.code));
    const runs = _aicRunsArr(s);
    const errCnt = runs.filter(r => r && !r.ok).length;
    const runCell = runs.length ? `${runs.length}회${errCnt ? ` <span class="aic-td-err">⚠️${errCnt}</span>` : ''}` : '-';
    return `<tr>
      <td>${esc(st.number)}</td>
      <td>${esc(st.name)}</td>
      <td>${turns}/${AIC_TURN_LIMIT}</td>
      <td>${hasCode ? '✅' : '-'}</td>
      <td>${s?.brief?.problem ? '✓' : '-'}</td>
      <td>${runCell}</td>
      <td>${s?.challengeUsed ? '🚀' : '-'}</td>
      <td>${s?.reflect ? '🏁' : '-'}</td>
      <td>${s?.tcNote ? '✏️' : '-'}</td>
      <td>${updatedAt}</td>
      <td><button class="btn-xs" data-action="aic-tc-view" data-snum="${esc(st.number)}" ${canView ? '' : 'disabled'}>보기</button></td>
    </tr>`;
  }).join('');

  return `
    <div class="asmt-phase-row">
      <div class="asmt-phase-info">
        <div class="asmt-phase-title">🤖 AI 코딩 메뉴</div>
        <div class="asmt-phase-cur">${active
          ? '<b style="color:var(--accent)">● 열림</b> — 학생 화면에 "🤖 AI 코딩" 탭이 보이고 자유롭게 AI와 코드를 만들 수 있어요.'
          : '<b style="color:var(--text3)">● 닫힘</b> — 학생 화면에 메뉴가 보이지 않습니다. (저장된 작업은 보존)'}</div>
      </div>
      ${toggle}
    </div>

    <div class="asmt-stat-grid">
      <div class="stat-card"><div class="stat-num">${STUDENTS.length}</div><div class="stat-label">전체 학생</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--accent)">${usedCount}</div><div class="stat-label">사용한 학생</div></div>
    </div>

    <div class="sec-title aic-tc-list-head" style="margin-top:14px">
      <span>학생별 사용 현황</span>
      <button class="btn-sm" data-action="aic-export-md" title="설계·시행착오·성찰·메모·학생 메시지를 md 파일로 내려받아요">📄 세특 재료 내보내기</button>
    </div>
    ${STUDENTS.length === 0
      ? emptyBox('👥', '먼저 학생을 등록하세요.')
      : `<div style="overflow-x:auto"><table class="tbl asmt-tc-table">
          <thead><tr><th>학번</th><th>이름</th><th>대화</th><th>코드</th><th>설계</th><th>실행</th><th>도전</th><th>성찰</th><th>메모</th><th>마지막 활동</th><th></th></tr></thead>
          <tbody>${stuRows}</tbody>
        </table></div>`
    }

    <div class="asmt-tc-help">
      <b>📖 안내</b>
      <ul>
        <li>"🤖 열기"를 누르면 학생 화면에 <b>AI 코딩 탭</b>이 나타나고, AI와 대화하며 자유롭게 프로그램을 만들 수 있어요.</li>
        <li>학생 작업은 자동 저장되어 다음 시간에 <b>이어서</b> 할 수 있습니다.</li>
        <li>"보기"에서 <b>세특 재료 요약</b>(동기·설계·시행착오·성찰)과 대화·코드를 확인하고, <b>키워드 메모</b>를 남길 수 있어요.</li>
        <li>"📄 세특 재료 내보내기"는 기록이 있는 학생 전체를 md 파일 하나로 만들어줘요 — 세특 초안 쓸 때 원문으로 쓰세요.</li>
        <li>학생당 AI 메시지는 최대 <b>${AIC_TURN_LIMIT}회</b>입니다.</li>
      </ul>
    </div>
  `;
}

// RTDB 는 배열을 객체로 돌려줄 수 있어 양쪽 다 수용
function _aicRunsArr(s){
  if(!s || !s.runsLog) return [];
  return Array.isArray(s.runsLog) ? s.runsLog : Object.values(s.runsLog);
}

// ── 선생님: 학생 상세 (대화 + 코드, 읽기 전용) ──
function vTcAicStudent(){
  const snum = AIC_TC_SEL_SNUM;
  const st = STUDENTS.find(s => s.number === snum);
  const sess = AIC_ALL_SESSIONS[snum] || {};
  if(!st) return emptyBox('❓', `학번 ${snum} 학생을 찾을 수 없어요.`);

  const messages = Array.isArray(sess.messages) ? sess.messages : [];
  const code = sess.code || '';

  const header = `
    <div class="asmt-tcs-header">
      <button class="btn-sm" data-action="aic-tc-back">← 학생 목록</button>
      <div class="asmt-tcs-stu-info">
        <span class="asmt-tcs-snum">${esc(st.number)}</span>
        <span class="asmt-tcs-name">${esc(st.name)}</span>
        <span class="chip">대화 ${sess.turnCount || 0}회</span>
      </div>
      <div></div>
    </div>
  `;

  // ── 세특 재료 요약 패널 (동기·설계·시행착오·도전·성찰 + 교사 키워드 메모) ──
  const b = sess.brief || {};
  const runs = _aicRunsArr(sess);
  const errRuns = runs.filter(r => r && !r.ok);
  const lastRun = runs[runs.length - 1];
  const rf = sess.reflect || null;

  const none = `<span class="aic-sebu-none">기록 없음</span>`;
  const briefLines = b.problem ? [
    `<b>${esc(b.problem)}</b>`,
    b.io ? `입력→출력: ${esc(b.io)}` : '',
    b.ctrl ? `판단·반복: ${esc(b.ctrl)}` : '',
    b.connect ? `진로·관심: ${esc(b.connect)}` : ''
  ].filter(Boolean).join('<br>') : none;

  const runsHtml = runs.length
    ? `▶ ${runs.length}회 실행 · ⚠️ 오류 ${errRuns.length}회${(errRuns.length && lastRun?.ok) ? ' → ✅ 최종 성공 (오류 극복)' : ''}`
      + (errRuns.length ? `<div class="aic-sebu-errlist">${errRuns.slice(-8).map(e =>
          `<div class="aic-sebu-err">· ${e.ts ? fmtDt(e.ts) : ''} — ${esc(e.err || '(오류)')}</div>`).join('')}</div>` : '')
    : none;

  const reflectHtml = rf ? [
    `<b>${esc(rf.name || '')}</b>${rf.intro ? ` — ${esc(rf.intro)}` : ''}`,
    rf.hard ? `고민·해결: ${esc(rf.hard)}` : '',
    rf.learned ? `알게 된 것: ${esc(rf.learned)}` : '',
    rf.next ? `발전시키고 싶은 점: ${esc(rf.next)}` : ''
  ].filter(Boolean).join('<br>') : none;

  const sebuSec = `
    <section class="asmt-tcs-sec aic-sebu">
      <div class="asmt-tcs-sec-head">🗂️ 세특 재료 요약</div>
      <div class="aic-sebu-grid">
        <div class="aic-sebu-row"><div class="aic-sebu-k">💡 동기(왜)</div><div class="aic-sebu-v">${b.why ? esc(b.why) : none}</div></div>
        <div class="aic-sebu-row"><div class="aic-sebu-k">📝 설계</div><div class="aic-sebu-v">${briefLines}</div></div>
        <div class="aic-sebu-row"><div class="aic-sebu-k">🔁 시행착오</div><div class="aic-sebu-v">${runsHtml}</div></div>
        <div class="aic-sebu-row"><div class="aic-sebu-k">🚀 확장 도전</div><div class="aic-sebu-v">${sess.challengeUsed ? '도전 카드 사용함' : none}</div></div>
        <div class="aic-sebu-row"><div class="aic-sebu-k">🏁 성찰</div><div class="aic-sebu-v">${reflectHtml}</div></div>
      </div>
      <div class="aic-sebu-note">
        <label>✏️ 키워드 메모 <span class="aic-opt">(선생님만 보임 — 세특 쓸 때 참고)</span></label>
        <textarea id="aic-tc-note" rows="2" maxlength="1000" placeholder="예: 입력검증 집착, 오류 원인 스스로 찾음, GOOD">${esc(sess.tcNote || '')}</textarea>
        <div class="aic-sebu-note-btns"><button class="btn-p btn-sm" data-action="aic-tc-note-save">메모 저장</button></div>
      </div>
    </section>`;

  const codeSec = code ? `
    <section class="asmt-tcs-sec">
      <div class="asmt-tcs-sec-head">💻 AI와 만든 코드</div>
      <pre class="asmt-tcs-code-pre">${esc(code)}</pre>
    </section>` : '';

  const dialogSec = messages.length ? `
    <section class="asmt-tcs-sec">
      <div class="asmt-tcs-sec-head">💬 AI 대화 (${messages.length}개 메시지)</div>
      <div class="asmt-tcs-msgs">
        ${messages.map(m => {
          const cls = m.role === 'user' ? 'user' : 'ai';
          const label = m.role === 'user' ? `👤 ${esc(st.name)}` : '🤖 AI';
          const body = m.role === 'user'
            ? esc(m.content).replace(/\n/g, '<br>')
            : (typeof marked !== 'undefined' ? marked.parse(m.content) : esc(m.content).replace(/\n/g, '<br>'));
          return `<div class="asmt-tcs-msg ${cls}">
            <div class="asmt-tcs-msg-label">${label}</div>
            <div class="asmt-tcs-msg-body">${body}</div>
          </div>`;
        }).join('')}
      </div>
    </section>` : emptyBox('💬','아직 AI와 대화를 시작하지 않았어요.');

  return `<div class="asmt-tcs-wrap">
    ${header}
    ${sebuSec}
    ${codeSec}
    ${dialogSec}
  </div>`;
}
