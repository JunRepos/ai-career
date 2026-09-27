/* ═══════════════════════════════════════
   views/guide.js — 대학 가이드북 (학생 화면)

   대학이 낸 학생부종합전형 가이드북에서 "무엇을 어떻게 평가하는지"를 읽고,
   체크리스트로 자기 학교생활기록부를 점검하는 화면입니다. 데이터는 js/guide-data.js.

   탭 여섯
     what   무엇을 보는가   — 평가요소와 비율, 학생부 어디를 보는지, 면접
     check  자가 점검       — 체크리스트 15문항 (체크하면 영역별로 몇 개인지)
     detail 자세한 평가지표 — 대학이 공개한 평가지표(안)
     qna    궁금증          — 평가항목별 Q&A
     plan   학년별 준비     — 1·2·3학년에 할 것
     subj   과목 TOP10      — 단과대학별 진로선택과목 이수 순위
═══════════════════════════════════════ */

let GD_ID   = (typeof GUIDES !== 'undefined' && GUIDES[0]) ? GUIDES[0].id : '';
let GD_TAB  = 'what';
let GD_SCR  = 'KGU';      // 전형 (KGU / SW)
let GD_CHECK = {};        // 체크리스트 체크 상태 — 화면에서만 씁니다 (저장은 학습지로)
let GD_OPEN = {};         // 아코디언 열림
let GD_COL  = '';         // 과목 TOP10 에서 고른 단과대학
let GD_CASE = 0;          // 평가 사례 번호

const GD_TABS = [
  ['what',   '무엇을 보는가'],
  ['check',  '자가 점검'],
  ['detail', '자세한 평가지표'],
  ['case',   '평가 사례'],
  ['qna',    '궁금증'],
  ['plan',   '학년별 준비'],
  ['subj',   '과목 TOP10'],
];

function vStGuide(){
  const g = guideById(GD_ID);
  if(!g) return emptyBox('📘', '가이드북 자료가 아직 없습니다.');

  const univPick = GUIDES.length > 1
    ? `<div class="gd-univs">${GUIDES.map(u => `<button class="gd-univ${u.id === g.id ? ' on' : ''}"
         data-action="gd-univ" data-id="${esc(u.id)}">${esc(u.univ)}</button>`).join('')}</div>`
    : '';

  const tabs = GD_TABS.map(([k, label]) =>
    `<button class="gd-tab${GD_TAB === k ? ' on' : ''}" data-action="gd-tab" data-k="${k}">${label}</button>`).join('');

  const body = GD_TAB === 'check'  ? _gdCheck(g)
             : GD_TAB === 'case'   ? _gdCase(g)
             : GD_TAB === 'detail' ? _gdDetail(g)
             : GD_TAB === 'qna'    ? _gdQna(g)
             : GD_TAB === 'plan'   ? _gdPlan(g)
             : GD_TAB === 'subj'   ? _gdSubj(g)
             : _gdWhat(g);

  return `<div class="gd">
    <div class="gd-head">
      <div class="gd-univ-name">${esc(g.univ)}</div>
      <div class="gd-title">${esc(g.title)}</div>
      <div class="gd-src">${esc(g.source)} ·
        <a href="${esc(g.siteUrl)}" target="_blank" rel="noopener">입학처에서 원문 보기</a></div>
      <div class="gd-note">${esc(g.note)}</div>
    </div>
    ${univPick}
    <div class="gd-tabs">${tabs}</div>
    <div class="gd-body">${body}</div>
  </div>`;
}

/* ── 무엇을 보는가 ── */
function _gdWhat(g){
  const keys = Object.keys(g.screens);
  const scr = g.screens[GD_SCR] || g.screens[keys[0]];
  const pick = keys.map(k => `<button class="gd-pill${(g.screens[GD_SCR] ? GD_SCR : keys[0]) === k ? ' on' : ''}"
      data-action="gd-scr" data-k="${esc(k)}">${esc(g.screens[k].label.split(' (')[0])}</button>`).join('');

  const cards = scr.elements.map(e => `<div class="gd-card">
      <div class="gd-card-top">
        <span class="gd-card-name">${esc(e.name)}</span>
        <span class="gd-card-pct">${e.pct}%</span>
      </div>
      <div class="gd-bar"><i style="width:${e.pct}%"></i></div>
      <div class="gd-card-group">${esc(g.groups[e.name] || '')}</div>
      <ul class="gd-list">${e.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="gd-areas">학생부에서 보는 곳 · ${e.areas.map(esc).join(' · ')}</div>
    </div>`).join('');

  const iv = g.interview;
  return `<div class="gd-sec-t">서류평가 — 무엇을 몇 %로 보나</div>
    <div class="gd-pills">${pick}</div>
    <div class="gd-cards">${cards}</div>
    <div class="gd-scale">평가척도 ${g.scale.map(s => `<b>${esc(s)}</b>`).join(' · ')}
      <span>입학사정관 여러 명이 정성평가합니다.</span></div>
    <div class="gd-sec-t">면접평가</div>
    <div class="gd-iv-intro">${esc(iv.intro)}</div>
    <div class="gd-cards">${iv.elements.map(e => `<div class="gd-card gd-card-sm">
        <div class="gd-card-top"><span class="gd-card-name">${esc(e.name)}</span>
          <span class="gd-card-pct">${e.pct}%</span></div>
        <div class="gd-iv-desc">${esc(e.desc)}</div>
        ${e.base.length ? `<div class="gd-areas">서류 평가항목 · ${e.base.map(esc).join(' · ')}</div>` : ''}
      </div>`).join('')}</div>`;
}

/* ── 자가 점검 ── */
function _gdCheck(g){
  const areas = [...new Set(g.checklist.map(c => c.area))];
  const done = a => g.checklist.filter((c, i) => c.area === a && GD_CHECK[i]).length;
  const tot  = a => g.checklist.filter(c => c.area === a).length;

  const summary = areas.map(a => {
    const d = done(a), t = tot(a);
    const cls = d === t ? 'full' : d === 0 ? 'none' : '';
    return `<div class="gd-sum ${cls}"><b>${esc(a)}</b><span>${d} / ${t}</span></div>`;
  }).join('');

  const groups = areas.map(a => `<div class="gd-chk-group">
      <div class="gd-chk-head">${esc(a)} <span>${esc(g.groups[a] || '')}</span></div>
      ${g.checklist.map((c, i) => c.area !== a ? '' : `
        <label class="gd-chk${GD_CHECK[i] ? ' on' : ''}">
          <input type="checkbox" data-action="gd-check" data-i="${i}" ${GD_CHECK[i] ? 'checked' : ''}/>
          <span class="gd-chk-box"></span><span>${esc(c.q)}</span>
        </label>`).join('')}
    </div>`).join('');

  return `<div class="gd-guide-txt">내 학교생활기록부를 떠올리면서, <b>근거가 되는 기록이 실제로 있는 것만</b> 체크해 보세요.
      체크가 적은 영역이 앞으로 채워야 할 곳입니다. (체크는 저장되지 않습니다 — 학습지에 옮겨 적으세요)</div>
    <div class="gd-sums">${summary}</div>
    ${groups}`;
}

/* ── 자세한 평가지표 ── */
function _gdDetail(g){
  const subs = [...new Set(g.indicators.map(i => i.sub))];
  return `<div class="gd-guide-txt">대학이 공개한 평가지표입니다. 체크리스트보다 자세해서,
      "이 정도까지 본다"를 확인할 때 보세요.</div>
    ${subs.map(s => `<div class="gd-acc${GD_OPEN['d' + s] ? ' on' : ''}">
      <button class="gd-acc-head" data-action="gd-open" data-k="d${esc(s)}">
        <span>${esc(s)}</span><span class="gd-acc-n">${g.indicators.filter(i => i.sub === s).length}</span>
      </button>
      <div class="gd-acc-body"><ul class="gd-list">
        ${g.indicators.filter(i => i.sub === s).map(i => `<li>${esc(i.q)}</li>`).join('')}
      </ul></div>
    </div>`).join('')}`;
}

/* ── 평가 사례 — 학생부에 이렇게 적혀 있고, 대학은 이렇게 읽었다 ── */
function _gdCase(g){
  const cs = g.cases || [];
  if(!cs.length) return emptyBox('📄', '사례 자료가 없습니다.');
  const cur = Math.min(GD_CASE, cs.length - 1);
  const c = cs[cur];
  return `<div class="gd-guide-txt">학생부에 <b>이렇게 적혀 있을 때 대학이 어떻게 읽었는지</b> 짝지어 놓은 자료입니다.
      대학이 학교생활기록부 내용을 줄이고 다시 구성한 것이라, 실제 학생부와는 다릅니다.</div>
    <div class="gd-pills">${cs.map((x, i) => `<button class="gd-pill${i === cur ? ' on' : ''}"
        data-action="gd-case" data-i="${i}">${esc(x.area)}</button>`).join('')}</div>
    <div class="gd-case-head">${esc(c.group)} · ${esc(c.area)} <span>${esc(c.dept)}</span></div>
    <div class="gd-sec-t">학생부에 적힌 것</div>
    <div class="gd-recs">${c.records.map(r => `<div class="gd-rec">
        <div class="gd-rec-w">${esc(r.where)}</div><p>${esc(r.text)}</p></div>`).join('')}</div>
    <div class="gd-sec-t">대학이 읽은 것 (평가 의견)</div>
    ${c.opinion.map(o => `<div class="gd-op">
      <div class="gd-op-t">${esc(o.sub)}</div><p>${esc(o.text)}</p></div>`).join('')}`;
}

/* ── 궁금증 ── */
function _gdQna(g){
  const areas = [...new Set(g.qna.map(q => q.area))];
  return areas.map(a => `<div class="gd-qna-area">
      <div class="gd-sec-t">${esc(a)}</div>
      ${g.qna.map((q, i) => q.area !== a ? '' : `
        <div class="gd-acc${GD_OPEN['q' + i] ? ' on' : ''}">
          <button class="gd-acc-head" data-action="gd-open" data-k="q${i}">
            <span>${esc(q.q)}</span><span class="gd-acc-n">＋</span>
          </button>
          <div class="gd-acc-body">
            ${q.title ? `<div class="gd-qna-title">${esc(q.title)}</div>` : ''}
            <p>${esc(q.a)}</p>
          </div>
        </div>`).join('')}
    </div>`).join('');
}

/* ── 학년별 준비 ── */
function _gdPlan(g){
  return `<div class="gd-plan">${g.grades.map(x => `<div class="gd-plan-card">
      <div class="gd-plan-t">${esc(x.title)}</div>
      <p>${esc(x.body)}</p>
    </div>`).join('')}</div>`;
}

/* ── 과목 TOP10 ── */
function _gdSubj(g){
  const cols = Object.keys(g.top10 || {});
  if(!cols.length) return emptyBox('📊', '과목 자료가 없습니다.');
  const cur = g.top10[GD_COL] ? GD_COL : cols[0];
  const rows = g.top10[cur].map(r => `<tr>
      <td class="gd-rank">${r.rank}</td>
      <td>${esc(r.subject)}<span class="gd-sub-g">${esc(r.group)}</span></td>
      <td class="gd-pct">${esc(r.apply)}</td>
      <td>${esc(r.subject2)}<span class="gd-sub-g">${esc(r.group2)}</span></td>
      <td class="gd-pct">${esc(r.pass)}</td>
    </tr>`).join('');
  return `<div class="gd-guide-txt">이 대학에 지원한 학생과 1단계에 붙은 학생이 <b>어떤 진로선택과목을 들었는지</b>입니다.
      ⚠ 2015 개정 교육과정 과목 이름이라 지금 2학년(2022 개정)과 과목명이 다릅니다. 과목 이름보다
      <b>어느 교과를 얼마나 들었는지</b>를 보세요.</div>
    <div class="gd-pills">${cols.map(c => `<button class="gd-pill${c === cur ? ' on' : ''}"
        data-action="gd-col" data-k="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="gd-table-wrap"><table class="gd-table">
      <thead><tr><th>순위</th><th>지원자</th><th>비율</th><th>1단계 합격자</th><th>비율</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}
