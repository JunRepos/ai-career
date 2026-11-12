/* ═══════════════════════════════════════
   views/observe.js — ✍️ 관찰 기록 (인공지능 기초 · 선생님 전용 · 세특용 메모)

   학생마다 칸이 하나입니다. 칸에 적고 나오면 그 칸만 저장됩니다 (2026-11-12 선생님 —
   「칸 하나만 줘. 수업 시간에 언제 다른 칸 하나하나 다 선택해가면서 적고 있어」).
   칸에 들어가면 오늘 날짜가 줄 앞에 붙고, 아무것도 안 적고 나오면 그 날짜는 도로 지워집니다.
   DB aiactivity/submissions/{반}/observeNote/{학번 | _class} = { text, at }
   (DB 규칙이 aiactivity 아래 active · submissions 만 열어 두어 진도 계획(plan)과 같은 자리에 둡니다.)
   ⚠ 학생 화면은 이 자리를 읽지 않지만 DB 규칙이 열려 있어 주소를 아는 사람은 읽을 수 있습니다 (HANDOFF 「보안」).
═══════════════════════════════════════ */

let OB_NOTES = {};            // { cid: { 학번: {text, at} } }
let OB_LOADING = {};          // { cid: Promise }
let OB_ERR = '';

function _obRef(cid, key){ return db.ref(`aiactivity/submissions/${cid}/observeNote${key ? '/' + key : ''}`); }
function _obStamp(){ const d = new Date(); return `${d.getMonth() + 1}/${d.getDate()} `; }
function _obNo(n){ n = String(n); return n.length === 5 ? `${+n.slice(1, 3)}-${+n.slice(3)}` : n; }
function _obStudents(){
  return [...(typeof STUDENTS !== 'undefined' ? STUDENTS : [])]
    .filter(s => /^\d+$/.test(String(s.number)))          // 확인용 test 계정은 뺍니다
    .sort((a, b) => String(a.number).localeCompare(String(b.number)));
}
function obLoad(cid){
  if(OB_NOTES[cid] || OB_LOADING[cid]) return;
  OB_LOADING[cid] = withTimeout(_obRef(cid).get(), 12000, '관찰 기록 불러오기')
    .then(s => { OB_NOTES[cid] = s.val() || {}; OB_ERR = ''; })
    .catch(e => { OB_ERR = e.message || String(e); })
    .finally(() => { delete OB_LOADING[cid]; if(TC_TAB === 'observe') render(); });
}

function _obCss(){
  if(document.getElementById('ob-css')) return;
  const st = document.createElement('style'); st.id = 'ob-css';
  st.textContent = `
.ob-wrap{max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:10px}
.ob-title{font-size:20px;font-weight:800;color:var(--text)}
.ob-sub{font-size:13px;color:var(--text3);margin-top:4px;line-height:1.6}
.ob-rows{display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border2);border-radius:12px;overflow:hidden}
.ob-row{display:grid;grid-template-columns:44px 84px minmax(0,1fr);gap:8px;align-items:start;padding:6px 10px;border-bottom:1px solid var(--border)}
.ob-row:last-child{border-bottom:0}
.ob-row.all{background:var(--surface2)}
.ob-row .no{font-size:12px;color:var(--text3);font-variant-numeric:tabular-nums;padding-top:8px}
.ob-row .nm{font-weight:700;font-size:15px;color:var(--text);padding-top:6px}
.ob-ta{font:inherit;font-size:14.5px;line-height:1.55;color:var(--text);background:transparent;border:1px solid transparent;border-radius:8px;padding:5px 8px;width:100%;resize:none;overflow:hidden;min-height:34px;display:block}
.ob-ta:hover{border-color:var(--border2)}
.ob-ta:focus{outline:none;border-color:var(--accent);background:var(--surface)}
.ob-ta.saving{border-color:var(--warn-bd)}
.ob-ta.saved{border-color:var(--ok);background:var(--ok-bg)}
.ob-ta.fail{border-color:var(--danger);background:var(--danger-bg)}
.ob-empty{color:var(--text3);font-size:14px;padding:14px 2px}
.ob-err{color:var(--danger);font-size:13px}`;
  document.head.appendChild(st);
}

function vTcObserve(){
  _obCss();
  const cid = TC_CLS?.id;
  if(!cid) return emptyBox('⚠️', '반을 먼저 고르세요');
  obLoad(cid);
  const head = `<div><div class="ob-title">✍️ 관찰 기록 — ${esc(cid)}</div>
      <div class="ob-sub">학생 칸에 적고 나오면 저장됩니다. 칸에 들어가면 오늘 날짜가 줄 앞에 붙습니다.</div></div>
    ${OB_ERR ? `<div class="ob-err">⚠️ 기록을 불러오지 못했습니다 — ${esc(OB_ERR)} <button class="btn-sm" data-action="ob-retry">다시 시도</button></div>` : ''}`;
  if(!OB_NOTES[cid]) return `<div class="ob-wrap">${head}${OB_ERR ? '' : '<div class="ob-empty">불러오는 중…</div>'}</div>`;
  const notes = OB_NOTES[cid];
  const row = (key, no, name, cls) => {
    const text = (notes[key] && notes[key].text) || '';
    const lines = Math.max(1, text.split('\n').length);
    return `<div class="ob-row ${cls}"><span class="no">${esc(no)}</span><span class="nm">${esc(name)}</span>
      <textarea class="ob-ta" rows="${lines}" data-ob-key="${esc(key)}" data-ob-cid="${esc(cid)}" aria-label="${esc(name)} 기록">${esc(text)}</textarea></div>`;
  };
  const sts = _obStudents();
  return `<div class="ob-wrap">${head}
    <div class="ob-rows">
      ${row('_class', '', '반 전체', 'all')}
      ${sts.map(s => row(String(s.number), _obNo(s.number), s.name, '')).join('')}
    </div>
    ${sts.length ? '' : '<div class="ob-empty">이 반 명단이 비어 있습니다.</div>'}
  </div>`;
}
