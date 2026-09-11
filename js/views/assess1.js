/* ═══════════════════════════════════════
   views/assess1.js — 📝 1차 수행평가 (인공지능 기초 · 논술형)

   문항 · 조건 · 제시어 · 채점 기준 · 유의 사항은 js/assess1-data.js 에 있습니다.
   그 파일은 verify/assess1-docs.py 가 종이 평가지와 같은 글로 만듭니다 — 직접 고치지 마세요.

   저장 (쓰기가 열려 있는 가지라 Firebase 규칙을 다시 배포하지 않습니다)
     aiactivity/submissions/{cid}/assess1Open        : 'closed' | 'q13' | 'q45' | 'all'  학생 작성 범위
     aiactivity/submissions/{cid}/assess1/{학번}      : { name, answers:{칸:글}, updatedAt,
                                                        submitted:{ answers, at } }
   · 입력은 칸 단위로 저장합니다(answers/q4 만 갱신). 불러오기가 실패한 채로 쓰더라도
     앞 시간에 쓴 답을 덮어쓰지 않게 하려는 것입니다.
   · '제출' 은 그 순간의 답 전체를 submitted 에 따로 남깁니다. 채점은 제출본으로 합니다.
     제출 뒤에는 서버에서 다시 읽어 같은지 확인한 다음에만 '제출 확인' 을 띄웁니다.
═══════════════════════════════════════ */

const A1_STAGES = { closed: [], q13: ['1', '2', '3'], q45: ['4', '5'], all: ['1', '2', '3', '4', '5'] };
const A1_STAGE_LABEL = { closed: '닫힘', q13: '1 ~ 3번', q45: '4 ~ 5번', all: '1 ~ 5번 전체' };

let A1_OPEN       = {};      // { [cid]: stage }
let A1_OPEN_WATCH = null;    // { cid, ref, fn } — 학생 화면이 작성 범위 변경을 바로 받도록
// 학생
let A1_FOR        = null;    // 불러온 대상 'cid/학번'
let A1_LOADING    = false;
let A1_LOAD_ERR   = '';
let A1_READY      = false;   // 불러오기에 성공해야 입력을 받습니다
let A1_DOC        = null;    // 서버에 있는 내 문서
let A1_ANS        = {};      // 화면의 답 { 칸id: 글 }
let A1_TOUCHED    = new Set();   // 아직 서버에 안 보낸 칸
let A1_DIRTY      = false;
let A1_SAVING     = null;    // null | 'save' | 'submit'
let A1_PENDING    = false;
let A1_SAVE_ERR   = '';
let A1_SAVE_TIMER = null;
// 선생님
let A1_TC_FOR     = null;    // 구독 중인 cid
let A1_TC_WATCH   = null;    // { ref, fn }
let A1_ALL        = null;    // { [학번]: 문서 } — null 이면 불러오는 중
let A1_TC_ERR     = '';
let A1_TC_VIEW    = 'list';  // 'list' | 'student'
let A1_TC_SNUM    = null;

/* ─────────── 공통 ─────────── */
function _a1Ref(cid, snum){ return db.ref(`aiactivity/submissions/${cid}/assess1${snum ? '/' + snum : ''}`); }
function _a1OpenRef(cid){ return db.ref(`aiactivity/submissions/${cid}/assess1Open`); }
function _a1Time(iso){
  if(!iso) return '';
  const d = new Date(iso), p = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function _a1IsTest(){ return !!ST_USER && String(ST_USER.number).toLowerCase() === 'test'; }
function a1Stage(cid){ return A1_OPEN[cid] || 'closed'; }
function a1Visible(cls){ return cls?.type === 'ai' && (a1Stage(cls.id) !== 'closed' || _a1IsTest()); }
function _a1Fields(){ return A1.items.flatMap(it => it.fields); }
function _a1Same(a, b){
  a = a || {}; b = b || {};
  return _a1Fields().every(f => String(a[f.id] || '').trim() === String(b[f.id] || '').trim());
}
function _a1Len(ans, it){ return it.fields.reduce((n, f) => n + String((ans || {})[f.id] || '').trim().length, 0); }
// 학생이 지금 쓸 수 있는 문항 — 확인용 계정은 닫혀 있어도 전체
function _a1EditableNos(cid){
  const st = a1Stage(cid);
  if(st === 'closed' && _a1IsTest()) return A1_STAGES.all;
  return A1_STAGES[st] || [];
}

async function loadA1Open(cid){
  if(!/^ai-/.test(cid || '')) return 'closed';
  try {
    const s = await _a1OpenRef(cid).get();
    const v = s.exists() ? s.val() : 'closed';
    A1_OPEN[cid] = A1_STAGES[v] ? v : 'closed';
  } catch(err){
    console.warn('[1차 수행평가] 작성 범위 로드 실패:', err.message || err);
    if(!A1_OPEN[cid]) A1_OPEN[cid] = 'closed';
  }
  return A1_OPEN[cid];
}

// 선생님이 범위를 바꾸면 학생 화면이 새로고침 없이 따라오게
function a1WatchOpen(cid){
  if(!/^ai-/.test(cid || '')) return;
  if(A1_OPEN_WATCH && A1_OPEN_WATCH.cid === cid) return;
  a1UnwatchOpen();
  const ref = _a1OpenRef(cid);
  const fn = s => {
    const v = s.val();
    const nv = A1_STAGES[v] ? v : 'closed';
    if(A1_OPEN[cid] === nv) return;
    A1_OPEN[cid] = nv;
    if(VIEW !== 'student') return;
    (A1_DIRTY ? a1SaveNow(true) : Promise.resolve()).then(a1RenderKeep);
  };
  ref.on('value', fn, err => console.warn('[1차 수행평가] 작성 범위 구독 실패:', err.message || err));
  A1_OPEN_WATCH = { cid, ref, fn };
}
function a1UnwatchOpen(){
  if(A1_OPEN_WATCH){ A1_OPEN_WATCH.ref.off('value', A1_OPEN_WATCH.fn); A1_OPEN_WATCH = null; }
}

// 다시 그려도 쓰던 칸의 커서와 스크롤을 잃지 않게
function a1RenderKeep(){
  const ae = document.activeElement;
  const fid = ae && ae.dataset ? ae.dataset.a1fid : null;
  const sel = fid ? [ae.selectionStart, ae.selectionEnd, ae.scrollTop] : null;
  const content = document.querySelector('.content');
  const cTop = content ? content.scrollTop : 0, wTop = window.scrollY;
  render();
  const c2 = document.querySelector('.content');
  if(c2) c2.scrollTop = cTop;
  window.scrollTo(0, wTop);
  if(fid){
    const el = document.querySelector(`[data-a1fid="${fid}"]`);
    if(el && !el.readOnly && !el.disabled){
      el.focus({ preventScroll: true });
      try { el.setSelectionRange(sel[0], sel[1]); } catch(e){}
      el.scrollTop = sel[2];
    }
  }
}

/* ─────────── 학생 ─────────── */
async function a1LoadMine(){
  const cid = SEL_CLS?.id, snum = ST_USER?.number;
  if(!cid || !snum) return;
  A1_LOADING = true; A1_LOAD_ERR = ''; A1_READY = false;
  try {
    const [s] = await withTimeout(Promise.all([_a1Ref(cid, snum).get(), loadA1Open(cid)]), 12000, '내 답안 불러오기');
    A1_DOC = s.exists() ? s.val() : null;
    A1_ANS = { ...((A1_DOC && A1_DOC.answers) || {}) };
    A1_TOUCHED = new Set(); A1_DIRTY = false; A1_SAVE_ERR = '';
    A1_READY = true;
  } catch(err){
    A1_LOAD_ERR = err.message || String(err);
  } finally {
    A1_FOR = cid + '/' + snum;
    A1_LOADING = false;
    render();
  }
}

function _a1Field(f, editable){
  const v = A1_ANS[f.id] || '';
  const ro = editable ? '' : ' readonly';
  const label = f.label ? `<div class="a1-flabel">${esc(f.label)}</div>` : '';
  if(f.type === 'choice'){
    const btns = f.options.map(o => `<button class="${v === o ? 'on' : ''}" data-action="a1-choice" data-fid="${f.id}" data-val="${esc(o)}" ${editable ? '' : 'disabled'}>${v === o ? '◉' : '○'} ${esc(o)}</button>`).join('');
    return `${label}<div class="a1-choice">${btns}</div>`;
  }
  if(f.type === 'text'){
    return `${label}<input type="text" class="a1-in" data-a1fid="${f.id}" value="${esc(v)}" autocomplete="off"${ro}/>`;
  }
  return `${label}<textarea class="a1-area" data-a1fid="${f.id}" rows="${f.rows || 8}" spellcheck="false"${ro}>${esc(v)}</textarea>
    <span class="a1-count" data-a1count="${f.id}">${v.length}자</span>`;
}

function _a1Keywords(it){
  if(!it.kw || !it.kw.length) return '';
  return `<div class="a1-kw"><span class="t">제시어</span>${it.kw.map(w => `<span class="w">${esc(w)}</span>`).join('')}</div>`;
}
function _a1Conds(it){
  if(!it.conds || !it.conds.length) return '';
  return `<div class="a1-cond"><div class="ct">&lt;조건&gt;</div>${it.conds.map(c => `<div class="cl"><span>∙</span><span>${esc(c)}</span></div>`).join('')}</div>`;
}
function _a1ItemHead(it, extra){
  return `<div class="a1-qh"><span class="a1-qn">${esc(it.no)}.</span> ${esc(it.title)}${it.showPt ? ` <span class="mla-pt">[${it.pt}점]</span>` : ''}${extra || ''}</div>`;
}

function _a1ScaleTable(){
  const nums = { '①': '1 · 2번', '②': '3번', '③': '4번', '④': '5번' };
  const rows = A1.scale.map(s => `<tr><th>${esc(s.where || nums[s.no] || '')}<br><small>${esc(s.no)} ${esc(s.name)}</small></th>${s.levels.map(l => `<td>${esc(l[1])}</td>`).join('')}</tr>`).join('');
  return `<details class="mla-rubric"><summary>📊 채점 기준 보기</summary>
    <div class="mla-rubric-body"><div style="overflow-x:auto"><table class="tbl a1-scale">
      <thead><tr><th>문항</th><th>5점</th><th>4점</th><th>3점</th><th>2점</th></tr></thead><tbody>${rows}</tbody></table></div></div></details>`;
}

function _a1StatusHtml(){
  let s1;
  if(A1_SAVE_ERR) s1 = `<span class="err">⚠ 저장되지 않았습니다 — ${esc(A1_SAVE_ERR)}. 인터넷 연결을 확인하고 [저장]을 다시 누르세요.</span>`;
  else if(A1_SAVING === 'submit') s1 = '<span class="s1">📤 제출 중…</span>';
  else if(A1_SAVING === 'save') s1 = '<span class="s1">💾 저장 중…</span>';
  else if(A1_DIRTY) s1 = '<span class="s1">입력 중 — 곧 자동 저장됩니다</span>';
  else if(A1_DOC && A1_DOC.updatedAt) s1 = `<span class="s1">💾 저장됨 ${_a1Time(A1_DOC.updatedAt)}</span>`;
  else s1 = '<span class="s1">아직 저장한 내용이 없습니다</span>';
  const sub = A1_DOC && A1_DOC.submitted;
  let s2;
  if(!sub) s2 = '<span class="warn">아직 제출하지 않았습니다 — [제출하기]를 눌러야 선생님 화면에 표시됩니다.</span>';
  else if(!_a1Same(sub.answers, A1_ANS)) s2 = `<span class="warn">⚠ ${_a1Time(sub.at)}에 제출한 뒤 고친 내용이 있습니다 — [제출하기]를 다시 눌러야 반영됩니다.</span>`;
  else s2 = `<span class="ok">✅ 제출 확인 ${_a1Time(sub.at)} — 선생님 화면에 표시되어 있습니다.</span>`;
  return `<div>${s1}</div><div>${s2}</div>`;
}
function a1PaintStatus(){
  const el = document.getElementById('a1-status');
  if(el) el.innerHTML = _a1StatusHtml();
  document.querySelectorAll('[data-a1busy]').forEach(b => { b.disabled = !!A1_SAVING; });
}

function vStAssess1(){
  if(typeof A1 === 'undefined') return emptyBox('📝', '평가 문항을 불러오지 못했습니다. 새로고침 해 주세요.');
  const cid = SEL_CLS?.id, snum = ST_USER?.number;
  if(!cid || !snum) return '';
  if(A1_FOR !== cid + '/' + snum && !A1_LOADING){ A1_LOADING = true; setTimeout(a1LoadMine, 0); }
  if(A1_LOADING) return `<div class="section"><div class="ml-sub-explain">⏳ 내 답안을 불러오는 중…</div></div>`;
  if(A1_LOAD_ERR){
    return `<div class="section">
      <div class="a1-notice err"><b>답안을 불러오지 못했습니다.</b> (${esc(A1_LOAD_ERR)})<br>
      불러오기 전에는 쓸 수 없습니다. 인터넷 연결을 확인하고 다시 시도하세요.</div>
      <button class="btn-p btn-sm" data-action="a1-retry">다시 불러오기</button></div>`;
  }

  const stage = a1Stage(cid);
  const open = _a1EditableNos(cid);
  const testNote = (_a1IsTest() && stage === 'closed')
    ? `<div class="a1-stagebar test">🔍 확인용 계정 — 학생에게는 지금 <b>닫혀</b> 있습니다. 여기서 쓴 내용도 저장됩니다.</div>` : '';
  const stageBar = stage === 'closed' && !_a1IsTest()
    ? `<div class="a1-stagebar">지금은 작성할 수 없습니다. 선생님이 열면 쓸 수 있습니다.</div>`
    : `<div class="a1-stagebar">지금 작성할 문항: <b>${esc(A1_STAGE_LABEL[_a1IsTest() && stage === 'closed' ? 'all' : stage])}</b></div>`;

  const items = A1.items.map(it => {
    const ed = open.includes(it.no) && A1_READY;
    return `<div class="a1-q ${ed ? '' : 'locked'}">
      ${_a1ItemHead(it, ed ? '' : '<span class="a1-lock">🔒 지금은 작성할 수 없음</span>')}
      <div class="a1-qb">
        <div class="a1-ask">${esc(it.ask)}</div>
        ${_a1Keywords(it)}${_a1Conds(it)}
        ${it.fields.map(f => _a1Field(f, ed)).join('')}
      </div></div>`;
  }).join('');

  return `<div class="a1-wrap">
    <div class="a1-head">
      <div><div class="a1-title">📝 1차 수행평가</div><div class="a1-sub">${esc(A1.title)} · ${A1.total}점</div></div>
    </div>
    <div class="a1-notice"><b>유의 사항</b>${A1.notice.map(n => `<div>∙ ${esc(n)}</div>`).join('')}</div>
    ${_a1ScaleTable()}
    ${testNote}${stageBar}
    <div class="a1-topic">${esc(A1.topic)} <span class="mla-pt">[총 ${A1.total}점]</span></div>
    ${items}
    <div class="a1-bar">
      <div class="a1-status" id="a1-status">${_a1StatusHtml()}</div>
      <button class="btn-sm" data-action="a1-save" data-a1busy ${A1_SAVING ? 'disabled' : ''}>💾 저장</button>
      <button class="btn-p btn-sm" data-action="a1-submit" data-a1busy ${A1_SAVING || !open.length ? 'disabled' : ''}>📤 제출하기</button>
    </div>
  </div>`;
}

/* ─────────── 선생님 ─────────── */
function a1TcStart(cid){
  a1TcStop();
  A1_TC_FOR = cid; A1_ALL = null; A1_TC_ERR = '';
  const ref = _a1Ref(cid);
  const fn = s => {
    A1_ALL = s.val() || {};
    if(VIEW === 'teacher' && TC_TAB === 'assess1' && TC_CLS?.id === cid) render();
  };
  ref.on('value', fn, err => {
    A1_TC_ERR = err.message || String(err); A1_ALL = {};
    if(VIEW === 'teacher' && TC_TAB === 'assess1') render();
  });
  A1_TC_WATCH = { ref, fn };
}
function a1TcStop(){
  if(A1_TC_WATCH){ A1_TC_WATCH.ref.off('value', A1_TC_WATCH.fn); A1_TC_WATCH = null; }
  A1_TC_FOR = null;
}

function _a1State(doc){
  if(!doc) return { key: 'none', label: '미응시', chip: '' };
  const sub = doc.submitted;
  if(!sub) return { key: 'draft', label: '작성 중 · 미제출', chip: 'a1-chip-draft' };
  if(!_a1Same(sub.answers, doc.answers)) return { key: 'changed', label: '제출 후 수정 · 미제출', chip: 'a1-chip-warn' };
  return { key: 'done', label: '제출', chip: 'a1-chip-ok' };
}

function vTcAssess1(){
  if(typeof A1 === 'undefined') return emptyBox('📝', '평가 문항 파일(js/assess1-data.js)을 불러오지 못했습니다.');
  const cid = TC_CLS?.id;
  if(!cid) return '';
  if(TC_CLS.type !== 'ai') return emptyBox('📝', '인공지능 기초 반에서만 씁니다.');
  if(A1_TC_FOR !== cid){ A1_TC_FOR = cid; setTimeout(() => a1TcStart(cid), 0); }
  if(A1_TC_VIEW === 'student' && A1_TC_SNUM) return _a1TcStudent();

  const stage = a1Stage(cid);
  const seg = ['closed', 'q13', 'q45', 'all'].map(k =>
    `<button class="${k === stage ? 'on' : ''}" data-action="a1-stage" data-stage="${k}">${A1_STAGE_LABEL[k]}</button>`).join('');
  const control = `<div class="a1-stage ${stage === 'closed' ? '' : 'on'}">
    <div><b>학생 작성 범위</b> · ${esc(TC_CLS.label)} — 지금 <b>${A1_STAGE_LABEL[stage]}</b>
      <div class="a1-stage-sub">바꾸면 학생 화면에 바로 반영됩니다. 반마다 따로 정합니다.</div></div>
    <div class="a1-seg">${seg}</div>
  </div>`;

  if(A1_ALL === null){
    return `<div class="aia-tc-head"><div class="aia-tc-head-title">📝 1차 수행평가 · ${esc(A1.title)}</div></div>${control}
      <div class="ml-sub-explain">⏳ 답안을 불러오는 중…</div>`;
  }
  const all = A1_ALL || {};
  const sts = [...STUDENTS].sort((a, b) => String(a.number).localeCompare(String(b.number)));
  const cnt = { none: 0, draft: 0, changed: 0, done: 0 };
  const rows = sts.map(st => {
    const doc = all[st.number];
    const s = _a1State(doc);
    cnt[s.key]++;
    const subAns = doc?.submitted?.answers;
    const cells = A1.items.map(it => {
      const n = subAns ? _a1Len(subAns, it) : 0;
      const d = doc ? _a1Len(doc.answers, it) : 0;
      return `<td class="n">${n ? n + '자' : (d ? `<span class="a1-dim">(${d})</span>` : '–')}</td>`;
    }).join('');
    return `<tr class="a1-row-${s.key}">
      <td>${esc(st.number)}</td><td>${esc(st.name)}</td>${cells}
      <td>${s.chip ? `<span class="a1-chip ${s.chip}">${s.label}</span>` : `<span class="a1-dim">${s.label}</span>`}</td>
      <td class="n">${doc?.submitted ? _a1Time(doc.submitted.at) : ''}</td>
      <td>${doc ? `<button class="btn-xs" data-action="a1-tc-view" data-snum="${esc(st.number)}">답안 →</button>` : ''}</td>
    </tr>`;
  }).join('');

  return `<div class="aia-tc-head">
      <div class="aia-tc-head-title">📝 1차 수행평가 · ${esc(A1.title)}</div>
      <button class="btn-sm" data-action="a1-tc-csv">📤 제출본 CSV</button>
    </div>
    ${control}
    ${A1_TC_ERR ? `<div class="a1-notice err">답안을 불러오지 못했습니다 — ${esc(A1_TC_ERR)}</div>` : ''}
    <div class="a1-stats">
      <div class="stat-card"><div class="stat-num">${sts.length}</div><div class="stat-label">전체</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--ok,#16a34a)">${cnt.done}</div><div class="stat-label">제출</div></div>
      <div class="stat-card"><div class="stat-num" style="color:#d97706">${cnt.changed}</div><div class="stat-label">제출 후 수정</div></div>
      <div class="stat-card"><div class="stat-num" style="color:#3b82f6">${cnt.draft}</div><div class="stat-label">작성 중</div></div>
      <div class="stat-card"><div class="stat-num">${cnt.none}</div><div class="stat-label">미응시</div></div>
    </div>
    <div class="ml-sub-explain">문항 칸의 숫자는 <b>제출본</b>의 글자 수입니다. 괄호 안 회색은 저장만 되고 제출하지 않은 글자 수입니다. 이 화면은 학생이 저장·제출할 때마다 바로 바뀝니다.</div>
    ${sts.length === 0 ? emptyBox('👥', '먼저 학생을 등록하세요.')
      : `<div style="overflow-x:auto"><table class="tbl aia-tc-table a1-tc-table">
          <thead><tr><th>학번</th><th>이름</th>${A1.items.map(it => `<th>${esc(it.no)}번</th>`).join('')}<th>상태</th><th>제출 시각</th><th></th></tr></thead>
          <tbody>${rows}</tbody></table></div>`}`;
}

function _a1AnswerBlocks(ans){
  return A1.items.map(it => `<div class="a1-q">
      ${_a1ItemHead(it)}
      <div class="a1-qb">${it.fields.map(f => {
        const v = String((ans || {})[f.id] || '').trim();
        return `${f.label ? `<div class="a1-flabel">${esc(f.label)}</div>` : ''}<div class="a1-ans ${v ? '' : 'empty'}">${v ? esc(v) : '(비어 있음)'}</div>`;
      }).join('')}</div></div>`).join('');
}

function _a1TcStudent(){
  const snum = A1_TC_SNUM;
  const st = STUDENTS.find(s => s.number === snum);
  const doc = (A1_ALL || {})[snum];
  const s = _a1State(doc);
  const head = `<div class="aia-tcs-header">
    <button class="btn-sm" data-action="a1-tc-back">← 목록</button>
    <div class="aia-tcs-info"><span class="aia-tcs-snum">${esc(snum)}</span><span class="aia-tcs-name">${esc(st?.name || doc?.name || '')}</span>
      ${s.chip ? `<span class="a1-chip ${s.chip}">${s.label}</span>` : `<span class="a1-dim">${s.label}</span>`}</div>
  </div>`;
  if(!doc) return head + emptyBox('📭', '저장한 답안이 없습니다.');
  if(!doc.submitted){
    return head + `<div class="a1-notice">제출하지 않았습니다. 아래는 저장만 된 내용입니다 (마지막 저장 ${_a1Time(doc.updatedAt)}).</div>`
      + _a1AnswerBlocks(doc.answers);
  }
  const changed = s.key === 'changed';
  return head
    + `<div class="ml-sub-explain">제출본 · ${_a1Time(doc.submitted.at)}</div>`
    + (changed ? `<div class="a1-notice">⚠ 제출 뒤 고친 내용이 있습니다 (마지막 저장 ${_a1Time(doc.updatedAt)}, 미제출).
        <details style="margin-top:6px"><summary>저장만 된 최신 내용 보기</summary>${_a1AnswerBlocks(doc.answers)}</details></div>` : '')
    + _a1AnswerBlocks(doc.submitted.answers);
}
