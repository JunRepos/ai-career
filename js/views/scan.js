/* ═══════════════════════════════════════
   views/scan.js — 📄 활동지 스캔 (인공지능 기초 · 선생님 전용)

   종이 활동지 스캔본을 학생별로 보고, 손글씨를 옮겨 적은 글을 옆에 둡니다.
   Ⅲ-02 인공지능 윤리 ① 자율주행 자동차의 선택 · ② 모둠 토론(ai-2B) — 2026-11-12 스캔.
   DB      aiactivity/submissions/{반}/ethicsScan = { at, students:[{id,num,name,group,pages:[…]}], groups:[…] }
   Storage teacherFiles/ai-2B/ethicsScan1112/{a|b}{쪽}.jpg   (pages[].url 에 주소가 들어 있습니다)
   올리는 것은 앱 밖에서 합니다(스캔 → 옮겨 적기 → DB). 이 화면은 읽기만 합니다.
   ⚠ 학생 화면은 이 자리를 읽지 않지만 DB 규칙이 열려 있어 주소를 아는 사람은 읽을 수 있습니다 (HANDOFF 「보안」).
═══════════════════════════════════════ */

let ESCAN_DATA = {};             // { cid: {students, groups} }
let ESCAN_LOADING = {};
let ESCAN_ERR = '';
let ESCAN_VIEW = 'students';     // students | groups | first
let ESCAN_CUR = {};              // { cid: 학생 id }
let ESCAN_Q = '';

function escanLoad(cid){
  if(ESCAN_DATA[cid] || ESCAN_LOADING[cid]) return;
  ESCAN_LOADING[cid] = withTimeout(db.ref(`aiactivity/submissions/${cid}/ethicsScan`).get(), 15000, '활동지 스캔 불러오기')
    .then(s => { ESCAN_DATA[cid] = s.val() || { students: [] }; ESCAN_ERR = ''; })
    .catch(e => { ESCAN_ERR = e.message || String(e); })
    .finally(() => { delete ESCAN_LOADING[cid]; if(TC_TAB === 'scan') render(); });
}

function _escanCss(){
  if(document.getElementById('sc-css')) return;
  const st = document.createElement('style'); st.id = 'sc-css';
  st.textContent = `
.sc-wrap{max-width:1280px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.sc-title{font-size:20px;font-weight:800;color:var(--text)}
.sc-sub{font-size:13px;color:var(--text3);line-height:1.6}
.sc-tabs{display:flex;gap:6px;flex-wrap:wrap}
.sc-tab{padding:6px 14px;border:1px solid var(--border2);border-radius:999px;background:var(--surface);color:var(--text);font:inherit;font-weight:700;font-size:14px;cursor:pointer}
.sc-tab.on{background:var(--accent);border-color:var(--accent);color:#fff}
.sc-cols{display:flex;gap:14px;align-items:flex-start}
.sc-side{flex:0 0 230px;display:flex;flex-direction:column;gap:2px;position:sticky;top:8px;max-height:calc(100vh - 40px);overflow:auto;background:var(--surface);border:1px solid var(--border2);border-radius:12px;padding:8px}
.sc-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}
.sc-q{font:inherit;padding:7px 9px;border:1px solid var(--border2);border-radius:8px;background:var(--surface);color:var(--text);margin-bottom:6px;width:100%;box-sizing:border-box}
.sc-stu{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:5px 8px;border:0;border-radius:6px;background:transparent;color:var(--text);font:inherit;cursor:pointer}
.sc-stu:hover{background:var(--surface2)}
.sc-stu.on{background:var(--accent);color:#fff}
.sc-stu .num{font-size:12px;opacity:.75;font-variant-numeric:tabular-nums}
.sc-stu .nm{flex:1;font-weight:700}
.sc-dot{font-size:11px;font-weight:700;border:1px solid currentColor;border-radius:4px;padding:0 4px}
.sc-dot.off{opacity:.25}
.sc-card{background:var(--surface);border:1px solid var(--border2);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px}
.sc-card h2{margin:0;font-size:17px;font-weight:800;color:var(--text)}
.sc-card h3{margin:0;font-size:15px;font-weight:800;color:var(--text)}
.sc-pair{display:flex;gap:14px;align-items:flex-start}
.sc-scan{flex:0 0 46%;min-width:0}
.sc-scan img{display:block;width:100%;border:1px solid var(--border2);border-radius:6px;cursor:zoom-in;background:#fff}
.sc-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:9px}
.sc-f{display:flex;flex-direction:column;gap:2px}
.sc-f .k{font-size:12px;font-weight:700;color:var(--text3)}
.sc-f .v{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--text);font-size:14.5px;line-height:1.55}
.sc-f .v.empty,.sc-note{color:var(--text3);font-size:13px}
.sc-pill{display:inline-block;padding:1px 9px;border-radius:999px;font-size:13px;font-weight:700;background:var(--surface2);color:var(--text);border:1px solid var(--border2)}
.sc-pill.ga{background:#e3edf8;color:#1f5fa8;border-color:#b9d0ea}
.sc-pill.na{background:#f8ebe0;color:#a8571f;border-color:#ecd0b8}
.sc-pill.no{background:var(--warn-bg,#fbf0d3);color:var(--warn,#8a5a00)}
.sc-pills{display:flex;flex-wrap:wrap;gap:6px}
.sc-tw{overflow-x:auto}
.sc-tw table{border-collapse:collapse;width:100%;font-size:14px}
.sc-tw th,.sc-tw td{border:1px solid var(--border2);padding:6px 8px;text-align:left;vertical-align:top;overflow-wrap:anywhere;color:var(--text)}
.sc-tw th{font-size:12px;color:var(--text3);white-space:nowrap}
.sc-sit{display:flex;gap:10px;flex-wrap:wrap}
.sc-sit>div{flex:1 1 260px;border:1px solid var(--border2);border-radius:8px;padding:8px 12px;color:var(--text)}
.sc-bar{display:flex;height:22px;border-radius:6px;overflow:hidden;border:1px solid var(--border2)}
.sc-bar span{display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}
.sc-bar .g{background:#e3edf8;color:#1f5fa8}.sc-bar .n{background:#f8ebe0;color:#a8571f}
#sc-zoom{position:fixed;inset:0;background:rgba(0,0,0,.82);overflow:auto;z-index:9999;padding:20px;cursor:zoom-out}
#sc-zoom img{display:block;margin:0 auto;max-width:none;width:min(1240px,220vw)}
@media (max-width:820px){.sc-cols{flex-direction:column}.sc-side{position:static;flex:none;width:100%;max-height:240px;box-sizing:border-box}.sc-pair{flex-direction:column}.sc-scan{flex:none;width:100%}}`;
  document.head.appendChild(st);
}

function _escanPill(c){
  return c === '㉮' ? '<span class="sc-pill ga">㉮</span>' : c === '㉯' ? '<span class="sc-pill na">㉯</span>'
    : c ? `<span class="sc-pill">${esc(c)}</span>` : '<span class="sc-pill no">표시 없음</span>';
}
function _escanFld(k, v){
  return `<div class="sc-f"><span class="k">${esc(k)}</span><span class="v${v ? '' : ' empty'}">${v ? esc(v) : '쓰지 않음'}</span></div>`;
}
function _escanImg(p){
  return `<div class="sc-scan"><img loading="lazy" src="${esc(p.url)}" alt="스캔본" data-sc-zoom="${esc(p.url)}">
    <div class="sc-note">${p.kind === 'a' ? '①' : '②'} 묶음 ${esc(p.page)}쪽</div></div>`;
}
function _escanSheetA(p){
  return `<div class="sc-pair">${_escanImg(p)}<div class="sc-txt">
    <h3>① 자율주행 자동차의 선택</h3>
    <div class="sc-f"><span class="k">① 나의 선택</span><span class="v">${_escanPill(p.choice)}</span></div>
    ${_escanFld('② 그렇게 선택한 까닭', p.q2)}
    ${_escanFld('③ 탐구 질문에 대한 나의 의견', p.q3)}
    ${_escanFld('④ 나와 다른 선택을 한 친구의 의견', p.q4)}
    ${_escanFld('⑤ 토론을 마친 뒤 나의 의견', p.q5)}
    ${p.memo ? `<div class="sc-note">메모 · ${esc(p.memo)}</div>` : ''}
  </div></div>`;
}
function _escanSheetB(p){
  const rows = (p.table || []).filter(r => r.name || r.reason)
    .map(r => `<tr><td>${esc(r.name || '')}</td><td>${_escanPill(r.choice)}</td><td>${esc(r.reason || '')}</td></tr>`).join('');
  const mem = p.members || [], iss = p.issues || [];
  return `<div class="sc-pair">${_escanImg(p)}<div class="sc-txt">
    <h3>② 모둠 토론 · ${esc(p.case || '')}${p.group ? ` · ${esc(p.group)}조` : ''}</h3>
    <div class="sc-f"><span class="k">조원</span><span class="v${mem.length ? '' : ' empty'}">${mem.length ? esc(mem.join(' · ')) : '쓰지 않음'}</span></div>
    <div class="sc-f"><span class="k">① 관련 있는 쟁점</span><span class="sc-pills">${iss.length ? iss.map(i => `<span class="sc-pill">${esc(i)}</span>`).join('') : '<span class="sc-pill no">표시 없음</span>'}</span></div>
    <div class="sc-f"><span class="k">② 자신의 선택과 이유</span><span class="v">${_escanPill(p.choice)} ${p.reason ? esc(p.reason) : '<span class="sc-note">이유 쓰지 않음</span>'}</span></div>
    <div class="sc-f"><span class="k">③ 조원들의 선택과 그 이유</span>${rows ? `<div class="sc-tw"><table><tr><th>이름</th><th>선택</th><th>이유</th></tr>${rows}</table></div>` : '<span class="v empty">쓰지 않음</span>'}</div>
    ${_escanFld('④ 같았던 점과 달랐던 점', p.summary)}
    ${_escanFld('⑤ 토론을 마친 소감', p.feeling)}
    ${p.memo ? `<div class="sc-note">메모 · ${esc(p.memo)}</div>` : ''}
  </div></div>`;
}

function _escanStudents(cid, d){
  const all = d.students || [];
  if(!all.length) return '<div class="sc-note">이 반의 스캔본이 없습니다.</div>';
  const list = all.filter(s => !ESCAN_Q || (s.name + s.num).includes(ESCAN_Q));
  if(!all.find(s => s.id === ESCAN_CUR[cid])) ESCAN_CUR[cid] = (all.find(s => (s.pages || []).length) || all[0]).id;
  const withB = all.some(s => (s.pages || []).some(p => p.kind === 'b'));
  let side = `<input class="sc-q" id="sc-q" type="search" placeholder="이름 · 학번" value="${esc(ESCAN_Q)}" aria-label="학생 찾기">`;
  for(const s of list){
    const pg = s.pages || [], a = pg.some(p => p.kind === 'a'), b = pg.some(p => p.kind === 'b');
    side += `<button class="sc-stu${s.id === ESCAN_CUR[cid] ? ' on' : ''}" data-sc-stu="${esc(s.id)}"><span class="num">${esc(s.num)}</span><span class="nm">${esc(s.name)}</span>
      <span class="sc-dot${a ? '' : ' off'}">①</span>${withB ? `<span class="sc-dot${b ? '' : ' off'}">②</span>` : ''}</button>`;
  }
  const s = all.find(x => x.id === ESCAN_CUR[cid]), pg = s.pages || [];
  let main = `<div class="sc-card"><h2>${esc(s.name)} <span class="sc-sub">${esc(s.num)}${s.group ? ` · ${esc(s.group)}조` : ''}</span></h2>
    ${pg.length ? '' : '<div class="sc-note">스캔본에 이 학생의 활동지가 없습니다.</div>'}</div>`;
  for(const p of pg) main += `<div class="sc-card">${p.kind === 'a' ? _escanSheetA(p) : _escanSheetB(p)}</div>`;
  return `<div class="sc-cols"><div class="sc-side">${side}</div><div class="sc-main">${main}</div></div>`;
}
function _escanGroups(d){
  const gs = d.groups || [];
  if(!gs.length) return '<div class="sc-note">이 반은 모둠 토론 스캔본이 없습니다.</div>';
  return `<div class="sc-main">${gs.map(g => {
    const rows = g.rows || [], ga = rows.filter(r => r.choice === '㉮').length, na = rows.filter(r => r.choice === '㉯').length;
    const iss = Object.entries(g.issues || {}).sort((x, y) => y[1] - x[1]);
    const lines = k => rows.filter(r => r[k]).map(r => `<span class="v"><b>${esc(r.name)}</b> · ${esc(r[k])}</span>`).join('') || '<span class="v empty">쓰지 않음</span>';
    return `<div class="sc-card"><h2>${esc(g.no)}조 · ${esc(g.case)}</h2>
      <div class="sc-sit"><div><span class="sc-pill ga">㉮</span> ${esc(g.ga)}</div><div><span class="sc-pill na">㉯</span> ${esc(g.na)}</div></div>
      ${ga + na ? `<div class="sc-bar">${ga ? `<span class="g" style="flex:${ga}">㉮ ${ga}명</span>` : ''}${na ? `<span class="n" style="flex:${na}">㉯ ${na}명</span>` : ''}</div>` : ''}
      <div class="sc-tw"><table><tr><th>이름</th><th>선택</th><th>이유 (② 자신이 쓴 것)</th><th>표시한 쟁점</th></tr>
      ${rows.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${_escanPill(r.choice)}</td><td>${r.reason ? esc(r.reason) : '<span class="sc-note">쓰지 않음</span>'}</td><td>${esc((r.issues || []).join(' · '))}</td></tr>`).join('')}</table></div>
      <div class="sc-f"><span class="k">표시한 쟁점</span><span class="sc-pills">${iss.length ? iss.map(([k, n]) => `<span class="sc-pill">${esc(k)} ${n}명</span>`).join('') : '<span class="sc-pill no">표시 없음</span>'}</span></div>
      <div class="sc-f"><span class="k">④ 같았던 점과 달랐던 점 (학생이 쓴 것)</span>${lines('summary')}</div>
      <div class="sc-f"><span class="k">⑤ 소감</span>${lines('feeling')}</div>
      ${(g.missing || []).length ? `<div class="sc-note">활동지가 없는 조원 · ${esc(g.missing.join(' · '))}</div>` : ''}
      ${g.note ? `<div class="sc-note">${esc(g.note)}</div>` : ''}
    </div>`;
  }).join('')}</div>`;
}
function _escanFirst(d){
  const rows = [];
  for(const s of d.students || []) for(const p of s.pages || []) if(p.kind === 'a') rows.push({ s, p });
  if(!rows.length) return '<div class="sc-note">이 반의 ① 활동지 스캔본이 없습니다.</div>';
  const n = c => rows.filter(r => r.p.choice === c).length;
  return `<div class="sc-card"><h2>① 자율주행 자동차의 선택 <span class="sc-sub">직진 ${n('직진')}명 · 왼쪽 차선으로 ${n('왼쪽 차선으로')}명 · 활동지 ${rows.length}장</span></h2>
    <div class="sc-tw"><table><tr><th>학번</th><th>이름</th><th>선택</th><th>② 까닭</th><th>③ 탐구 질문</th><th>⑤ 토론 뒤</th></tr>
    ${rows.map(({ s, p }) => `<tr><td>${esc(s.num)}</td><td><b>${esc(s.name)}</b></td><td>${_escanPill(p.choice)}</td><td>${esc(p.q2 || '')}</td><td>${esc(p.q3 || '')}</td><td>${esc(p.q5 || '')}</td></tr>`).join('')}</table></div></div>`;
}

function vTcScan(){
  _escanCss();
  const cid = TC_CLS?.id;
  if(!cid) return emptyBox('⚠️', '반을 먼저 고르세요');
  escanLoad(cid);
  const tab = (k, label) => `<button class="sc-tab${ESCAN_VIEW === k ? ' on' : ''}" data-sc-view="${k}">${label}</button>`;
  const head = `<div><div class="sc-title">📄 활동지 스캔 — ${esc(cid)}</div>
      <div class="sc-sub">Ⅲ-02 인공지능 윤리 ① 자율주행 자동차의 선택 · ② 모둠 토론. 옮겨 적은 글은 틀린 곳이 있을 수 있습니다. [?] 읽지 못한 낱말 · (?) 확실하지 않은 낱말. 스캔본을 누르면 크게 보입니다.</div></div>
    ${ESCAN_ERR ? `<div class="sc-note">⚠️ 불러오지 못했습니다 — ${esc(ESCAN_ERR)} <button class="btn-sm" data-sc-retry="1">다시 시도</button></div>` : ''}`;
  const d = ESCAN_DATA[cid];
  if(!d) return `<div class="sc-wrap">${head}${ESCAN_ERR ? '' : '<div class="sc-note">불러오는 중…</div>'}</div>`;
  return `<div class="sc-wrap">${head}
    <div class="sc-tabs">${tab('students', '학생별')}${tab('groups', '② 조별 정리')}${tab('first', '① 선택 모아 보기')}</div>
    ${ESCAN_VIEW === 'groups' ? _escanGroups(d) : ESCAN_VIEW === 'first' ? _escanFirst(d) : _escanStudents(cid, d)}
  </div>`;
}
