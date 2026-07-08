/* ═══════════════════════════════════════
   events/aicode.js — 🤖 AI 코딩 이벤트 핸들러

   학생: 진입 카드 → AI 채팅(코드 생성) → 자동 저장 → 코드 직접 실행
   선생님: on/off 토글 + 학생별 대화·코드 열람

   백엔드: Cloudflare Worker (AIC_WORKER_URL) → Gemini 2.5 Flash
   코드 실행: js/oj-worker.js (Pyodide, 실시간 input 지원)
═══════════════════════════════════════ */

// ── AI 코칭 지침 (학생에게 안 보임, 첫 사용자 메시지에만 주입) ──
//   서버 워커 시스템 프롬프트는 못 바꾸므로 클라이언트에서 첫 턴에 끼워 넣어 역할을 '동료'로 유도.
const AIC_COACH = [
  '[지도 지침 — 학생에게는 보이지 않음]',
  '너는 학생이 진로·관심사 프로그램을 "스스로 설계"하도록 돕는 코딩 동료다. 답을 대신 내주는 도구가 아니다.',
  '1) 요청이 막연하거나 처음이면 코드를 한 번에 다 주지 말고, 먼저 1~2개의 짧은 설계 질문을 한다(무엇을 입력받고 무엇을 출력할지, 어떤 경우에 다르게 동작해야 할지).',
  '2) 코드는 단계적으로 만들고, 조건문·반복문 같은 핵심 선택은 "왜 그렇게 했는지" 한 줄로 설명한다.',
  '3) 학생이 스스로 정하도록 유도하고, 동작하면 한 걸음 더 갈 거리(조건 추가, 잘못된 입력 처리, 문제 살짝 바꾸기)를 짧게 제안한다.',
  '4) "빨리/답만/아무거나" 같은 회피에는 짧은 질문 하나로 다시 생각을 끌어낸 뒤 돕는다.',
  '5) 코드가 완성되어 잘 동작하면, 두세 번에 한 번은 코드의 핵심 한 줄(조건문·반복문 등)을 골라 "이 줄이 무슨 일을 하는지 네 말로 설명해줄래?"라고 묻는다. 학생이 설명하면 맞는지 짧게 확인해준다.',
  '6) 항상 한국어로 친근하고 간결하게(중학생 눈높이). 파이썬 코드는 ```python 코드블록으로 제공한다.',
  '아래는 학생이 쓴 설계와 메시지다.',
].join('\n');

// ── 세션 상태 초기화/복원 (student.js·unit.js 진입 경로 공용) ──
//   복원은 모든 저장 필드를 빠짐없이 읽어야 함 — 누락하면 다음 저장 때 해당 필드가 지워짐.
function _aicResetState(){
  AIC_MESSAGES = []; AIC_CODE = ''; AIC_TURN_COUNT = 0;
  AIC_BRIEF = null; AIC_BRIEF_EDITING = false;
  AIC_RUNS_LOG = []; AIC_REFLECT = null; AIC_DONE = false; AIC_CHAL_USED = false;
  AIC_LOADING = false; AIC_RUN_RESULT = null; AIC_RUN_STDIN = '';
  AIC_VIEW = 'entry';
}
function _aicApplySession(s){
  if(!s) return;
  AIC_MESSAGES   = Array.isArray(s.messages) ? s.messages : [];
  AIC_CODE       = s.code || '';
  AIC_TURN_COUNT = s.turnCount || 0;
  AIC_BRIEF      = s.brief || null;
  AIC_RUNS_LOG   = Array.isArray(s.runsLog) ? s.runsLog : [];
  AIC_REFLECT    = s.reflect || null;
  AIC_DONE       = !!s.done;
  AIC_CHAL_USED  = !!s.challengeUsed;
}

// ── 채팅 모드로 진입 (빈 채팅 — 학생이 직접 입력) ──
function _enterAicChat(){
  _aicResetState();
  AIC_VIEW = 'chat';
  render();
}

// ── 설계 브리프 제출 → 브리프를 첫 메시지로 채팅 시작 ──
//   채팅 도중 수정 모드(AIC_BRIEF_EDITING)면 대화·코드는 그대로 두고 설계만 갱신
function _submitAicBrief(){
  const v = id => (document.getElementById(id)?.value || '').trim();
  const problem = v('aicb-problem');
  const err = document.getElementById('aicb-err');
  if(!problem){ if(err) err.textContent = '① 만들고 싶은 프로그램은 한 줄이라도 적어주세요.'; return; }
  const brief = { problem, why: v('aicb-why'), connect: v('aicb-connect'), io: v('aicb-io'), ctrl: v('aicb-ctrl') };

  if(AIC_BRIEF_EDITING){
    AIC_BRIEF = brief;
    AIC_BRIEF_EDITING = false;
    AIC_VIEW = 'chat';
    render();
    _saveAicSession();
    return;
  }

  // 새 프로그램 시작 — 이전 대화·코드·기록 초기화 (브리프는 유지)
  AIC_MESSAGES = []; AIC_CODE = ''; AIC_TURN_COUNT = 0;
  AIC_RUNS_LOG = []; AIC_REFLECT = null; AIC_DONE = false; AIC_CHAL_USED = false;
  AIC_LOADING = false; AIC_RUN_RESULT = null; AIC_RUN_STDIN = '';
  AIC_BRIEF = brief;
  AIC_VIEW = 'chat';
  const b = AIC_BRIEF;
  const briefMsg = `[내 설계]\n· 만들 프로그램: ${b.problem}`
    + (b.why ? `\n· 왜 만들고 싶은지: ${b.why}` : '')
    + (b.connect ? `\n· 진로·관심 연결: ${b.connect}` : '')
    + (b.io ? `\n· 입력 → 출력: ${b.io}` : '')
    + (b.ctrl ? `\n· 필요한 판단·반복: ${b.ctrl}` : '');
  render();
  _sendAicMessage(briefMsg);
}

// ── 학생 메시지 전송 + AI 응답 ──
async function _sendAicMessage(userText){
  if(!userText || !userText.trim()) return;
  if(AIC_LOADING) return;
  if(AIC_TURN_COUNT >= AIC_TURN_LIMIT){
    toast(`대화 한도 ${AIC_TURN_LIMIT}회를 모두 사용했어요.`, 'err');
    return;
  }

  AIC_MESSAGES.push({ role: 'user', content: userText.trim(), ts: Date.now() });
  AIC_TURN_COUNT += 1;
  AIC_LOADING = true;
  render();
  _scrollAicListToBottom();

  try {
    // 첫 사용자 메시지에 코칭 지침을 끼워 보냄(화면엔 안 보임 → AIC_MESSAGES 원본은 그대로)
    const outMsgs = AIC_MESSAGES.map(m => ({ role: m.role, content: m.content }));
    const fi = outMsgs.findIndex(m => m.role === 'user');
    if(fi >= 0) outMsgs[fi] = { role: 'user', content: AIC_COACH + '\n\n' + outMsgs[fi].content };
    const r = await fetch(AIC_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: outMsgs })
    });
    if(!r.ok){
      const errText = await r.text().catch(() => '');
      throw new Error(`서버 응답 오류 (${r.status}): ${errText.slice(0, 200)}`);
    }
    const data = await r.json();
    if(data.error) throw new Error(data.error);
    const aiText = data.text || '';

    AIC_MESSAGES.push({ role: 'assistant', content: aiText, ts: Date.now() });

    const code = _extractAicCode(aiText);
    if(code) AIC_CODE = code;

    AIC_LOADING = false;
    render();
    _scrollAicListToBottom();
    _saveAicSession();
  } catch(e){
    AIC_LOADING = false;
    AIC_MESSAGES.push({
      role: 'assistant',
      content: `(⚠️ AI 응답 중 오류가 발생했어요: ${e.message}\n\n잠시 후 다시 시도해 주세요.)`,
      ts: Date.now(),
      isError: true
    });
    render();
    _scrollAicListToBottom();
  }
}

// ── 세션 저장 (debounce 1초) ──
function _saveAicSession(){
  if(!SEL_CLS || !ST_USER) return;
  if(AIC_SAVE_TIMER) clearTimeout(AIC_SAVE_TIMER);
  AIC_SAVE_TIMER = setTimeout(async () => {
    try {
      await saveAicSession(SEL_CLS.id, ST_USER.number, {
        messages: AIC_MESSAGES,
        code: AIC_CODE || null,
        turnCount: AIC_TURN_COUNT,
        brief: AIC_BRIEF || null,
        runsLog: AIC_RUNS_LOG.length ? AIC_RUNS_LOG : null,
        reflect: AIC_REFLECT || null,
        done: AIC_DONE || null,
        challengeUsed: AIC_CHAL_USED || null
      });
    } catch(err){
      console.warn('[AI코딩] 세션 저장 실패:', err);
    }
  }, 1000);
}

// ── Pyodide 워커 (코드 실행) — 실시간 input() 지원 (oj-worker 재사용) ──
//   Colab 방식: input() 만나면 SharedArrayBuffer 로 메인에 입력 요청 → 노란 입력칸
const AIC_STDIN_BUF_SIZE = 4096;
let _aicWorker = null;
let _aicMsgId = 0;
const _aicCallbacks = {};
let _aicStdinSAB = null, _aicStdinCtrl = null, _aicStdinData = null;
const _aicSABSupported = (typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined' && self.crossOriginIsolated !== false);

function _getAicWorker(){
  if(_aicWorker) return _aicWorker;
  // oj-worker 는 범용 run/grade 워커 (실시간 input 지원). 캐시 키도 OJ 와 공유.
  _aicWorker = new Worker('js/oj-worker.js?v=' + (typeof OJ_WORKER_VER !== 'undefined' ? OJ_WORKER_VER : '1'));
  _aicWorker.onmessage = (e) => {
    const data = e.data;
    if(data.type === 'request-input'){ _handleAicInputRequest(data.prompt); return; }
    if(data.type === 'init-stdin-done'){ return; }
    const cb = _aicCallbacks[data.id];
    if(cb){ delete _aicCallbacks[data.id]; cb(data); }
  };
  _aicWorker.onerror = (err) => console.error('AIC Worker error:', err);
  try {
    if(_aicSABSupported){
      _aicStdinSAB = new SharedArrayBuffer(8 + AIC_STDIN_BUF_SIZE);
      _aicStdinCtrl = new Int32Array(_aicStdinSAB, 0, 2);
      _aicStdinData = new Uint8Array(_aicStdinSAB, 8, AIC_STDIN_BUF_SIZE);
      _aicWorker.postMessage({ type: 'init-stdin', buffer: _aicStdinSAB });
    } else {
      _aicWorker.postMessage({ type: 'init-stdin' });
    }
  } catch(e){
    _aicWorker.postMessage({ type: 'init-stdin' });
  }
  return _aicWorker;
}

// 워커가 input() 요청 → 노란 입력칸 표시 후 SAB 에 써서 깨움
async function _handleAicInputRequest(prompt){
  const value = await _showAicInlineInput(prompt);
  if(!_aicStdinSAB || !_aicStdinCtrl || !_aicStdinData) return;
  if(value === null){
    Atomics.store(_aicStdinCtrl, 0, 2); // 취소
    Atomics.notify(_aicStdinCtrl, 0);
    return;
  }
  const bytes = new TextEncoder().encode(value);
  const len = Math.min(bytes.length, AIC_STDIN_BUF_SIZE);
  for(let i = 0; i < len; i++) _aicStdinData[i] = bytes[i];
  Atomics.store(_aicStdinCtrl, 1, len);
  Atomics.store(_aicStdinCtrl, 0, 1); // 데이터 준비됨
  Atomics.notify(_aicStdinCtrl, 0);
}

// 코드 패널 실행 영역에 노란 입력칸 띄우고 Promise 로 값 받기 (OJ 와 동일 스타일 재사용)
function _showAicInlineInput(prompt){
  return new Promise(resolve => {
    const body = document.getElementById('aic-run-area');
    if(!body){ resolve(''); return; }
    body.querySelectorAll('.oj-live-input').forEach(el => el.remove());
    const div = document.createElement('div');
    div.className = 'oj-live-input';
    const label = prompt
      ? `<span style="color:var(--text);font-weight:500">${esc(prompt)}</span>`
      : `<span style="color:var(--text2)">📝 input() — 값을 입력하세요</span>`;
    div.innerHTML = `
      <div class="oj-live-prompt">${label}</div>
      <div class="oj-live-row">
        <input class="oj-live-field" type="text" placeholder="값을 입력하고 Enter" spellcheck="false" autocomplete="off"/>
        <button class="btn-sm btn-p oj-live-submit">↵ 입력</button>
      </div>
      <div class="oj-live-hint">Enter로 제출 · Esc로 취소</div>`;
    body.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const input = div.querySelector('.oj-live-field');
    const btn = div.querySelector('.oj-live-submit');
    setTimeout(() => input?.focus(), 30);
    let done = false;
    const submit = () => {
      if(done) return; done = true;
      const val = input?.value || '';
      const echo = document.createElement('div');
      echo.className = 'oj-live-echo';
      echo.textContent = (prompt ? prompt : '') + val;
      div.replaceWith(echo);
      resolve(val);
    };
    const cancel = () => {
      if(done) return; done = true;
      div.remove();
      resolve(null);
    };
    btn?.addEventListener('click', submit);
    input?.addEventListener('keydown', ev => {
      if(ev.key === 'Enter'){ ev.preventDefault(); submit(); }
      else if(ev.key === 'Escape'){ ev.preventDefault(); cancel(); }
    });
  });
}

// 실시간 입력 모드로 실행 (5분 타임아웃 — 학생 입력 대기 허용)
const AIC_RUN_TIMEOUT_MS = 5 * 60 * 1000;
function _runAicCode(code){
  return new Promise((resolve) => {
    const id = ++_aicMsgId;
    const timer = setTimeout(() => {
      delete _aicCallbacks[id];
      try { _aicWorker?.terminate(); } catch(e){}
      _aicWorker = null;
      document.querySelectorAll('.oj-live-input').forEach(el => el.remove());
      resolve({ success: false, output: '', error: 'TimeoutError: 5분 동안 응답이 없어 종료했어요.' });
    }, AIC_RUN_TIMEOUT_MS);
    _aicCallbacks[id] = (data) => { clearTimeout(timer); resolve(data); };
    _getAicWorker().postMessage({ id, code, stdin: '', mode: 'run' });
  });
}

function _scrollAicListToBottom(){
  setTimeout(() => {
    const el = document.getElementById('aic-msg-list');
    if(el) el.scrollTop = el.scrollHeight;
  }, 30);
}

// ── 클릭 이벤트 ──
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const act = el.dataset;

  // 학생: 시작 ("제가 만들어볼래요" → 설계 브리프)
  if(act.action === 'aic-begin'){
    // 이전 작업이 있으면 확인 — 브리프 제출 시 대화·코드·성찰이 새로 시작됨
    if((AIC_MESSAGES.length > 0 || AIC_CODE) &&
       !confirm('이전에 만들던 프로그램이 있어요.\n새로 설계를 시작하면 이전 대화·코드·완성 기록이 지워져요.\n(이어서 하려면 "이어서 하기"를 눌러주세요)\n\n새로 시작할까요?')) return;
    AIC_BRIEF = null;
    AIC_BRIEF_EDITING = false;
    AIC_VIEW = 'brief';
    render();
    return;
  }

  // 학생: 채팅 도중 설계 보기·수정 (대화·코드 유지)
  if(act.action === 'aic-brief-edit'){
    if(AIC_LOADING) return;
    AIC_BRIEF_EDITING = true;
    AIC_VIEW = 'brief';
    render();
    return;
  }

  // 학생: 설계 수정 취소 → 채팅으로
  if(act.action === 'aic-brief-cancel'){
    AIC_BRIEF_EDITING = false;
    AIC_VIEW = 'chat';
    render();
    return;
  }

  // 학생: 설계 브리프 제출 → 채팅 시작
  if(act.action === 'aic-brief-submit'){
    _submitAicBrief();
    return;
  }

  // 학생: 설계 없이 바로 채팅
  if(act.action === 'aic-brief-skip'){
    AIC_BRIEF = null;
    _enterAicChat();
    return;
  }

  // 학생: 확장 도전 카드 → 입력창에 채워 넣기(학생이 다듬어 전송)
  if(act.action === 'aic-challenge'){
    const inp = document.getElementById('aic-input');
    if(inp && !inp.disabled){
      inp.value = act.prompt || ''; inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
      if(!AIC_CHAL_USED){ AIC_CHAL_USED = true; _saveAicSession(); }
    }
    return;
  }

  // 학생: 완성 기록(성찰) 화면 열기
  if(act.action === 'aic-reflect-open'){
    if(AIC_LOADING) return;
    AIC_VIEW = 'reflect';
    render();
    return;
  }

  // 학생: 완성 기록 → 채팅으로 돌아가기
  if(act.action === 'aic-reflect-back'){
    AIC_VIEW = 'chat';
    render();
    return;
  }

  // 학생: 완성 기록 저장
  if(act.action === 'aic-reflect-submit'){
    const v = id => (document.getElementById(id)?.value || '').trim();
    const name = v('aicr-name'), hard = v('aicr-hard'), learned = v('aicr-learned');
    const errEl = document.getElementById('aicr-err');
    if(!name || !hard || !learned){
      if(errEl) errEl.textContent = '① 프로그램 이름, ③ 고민했던 부분, ④ 알게 된 것은 꼭 적어주세요.';
      return;
    }
    AIC_REFLECT = { name, intro: v('aicr-intro'), hard, learned, next: v('aicr-next'), ts: new Date().toISOString() };
    AIC_DONE = true;
    AIC_VIEW = 'chat';
    render();
    toast('🏁 완성 기록을 저장했어요! 수고했어요.', 'ok');
    _saveAicSession();
    return;
  }

  // 학생: 이전 작업 이어하기
  if(act.action === 'aic-resume'){
    AIC_VIEW = AIC_MESSAGES.length ? 'chat' : 'entry';
    render();
    if(AIC_VIEW === 'chat') _scrollAicListToBottom();
    return;
  }

  // 학생: 처음 화면으로
  if(act.action === 'aic-back-entry'){
    AIC_VIEW = 'entry';
    render();
    return;
  }

  if(act.action === 'aic-send'){
    const input = document.getElementById('aic-input');
    const text = input?.value || '';
    if(!text.trim()) return;
    if(input) input.value = '';
    await _sendAicMessage(text);
    return;
  }

  // 학생: 새로 시작 (대화·코드·기록 초기화)
  if(act.action === 'aic-restart'){
    if(!confirm('지금까지의 대화·코드·실행 기록·완성 기록을 모두 지우고 새 프로그램을 만들까요?')) return;
    _aicResetState();
    render();
    _saveAicSession();
    return;
  }

  // 학생: 코드 복사
  if(act.action === 'aic-copy-code'){
    if(!AIC_CODE) return;
    try {
      await navigator.clipboard.writeText(AIC_CODE);
      toast('코드를 복사했어요!', 'ok');
    } catch(_){
      toast('복사에 실패했어요. 직접 선택해 복사해주세요.', 'err');
    }
    return;
  }

  // 학생: 코드 실행 (실시간 input — input() 만나면 입력칸이 뜸)
  if(act.action === 'aic-run'){
    if(AIC_RUNNING) return;
    const code = AIC_CODE || '';
    if(!code.trim()){ toast('실행할 코드가 없어요.', 'err'); return; }
    AIC_RUNNING = true;
    AIC_RUN_RESULT = null;
    render();
    const result = await _runAicCode(code);
    AIC_RUNNING = false;
    AIC_RUN_RESULT = result;
    // 시행착오 타임라인 기록 — 오류는 마지막 줄(예외 메시지)만 요약 저장
    const errLine = result.success ? null
      : (String(result.error || '').split('\n').filter(l => l.trim()).pop() || '').slice(0, 120) || null;
    AIC_RUNS_LOG.push({ ts: new Date().toISOString(), ok: !!result.success, err: errLine });
    if(AIC_RUNS_LOG.length > 200) AIC_RUNS_LOG = AIC_RUNS_LOG.slice(-200);
    render();
    _saveAicSession();
    return;
  }

  // 선생님: 학생 상세 보기
  if(act.action === 'aic-tc-view'){
    const snum = act.snum;
    if(!snum) return;
    AIC_TC_SEL_SNUM = snum;
    AIC_VIEW = 'student';
    render();
    setTimeout(() => window.scrollTo({top:0, behavior:'instant'}), 30);
    return;
  }

  if(act.action === 'aic-tc-back'){
    AIC_TC_SEL_SNUM = null;
    AIC_VIEW = 'manage';
    render();
    return;
  }

  // 선생님: 세특 키워드 메모 저장
  if(act.action === 'aic-tc-note-save'){
    const cid = TC_CLS?.id, snum = AIC_TC_SEL_SNUM;
    if(!cid || !snum) return;
    const txt = (document.getElementById('aic-tc-note')?.value || '').trim();
    try {
      await saveAicTcNote(cid, snum, txt || null);
      if(!AIC_ALL_SESSIONS[snum]) AIC_ALL_SESSIONS[snum] = {};
      AIC_ALL_SESSIONS[snum].tcNote = txt;
      toast('✓ 키워드 메모를 저장했어요.', 'ok');
    } catch(err){
      toast('메모 저장 실패: ' + (err.message || err), 'err');
    }
    return;
  }

  // 선생님: 세특 재료 md 내보내기 (반 전체)
  if(act.action === 'aic-export-md'){
    const cid = TC_CLS?.id;
    if(!cid) return;
    const md = _buildAicSebuMd(cid);
    if(!md){ toast('내보낼 학생 기록이 아직 없어요.', 'err'); return; }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `AI코딩_세특재료_${cid}_${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('📄 세특 재료 파일을 내려받았어요.', 'ok');
    return;
  }

  // 선생님: on/off 토글
  if(act.action === 'aic-set-active'){
    const cid = TC_CLS?.id;
    if(!cid){ toast('반을 먼저 선택하세요.', 'err'); return; }
    const next = act.on === '1';
    if(!!AIC_ACTIVE[cid] === next) return;
    try {
      await setAicActive(cid, next);
      toast(next ? '✓ AI 코딩 메뉴를 열었어요. 학생 화면에 탭이 나타납니다.' : 'AI 코딩 메뉴를 닫았어요.', 'ok');
      render();
    } catch(err){
      toast('변경 실패: ' + (err.message || err), 'err');
    }
    return;
  }
});

// ── 키보드: Enter 전송 ──
document.addEventListener('keydown', e => {
  if(e.target?.id !== 'aic-input') return;
  if(e.key !== 'Enter' || e.shiftKey) return;
  e.preventDefault();
  const text = e.target.value || '';
  if(!text.trim()) return;
  e.target.value = '';
  _sendAicMessage(text);
});

// ── 세특 재료 md 생성 (선생님: 반 전체 내보내기) ──
//   기록이 있는 학생만 포함. 학생이 보낸 메시지 전문(질문 궤적)까지 담아 세특 초안 원문으로 사용.
function _buildAicSebuMd(cid){
  const sessions = AIC_ALL_SESSIONS || {};
  const parts = [];
  const sorted = [...STUDENTS].sort((a, b) => String(a.number).localeCompare(String(b.number), 'ko', { numeric: true }));
  for(const st of sorted){
    const s = sessions[st.number];
    if(!s || (!(s.messages && Object.keys(s.messages).length) && !s.code && !s.brief && !s.reflect)) continue;
    const msgs = Array.isArray(s.messages) ? s.messages : Object.values(s.messages || {});
    const runs = Array.isArray(s.runsLog) ? s.runsLog : Object.values(s.runsLog || {});
    const errRuns = runs.filter(r => r && !r.ok);
    const b = s.brief || {};
    const r = s.reflect || null;
    const L = [];
    L.push(`## ${st.number} ${st.name}`);
    L.push('');
    L.push(`- 대화 턴: ${s.turnCount || 0} / 실행 ${runs.length}회(오류 ${errRuns.length}회) / 확장 도전 카드: ${s.challengeUsed ? '사용' : '미사용'} / 완성 선언: ${s.done ? '🏁' : '-'}`);
    if(b.problem){
      L.push('');
      L.push('### 📝 설계 브리프');
      L.push(`- 만들 프로그램: ${b.problem}`);
      if(b.why)     L.push(`- 왜(동기): ${b.why}`);
      if(b.connect) L.push(`- 진로·관심 연결: ${b.connect}`);
      if(b.io)      L.push(`- 입력→출력: ${b.io}`);
      if(b.ctrl)    L.push(`- 판단·반복: ${b.ctrl}`);
    }
    if(errRuns.length){
      L.push('');
      L.push('### 🔁 시행착오 (오류 기록)');
      errRuns.slice(0, 10).forEach(e => L.push(`- ${fmtDt(e.ts)} — ${e.err || '(오류)'}`));
      const last = runs[runs.length - 1];
      if(last && last.ok) L.push('- → 최종 실행 성공 (오류 극복)');
    }
    if(r){
      L.push('');
      L.push('### 🏁 완성 기록 (학생 성찰)');
      L.push(`- 프로그램 이름: ${r.name || ''}${r.intro ? ` — ${r.intro}` : ''}`);
      if(r.hard)    L.push(`- 가장 고민한 부분·해결: ${r.hard}`);
      if(r.learned) L.push(`- 새로 알게 된 것: ${r.learned}`);
      if(r.next)    L.push(`- 발전시키고 싶은 점: ${r.next}`);
    }
    if(s.tcNote){
      L.push('');
      L.push(`### ✏️ 교사 키워드 메모`);
      L.push(s.tcNote);
    }
    const userMsgs = msgs.filter(m => m && m.role === 'user');
    if(userMsgs.length){
      L.push('');
      L.push('### 💬 학생이 보낸 메시지 (질문 궤적)');
      userMsgs.forEach((m, i) => L.push(`${i + 1}. ${String(m.content || '').replace(/\n/g, ' ')}`));
    }
    if(s.code){
      L.push('');
      L.push('### 💻 완성 코드');
      L.push('```python');
      L.push(s.code);
      L.push('```');
    }
    parts.push(L.join('\n'));
  }
  if(!parts.length) return null;
  const head = `# 🤖 AI 코딩 세특 재료 — ${cid}\n\n> 생성: ${fmtDt(new Date().toISOString())} · 기록 있는 학생 ${parts.length}명\n\n---\n\n`;
  return head + parts.join('\n\n---\n\n') + '\n';
}

// ── render 후 처리 ──
function afterRenderAiCode(){
  if(ST_TAB !== 'aicode') return;
  if(AIC_VIEW === 'brief'){
    setTimeout(() => document.getElementById('aicb-problem')?.focus(), 50);
    return;
  }
  if(AIC_VIEW === 'reflect'){
    setTimeout(() => document.getElementById('aicr-name')?.focus(), 50);
    return;
  }
  if(AIC_VIEW === 'chat'){
    _scrollAicListToBottom();
    setTimeout(() => {
      const inp = document.getElementById('aic-input');
      if(inp && !inp.disabled) inp.focus();
    }, 50);
  }
}

window.afterRenderAiCode = afterRenderAiCode;
