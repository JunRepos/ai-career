/* ═══════════════════════════════════════
   games/rulecar.js — 🚗 자율주행차 규칙 만들기 (지식 베이스 · 추론 엔진)

   7차시(지식의 표현과 추론) 실습. 선생님 학습지 「새로운 상태공간을 위한 추론」 의 조건·행동 카드로
   IF-THEN 규칙을 만들어 자율주행차의 지식 베이스를 짓고, 주행 시험 여섯 상황을 모두 통과하게 합니다.

   2026-09-11 선생님과 정한 규칙
     · 조건 빈칸 두 칸 = 「자동차가 멈춰 있다」「자동차가 달리고 있다」
     · 조건이 맞는 규칙은 모두 쓴다 — 행동이 서로 다르면 「충돌」 (7차시 추론 엔진 세 걸음과 같음)
     · 「전방의 장애물을 확인한다」 는 연쇄 — 확인하면 장애물이 움직이는지가 새 사실로 드러난다
     · 한 규칙의 조건은 AND 로 두 개까지 — 2026-09-11 「너무 어렵다, 10분 안에」 로 쉽게 바꿈
       (8상황·조건 세 개 → 6상황·조건 두 개. 앞차 상황은 신호등 없는 길로 옮김)

   점수 — 통과한 상황 수 × 100 − 규칙 수 (통과가 같으면 규칙이 적은 쪽이 위). 가장 적게는 7개.
   ⚠ 판 데이터는 손으로 고치지 말고 verify/rulecar.py 를 고친 뒤 verify/rulecar-data.json 을 옮기세요.
     검산기가 이 파일의 판 데이터와 추론 엔진(rcRun)을 node 로 돌려 파이썬 판정과 대조합니다.
   ⚠ 모범 답(지식 베이스)은 여기 넣지 않습니다 — 학생 브라우저로 나가므로.
     교사용은 verify/rulecar.py 의 REFERENCE (돌리면 verify/rulecar-check.txt 에 추론 과정까지 나옴)
═══════════════════════════════════════ */

/* ═══ 판 데이터 시작 — verify/rulecar-data.json 에서 옮긴 값 ═══ */
const RC_DATA = {"conds": [["green", "신호등이 녹색이다"], ["red", "신호등이 적색이다"], ["obs", "전방에 장애물이 있다"], ["noobs", "전방에 장애물이 없다"], ["stop", "자동차가 멈춰 있다"], ["run", "자동차가 달리고 있다"], ["still", "전방의 장애물이 움직이지 않는다"], ["ahead", "전방의 장애물이 앞으로 움직인다"]], "acts": [["go", "앞으로 움직인다"], ["halt", "멈춘다"], ["check", "전방의 장애물을 확인한다"], ["start", "출발한다"], ["slow", "속도를 줄인다"], ["wait", "기다린다"]], "opposite": [["green", "red"], ["obs", "noobs"], ["stop", "run"], ["still", "ahead"]], "scenarios": [{"id": 1, "name": "빨간불 앞에 서 있다", "facts": ["stop", "red", "noobs"], "hidden": [], "expect": "wait", "needCheck": false}, {"id": 2, "name": "초록불로 바뀌었다", "facts": ["stop", "green", "noobs"], "hidden": [], "expect": "start", "needCheck": false}, {"id": 3, "name": "뻥 뚫린 길을 달린다", "facts": ["run", "green", "noobs"], "hidden": [], "expect": "go", "needCheck": false}, {"id": 4, "name": "달리다가 빨간불", "facts": ["run", "red", "noobs"], "hidden": [], "expect": "halt", "needCheck": false}, {"id": 5, "name": "신호등 없는 길, 앞차가 서 있다", "facts": ["run", "obs"], "hidden": ["still"], "expect": "halt", "needCheck": true}, {"id": 6, "name": "신호등 없는 길, 앞차가 달린다", "facts": ["run", "obs"], "hidden": ["ahead"], "expect": "slow", "needCheck": true}], "minRules": 7, "maxConds": 2, "need2": [1, 2, 3, 4]};
/* ═══ 판 데이터 끝 ═══ */

const RC_TXT = { cond: Object.fromEntries(RC_DATA.conds), act: Object.fromEntries(RC_DATA.acts) };
const RC_ORDER = RC_DATA.conds.map(c => c[0]);
const RC_MAX = 15;                 // 규칙은 15개까지
const RC_SCORE_ID = 'rule-car-2';  // 점수 자리 — 쉽게 바꾸면서 새로 (옛 8상황 기록이 섞이지 않게)
const RC_VERDICT = {
  pass: '통과', none: '행동 없음', conflict: '충돌', wrong: '틀린 행동', nocheck: '확인 안 함',
};

let RC = null;
let RC_RANK = [];
let RC_BEST = null;                // { pass, rules }

/* ── 추론 엔진 — 7차시 세 걸음 ──
   ① 지금 아는 사실과 규칙의 IF 를 비교한다
   ② 조건이 맞는 규칙의 THEN 을 모두 쓴다 (「확인한다」 면 숨은 사실을 새 사실로 더한다)
   ③ 새로 불릴 규칙이 없을 때까지 되풀이한다
   verify/rulecar.py 의 run() 과 한 줄 한 줄 같습니다 — 고치면 둘 다 고치세요. */
function _rcMatch(rule, known){
  const cs = rule.conds;
  if(cs.length === 1 || rule.op === 'AND') return cs.every(c => known.has(c));
  return cs.some(c => known.has(c));
}

function rcRun(rules, sc){
  const known = sc.facts.slice();
  const fired = new Set(), acts = [], trace = [];
  for(;;){
    const set = new Set(known);
    const now = [];
    rules.forEach((r, i) => { if(!fired.has(i) && _rcMatch(r, set)) now.push(i); });
    if(!now.length) break;
    now.forEach(i => fired.add(i));
    const nw = [];
    for(const i of now){
      const a = rules[i].act;
      if(!acts.includes(a)) acts.push(a);
      if(a === 'check'){
        const hid = sc.hidden.slice().sort((x, y) => RC_ORDER.indexOf(x) - RC_ORDER.indexOf(y));
        for(const h of hid){ if(!known.includes(h)){ known.push(h); nw.push(h); } }
      }
    }
    trace.push({ rules: now, new: nw });
  }
  const drive = acts.filter(a => a !== 'check');
  const checked = acts.includes('check');
  let verdict;
  if(!drive.length) verdict = 'none';
  else if(drive.length > 1) verdict = 'conflict';
  else if(drive[0] !== sc.expect) verdict = 'wrong';
  else if(sc.needCheck && !checked) verdict = 'nocheck';
  else verdict = 'pass';
  return { verdict, acts, trace, known };
}

/* ── 저장 — 새로 고침해도 만든 규칙이 남게 (학번마다 따로) ── */
function _rcKey(){ return 'rc-rules-' + ((typeof ST_USER !== 'undefined' && ST_USER && ST_USER.number) || 'guest'); }
function _rcValid(r){
  return r && Array.isArray(r.conds) && r.conds.length >= 1 && r.conds.length <= RC_DATA.maxConds &&
    r.conds.every(c => RC_TXT.cond[c]) && new Set(r.conds).size === r.conds.length &&
    RC_TXT.act[r.act] && (r.op === 'AND' || r.conds.length === 1);
}
function _rcLoad(){
  try {
    const v = JSON.parse(localStorage.getItem(_rcKey()) || '[]');
    return Array.isArray(v) ? v.filter(_rcValid).slice(0, RC_MAX) : [];
  } catch(e){ return []; }
}
function _rcSave(){
  try { localStorage.setItem(_rcKey(), JSON.stringify(RC.rules)); } catch(e){ /* 저장 못 해도 진행 */ }
}

/* ── 화면 ── */

function vRuleCar(){
  if(!RC) return _rcIntro();
  return _rcPlay();
}

function _rcIntro(){
  const n = RC_DATA.scenarios.length;
  const best = RC_BEST ? `<div class="mz-best">내 최고 기록 — 통과 <b>${RC_BEST.pass}/${n}</b> · 규칙 <b>${RC_BEST.rules}개</b></div>` : '';
  return `<div class="mz-wrap rc-wrap">
    <div class="mz-title">자율주행차 규칙 만들기</div>
    <div class="mz-sub">조건과 행동을 이어 IF-THEN 규칙을 만들고 · 주행 시험 ${n}개 상황을 모두 통과하기</div>
    <div class="mz-speech">
      여러분이 만든 규칙들이 자율주행차의 <b>지식 베이스</b>가 됩니다.
      주행 시험을 누르면 <b>추론 엔진</b>이 상황마다 지금 아는 사실과 규칙의 IF 를 비교해,
      조건이 맞는 규칙의 THEN 을 행동으로 고릅니다.
    </div>
    <div class="mz-speech cc-tip">
      <b>충돌</b> — 한 상황에서 서로 다른 행동이 함께 나오면 통과할 수 없습니다. 조건을 <b>AND</b> 로 더 좁혀 보세요.<br>
      <b>확인</b> — 「전방의 장애물을 확인한다」 를 하면 장애물이 움직이는지가 <b>새 사실</b>로 드러나고, 그 사실로 다음 규칙이 불립니다.<br>
      주행 시험에서는 차가 상황 1부터 차례로 달립니다. 규칙이 틀리면 <b>쾅</b> — 사고가 납니다.<br>
      조건은 <b>AND</b> 로 <b>${RC_DATA.maxConds}개까지</b> 이을 수 있습니다 — 예: IF 자동차가 멈춰 있다 AND 신호등이 적색이다 THEN 기다린다. 통과가 같으면 <b>규칙이 적을수록</b> 좋은 기록입니다.
    </div>
    ${best}
    <button class="mz-btn" data-action="rc-start">시작하기</button>
  </div>`;
}

function _rcOpts(list, cur, blank){
  return (blank ? `<option value="">${blank}</option>` : '') +
    list.map(([id, t]) => `<option value="${id}"${id === cur ? ' selected' : ''}>${esc(t)}</option>`).join('');
}

function _rcRuleText(r){
  const cs = r.conds.map(c => esc(RC_TXT.cond[c])).join(` <b>${r.op}</b> `);
  return `<b>IF</b> ${cs} <b>THEN</b> <em>${esc(RC_TXT.act[r.act])}</em>`;
}

function _rcDecks(){
  const c = RC_DATA.conds.map(([, t]) => `<span>${esc(t)}</span>`).join('');
  const a = RC_DATA.acts.map(([, t]) => `<span>${esc(t)}</span>`).join('');
  return `<div class="rc-cards">
    <div class="rc-deck"><h4>조건</h4>${c}</div>
    <div class="rc-deck"><h4>행동</h4>${a}</div>
  </div>`;
}

function _rcBuilder(){
  const d = RC.draft;
  return `<div class="rc-build" id="rc-build">
    <span class="kw">IF</span>
    <select class="rc-sel" id="rc-c1" aria-label="조건 1">${_rcOpts(RC_DATA.conds, d.c1)}</select>
    <span class="kw">AND</span>
    <select class="rc-sel" id="rc-c2" aria-label="조건 2">${_rcOpts(RC_DATA.conds, d.c2, '(조건 하나만 쓸 때는 비워 둠)')}</select>
    <span class="kw">THEN</span>
    <div class="rc-then">
      <select class="rc-sel" id="rc-act" aria-label="행동">${_rcOpts(RC_DATA.acts, d.act)}</select>
      <button class="rc-add" data-action="rc-add">규칙 넣기</button>
    </div>
  </div>
  <div class="rc-hint">조건을 두 개 고르면 <b>두 조건이 모두 맞을 때(AND)</b>만 규칙이 불립니다</div>
  <div class="rc-msg">${RC.msg || ''}</div>`;
}

function _rcRules(){
  if(!RC.rules.length) return '<div class="mz-empty rc-none">아직 규칙이 없습니다 — 위에서 조건과 행동을 골라 넣으세요</div>';
  const res = RC.results && RC.results[RC.sel];
  const hot = new Set(res ? res.trace.flatMap(t => t.rules) : []);
  return `<div class="rc-rules">${RC.rules.map((r, i) => `
    <div class="rc-rule${hot.has(i) ? ' hot' : ''}"><span class="no">R${i + 1}</span>
      <span class="tx">${_rcRuleText(r)}</span>
      <button class="rc-x" data-action="rc-del" data-i="${i}" title="이 규칙 지우기">✕</button></div>`).join('')}</div>`;
}

function _rcScenes(){
  return `<div class="rc-scs">${RC_DATA.scenarios.map((sc, i) => {
    const r = RC.results && RC.results[i], wait = RC.mode === 'play' && i >= RC.at;
    const badge = !r ? '<span class="rc-badge idle">시험 전</span>'
      : wait ? (i === RC.at ? '<span class="rc-badge run">주행 중</span>' : '<span class="rc-badge idle">대기</span>')
      : `<span class="rc-badge ${r.verdict}">${RC_VERDICT[r.verdict]}</span>`;
    return `<button class="rc-sc${i === RC.sel ? ' on' : ''}" data-action="rc-show" data-i="${i}" aria-label="상황 ${sc.id} ${esc(sc.name)}">
      <span class="n">${sc.id}</span><span class="nm">${esc(sc.name)}</span>${badge}</button>`;
  }).join('')}</div>`;
}

function _rcDetail(){
  const sc = RC_DATA.scenarios[RC.sel];
  const facts = sc.facts.map(f => `<span class="rc-fact">${esc(RC_TXT.cond[f])}</span>`).join('');
  const hid = sc.hidden.length ? '<span class="rc-fact hid">? 장애물이 움직이는지는 확인해야 안다</span>' : '';
  const want = (sc.needCheck ? `${esc(RC_TXT.act.check)} → ` : '') + `<b>${esc(RC_TXT.act[sc.expect])}</b>`;
  let body = '';
  const r = RC.results && RC.results[RC.sel];
  if(r){
    const late = RC.mode === 'play' || RC.mode === 'view'    // 장면에서 결과가 나올 때 같이 보이게
      ? ` rc-late" style="animation-delay:${_rsScript(sc, r, rcOutcome(sc, r)).tEnd.toFixed(2)}s` : '';
    const steps = r.trace.map((t, k) => {
      const names = t.rules.map(i => 'R' + (i + 1)).join(', ');
      const acts = [...new Set(t.rules.map(i => RC.rules[i].act))].map(a => esc(RC_TXT.act[a])).join(', ');
      const nw = t.new.length ? ` <span class="rc-new">새 사실: ${t.new.map(h => esc(RC_TXT.cond[h])).join(', ')}</span>` : '';
      return `<li>${k + 1}회차 — ${names} 의 조건이 맞음 → ${acts}${nw}</li>`;
    }).join('');
    const drive = r.acts.filter(a => a !== 'check').map(a => RC_TXT.act[a]);
    const say = {
      pass: '통과',
      none: r.acts.includes('check')
        ? '행동 없음 — 확인은 했지만, 드러난 사실로 행동을 정하는 규칙이 없습니다. 규칙을 더해 보세요.'
        : '행동 없음 — 이 상황에서 조건이 맞는 규칙이 없습니다. 규칙을 더해 보세요.',
      conflict: `충돌 — 「${drive.join('」 「')}」 가 함께 나왔습니다. 조건을 AND 로 더 좁혀 보세요.`,
      wrong: `틀린 행동 — 이 상황에서는 「${RC_TXT.act[sc.expect]}」 가 맞습니다 (지금 행동: 「${drive[0] || ''}」).`,
      nocheck: '확인 안 함 — 장애물이 움직이는지 먼저 확인해야 합니다. 확인한 뒤에 드러나는 사실로 행동을 정하세요.',
    }[r.verdict];
    body = `<div class="rc-row"><span class="rc-k">추론 과정</span>
        ${steps ? `<ol class="rc-steps">${steps}</ol>` : '<span>조건이 맞는 규칙이 하나도 없습니다</span>'}</div>
      <div class="rc-verdict ${r.verdict === 'pass' ? 'pass' : 'bad'}${late}">${esc(say)}</div>`;
  } else {
    body = '<div class="rc-row rc-wait">주행 시험을 누르면 이 상황에서 어느 규칙이 불렸는지 차례로 보여 줍니다</div>';
  }
  return `<div class="rc-detail">
    <h4>상황 ${sc.id}. ${esc(sc.name)}</h4>
    <div class="rc-row"><span class="rc-k">처음 아는 사실</span>${facts}${hid}</div>
    <div class="rc-row"><span class="rc-k">해야 할 행동</span>${want}</div>
    ${body}
  </div>`;
}

function _rcPlay(){
  const S = RC_DATA.scenarios;
  const R = RC.results, playing = RC.mode === 'play';
  const shown = R ? (playing ? R.slice(0, RC.at) : R) : [];       // 달리는 중에는 지나온 상황만 셈
  const pass = shown.filter(r => r.verdict === 'pass').length;
  const n = RC.rules.length, min = RC_DATA.minRules;
  const done = R && !playing && pass === S.length ? `<div class="mz-speech cc-name rc-done">
      ${S.length}개 상황을 모두 통과했습니다 — 규칙 <b>${n}개</b>${n > min ? ` · 가장 적게는 <b>${min}개</b>로도 됩니다` : ' · <b>가장 적은 수</b>입니다'}.<br>
      방금 만든 규칙들이 <b>전문가 시스템의 지식 베이스</b>이고, 주행 시험을 돌린 것이 <b>추론 엔진</b>입니다.
      그런데 상황이 여섯 개가 아니라 수천 개라면? 사람이 모든 경우를 규칙으로 적어 넣기는 어렵습니다 —
      이것이 전문가 시스템의 한계이고, <b>기계학습</b>이 나온 까닭입니다.
    </div>` : '';
  return `<div class="mz-wrap rc-wrap">
    <div class="mz-bar">
      <div><b>🚗 자율주행차 규칙 만들기</b></div>
      <div>규칙 <b>${n}</b>개${R ? ` · 통과 <b>${pass}/${S.length}</b>` : ''}</div>
    </div>
    ${_rcDecks()}
    <div class="mz-board">
      <div class="mz-col">
        <div class="mz-lab">지식 베이스 — 내가 만든 규칙</div>
        ${_rcBuilder()}
        ${_rcRules()}
      </div>
      <div class="mz-col">
        <div class="mz-lab">주행 시험 — 상황 ${S.length}개 (눌러서 자세히)</div>
        ${_rcScenes()}
      </div>
    </div>
    ${!R || RC.mode === 'idle' ? rcStageIdle() : RC.mode === 'done' ? rcStageDone() : rcScene(playing ? RC.at : RC.sel)}
    ${_rcDetail()}
    <div class="rc-btns">${playing
      ? '<button class="mz-btn" data-action="rc-skip">⏭ 결과만 보기</button>'
      : `<button class="mz-btn" data-action="rc-test">주행 시험 하기</button>
      <button class="mz-btn rc-small" data-action="rc-reset">${RC.confirmReset ? '한 번 더 누르면 모두 지웁니다' : '규칙 모두 지우기'}</button>`}
    </div>
    ${done}
  </div>`;
}

/* ── 진행 ── */

function rcStart(){
  RC = {
    rules: _rcLoad(),
    draft: { c1: 'green', op: 'AND', c2: '', c3: '', act: 'go' },
    results: null, sel: 0, msg: '', confirmReset: false,
    mode: 'idle', at: 0, timer: null,     // idle · play(차례로 달림) · view(한 장면 다시) · done
  };
  return RC;
}

/* 고르기 칸의 값을 상태로 옮깁니다 — 다시 그려도 고른 것이 남게 */
function _rcGrab(){
  if(!RC) return;
  const root = document.getElementById('rc-build');
  if(!root) return;
  const v = id => { const el = root.querySelector('#' + id); return el ? el.value : ''; };
  RC.draft = { c1: v('rc-c1'), op: v('rc-op') || 'AND', c2: v('rc-c2'), c3: v('rc-c3'), act: v('rc-act') };
}

function rcAdd(){
  if(!RC) return;
  _rcGrab();
  RC.confirmReset = false;
  const d = RC.draft;
  const conds = [d.c1, d.c2, d.c3].filter(Boolean);
  const bad = msg => { RC.msg = msg; render(); };
  if(!conds.length) return bad('조건을 하나 이상 고르세요.');
  if(new Set(conds).size !== conds.length) return bad('같은 조건을 두 번 넣었습니다.');
  if(RC.rules.length >= RC_MAX) return bad(`규칙은 ${RC_MAX}개까지입니다. 필요 없는 규칙을 지워 보세요.`);
  const op = conds.length > 1 ? d.op : 'AND';
  if(op === 'AND'){
    const clash = RC_DATA.opposite.find(([a, b]) => conds.includes(a) && conds.includes(b));
    if(clash) return bad(`「${RC_TXT.cond[clash[0]]}」 와 「${RC_TXT.cond[clash[1]]}」 는 동시에 참일 수 없어서, AND 로 이으면 이 규칙은 영영 불리지 않습니다.`);
  }
  const key = r => [r.conds.slice().sort().join('+'), r.op, r.act].join('|');
  const rule = { conds, op, act: d.act };
  if(RC.rules.some(r => key(r) === key(rule))) return bad('같은 규칙이 이미 있습니다.');
  RC.rules.push(rule);
  RC.results = null; _rcStop(); RC.mode = 'idle';                 // 규칙이 바뀌었으니 시험을 다시 봐야 합니다
  RC.msg = '';
  _rcSave();
  render();
}

function rcDel(i){
  if(!RC || !RC.rules[i]) return;
  _rcGrab();
  RC.rules.splice(i, 1);
  RC.results = null; _rcStop(); RC.mode = 'idle';
  RC.msg = '';
  RC.confirmReset = false;
  _rcSave();
  render();
}

function rcShow(i){
  if(!RC || !RC_DATA.scenarios[i]) return;
  _rcGrab();
  _rcStop();
  RC.sel = i;
  if(RC.results) RC.mode = 'view';     // 그 상황 장면을 한 번 더
  render();
}

function rcReset(){
  if(!RC) return;
  _rcGrab();
  if(!RC.rules.length) return;
  if(!RC.confirmReset){ RC.confirmReset = true; render(); return; }
  RC.rules = [];
  RC.results = null; _rcStop(); RC.mode = 'idle';
  RC.msg = '';
  RC.confirmReset = false;
  _rcSave();
  render();
}

function rcTest(){
  if(!RC) return;
  _rcGrab();
  _rcStop();
  RC.confirmReset = false;
  if(!RC.rules.length){ RC.msg = '규칙을 먼저 넣으세요.'; render(); return; }
  RC.results = RC_DATA.scenarios.map(sc => rcRun(RC.rules, sc));
  RC.msg = '';
  RC.mode = 'play'; RC.at = 0; RC.sel = 0;          // 상황 1부터 차례로 달림
  const pass = RC.results.filter(r => r.verdict === 'pass').length;
  render();
  _rcNext();
  _rcScore(pass, RC.rules.length);
}

/* ── 주행 장면 넘기기 — 한 상황 장면이 끝나면 다음 상황 (장면 안의 움직임은 CSS 가 함) ── */
function _rcStop(){ if(RC && RC.timer){ clearTimeout(RC.timer); RC.timer = null; } }
function _rcNext(){
  _rcStop();
  const sc = RC_DATA.scenarios[RC.at], r = RC.results[RC.at];
  RC.timer = setTimeout(_rcTick, (_rsScript(sc, r, rcOutcome(sc, r)).D + 0.6) * 1000);
}
function _rcTick(){
  if(!RC || RC.mode !== 'play') return;
  RC.timer = null;
  if(!document.getElementById('rc-stage')){ _rcFinish(); return; }   // 게임 화면을 떠났으면 멈춤
  _rcGrab();
  if(RC.at + 1 >= RC_DATA.scenarios.length){ _rcFinish(); render(); return; }
  RC.at++; RC.sel = RC.at;
  render();
  _rcNext();
}
function _rcFinish(){
  RC.mode = 'done';
  const bad = RC.results.findIndex(r => r.verdict !== 'pass');
  if(bad >= 0) RC.sel = bad;
}
function rcSkip(){
  if(!RC || RC.mode !== 'play') return;
  _rcGrab(); _rcStop(); _rcFinish(); render();
}

/* 통과 × 100 − 규칙 수 — 저장 함수는 가장 큰 값만 남깁니다 */
async function _rcScore(pass, n){
  if(pass < 1) return;
  const score = pass * 100 - n;
  if(RC_BEST && RC_BEST.pass * 100 - RC_BEST.rules >= score) return;
  RC_BEST = { pass, rules: n };
  if(typeof SEL_CLS !== 'undefined' && SEL_CLS && ST_USER){
    try { await saveGameScore(SEL_CLS.id, ST_USER.number, ST_USER.name, score, RC_SCORE_ID); }
    catch(e){ console.warn('[자율주행차 규칙] 기록 저장 실패:', e.message || e); }
  }
}

function rcLeave(){ _rcStop(); RC = null; }

async function rcLoadRank(){
  if(typeof SEL_CLS === 'undefined' || !SEL_CLS) return;
  try {
    const all = await loadGameScores(SEL_CLS.id, RC_SCORE_ID);
    RC_RANK = Object.entries(all).map(([num, v]) => {
      const best = v.best || 0;
      const pass = Math.ceil(best / 100);
      return { num, name: v.name, best, pass, rules: pass * 100 - best };
    }).sort((a, b) => b.best - a.best);
    const me = RC_RANK.find(r => r.num === ST_USER?.number);
    if(me) RC_BEST = { pass: me.pass, rules: me.rules };
  } catch(e){ console.warn('[자율주행차 규칙] 순위 로드 실패:', e.message || e); }
  render();
}

function rcBoardForTeacher(){
  const n = RC_DATA.scenarios.length;
  const rows = RC_RANK.slice(0, 5).map((r, i) => `
    <div class="pwt-row"><span class="pwt-n">${i + 1}</span>
      <span class="pwt-name">${esc(r.name || r.num)}</span>
      <span class="pwt-s">${r.pass}/${n}<i>통과</i> ${r.rules}<i>규칙</i></span></div>`).join('');
  return `<div class="pwt">
    <div class="pwt-title">🚗 자율주행차 규칙 만들기</div>
    <div class="pwt-sub">각자 화면에서 시작하세요 · 통과가 많을수록, 같으면 규칙이 적을수록 위로 (가장 적게는 ${RC_DATA.minRules}개)</div>
    <div class="pwt-rank">${rows || '<div class="pwt-empty">아직 기록이 없습니다</div>'}</div>
    <div class="pwt-cnt">참여 ${RC_RANK.length}명</div>
  </div>`;
}
