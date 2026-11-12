/* ═══════════════════════════════════════
   views/observe.js — ✍️ 관찰 기록 (인공지능 기초 · 선생님 전용)

   수업 중에 학생을 누르고 「발표」나 「학습 태도」를 누르면 한 건이 저장됩니다. 내용은 비워도 됩니다.
   DB aiactivity/submissions/{반}/observe/{id} = { date, kind, topic, stance, students:[학번], text, createdAt, updatedAt }
   (DB 규칙이 aiactivity 아래 active · submissions 만 열어 두어 진도 계획(plan)과 같은 자리에 둡니다.)
   ⚠ 학생 화면은 이 자리를 읽지 않지만 DB 규칙이 열려 있어 주소를 아는 사람은 읽을 수 있습니다 (HANDOFF 「보안」).
═══════════════════════════════════════ */

let OB_RECS = {};             // { cid: { id: rec } }
let OB_LOADING = {};          // { cid: Promise }
let OB_ERR = '';
let OB_DATE = null;           // 보고 있는 날짜 (YYYY-MM-DD)
let OB_VIEW = 'day';          // day | stu
let OB_STU = null;            // 학생별 보기에서 고른 학번
let OB_PICK = {};             // 고른 학생 { 학번: true }
let OB_TOPIC = '', OB_STANCE = '', OB_TEXT = '';
let OB_EDIT = null;           // 고치는 기록 id
let OB_ASKDEL = null;         // 지우기 확인 중인 기록 id
let OB_CID = null;            // 지금 화면이 보고 있는 반 (반이 바뀌면 입력을 비웁니다)

function _obRef(cid, id){ return db.ref(`aiactivity/submissions/${cid}/observe${id ? '/' + id : ''}`); }
function _obToday(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function _obDay(s){
  const d = new Date(s + 'T00:00:00');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`;
}
function _obNo(n){ n = String(n); return n.length === 5 ? `${+n.slice(1, 3)}-${+n.slice(3)}` : n; }
function _obStudents(){
  return [...(typeof STUDENTS !== 'undefined' ? STUDENTS : [])]
    .filter(s => /^\d+$/.test(String(s.number)))          // 확인용 test 계정은 뺍니다
    .sort((a, b) => String(a.number).localeCompare(String(b.number)));
}
function _obName(num){
  const s = (typeof STUDENTS !== 'undefined' ? STUDENTS : []).find(x => String(x.number) === String(num));
  return s ? s.name : String(num);
}
function _obList(cid){ return Object.entries(OB_RECS[cid] || {}).map(([id, r]) => ({ id, ...r, students: r.students || [] })); }
function _obDayList(cid){ return _obList(cid).filter(r => r.date === OB_DATE); }

function obLoad(cid){
  if(OB_RECS[cid] || OB_LOADING[cid]) return;
  OB_LOADING[cid] = withTimeout(_obRef(cid).get(), 12000, '관찰 기록 불러오기')
    .then(s => { OB_RECS[cid] = s.val() || {}; OB_ERR = ''; _obSyncTopic(cid, false); })
    .catch(e => { OB_ERR = e.message || String(e); })
    .finally(() => { delete OB_LOADING[cid]; if(TC_TAB === 'observe') render(); });
}
/* 그날 마지막으로 쓴 활동 이름을 다시 적지 않게 채워 둡니다 */
function _obSyncTopic(cid, force){
  if(!force && OB_TOPIC) return;
  const recs = _obDayList(cid).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  OB_TOPIC = recs.length ? (recs[0].topic || '') : '';
}
function _obClearDock(){ OB_PICK = {}; OB_TEXT = ''; OB_EDIT = null; }

function _obCss(){
  if(document.getElementById('ob-css')) return;
  const st = document.createElement('style'); st.id = 'ob-css';
  st.textContent = `
.ob-wrap{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.ob-top{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.ob-title{font-size:20px;font-weight:800;color:var(--text)}
.ob-sub{font-size:13px;color:var(--text3);margin-top:4px;line-height:1.6}
.ob-seg{display:inline-flex;border:1px solid var(--border2);border-radius:10px;overflow:hidden;background:var(--surface)}
.ob-seg button{border:0;background:transparent;color:var(--text);font:inherit;font-weight:700;padding:8px 14px;cursor:pointer}
.ob-seg button.on{background:var(--accent);color:var(--accent-txt)}
.ob-line{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ob-in{font:inherit;color:var(--text);background:var(--surface);border:1px solid var(--border2);border-radius:9px;padding:8px 10px;min-width:0}
.ob-line .ob-topic{flex:1 1 240px}
.ob-days{display:flex;gap:6px;flex-wrap:wrap}
.ob-pill{border:1px solid var(--border2);background:var(--surface);color:var(--text);font:inherit;font-size:12.5px;border-radius:999px;padding:3px 10px;cursor:pointer}
.ob-pill.on{background:var(--accent-lt);border-color:var(--accent);color:var(--accent);font-weight:700}
.ob-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px}
.ob-stu{border:1.5px solid var(--border2);background:var(--surface);color:var(--text);font:inherit;border-radius:11px;padding:8px 8px 7px;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:2px;min-height:64px}
.ob-stu .no{font-size:11.5px;color:var(--text3);font-variant-numeric:tabular-nums}
.ob-stu .nm{font-weight:700;font-size:15.5px}
.ob-stu .mk{display:flex;gap:4px;min-height:16px}
.ob-stu.on{border-color:var(--accent);background:var(--accent-lt);box-shadow:inset 0 0 0 1.5px var(--accent)}
.ob-dot{font-size:11px;font-weight:700;border-radius:5px;padding:0 5px;background:var(--accent);color:var(--accent-txt)}
.ob-dot.att{background:var(--ok);color:#fff}
.ob-dock{position:sticky;bottom:10px;z-index:5;background:var(--surface);border:1.5px solid var(--accent);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;box-shadow:0 6px 24px rgba(0,0,0,.14)}
.ob-sel{font-size:13px;font-weight:700;color:var(--accent);min-height:1.4em}
.ob-sel.none{color:var(--text3);font-weight:500}
.ob-dock .ob-text{flex:1 1 260px;background:var(--surface2)}
.ob-dock .ob-stance{flex:0 1 150px;background:var(--surface2)}
.ob-btn{border:1px solid var(--accent);background:var(--accent);color:var(--accent-txt);font:inherit;font-weight:700;border-radius:9px;padding:9px 18px;cursor:pointer}
.ob-btn.att{border-color:var(--ok);background:var(--ok);color:#fff}
.ob-btn.ghost{background:transparent;color:var(--accent)}
.ob-h{font-size:16px;font-weight:800;color:var(--text);margin-top:6px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.ob-h span{font-size:12.5px;font-weight:500;color:var(--text3)}
.ob-log{display:flex;flex-direction:column;gap:6px}
.ob-stance-h{font-size:12.5px;font-weight:700;color:var(--accent);margin-top:8px}
.ob-rec{border:1px solid var(--border2);border-radius:10px;padding:8px 12px;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline;background:var(--surface)}
.ob-rec .who{font-weight:700}
.ob-rec .txt{flex:1 1 260px;min-width:0;white-space:pre-wrap}
.ob-rec .when{font-size:12px;color:var(--text3)}
.ob-tag{font-size:12px;font-weight:700;border-radius:6px;padding:1px 8px;background:var(--accent-lt);color:var(--accent)}
.ob-tag.att{background:var(--ok-bg);color:var(--ok-txt)}
.ob-acts{margin-left:auto;display:flex;gap:6px}
.ob-tbl{width:100%;border-collapse:collapse;font-size:14px;background:var(--surface);border:1px solid var(--border2);border-radius:12px;overflow:hidden}
.ob-tbl th,.ob-tbl td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--border)}
.ob-tbl th{font-size:12px;color:var(--text3);font-weight:700}
.ob-tbl td.n,.ob-tbl th.n{text-align:right;width:84px;font-variant-numeric:tabular-nums}
.ob-tbl tr.pick{cursor:pointer}.ob-tbl tr.pick:hover td{background:var(--accent-lt)}
.ob-empty{color:var(--text3);font-size:14px;padding:14px 2px}
.ob-err{color:var(--danger);font-size:13px}`;
  document.head.appendChild(st);
}

function vTcObserve(){
  _obCss();
  const cid = TC_CLS?.id;
  if(!cid) return emptyBox('⚠️', '반을 먼저 고르세요');
  if(OB_CID !== cid){ OB_CID = cid; _obClearDock(); OB_STU = null; OB_TOPIC = ''; OB_STANCE = ''; OB_ASKDEL = null; }
  if(!OB_DATE) OB_DATE = _obToday();
  obLoad(cid);
  const loaded = !!OB_RECS[cid];

  const head = `<div class="ob-top">
    <div><div class="ob-title">✍️ 관찰 기록 — ${esc(cid)}</div>
      <div class="ob-sub">학생을 누르고 「발표」나 「학습 태도」를 누르면 저장됩니다. 내용은 비워도 됩니다.</div></div>
    <div class="ob-seg">
      <button class="${OB_VIEW === 'day' ? 'on' : ''}" data-action="ob-view" data-v="day">기록</button>
      <button class="${OB_VIEW === 'stu' ? 'on' : ''}" data-action="ob-view" data-v="stu">학생별</button>
    </div></div>
    ${OB_ERR ? `<div class="ob-err">⚠️ 기록을 불러오지 못했습니다 — ${esc(OB_ERR)} <button class="btn-sm" data-action="ob-retry">다시 시도</button></div>` : ''}`;
  if(!loaded && !OB_ERR) return `<div class="ob-wrap">${head}<div class="ob-empty">불러오는 중…</div></div>`;
  return `<div class="ob-wrap">${head}${OB_VIEW === 'day' ? _obDayView(cid) : _obStuView(cid)}</div>`;
}

function _obDayView(cid){
  const today = _obToday();
  const all = _obList(cid), recs = _obDayList(cid);
  const days = [...new Set([today, ...all.map(r => r.date)])].sort().reverse().slice(0, 12);
  const pills = days.map(d => `<button class="ob-pill ${d === OB_DATE ? 'on' : ''}" data-action="ob-day" data-d="${d}">${d === today ? '오늘' : esc(_obDay(d))}</button>`).join('');
  const topics = [...new Set(all.map(r => r.topic).filter(Boolean))];
  const stances = [...new Set(recs.map(r => r.stance).filter(Boolean))];

  const sts = _obStudents();
  const grid = sts.length ? sts.map(s => {
    const num = String(s.number);
    const t = recs.filter(r => r.students.includes(num) && r.kind !== '학습 태도').length;
    const a = recs.filter(r => r.students.includes(num) && r.kind === '학습 태도').length;
    return `<button class="ob-stu ${OB_PICK[num] ? 'on' : ''}" data-action="ob-pick" data-num="${esc(num)}">
      <span class="no">${esc(_obNo(num))}</span><span class="nm">${esc(s.name)}</span>
      <span class="mk">${t ? `<span class="ob-dot">발표 ${t}</span>` : ''}${a ? `<span class="ob-dot att">태도 ${a}</span>` : ''}</span></button>`;
  }).join('') : '<div class="ob-empty">이 반 명단이 비어 있습니다.</div>';

  return `<div class="ob-line">
      <input type="date" class="ob-in" data-ob="date" value="${esc(OB_DATE)}" aria-label="날짜">
      <input type="text" class="ob-in ob-topic" data-ob="topic" list="ob-topics" value="${esc(OB_TOPIC)}" placeholder="활동 이름 (예: 자율주행 자동차의 선택)" aria-label="활동 이름">
      <datalist id="ob-topics">${topics.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
    </div>
    <div class="ob-days">${pills}</div>
    <div class="ob-grid">${grid}</div>
    <div class="ob-dock">
      <div class="ob-sel ${obSelText().none ? 'none' : ''}" id="ob-sel">${esc(obSelText().text)}</div>
      <div class="ob-line">
        <input type="text" class="ob-in ob-stance" data-ob="stance" list="ob-stances" value="${esc(OB_STANCE)}" placeholder="입장 · 모둠" aria-label="입장 또는 모둠">
        <datalist id="ob-stances">${stances.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
        <input type="text" class="ob-in ob-text" data-ob="text" value="${esc(OB_TEXT)}" placeholder="내용 (Enter = 발표로 저장)" aria-label="내용">
        <button class="ob-btn" data-action="ob-save" data-kind="발표">발표</button>
        <button class="ob-btn att" data-action="ob-save" data-kind="학습 태도">학습 태도</button>
        ${OB_EDIT ? '<button class="ob-btn ghost" data-action="ob-cancel">취소</button>' : ''}
      </div>
    </div>
    <div class="ob-h">${esc(_obDay(OB_DATE))} 기록<span>${recs.length}건</span></div>
    <div class="ob-log">${_obLog(recs)}</div>`;
}
/* 고른 학생 줄 — 학생을 누를 때마다 전체를 다시 그리지 않고 이 줄만 바꿉니다 */
function obSelText(){
  const ids = Object.keys(OB_PICK).sort();
  const names = ids.map(_obName).join(', ');
  if(OB_EDIT) return { none: false, text: '고치는 중 · ' + (names || '학생 지정 없음') };
  if(!ids.length) return { none: true, text: '고른 학생이 없습니다.' };
  return { none: false, text: `${ids.length}명 선택 · ${names}` };
}
function obPaintSel(){
  const el = document.getElementById('ob-sel'); if(!el) return;
  const s = obSelText(); el.textContent = s.text; el.className = 'ob-sel' + (s.none ? ' none' : '');
}

function _obRec(r, showDate){
  const acts = OB_ASKDEL === r.id
    ? `<button class="btn-xs danger" data-action="ob-del-ok" data-id="${esc(r.id)}">지우기 확정</button><button class="btn-xs" data-action="ob-del-no">취소</button>`
    : `<button class="btn-xs" data-action="ob-edit" data-id="${esc(r.id)}">고치기</button><button class="btn-xs danger" data-action="ob-del" data-id="${esc(r.id)}">지우기</button>`;
  const who = r.students.map(_obName).join(', ') || '학생 지정 없음';
  const lead = showDate
    ? `<span class="when">${esc(_obDay(r.date))}${r.topic ? ' · ' + esc(r.topic) : ''}${r.stance ? ' · ' + esc(r.stance) : ''}</span>`
    : `<span class="who">${esc(who)}</span>`;
  return `<div class="ob-rec"><span class="ob-tag ${r.kind === '학습 태도' ? 'att' : ''}">${esc(r.kind || '발표')}</span>
    ${lead}<span class="txt">${esc(r.text || '')}</span><span class="ob-acts">${acts}</span></div>`;
}
function _obLog(recs){
  if(!recs.length) return '<div class="ob-empty">이날 기록이 아직 없습니다.</div>';
  const by = (list, key) => { const m = new Map(); list.forEach(r => { const k = r[key] || ''; if(!m.has(k)) m.set(k, []); m.get(k).push(r); }); return m; };
  let html = '';
  by([...recs].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)), 'topic').forEach((list, topic) => {
    if(topic) html += `<div class="ob-stance-h">활동 · ${esc(topic)}</div>`;
    by(list, 'stance').forEach((rs, stance) => {
      if(stance) html += `<div class="ob-stance-h">${esc(stance)}</div>`;
      html += rs.map(r => _obRec(r, false)).join('');
    });
  });
  return html;
}

function _obStuView(cid){
  const all = _obList(cid), sts = _obStudents();
  if(OB_STU){
    const mine = all.filter(r => r.students.includes(OB_STU)).sort((a, b) => a.date < b.date ? 1 : -1);
    return `<div class="ob-line"><button class="btn-sm" data-action="ob-stu-back">← 학생 목록으로</button></div>
      <div class="ob-h">${esc(_obName(OB_STU))} · ${esc(_obNo(OB_STU))}<span>${mine.length}건</span></div>
      <div class="ob-log">${mine.length ? mine.map(r => _obRec(r, true)).join('') : '<div class="ob-empty">이 학생의 기록이 아직 없습니다.</div>'}</div>`;
  }
  if(!sts.length) return '<div class="ob-empty">이 반 명단이 비어 있습니다.</div>';
  const rows = sts.map(s => {
    const num = String(s.number);
    const t = all.filter(r => r.students.includes(num) && r.kind !== '학습 태도').length;
    const a = all.filter(r => r.students.includes(num) && r.kind === '학습 태도').length;
    return `<tr class="pick" data-action="ob-stu" data-num="${esc(num)}"><td>${esc(_obNo(num))}</td><td>${esc(s.name)}</td>
      <td class="n">${t || ''}</td><td class="n">${a || ''}</td></tr>`;
  }).join('');
  return `<table class="ob-tbl"><tr><th>번호</th><th>이름</th><th class="n">발표</th><th class="n">학습 태도</th></tr>${rows}</table>`;
}
