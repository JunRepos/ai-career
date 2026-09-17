/* ═══════════════════════════════════════
   views/aiplan.js — 📅 진도 계획 (인공지능 기초 · 선생님 전용)

   수업일은 js/aiplan-data.js (python verify/aiplan.py 로 계산) 에서 옵니다 —
   시간표 · 창체 운영계획(수요일 대체 · 학교 행사) · 정기시험 · 공휴일을 반영한 날짜입니다.
   선생님이 칸에 적은 진도는 DB aiactivity/submissions/{반}/plan/{날짜_교시} 에 저장되어 계산값 위에 덮입니다.
═══════════════════════════════════════ */

let AP_CLS = null;            // 보고 있는 반
let AP_EDITS = {};            // { cid: { key: {text, at} } }
let AP_LOADING = {};          // { cid: Promise }
let AP_ERR = '';
let AP_PAST = false;          // 지난 수업 펼치기

const AP_CIDS = ['ai-2B', 'ai-2D'];
/* DB 규칙이 aiactivity 아래 active · submissions 만 열어 두어 plan 은 submissions/{반} 안에 둡니다
   (1차 수행평가의 assess1Open 과 같은 자리). aiactivity/plan 은 Permission denied 가 납니다. */
function _apRef(cid, key){ return db.ref(`aiactivity/submissions/${cid}/plan${key ? '/' + key : ''}`); }
function _apToday(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const _apMD = s => `${+s.slice(5, 7)}/${+s.slice(8, 10)}`;

function apLoad(cid){
  if(AP_EDITS[cid] || AP_LOADING[cid]) return;
  AP_LOADING[cid] = withTimeout(_apRef(cid).get(), 12000, '진도 계획 불러오기')
    .then(s => { AP_EDITS[cid] = s.val() || {}; AP_ERR = ''; })
    .catch(e => { AP_ERR = e.message || String(e); })
    .finally(() => { delete AP_LOADING[cid]; if(TC_TAB === 'aiplan') render(); });
}

/* 칸에 보일 진도 — 선생님이 적은 것 > 평가 표시 > 지난 기록 */
function apText(cid, r){
  const e = (AP_EDITS[cid] || {})[r.key];
  if(e && typeof e.text === 'string') return e.text;
  return r.mark || r.done || '';
}

function vTcAiPlan(){
  if(typeof AIPLAN === 'undefined') return emptyBox('⚠️', '진도 계획 데이터를 불러오지 못했습니다 (js/aiplan-data.js)');
  if(!AP_CLS) AP_CLS = AP_CIDS.includes(TC_CLS?.id) ? TC_CLS.id : 'ai-2B';
  const cid = AP_CLS;
  apLoad(cid);
  const rows = AIPLAN.classes[cid] || [];
  const today = _apToday();
  const loaded = !!AP_EDITS[cid];

  const clsBtns = AP_CIDS.map(c => {
    const n = (AIPLAN.classes[c] || []).filter(r => r.no && r.date >= today).length;
    return `<button class="ap-cls ${c === cid ? 'on' : ''}" data-action="ap-cls" data-cid="${c}">
      <b>${c}</b><span>${esc(AIPLAN.slots[c])} · 남은 수업 ${n}회</span></button>`;
  }).join('');

  return `<div class="ap-wrap">
    <div class="ap-top">
      <div><div class="ap-title">📅 진도 계획 — 인공지능 기초</div>
        <div class="ap-sub">시간표 · 창체 운영계획(수요일 대체 · 행사) · 정기시험 · 공휴일을 반영한 수업일입니다. 칸에 적은 진도는 바로 저장됩니다.</div></div>
      <div class="ap-clss">${clsBtns}</div>
    </div>
    ${_apMilestones(cid, rows, today)}
    ${AP_ERR ? `<div class="ap-err">⚠️ 저장된 진도를 불러오지 못했습니다 — ${esc(AP_ERR)} <button class="btn-sm" data-action="ap-retry">다시 시도</button></div>` : ''}
    ${loaded ? _apWeeks(cid, rows, today) : '<div class="ap-loading">불러오는 중…</div>'}
  </div>`;
}

/* 다음 이정표까지 남은 수업 수 */
function _apMilestones(cid, rows, today){
  const cls = rows.filter(r => r.no);
  const firstMark = p => (cls.find(r => r.mark && r.mark.indexOf(p) === 0) || {}).date;
  const stones = [
    { label: '1차 정기시험', date: '2026-10-13', kind: 'exam' },
    { label: '2차 수행평가', date: firstMark('2차'), kind: 'asmt' },
    { label: '3차 수행평가', date: firstMark('3차'), kind: 'asmt' },
    { label: '2차 정기시험', date: '2026-12-14', kind: 'exam' },
    { label: '학기 끝', date: AIPLAN.semester[1], kind: 'end' },
  ].filter(s => s.date);
  const chips = stones.map(s => {
    const n = cls.filter(r => r.date >= today && r.date < s.date).length;
    const past = s.date < today;
    return `<div class="ap-ms ${s.kind} ${past ? 'past' : ''}"><span>${esc(s.label)} · ${_apMD(s.date)}</span>
      <b>${past ? '지남' : `앞으로 ${n}회`}</b></div>`;
  }).join('');
  return `<div class="ap-mss">${chips}</div>`;
}

function _apWeeks(cid, rows, today){
  const weeks = [];
  rows.forEach(r => {
    let w = weeks[weeks.length - 1];
    if(!w || w.label !== r.week){ w = { label: r.week, rows: [] }; weeks.push(w); }
    w.rows.push(r);
  });
  const pastWeeks = weeks.filter(w => w.rows[w.rows.length - 1].date < today);
  const nowWeeks = weeks.filter(w => w.rows[w.rows.length - 1].date >= today);
  const pastCount = pastWeeks.reduce((a, w) => a + w.rows.filter(r => r.no).length, 0);

  const toggle = `<button class="ap-pastbtn" data-action="ap-past">${AP_PAST ? '▲ 지난 수업 접기' : `▼ 지난 수업 ${pastCount}회 보기`}</button>`;
  return `${pastWeeks.length ? toggle : ''}
    ${AP_PAST ? pastWeeks.map(w => _apWeek(cid, w, today, true)).join('') : ''}
    ${nowWeeks.map(w => _apWeek(cid, w, today, false)).join('')}`;
}

function _apWeek(cid, w, today, isPast){
  const m = w.label.match(/(\d+)월 (\d+)주/);
  const plan = m ? AIPLAN.plan[`${m[1]}-${m[2]}`] : null;
  const d0 = w.rows[0].date, d1 = w.rows[w.rows.length - 1].date;
  const planHtml = plan && !isPast
    ? `<div class="ap-plan"><span class="ap-unit">${esc(plan.unit)}</span>
        ${plan.codes.length ? `<span class="ap-codes">${plan.codes.map(esc).join(' ')}</span>` : ''}
        ${plan.focus.length ? `<ul>${plan.focus.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}</div>`
    : '';
  const body = w.rows.map(r => _apRow(cid, r, today)).join('');
  return `<div class="ap-week ${isPast ? 'past' : ''}">
    <div class="ap-wh"><b>${esc(w.label)}</b><span>${_apMD(d0)}${d0 !== d1 ? ' ~ ' + _apMD(d1) : ''}</span>
      ${plan ? '<em>계획서</em>' : ''}</div>
    ${planHtml}
    <div class="ap-rows">${body}</div>
  </div>`;
}

function _apRow(cid, r, today){
  const date = `${_apMD(r.date)} <small>(${esc(r.dow)})</small>`;
  const cls = r.date < today ? 'past' : r.date === today ? 'today' : '';
  if(r.off){
    return `<div class="ap-row off ${r.kind} ${cls}">
      <span class="ap-no">—</span><span class="ap-date">${date}</span><span class="ap-per">${r.period}교시</span>
      <span class="ap-off">${esc(r.off)}</span></div>`;
  }
  const tags = [
    r.swap ? `<span class="ap-tag swap">대체 · ${esc(r.swap)}</span>` : '',
    r.mark ? `<span class="ap-tag asmt">${esc(r.mark)}</span>` : '',
    r.check ? `<span class="ap-tag check">⚠ ${esc(r.check)}</span>` : '',
    r.date === today ? '<span class="ap-tag now">오늘</span>' : '',
  ].join('');
  return `<div class="ap-row ${cls} ${r.mark ? 'asmt' : ''}">
    <span class="ap-no">${r.no}</span><span class="ap-date">${date}</span><span class="ap-per">${r.period}교시</span>
    <input class="ap-in" data-ap-key="${esc(r.key)}" data-ap-cid="${esc(cid)}" value="${esc(apText(cid, r))}" placeholder="진도 내용">
    <span class="ap-tags">${tags}</span></div>`;
}
