/* ═══════════════════════════════════════
   views/assess3.js — 📝 3차 수행평가 (인공지능 기초 · 논술형 15점)

   내용(안내 · 채점 기준 · 사례 · 준비 칸)은 js/assess3-data.js 에 있습니다.
   화면 틀과 스타일은 1차 수행평가(views/assess1.js)의 것을 그대로 씁니다.

   단계 — 선생님이 반마다 엽니다
     closed  닫힘   학생 메뉴에 보이지 않음
     prep    준비   준비 칸을 씀 (칸마다 자동 저장 · 한 칸 80자 · 붙여넣기 안 됨)
     (작성 단계는 11/27 전에 붙입니다 — 준비 내용을 옆에 두고 답안을 씀)

   저장 (1차와 같은 가지 — 규칙을 다시 배포하지 않습니다)
     aiactivity/submissions/{cid}/assess3Open            : 'closed' | 'prep'
     aiactivity/submissions/{cid}/assess3Extra/{학번}     : true   — 결석한 학생만 따로 준비를 엶
     aiactivity/submissions/{cid}/assess3/{학번}          : { name, prep:{칸:글}, prepAt }
   · 입력은 칸 단위로 보냅니다(prep/case 만 갱신) — 불러오기에 실패한 채로 써도 앞의 글을 덮지 않습니다.
═══════════════════════════════════════ */

const A3_STAGE_LABEL = { closed: '닫힘', prep: '준비' };

let A3_OPEN       = {};      // { [cid]: 'closed' | 'prep' }
let A3_EXTRA      = {};      // { [cid]: { [학번]: true } }
let A3_OPEN_WATCH = null;    // { cid, refs:[[ref, fn]] }
// 학생
let A3_FOR        = null;
let A3_LOADING    = false;
let A3_LOAD_ERR   = '';
let A3_READY      = false;
let A3_DOC        = null;
let A3_ANS        = {};
let A3_TOUCHED    = new Set();
let A3_DIRTY      = false;
let A3_SAVING     = false;
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
// 지금 준비 칸을 쓸 수 있는가
function _a3CanPrep(cid){ return a3Stage(cid) === 'prep' || _a3MyExtra(cid) || (_a3IsTest() && a3Stage(cid) === 'closed'); }
function _a3Fields(){ return A3.items.flatMap(it => it.fields); }
function _a3Filled(prep){ return _a3Fields().filter(f => String((prep || {})[f.id] || '').trim()).length; }
function _a3Need(){ return _a3Fields().filter(f => !f.optional).length; }

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

// 다시 그려도 쓰던 칸의 커서와 스크롤을 잃지 않게
function a3RenderKeep(){
  const ae = document.activeElement;
  const fid = ae && ae.dataset ? ae.dataset.a3fid : null;
  const sel = fid ? [ae.selectionStart, ae.selectionEnd] : null;
  const content = document.querySelector('.content');
  const cTop = content ? content.scrollTop : 0, wTop = window.scrollY;
  render();
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
// 문항마다 그 문항의 결격 사유 — 1차와 같은 상자
function _a3Crit(it){
  return `<div class="a1-crit"><div class="ct">📌 채점 기준 <span>— 아래에 해당하면 감점 (1가지면 4점 · 2가지 이상이면 3점)</span></div>
    ${it.crit.map(x => `<div class="cl"><span class="mk">${esc(x[0])}</span><span>${_a3Md(x[1])}</span></div>`).join('')}</div>`;
}
function _a3ItemHead(it, extra){
  return `<div class="a1-qh"><span class="a1-qn">${esc(it.no)}.</span> ${esc(it.title)} <span class="mla-pt">[${it.pt}점]</span>${extra || ''}</div>`;
}

/* 🗂 사례 카드 — 1차의 「문제 상황 카드」와 같은 팝업 (js/assess3-data.js 의 A3_CARDS).
   화면을 다시 그려도 팝업은 body 에 따로 남습니다. */
let A3_CARD_F = '*';
function _a3CardsBar(can){
  if(typeof A3_CARDS === 'undefined') return '';
  return `<button class="a1-cardsbar" data-action="a3-cards">
    <span class="ic">🗂</span>
    <span class="tx"><b>사례 카드 ${A3_CARDS.cards.length}장 보기</b><small>교과서 · 모둠 토론 · 기사에서 고를 수 있습니다 · 직접 찾은 사례를 써도 됩니다 (점수와는 관계없음)</small></span>
    <span class="go">열기 ›</span></button>`;
}
function _a3CardsHtml(){
  const fs = A3_CARDS.fields;
  const list = A3_CARDS.cards.map((c, i) => ({ c, i })).filter(x => A3_CARD_F === '*' || x.c.field === A3_CARD_F);
  const can = !!(SEL_CLS && VIEW === 'student' && _a3CanPrep(SEL_CLS.id) && A3_READY);
  const note = (A3_CARDS.note || {})[A3_CARD_F];
  return `<div class="a1-cm">
    <div class="a1-cm-h"><b>🗂 사례 카드 <small>${A3_CARDS.cards.length}장</small></b><button class="a1-cm-x" data-action="a3-cards-close">✕ 닫기</button></div>
    <div class="a1-cm-note">📣 사례는 <b>${A3.caseRule.map(esc).join(' · ')}</b>.<br>
      카드에서 고르거나 <b>직접 찾은 사례</b>를 써도 됩니다. 「이 사례로 정하기」를 누르면 1번의 「활용 사례」와 「출처」 칸에 들어갑니다.</div>
    <div class="a1-cm-f">${['*', ...fs].map(f => `<button class="${f === A3_CARD_F ? 'on' : ''}" data-action="a3-cards-f" data-f="${esc(f)}">${f === '*' ? '전체' : esc(f)}</button>`).join('')}</div>
    ${note ? `<div class="a1-cm-note">${esc(note)}</div>` : ''}
    <div class="a1-cm-grid">${list.map(({ c, i }) => `<div class="a1-cc"><div class="fl">${esc(c.field)}</div><div class="t">${esc(c.title)}</div>
      <div class="s">${esc(c.summary)}</div>
      ${c.url ? `<a class="src" href="${esc(c.url)}" target="_blank" rel="noopener">📰 기사 읽기<br><span>${esc(c.src)}</span></a>`
              : `<div class="src">📖 ${esc(c.src)}</div>`}
      ${can ? `<button class="a1-cc-copy" data-action="a3-cards-pick" data-i="${i}">✔ 이 사례로 정하기</button>` : ''}</div>`).join('')}</div>
  </div>`;
}
function a3CardsOpen(){
  a3CardsClose();
  const ov = document.createElement('div');
  ov.id = 'a3-cards-ov'; ov.className = 'modal-ov a1-cards-ov'; ov.dataset.action = 'a3-cards-close';
  ov.innerHTML = _a3CardsHtml();
  document.body.appendChild(ov);
}
function a3CardsRepaint(){ const ov = document.getElementById('a3-cards-ov'); if(ov) ov.innerHTML = _a3CardsHtml(); }
function a3CardsClose(){ const ov = document.getElementById('a3-cards-ov'); if(ov) ov.remove(); }

function _a3ScaleTable(){
  const mk = '㉮㉯㉰㉱';
  const rows = A3.scale.map(s => `<tr><th>${esc(s.no)}<br><small>${esc(s.name)}</small></th>
    <td class="df">${s.defects.map((d, i) => `<div>${mk[i]} ${esc(d)}</div>`).join('')}</td>
    ${s.levels.map(l => `<td>${esc(l)}</td>`).join('')}</tr>`).join('');
  const list = (t, a) => `<div class="a1-rule"><b>${t}</b>${a.map(x => `<div>∙ ${esc(x)}</div>`).join('')}</div>`;
  return `<details class="mla-rubric"><summary>📊 채점 기준 보기</summary>
    <div class="mla-rubric-body">
      <div class="a1-rule"><b>채점 원칙</b><div>${esc(A3.principle)}</div></div>
      <div style="overflow-x:auto"><table class="tbl a1-scale">
      <thead><tr><th>문항</th><th>결격 사유</th><th>5점</th><th>4점</th><th>3점</th><th>2점</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${list('성의 없는 답안 — 결격 사유와 관계없이 그 문항 3점', A3.sloppy)}
      ${list('감점하지 않는 것', A3.nopenalty)}
      <div class="a1-rule"><div>${esc(A3.base)}</div></div>
    </div></details>`;
}
function _a3RefsHtml(){
  const r = A3.refs;
  const dl = a => a.map(x => `<div class="a3-ref-row"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('');
  return `<details class="mla-rubric"><summary>📖 참고 — 윤리적 딜레마 · 6가지 윤리적 쟁점 · 10대 핵심 요건 · 이해관계자</summary>
    <div class="mla-rubric-body">
      <div class="a1-rule"><b>${esc(r.dilemma[0])}</b><div>${esc(r.dilemma[1])}</div></div>
      <div class="a1-rule"><b>6가지 윤리적 쟁점 (교과서 179쪽)</b>${dl(r.issues)}</div>
      <div class="a1-rule"><b>10대 핵심 요건 (교과서 190쪽)</b><div>${esc(r.reqs)}</div></div>
      <div class="a1-rule"><b>이해관계자의 역할 (교과서 185쪽)</b>${dl(r.roles)}</div>
    </div></details>`;
}

/* ─────────── 학생 ─────────── */
async function a3LoadMine(){
  const cid = SEL_CLS?.id, snum = ST_USER?.number;
  if(!cid || !snum) return;
  A3_LOADING = true; A3_LOAD_ERR = ''; A3_READY = false;
  try {
    const [s] = await withTimeout(Promise.all([_a3Ref(cid, snum).get(), loadA3Open(cid)]), 12000, '내 준비 내용 불러오기');
    A3_DOC = s.exists() ? s.val() : null;
    A3_ANS = { ...((A3_DOC && A3_DOC.prep) || {}) };
    A3_TOUCHED = new Set(); A3_DIRTY = false; A3_SAVE_ERR = '';
    A3_READY = true;
  } catch(err){
    A3_LOAD_ERR = err.message || String(err);
  } finally {
    A3_FOR = cid + '/' + snum;
    A3_LOADING = false;
    render();
  }
}

function _a3Field(f, editable, ans){
  const v = String((ans || {})[f.id] || '');
  const label = `<div class="a1-flabel">${esc(f.label)}</div>`;
  if(f.type === 'choice'){
    const btns = f.options.map(o => `<button class="${v === o ? 'on' : ''}" data-action="a3-choice" data-fid="${f.id}" data-val="${esc(o)}" ${editable ? '' : 'disabled'}>${v === o ? '◉' : '○'} ${esc(o)}</button>`).join('');
    return `${label}<div class="a1-choice">${btns}</div>`;
  }
  return `${label}<div class="a3-inwrap"><input type="text" class="a1-in" data-a3fid="${f.id}" value="${esc(v)}" maxlength="${A3.prepMax}" autocomplete="off" spellcheck="false"${editable ? '' : ' readonly'}/>
    <span class="a1-count" data-a3count="${f.id}">${v.length}/${A3.prepMax}자</span></div>`;
}

function _a3StatusHtml(){
  let s1;
  if(A3_SAVE_ERR) s1 = `<span class="err">⚠ 저장되지 않았습니다 — ${esc(A3_SAVE_ERR)}. 인터넷 연결을 확인하고 [저장]을 다시 누르세요.</span>`;
  else if(A3_SAVING) s1 = '<span class="s1">💾 저장 중…</span>';
  else if(A3_DIRTY) s1 = '<span class="s1">입력 중 — 곧 자동 저장됩니다</span>';
  else if(A3_DOC && A3_DOC.prepAt) s1 = `<span class="ok">💾 저장됨 ${_a3Time(A3_DOC.prepAt)} — 선생님 화면에 표시되어 있습니다.</span>`;
  else s1 = '<span class="s1">아직 저장한 내용이 없습니다</span>';
  const n = _a3Filled(A3_ANS), all = _a3Fields().length;
  return `<div>${s1}</div><div><span class="s1">채운 칸 ${n} / ${all}</span></div>`;
}
function a3PaintStatus(){
  const el = document.getElementById('a3-status');
  if(el) el.innerHTML = _a3StatusHtml();
  document.querySelectorAll('[data-a3busy]').forEach(b => { b.disabled = !!A3_SAVING; });
}

function vStAssess3(){
  if(typeof A3 === 'undefined') return emptyBox('📝', '평가 자료를 불러오지 못했습니다. 새로고침 해 주세요.');
  const cid = SEL_CLS?.id, snum = ST_USER?.number;
  if(!cid || !snum) return '';
  if(A3_FOR !== cid + '/' + snum && !A3_LOADING){ A3_LOADING = true; setTimeout(a3LoadMine, 0); }
  if(A3_LOADING) return `<div class="section"><div class="ml-sub-explain">⏳ 내 준비 내용을 불러오는 중…</div></div>`;
  if(A3_LOAD_ERR){
    return `<div class="section">
      <div class="a1-notice err"><b>준비 내용을 불러오지 못했습니다.</b> (${esc(A3_LOAD_ERR)})<br>
      불러오기 전에는 쓸 수 없습니다. 인터넷 연결을 확인하고 다시 시도하세요.</div>
      <button class="btn-p btn-sm" data-action="a3-retry">다시 불러오기</button></div>`;
  }

  const stage = a3Stage(cid);
  const can = _a3CanPrep(cid) && A3_READY;
  const sc = A3.schedule[cid];
  const testNote = (_a3IsTest() && stage === 'closed')
    ? `<div class="a1-stagebar test">🔍 확인용 계정 — 학생에게는 지금 <b>닫혀</b> 있습니다. 여기서 쓴 내용도 저장됩니다.</div>` : '';
  const stageBar = can
    ? `<div class="a1-stagebar">지금은 <b>준비 시간</b>입니다. 1번의 사례 카드를 보고 사례를 정한 뒤, 문항마다 준비 칸에 메모하세요.${_a3MyExtra(cid) && stage !== 'prep' ? ' (선생님이 따로 열어 준 준비 시간)' : ''}</div>`
    : `<div class="a1-stagebar">준비 시간이 끝났습니다. 준비 내용은 고칠 수 없고, 작성 시간에 다시 볼 수 있습니다.</div>`;

  const items = A3.items.map(it => `<div class="a1-q ${can ? '' : 'locked'}">
      ${_a3ItemHead(it, can ? '' : '<span class="a1-lock">🔒 지금은 고칠 수 없음</span>')}
      <div class="a1-qb">
        <div class="a1-ask">${esc(it.ask)}</div>
        ${_a3Crit(it)}${it.no === '1' ? _a3CardsBar(can) : ''}
        <div class="a3-prepnote">✏️ 준비 — 작성 시간에 쓸 내용을 칸마다 메모합니다 (한 칸 ${A3.prepMax}자 · 점수에 넣지 않음)</div>
        ${it.fields.map(f => _a3Field(f, can, A3_ANS)).join('')}
      </div></div>`).join('');

  return `<div class="a1-wrap">
    <div class="a1-head">
      <div><div class="a1-title">📝 3차 수행평가</div><div class="a1-sub">${esc(A3.title)} · ${A3.total}점</div></div>
    </div>
    ${sc ? `<div class="a3-sched"><div><small>준비</small><b>${esc(sc.prep)}</b></div><div><small>작성</small><b>${esc(sc.write)}</b></div>
      <div class="tag">컴퓨터로 작성</div><div class="tag no">생성형 인공지능 사용 금지</div></div>` : ''}
    <div class="a1-notice"><b>유의 사항</b>${A3.notice.map(n => `<div>∙ ${esc(n)}</div>`).join('')}</div>
    ${_a3ScaleTable()}${_a3RefsHtml()}
    ${testNote}${stageBar}
    <div class="a1-topic">${esc(A3.title)} <span class="mla-pt">[총 ${A3.total}점]</span></div>
    ${items}
    <div class="a1-bar">
      <div class="a1-status" id="a3-status">${_a3StatusHtml()}</div>
      <button class="btn-p btn-sm" data-action="a3-save" data-a3busy ${A3_SAVING || !can ? 'disabled' : ''}>💾 저장</button>
    </div>
  </div>`;
}

/* ─────────── 선생님 ─────────── */
function a3TcStart(cid){
  a3TcStop();
  A3_TC_FOR = cid; A3_ALL = null; A3_TC_ERR = '';
  const ref = _a3Ref(cid);
  const fn = s => {
    A3_ALL = s.val() || {};
    if(VIEW === 'teacher' && TC_TAB === 'assess3' && TC_CLS?.id === cid) render();
  };
  ref.on('value', fn, err => {
    A3_TC_ERR = err.message || String(err); A3_ALL = {};
    if(VIEW === 'teacher' && TC_TAB === 'assess3') render();
  });
  // 따로 열어 준 학생 — 단추를 누르면 바로 표에 보이게
  const xr = _a3ExtraRef(cid);
  const xf = s => { A3_EXTRA[cid] = s.val() || {}; if(VIEW === 'teacher' && TC_TAB === 'assess3' && TC_CLS?.id === cid) render(); };
  xr.on('value', xf);
  A3_TC_WATCH = [[ref, fn], [xr, xf]];
  loadA3Open(cid).then(() => { if(VIEW === 'teacher' && TC_TAB === 'assess3') render(); });
}
function a3TcStop(){
  if(A3_TC_WATCH){ A3_TC_WATCH.forEach(([r, f]) => r.off('value', f)); A3_TC_WATCH = null; }
  A3_TC_FOR = null;
}

function _a3TcStudent(){
  const snum = A3_TC_SNUM;
  const st = STUDENTS.find(s => String(s.number) === String(snum));
  const doc = (A3_ALL || {})[snum] || {};
  const groups = A3.items.map(it => `<div class="a1-q">${_a3ItemHead(it)}
    <div class="a1-qb"><div class="a1-ask">${esc(it.ask)}</div>${it.fields.map(f => {
      const v = String((doc.prep || {})[f.id] || '');
      return `<div class="a1-flabel">${esc(f.label)}</div><div class="a1-ans ${v ? '' : 'empty'}">${v ? esc(v) : '(비어 있음)'}</div>`;
    }).join('')}</div></div>`).join('');
  return `<div class="aia-tc-head">
      <button class="btn-sm" data-action="a3-tc-back">← 명단</button>
      <div class="aia-tc-head-title">${esc(snum)} ${esc(st?.name || doc.name || '')} · 준비 내용</div>
    </div>
    <div class="a1-stagebar">채운 칸 ${_a3Filled(doc.prep)} / ${_a3Fields().length}${doc.prepAt ? ' · 마지막 저장 ' + _a3Time(doc.prepAt) : ''}</div>
    ${groups}`;
}

function vTcAssess3(){
  if(typeof A3 === 'undefined') return emptyBox('📝', '평가 자료 파일(js/assess3-data.js)을 불러오지 못했습니다.');
  const cid = TC_CLS?.id;
  if(!cid) return '';
  if(TC_CLS.type !== 'ai') return emptyBox('📝', '인공지능 기초 반에서만 씁니다.');
  if(A3_TC_FOR !== cid){ A3_TC_FOR = cid; setTimeout(() => a3TcStart(cid), 0); }
  if(A3_TC_VIEW === 'student' && A3_TC_SNUM) return _a3TcStudent();

  const stage = a3Stage(cid);
  const seg = ['closed', 'prep'].map(k =>
    `<button class="${k === stage ? 'on' : ''}" data-action="a3-stage" data-stage="${k}">${A3_STAGE_LABEL[k]}</button>`).join('');
  const sc = A3.schedule[cid];
  const control = `<div class="a1-stage ${stage === 'closed' ? '' : 'on'}">
    <div><b>단계</b> · ${esc(TC_CLS.label)} — 지금 <b>${A3_STAGE_LABEL[stage]}</b>
      <div class="a1-stage-sub">「준비」로 열면 학생 메뉴에 3차 수행평가가 나타나고 준비 칸을 쓸 수 있습니다. 「닫힘」으로 바꾸면 더 고칠 수 없습니다.</div>
      ${sc ? `<div class="a1-stage-sub">이 반의 일정 — 준비 ${esc(sc.prep)} · 작성 ${esc(sc.write)} (작성 화면은 11/27 전에 붙습니다)</div>` : ''}</div>
    <div class="a1-seg">${seg}</div>
  </div>`;
  const title = `<div class="aia-tc-head"><div class="aia-tc-head-title">📝 3차 수행평가 · ${esc(A3.title)}</div></div>`;
  if(A3_ALL === null) return `${title}${control}<div class="ml-sub-explain">⏳ 준비 내용을 불러오는 중…</div>`;

  const all = A3_ALL || {}, extra = A3_EXTRA[cid] || {};
  const total = _a3Fields().length, need = _a3Need();
  const sts = [...STUDENTS].sort((a, b) => String(a.number).localeCompare(String(b.number)));
  const cnt = { none: 0, part: 0, done: 0 };
  const rows = sts.map(st => {
    const doc = all[st.number];
    const n = doc ? _a3Filled(doc.prep) : 0;
    const key = !n ? 'none' : (n >= need ? 'done' : 'part');
    cnt[key]++;
    const chip = key === 'done' ? '<span class="a1-chip a1-chip-ok">다 채움</span>'
      : key === 'part' ? '<span class="a1-chip a1-chip-draft">쓰는 중</span>' : '<span class="a1-dim">안 씀</span>';
    const ex = !!extra[st.number];
    return `<tr class="a1-row-${key === 'done' ? 'done' : key === 'part' ? 'draft' : 'none'}">
      <td>${esc(st.number)}</td><td>${esc(st.name)}</td>
      <td>${esc(String((doc?.prep || {}).case || ''))}</td>
      <td class="n">${n} / ${total}</td><td>${chip}</td>
      <td class="n">${doc?.prepAt ? _a3Time(doc.prepAt) : ''}</td>
      <td><button class="btn-xs ${ex ? 'on' : ''}" data-action="a3-extra" data-snum="${esc(st.number)}">${ex ? '🔓 따로 열림 — 닫기' : '따로 열기'}</button></td>
      <td>${doc ? `<button class="btn-xs" data-action="a3-tc-view" data-snum="${esc(st.number)}">준비 내용 →</button>` : ''}</td>
    </tr>`;
  }).join('');

  return `${title}${control}
    ${A3_TC_ERR ? `<div class="a1-notice err">준비 내용을 불러오지 못했습니다 — ${esc(A3_TC_ERR)}</div>` : ''}
    <div class="a1-stats" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card"><div class="stat-num">${sts.length}</div><div class="stat-label">전체</div></div>
      <div class="stat-card"><div class="stat-num">${cnt.done}</div><div class="stat-label">다 채움</div></div>
      <div class="stat-card"><div class="stat-num">${cnt.part}</div><div class="stat-label">쓰는 중</div></div>
      <div class="stat-card"><div class="stat-num">${cnt.none}</div><div class="stat-label">안 씀</div></div>
    </div>
    <div class="a1-stage-sub" style="margin:6px 2px">「따로 열기」 — 준비 시간에 결석한 학생만 단계가 닫혀 있어도 준비 칸을 쓸 수 있게 합니다. 끝나면 다시 눌러 닫습니다.</div>
    <div style="overflow-x:auto"><table class="tbl aia-tc-table a1-tc-table">
      <thead><tr><th>학번</th><th>이름</th><th>활용 사례</th><th>채운 칸</th><th>상태</th><th>마지막 저장</th><th>결석자</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
}
