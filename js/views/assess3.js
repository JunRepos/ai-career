/* ═══════════════════════════════════════
   views/assess3.js — 📝 3차 수행평가 (인공지능 기초 · 논술형 15점)

   내용(유의 사항 · 채점 기준 · 문항 · 사례 카드)은 js/assess3-data.js 에 있습니다.
   2026-11-23 선생님 — 「칸이 너무 많다 · 80자씩 나눈 것도 싫다 · A4 용지에 쓰듯이」
   「준비 그런 거 없이 그냥 1 · 2차시 다 풀 거야」.
   → **종이 한 장**(A4 모양 · 표의 열)을 두 시간에 걸쳐 쓰고 마지막에 제출합니다.

   단계 — 선생님이 반마다 엽니다
     closed  닫힘   학생 메뉴에 보이지 않음 (쓰던 글은 그대로 저장되어 있음)
     open    작성   답안을 씀 (쓰는 대로 자동 저장 · 붙여넣기 안 됨 · 제출 없음 — 2026-11-24)

   저장 (1차와 같은 가지 — 규칙을 다시 배포하지 않습니다)
     aiactivity/submissions/{cid}/assess3Open            : 'closed' | 'open'
     aiactivity/submissions/{cid}/assess3Extra/{학번}     : true   — 결석한 학생만 따로 엶
     aiactivity/submissions/{cid}/assess3/{학번}          : { name, answers:{칸:글}, updatedAt,
                                                            submitted:{ answers, at } }
   · 입력은 칸 단위로 보냅니다 — 불러오기에 실패한 채로 써도 앞 시간의 글을 덮지 않습니다.
   · 채점은 저장된 답안(answers)으로 합니다. log/{YYYYMMDD-HHmm} = 서버 시각 — 저장한 시각 기록.
═══════════════════════════════════════ */

const A3_STAGE_LABEL = { closed: '닫힘', open: '작성' };

let A3_OPEN       = {};      // { [cid]: 'closed' | 'open' }
let A3_EXTRA      = {};      // { [cid]: { [학번]: true } }
let A3_OPEN_WATCH = null;
// 학생
let A3_FOR        = null;
let A3_LOADING    = false;
let A3_LOAD_ERR   = '';
let A3_READY      = false;
let A3_DOC        = null;
let A3_ANS        = {};
let A3_TOUCHED    = new Set();
let A3_DIRTY      = false;
let A3_SAVING     = null;    // null | 'save'
let A3_PENDING    = false;
let A3_SAVE_ERR   = '';
let A3_SAVE_TIMER = null;
// 선생님
let A3_TC_FOR     = null;
let A3_TC_WATCH   = null;
let A3_ALL        = null;
let A3_TC_ERR     = '';
let A3_TC_VIEW    = 'list';
let A3_TC_SNUM    = null;

/* ─────────── 공통 ─────────── */
function _a3Base(cid){ return `aiactivity/submissions/${cid}`; }
function _a3Ref(cid, snum){ return db.ref(`${_a3Base(cid)}/assess3${snum ? '/' + snum : ''}`); }
function _a3OpenRef(cid){ return db.ref(`${_a3Base(cid)}/assess3Open`); }
function _a3ExtraRef(cid, snum){ return db.ref(`${_a3Base(cid)}/assess3Extra${snum ? '/' + snum : ''}`); }
function _a3Time(iso){
  if(!iso) return '';
  const d = new Date(iso), p = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function _a3IsTest(){ return !!ST_USER && String(ST_USER.number).toLowerCase() === 'test'; }
function a3Stage(cid){ return A3_OPEN[cid] || 'closed'; }
function _a3MyExtra(cid){ return !!(ST_USER && (A3_EXTRA[cid] || {})[ST_USER.number]); }
// 학생 메뉴에 보이는가 — 선생님이 열었거나, 나만 따로 열렸거나, 확인용 계정
function a3Visible(cls){
  return cls?.type === 'ai' && typeof A3 !== 'undefined'
    && (a3Stage(cls.id) !== 'closed' || _a3MyExtra(cls.id) || _a3IsTest());
}
// 지금 답안을 쓸 수 있는가
function _a3CanWrite(cid){ return a3Stage(cid) === 'open' || _a3MyExtra(cid) || (_a3IsTest() && a3Stage(cid) === 'closed'); }
function _a3Fields(){ return A3.items.flatMap(it => it.fields); }
function _a3F(id){ return _a3Fields().find(f => f.id === id); }
function _a3Req(){ return _a3Fields().filter(f => !f.opt); }      // 채운 칸을 셀 때는 꼭 쓰는 칸만 (출처 URL 은 직접 찾은 사례만 씀)
function _a3Filled(ans){ return _a3Req().filter(f => String((ans || {})[f.id] || '').trim()).length; }
// 저장한 시각 기록(log) — 날마다 처음~마지막 시각. 값은 서버 시각.
function _a3LogDays(doc){
  const ts = Object.values((doc && doc.log) || {}).map(Number).filter(n => n > 0).sort((a, b) => a - b);
  const p = n => String(n).padStart(2, '0'), days = [];
  ts.forEach(t => {
    const d = new Date(t), k = `${d.getMonth() + 1}/${d.getDate()}`, hm = `${p(d.getHours())}:${p(d.getMinutes())}`;
    const last = days[days.length - 1];
    if(last && last.k === k){ last.b = hm; last.n++; } else days.push({ k, a: hm, b: hm, n: 1 });
  });
  return days.map(x => `${x.k} ${x.a}${x.a === x.b ? '' : '~' + x.b}`);
}
function _a3Same(a, b){
  a = a || {}; b = b || {};
  return _a3Fields().every(f => String(a[f.id] || '').trim() === String(b[f.id] || '').trim());
}

async function loadA3Open(cid){
  if(!/^ai-/.test(cid || '')) return 'closed';
  try {
    const [s, x] = await Promise.all([_a3OpenRef(cid).get(), _a3ExtraRef(cid).get()]);
    const v = s.exists() ? s.val() : 'closed';
    A3_OPEN[cid] = A3_STAGE_LABEL[v] ? v : 'closed';
    A3_EXTRA[cid] = x.val() || {};
  } catch(err){
    console.warn('[3차 수행평가] 단계 로드 실패:', err.message || err);
    if(!A3_OPEN[cid]) A3_OPEN[cid] = 'closed';
  }
  return A3_OPEN[cid];
}

// 선생님이 단계를 바꾸면 학생 화면이 새로고침 없이 따라옵니다
function a3WatchOpen(cid){
  if(!/^ai-/.test(cid || '')) return;
  if(A3_OPEN_WATCH && A3_OPEN_WATCH.cid === cid) return;
  a3UnwatchOpen();
  const after = () => {
    if(VIEW !== 'student') return;
    // 선생님이 닫는 순간 쓰고 있던 글자까지는 보냅니다 (force)
    (A3_DIRTY ? a3SaveNow(true, true) : Promise.resolve()).then(a3RenderKeep);
  };
  const r1 = _a3OpenRef(cid), f1 = s => {
    const v = s.val(), nv = A3_STAGE_LABEL[v] ? v : 'closed';
    if(A3_OPEN[cid] === nv) return;
    A3_OPEN[cid] = nv; after();
  };
  const r2 = _a3ExtraRef(cid), f2 = s => {
    const nv = s.val() || {};
    if(JSON.stringify(A3_EXTRA[cid] || {}) === JSON.stringify(nv)) return;
    A3_EXTRA[cid] = nv; after();
  };
  const warn = err => console.warn('[3차 수행평가] 단계 구독 실패:', err.message || err);
  r1.on('value', f1, warn); r2.on('value', f2, warn);
  A3_OPEN_WATCH = { cid, refs: [[r1, f1], [r2, f2]] };
}
function a3UnwatchOpen(){
  if(A3_OPEN_WATCH){ A3_OPEN_WATCH.refs.forEach(([r, f]) => r.off('value', f)); A3_OPEN_WATCH = null; }
}

// 쓰는 만큼 칸이 아래로 늘어납니다
function a3Grow(root){
  (root || document).querySelectorAll('.a3-sheet textarea').forEach(t => {
    t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px';
  });
}
// 다시 그려도 쓰던 칸의 커서와 스크롤을 잃지 않게
function a3RenderKeep(){
  const ae = document.activeElement;
  const fid = ae && ae.dataset ? ae.dataset.a3fid : null;
  const sel = fid ? [ae.selectionStart, ae.selectionEnd] : null;
  const content = document.querySelector('.content');
  const cTop = content ? content.scrollTop : 0, wTop = window.scrollY;
  const openD = [...document.querySelectorAll('details[data-a3d][open]')].map(d => d.dataset.a3d);
  render();
  openD.forEach(k => { const d = document.querySelector(`details[data-a3d="${k}"]`); if(d) d.open = true; });
  a3Grow();
  const c2 = document.querySelector('.content');
  if(c2) c2.scrollTop = cTop;
  window.scrollTo(0, wTop);
  if(fid){
    const el = document.querySelector(`[data-a3fid="${fid}"]`);
    if(el && !el.readOnly && !el.disabled){
      el.focus({ preventScroll: true });
      try { el.setSelectionRange(sel[0], sel[1]); } catch(e){}
    }
  }
}

/* ─────────── 함께 쓰는 조각 ─────────── */
// **굵게** 표시만 살려서 (나머지는 이스케이프)
function _a3Md(t){ return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
/* 🗂 사례 카드 — 1차의 「문제 상황 카드」와 같은 팝업 (A3_CARDS). 화면을 다시 그려도 body 에 따로 남습니다. */
let A3_CARD_F = '*';
let A3_CARD_OPEN = null;      // 자세히 보고 있는 카드 번호 (없으면 목록)
function _a3CardLinks(c){
  return (c.links || []).length
    ? `<div class="src a3-links">${c.links.map(l => `<a href="${esc(l[1])}" target="_blank" rel="noopener">📰 ${esc(l[0])}</a>`).join('')}</div>`
    : `<div class="src">📖 ${esc(c.src)}</div>`;
}
function _a3CardsHtml(){
  const fs = A3_CARDS.fields;
  const can = !!(SEL_CLS && VIEW === 'student' && _a3CanWrite(SEL_CLS.id) && A3_READY);
  const head = `<div class="a1-cm-h"><b>🗂 사례 카드 <small>${A3_CARDS.cards.length}장</small></b><button class="a1-cm-x" data-action="a3-cards-close">✕ 닫기</button></div>`;
  // 한 장 자세히
  const oc = A3_CARD_OPEN == null ? null : A3_CARDS.cards[A3_CARD_OPEN];
  if(oc){
    return `<div class="a1-cm">${head}
      <div class="a3-cd">
        <button class="a3-cd-back" data-action="a3-cards-back">← 목록으로</button>
        <div class="fl">${esc(oc.field)}</div>
        <div class="t">${esc(oc.title)}</div>
        <div class="s">${esc(oc.summary)}</div>
        ${(oc.more || []).length ? `<div class="a3-cd-h">더 알아보기</div><ul class="a3-cd-more">${oc.more.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
        <div class="a3-cd-h">출처 — 눌러서 기사 · 자료 원문 읽기</div>
        ${_a3CardLinks(oc)}
        ${can ? `<button class="a1-cc-copy" data-action="a3-cards-pick" data-i="${A3_CARD_OPEN}">✔ 이 사례로 정하기</button>` : ''}
      </div></div>`;
  }
  const list = A3_CARDS.cards.map((c, i) => ({ c, i })).filter(x => A3_CARD_F === '*' || x.c.field === A3_CARD_F);
  const note = (A3_CARDS.note || {})[A3_CARD_F];
  return `<div class="a1-cm">${head}
    <div class="a1-cm-note">📣 사례는 <b>${A3.caseRule.map(esc).join(' · ')}</b>.<br>
      카드를 누르면 <b>자세한 내용</b>이 나옵니다. 카드에서 고르거나 <b>직접 찾은 사례</b>를 써도 됩니다. 「이 사례로 정하기」를 누르면 1번의 「활용 사례」 칸에 들어갑니다.</div>
    <div class="a1-cm-f">${['*', ...fs].map(f => `<button class="${f === A3_CARD_F ? 'on' : ''}" data-action="a3-cards-f" data-f="${esc(f)}">${f === '*' ? '전체' : esc(f)}</button>`).join('')}</div>
    ${note ? `<div class="a1-cm-note">${esc(note)}</div>` : ''}
    <div class="a1-cm-grid">${list.map(({ c, i }) => `<div class="a1-cc a3-cc" data-action="a3-cards-open" data-i="${i}"><div class="fl">${esc(c.field)}</div><div class="t">${esc(c.title)}</div>
      <div class="s">${esc(c.summary)}</div>
      <div class="a3-cc-more">자세히 보기 ›</div>
      ${_a3CardLinks(c)}
      ${can ? `<button class="a1-cc-copy" data-action="a3-cards-pick" data-i="${i}">✔ 이 사례로 정하기</button>` : ''}</div>`).join('')}</div>
  </div>`;
}
function a3CardsOpen(){
  a3CardsClose();
  A3_CARD_OPEN = null;
  const ov = document.createElement('div');
  ov.id = 'a3-cards-ov'; ov.className = 'modal-ov a1-cards-ov'; ov.dataset.action = 'a3-cards-close';
  ov.innerHTML = _a3CardsHtml();
  document.body.appendChild(ov);
}
function a3CardsRepaint(){ const ov = document.getElementById('a3-cards-ov'); if(ov) ov.innerHTML = _a3CardsHtml(); }
function a3CardsClose(){ const ov = document.getElementById('a3-cards-ov'); if(ov) ov.remove(); }

/* ─────────── 종이 한 장 ───────────
   ans 를 넣어 그립니다. edit 가 참이면 쓸 수 있고, 거짓이면 읽기만 (학생의 닫힌 화면 · 선생님 화면). */
function _a3Cell(id, ans, edit, rows){
  const f = _a3F(id), v = String((ans || {})[id] || '');
  const ph = f.ph && edit ? ` placeholder="${esc(f.ph)}"` : '';
  if(f.line) return `<input type="text" ${edit ? `data-a3fid="${id}"` : 'readonly'} value="${esc(v)}" autocomplete="off" spellcheck="false"${ph}/>`;
  return `<textarea ${edit ? `data-a3fid="${id}"` : 'readonly'} rows="${rows || 3}" spellcheck="false"${ph}>${esc(v)}</textarea>`;
}
function _a3Chips(id, ans, edit){
  const f = _a3F(id), v = String((ans || {})[id] || '');
  return `<div class="a3-chips">${f.options.map(o => `<button class="${v === o ? 'on' : ''}" data-action="a3-choice" data-fid="${id}" data-val="${esc(o)}" ${edit ? '' : 'disabled'}>${esc(o)}</button>`).join('')}</div>`;
}
// 6가지 윤리적 쟁점 설명 — 쟁점 단추 바로 아래 (고른 쟁점은 진하게)
function _a3IssueHelp(ans, edit){
  if(!edit) return '';
  const v = String((ans || {}).issue || '');
  return `<div class="a3-iss">${A3.refs.issues.map(x => `<div class="${v === x[0] ? 'on' : ''}"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('')}</div>`;
}
// 「인공지능(AI) 윤리 기준」 3대 원칙 · 10대 핵심 요건 — 공존 방안 칸 **위에 따로** 둡니다 (2026-11-24 「칸이 너무 작아 보여」)
function _a3StdHtml(key, edit){
  if(!edit) return '';
  const r = A3.refs;
  return `<div class="a3-std"><div class="h">「인공지능(AI) 윤리 기준」 3대 원칙 · 10대 핵심 요건 (교과서 190쪽)</div>
    <div class="a3-std-p">${r.principles.map(x => `<div><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('')}</div>
    <div class="a3-std-r">${r.reqs.map((x, i) => `<div><b>${i + 1} ${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('')}</div>
  </div>`;
}
function _a3Q(it, body, edit){
  return `<div class="a3-q">
    <div class="a3-qh"><b>${esc(it.no)}. ${esc(it.title)}</b><span>${it.pt}점</span></div>
    <div class="a3-ask">${esc(it.ask)}</div>
    <div class="a3-crit"><b class="h">${esc(A3.critHead)}</b>
      ${it.crit.map(x => `<div>∙ ${esc(x)}</div>`).join('')}</div>
    ${body}</div>`;
}
function _a3Sheet(ans, edit, who){
  const [q1, q2, q3] = A3.items;
  const c = (id, rows) => _a3Cell(id, ans, edit, rows);
  const own = String((ans || {}).src || '') === '직접 찾은 사례';
  const b1 = `<div class="a3-tb a3-g1">
      <div class="l">활용 사례</div>
      <div class="e a3-s2">${_a3Chips('src', ans, edit)}
        <div class="a3-caserow">${c('case')}${edit && !own ? '<button class="a3-cardbtn" data-action="a3-cards">🗂 사례 카드</button>' : ''}</div>
        ${own ? `<div class="a3-urlrow"><span>출처 URL</span>${c('url')}</div>` : ''}</div>
      <div class="l">딜레마 상황</div>
      <div class="e a3-s2">${c('dil', 4)}</div>
      <div class="l">쟁점과<br>나의 입장</div>
      <div class="e a3-s2">${_a3Chips('issue', ans, edit)}${_a3IssueHelp(ans, edit)}${c('stance', 4)}</div>
    </div>`;
  const b2 = `<div class="a3-tb a3-g3">
      <div class="l c">개발자</div><div class="l c">운영·관리자</div><div class="l c e">사용자</div>
      <div>${c('dev', 4)}</div><div>${c('op', 4)}</div><div class="e">${c('user', 4)}</div>
    </div>
    ${_a3StdHtml('std2', edit)}
    <div class="a3-tb a3-g2">
      <div class="l">공존 방안과<br>그 한계</div><div class="e">${c('plan', 6)}</div>
    </div>`;
  const b3 = `<div class="a3-tb a3-g3 a3-flow">
      <div class="l c">캠페인 목표</div><div class="l c">캠페인 진행 방식</div><div class="l c e">그로 인한 효과</div>
      <div>${c('goal', 6)}</div><div>${c('run', 6)}</div><div class="e">${c('effect', 6)}</div>
    </div>`;
  return `<div class="a3-sheet">
    <div class="a3-top">
      <div><div class="cap">2026학년도 2학기 인공지능 기초 · 3차 수행평가 (${A3.total}점)</div><div class="a3-title">${esc(A3.title)}</div></div>
      <div class="a3-who">${esc(who || '')}</div>
    </div>
    ${_a3Q(q1, b1, edit)}${_a3Q(q2, b2, edit)}${_a3Q(q3, b3, edit)}
  </div>`;
}

/* ─────────── 학생 ─────────── */
async function a3LoadMine(){
  const cid = SEL_CLS?.id, snum = ST_USER?.number;
  if(!cid || !snum) return;
  A3_LOADING = true; A3_LOAD_ERR = ''; A3_READY = false;
  try {
    const [s] = await withTimeout(Promise.all([_a3Ref(cid, snum).get(), loadA3Open(cid), loadNbPw(cid)]), 12000, '내 답안 불러오기');
    A3_DOC = s.exists() ? s.val() : null;
    A3_ANS = { ...((A3_DOC && A3_DOC.answers) || {}) };
    A3_TOUCHED = new Set(); A3_DIRTY = false; A3_SAVE_ERR = '';
    A3_READY = true;
  } catch(err){
    A3_LOAD_ERR = err.message || String(err);
  } finally {
    A3_FOR = cid + '/' + snum;
    A3_LOADING = false;
    render();
    a3Grow();
  }
}

function _a3StatusHtml(){
  let s1;
  if(A3_SAVE_ERR) s1 = `<span class="err">⚠ 저장되지 않았습니다 — ${esc(A3_SAVE_ERR)}. 인터넷 연결을 확인하세요. 연결되면 [다시 저장]을 누르세요.</span>`;
  else if(A3_SAVING) s1 = '<span class="s1">💾 저장 중…</span>';
  else if(A3_DIRTY) s1 = '<span class="s1">입력 중 — 곧 자동 저장됩니다</span>';
  else if(A3_DOC && A3_DOC.updatedAt) s1 = `<span class="ok">✅ 저장됨 ${_a3Time(A3_DOC.updatedAt)} — 선생님 화면에 그대로 보입니다.</span>`;
  else s1 = '<span class="s1">아직 쓴 내용이 없습니다</span>';
  return `<div>${s1}</div><div><span class="s1">쓰는 대로 자동으로 저장됩니다. 따로 제출하지 않습니다.</span></div>`;
}
function a3PaintStatus(){
  const el = document.getElementById('a3-status');
  if(el) el.innerHTML = _a3StatusHtml();
  document.querySelectorAll('[data-a3busy]').forEach(b => { b.disabled = !!A3_SAVING; });
}

/* ─────────── 입장 비밀번호 ───────────
   2차 수행평가와 같은 자리(js/nb-open.js)에 둡니다 — aiactivity/submissions/{반}/nbPw/assess3 = {salt, iter, hash}.
   원래 글자는 어디에도 저장하지 않습니다. 선생님이 평가 화면에서 정하고, 정하지 않으면 묻지 않습니다.
   맞게 넣으면 그 탭을 닫을 때까지 다시 묻지 않습니다. 선생님 화면에는 걸지 않습니다. */
const A3_PW_ID = 'assess3';
let A3_GATE_BUSY = false, A3_GATE_ERR = '';
function _a3NeedPw(cid){ return nbHasPw(cid, A3_PW_ID) && !nbPwPassed(cid, A3_PW_ID); }
function _a3GateView(){
  return `<div class="a1-gate"><div class="a1-gate-box">
    <div class="a1-gate-ic">🔒</div>
    <div class="a1-gate-t">3차 수행평가 입장</div>
    <div class="a1-gate-s">선생님이 알려 준 입장 비밀번호를 입력하세요.</div>
    <input type="password" id="a3-gate-pw" class="a1-in a1-gate-in" autocomplete="off" maxlength="32" placeholder="비밀번호" ${A3_GATE_BUSY ? 'disabled' : ''}/>
    ${A3_GATE_ERR ? `<div class="a1-gate-err">${esc(A3_GATE_ERR)}</div>` : ''}
    <button class="btn-p" data-action="a3-gate" ${A3_GATE_BUSY ? 'disabled' : ''}>${A3_GATE_BUSY ? '확인 중…' : '입장하기'}</button>
  </div></div>`;
}

function vStAssess3(){
  if(typeof A3 === 'undefined') return emptyBox('📝', '평가 자료를 불러오지 못했습니다. 새로고침 해 주세요.');
  const cid = SEL_CLS?.id, snum = ST_USER?.number;
  if(!cid || !snum) return '';
  if(A3_FOR !== cid + '/' + snum && !A3_LOADING){ A3_LOADING = true; setTimeout(a3LoadMine, 0); }
  if(A3_LOADING) return `<div class="section"><div class="ml-sub-explain">⏳ 내 답안을 불러오는 중…</div></div>`;
  if(A3_LOAD_ERR){
    return `<div class="section">
      <div class="a1-notice err"><b>답안을 불러오지 못했습니다.</b> (${esc(A3_LOAD_ERR)})<br>
      불러오기 전에는 쓸 수 없습니다. 인터넷 연결을 확인하고 다시 시도하세요.</div>
      <button class="btn-p btn-sm" data-action="a3-retry">다시 불러오기</button></div>`;
  }
  if(_a3NeedPw(cid)) return _a3GateView();          // 입장 비밀번호를 넣기 전에는 아무것도 보이지 않음

  const stage = a3Stage(cid);
  const can = _a3CanWrite(cid) && A3_READY;
  const sc = A3.schedule[cid];
  const testNote = (_a3IsTest() && stage === 'closed')
    ? `<div class="a1-stagebar test">🔍 확인용 계정 — 학생에게는 지금 <b>닫혀</b> 있습니다. 여기서 쓴 내용도 저장됩니다.</div>` : '';
  const stageBar = can ? ''
    : `<div class="a1-stagebar">지금은 작성 시간이 아닙니다. 쓴 내용은 저장되어 있고, 선생님이 열면 이어서 쓸 수 있습니다.</div>`;
  setTimeout(a3Grow, 0);

  return `<div class="a1-wrap a3-wrap">
    <div class="a1-head">
      <div><div class="a1-title">📝 3차 수행평가</div><div class="a1-sub">${esc(A3.title)} · ${A3.total}점</div></div>
    </div>
    ${sc ? `<div class="a3-sched">${sc.map((d, i) => `<div><small>${i + 1}차시</small><b>${esc(d)}</b></div>`).join('')}
      <div class="tag">컴퓨터로 작성</div><div class="tag no">생성형 인공지능 사용 금지</div></div>` : ''}
    <div class="a1-notice"><b>유의 사항</b>${A3.notice.map(n => `<div>∙ ${esc(n)}</div>`).join('')}</div>
    ${testNote}${stageBar}
    ${_a3Sheet(A3_ANS, can, `${snum} ${ST_USER.name || ''}`)}
    <div class="a1-bar">
      <div class="a1-status" id="a3-status">${_a3StatusHtml()}</div>
      ${A3_SAVE_ERR ? `<button class="btn-sm" data-action="a3-save" data-a3busy ${A3_SAVING || !can ? 'disabled' : ''}>💾 다시 저장</button>` : ''}
    </div>
  </div>`;
}

/* ─────────── 선생님 ─────────── */
function a3TcStart(cid){
  a3TcStop();
  A3_TC_FOR = cid; A3_ALL = null; A3_TC_ERR = '';
  const on = () => { if(VIEW === 'teacher' && TC_TAB === 'assess3' && TC_CLS?.id === cid){ render(); a3Grow(); } };
  const ref = _a3Ref(cid);
  const fn = s => { A3_ALL = s.val() || {}; on(); };
  ref.on('value', fn, err => { A3_TC_ERR = err.message || String(err); A3_ALL = {}; on(); });
  const xr = _a3ExtraRef(cid);
  const xf = s => { A3_EXTRA[cid] = s.val() || {}; on(); };
  xr.on('value', xf);
  A3_TC_WATCH = [[ref, fn], [xr, xf]];
  loadNbPw(cid).then(on);
  loadA3Open(cid).then(on);
}
function a3TcStop(){
  if(A3_TC_WATCH){ A3_TC_WATCH.forEach(([r, f]) => r.off('value', f)); A3_TC_WATCH = null; }
  A3_TC_FOR = null;
}
function _a3State(doc){
  if(!doc || !_a3Filled(doc.answers)) return { key: 'none', label: '안 씀', chip: '' };
  if(_a3Filled(doc.answers) >= _a3Req().length) return { key: 'done', label: '다 채움', chip: 'a1-chip-ok' };
  return { key: 'draft', label: '작성 중', chip: 'a1-chip-draft' };
}

function _a3TcStudent(){
  const snum = A3_TC_SNUM;
  const st = STUDENTS.find(s => String(s.number) === String(snum));
  const doc = (A3_ALL || {})[snum] || {};
  const s = _a3State(doc);
  const days = _a3LogDays(doc);
  setTimeout(a3Grow, 0);
  return `<div class="aia-tc-head">
      <button class="btn-sm" data-action="a3-tc-back">← 명단</button>
      <div class="aia-tc-head-title">${esc(snum)} ${esc(st?.name || doc.name || '')}</div>
    </div>
    <div class="a1-stagebar">상태: ${esc(s.label)}${doc.updatedAt ? ' · 마지막 저장 ' + _a3Time(doc.updatedAt) : ''}
      <br><b>기록한 시간</b> — ${days.length ? days.map(esc).join(' · ') : '기록 없음'}</div>
    <div class="a3-wrap">${_a3Sheet(doc.answers, false, `${snum} ${st?.name || doc.name || ''}`)}</div>`;
}

function vTcAssess3(){
  if(typeof A3 === 'undefined') return emptyBox('📝', '평가 자료 파일(js/assess3-data.js)을 불러오지 못했습니다.');
  const cid = TC_CLS?.id;
  if(!cid) return '';
  if(TC_CLS.type !== 'ai') return emptyBox('📝', '인공지능 기초 반에서만 씁니다.');
  if(A3_TC_FOR !== cid){ A3_TC_FOR = cid; setTimeout(() => a3TcStart(cid), 0); }
  if(A3_TC_VIEW === 'student' && A3_TC_SNUM) return _a3TcStudent();

  const stage = a3Stage(cid);
  const seg = ['closed', 'open'].map(k =>
    `<button class="${k === stage ? 'on' : ''}" data-action="a3-stage" data-stage="${k}">${A3_STAGE_LABEL[k]}</button>`).join('');
  const sc = A3.schedule[cid];
  const control = `<div class="a1-stage ${stage === 'closed' ? '' : 'on'}">
    <div><b>단계</b> · ${esc(TC_CLS.label)} — 지금 <b>${A3_STAGE_LABEL[stage]}</b>
      <div class="a1-stage-sub">「작성」으로 열면 학생 메뉴에 3차 수행평가가 나타나고 답안을 쓸 수 있습니다. 시간이 끝나면 「닫힘」으로 바꿉니다 — 쓴 글은 남아 있고, 다음 시간에 다시 열면 이어서 씁니다.</div>
      ${sc ? `<div class="a1-stage-sub">이 반의 일정 — 1차시 ${esc(sc[0])} · 2차시 ${esc(sc[1])}</div>` : ''}</div>
    <div class="a1-seg">${seg}</div>
  </div>
  <div class="a1-stage ${nbHasPw(cid, A3_PW_ID) ? 'on' : ''}">
    <div><b>입장 비밀번호</b> · ${nbHasPw(cid, A3_PW_ID) ? '🔒 <b>정해 둠</b>' : '없음'}
      <div class="a1-stage-sub">${nbHasPw(cid, A3_PW_ID)
        ? '학생은 비밀번호를 넣어야 문항과 답안이 보입니다 (확인용 test 계정 포함). 탭을 닫으면 다시 묻습니다.'
        : '정하지 않으면 「작성」으로 열었을 때 학생이 바로 들어옵니다.'}
        비밀번호는 반마다 따로 정하고, 원래 글자는 저장하지 않습니다 — 잊으면 새로 정하면 됩니다.</div></div>
    <div><button class="btn-s" data-action="a3-set-pw">🔑 비밀번호 ${nbHasPw(cid, A3_PW_ID) ? '바꾸기' : '정하기'}</button></div>
  </div>`;
  const title = `<div class="aia-tc-head"><div class="aia-tc-head-title">📝 3차 수행평가 · ${esc(A3.title)}</div></div>`;
  if(A3_ALL === null) return `${title}${control}<div class="ml-sub-explain">⏳ 답안을 불러오는 중…</div>`;

  const all = A3_ALL || {}, extra = A3_EXTRA[cid] || {};
  const total = _a3Req().length;
  const sts = [...STUDENTS].sort((a, b) => String(a.number).localeCompare(String(b.number)));
  const cnt = { none: 0, draft: 0, done: 0 };
  const rows = sts.map(st => {
    const doc = all[st.number];
    const s = _a3State(doc);
    cnt[s.key]++;
    const ex = !!extra[st.number];
    return `<tr class="a1-row-${s.key}">
      <td>${esc(st.number)}</td><td>${esc(st.name)}</td>
      <td>${esc(String((doc?.answers || {}).case || '').slice(0, 40))}</td>
      <td class="n">${doc ? _a3Filled(doc.answers) : 0} / ${total}</td>
      <td>${s.chip ? `<span class="a1-chip ${s.chip}">${s.label}</span>` : `<span class="a1-dim">${s.label}</span>`}</td>
      <td class="n">${doc ? esc(_a3LogDays(doc).join(' · ') || (doc.updatedAt ? _a3Time(doc.updatedAt) : '')) : ''}</td>
      <td><button class="btn-xs ${ex ? 'on' : ''}" data-action="a3-extra" data-snum="${esc(st.number)}">${ex ? '🔓 따로 열림 — 닫기' : '따로 열기'}</button></td>
      <td>${doc ? `<button class="btn-xs" data-action="a3-tc-view" data-snum="${esc(st.number)}">답안 →</button>` : ''}</td>
    </tr>`;
  }).join('');

  return `${title}${control}
    ${A3_TC_ERR ? `<div class="a1-notice err">답안을 불러오지 못했습니다 — ${esc(A3_TC_ERR)}</div>` : ''}
    <div class="a1-stats">
      <div class="stat-card"><div class="stat-num">${sts.length}</div><div class="stat-label">전체</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--ok,#16a34a)">${cnt.done}</div><div class="stat-label">다 채움</div></div>
      <div class="stat-card"><div class="stat-num" style="color:#3b82f6">${cnt.draft}</div><div class="stat-label">작성 중</div></div>
      <div class="stat-card"><div class="stat-num">${cnt.none}</div><div class="stat-label">안 씀</div></div>
    </div>
    <div class="a1-stage-sub" style="margin:6px 2px">제출 단추는 없습니다. 학생이 쓰는 대로 저장되고 저장한 시각이 「기록한 시간」에 날마다 처음~마지막으로 남습니다. 「따로 열기」 — 결석한 학생만 단계가 닫혀 있어도 답안을 쓸 수 있게 합니다. 끝나면 다시 눌러 닫습니다.</div>
    <div style="overflow-x:auto"><table class="tbl aia-tc-table a1-tc-table">
      <thead><tr><th>학번</th><th>이름</th><th>활용 사례</th><th>채운 칸</th><th>상태</th><th>기록한 시간</th><th>결석자</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
}
