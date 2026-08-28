/* ═══════════════════════════════════════
   games/citycost.js — 🏙 도시 배달 (균일 비용 탐색)

   길마다 걸리는 시간이 다른 도시에서, 출발 a 에서 목적지 h 까지 **가장 싼 길**을 찾습니다.

   ⚠ 학생에게 규칙을 먼저 알려 주지 않습니다.
     "오픈 리스트에서 **어디를 골라야 할까요?**" 만 묻고, 스스로 찾아내게 합니다.
     다 끝난 뒤에야 "지금 한 것이 균일 비용 탐색입니다" 라고 이름을 붙여 줍니다.

   판은 verify/citycost.py 로 검산했습니다.
     가장 싼 길      a → c → d → f → h · 비용 12 · 간선 4개
     간선이 적은 길  a → b → e → h     · 비용 19 · 간선 3개
     → **깊이(간선 수)가 곧 비용이 아니다** 가 판에서 그대로 드러납니다.
     테스트 7번 · 중간에 h(18) 이 h(12) 로 바뀌는 장면이 있습니다.

   ⚠ 진행 중에는 render() 를 부르지 않고 값만 갈아끼웁니다.
═══════════════════════════════════════ */

/* ═══ 판 데이터 시작 ═══ */
const CC_MAP = {
  pos: {
    a: [4, 50], b: [23, 15], c: [22, 85], d: [45, 60],
    e: [47, 15], f: [69, 37], g: [69, 88], h: [96, 52],
  },
  edges: [
    ['a', 'b', 4], ['a', 'c', 2],
    ['b', 'd', 5], ['b', 'e', 6],
    ['c', 'd', 3], ['c', 'e', 7],
    ['d', 'f', 4], ['d', 'g', 8],
    ['e', 'f', 2], ['e', 'h', 9],
    ['f', 'h', 3], ['g', 'h', 2],
  ],
  start: 'a', goal: 'h',
};
/* ═══ 판 데이터 끝 ═══ */

let CC = null;
let CC_RANK = [];
let CC_BEST = null;

function _ccAdj(){
  const adj = {};
  for(const [u, v, w] of CC_MAP.edges){ (adj[u] ||= []).push([v, w]); (adj[v] ||= []).push([u, w]); }
  for(const k in adj) adj[k].sort((a, b) => a[0].localeCompare(b[0]));
  return adj;
}

/* ── 화면 ── */

function vCityCost(){
  if(!CC) return _ccIntro();
  if(CC.over) return _ccResult();
  return _ccPlay();
}

function _ccIntro(){
  const best = CC_BEST == null ? ''
    : `<div class="mz-best">내 최고 기록 — 헤맨 횟수 <b>${CC_BEST}</b></div>`;
  return `<div class="mz-wrap cc-wrap">
    <div class="cc-sky"><i></i></div>
    <div class="cc-front">
      <div class="mz-title">도시 배달</div>
      <div class="mz-sub">출발 a → 목적지 h · 가장 빨리 가는 길 찾기</div>
      <div class="mz-speech">
        길마다 <b>걸리는 시간이 다릅니다.</b> 간선 위의 숫자가 그 길을 지나는 데 걸리는 시간이에요.<br>
        도시를 하나씩 <b>열어 보면서</b> 목적지까지 <b>가장 짧은 시간</b>으로 가는 길을 찾으세요.
      </div>
      <div class="mz-speech cc-tip">
        열어 볼 후보는 <b>오픈 리스트</b>에 쌓입니다.<br>
        <b>그중 어디를 먼저 열어야 할까요?</b> 직접 정해 보세요.
      </div>
      ${best}
      <button class="mz-btn" data-action="cc-start">시작하기</button>
    </div>
  </div>`;
}

function _ccMapHtml(){
  const P = CC_MAP.pos;
  const onPath = new Set();
  if(CC.path) for(let i = 1; i < CC.path.length; i++)
    onPath.add([CC.path[i - 1], CC.path[i]].sort().join(''));

  const lines = CC_MAP.edges.map(([u, v]) => {
    const a = P[u], b = P[v];
    const hot = onPath.has([u, v].sort().join(''));
    return `<line class="${hot ? 'hot' : ''}" x1="${a[0] * 10}" y1="${a[1] * 10}"
      x2="${b[0] * 10}" y2="${b[1] * 10}"/>`;
  }).join('');
  const labs = CC_MAP.edges.map(([u, v, w]) => {
    const a = P[u], b = P[v];
    return `<div class="cc-cost" style="left:${(a[0] + b[0]) / 2}%;top:${(a[1] + b[1]) / 2}%">${w}</div>`;
  }).join('');
  const nodes = Object.entries(P).map(([id, [x, y]]) => {
    let cls = 'cc-node';
    if(CC.closed[id] != null) cls += ' done';
    else if(CC.open[id] != null) cls += ' wait';
    if(id === CC_MAP.start) cls += ' start';
    if(id === CC_MAP.goal) cls += ' goal';
    if(id === CC.justPicked) cls += ' now';
    const g = CC.closed[id] != null ? CC.closed[id] : CC.open[id];
    return `<div class="${cls}" style="left:${x}%;top:${y}%">${id}${
      g != null ? `<i>${g}</i>` : ''}</div>`;
  }).join('');
  return `<div class="cc-map"><div class="cc-sky"><i></i></div><div class="mz-plane">
    <svg class="cc-lines" viewBox="0 0 1000 1000" preserveAspectRatio="none">${lines}</svg>
    ${labs}${nodes}</div></div>`;
}

function _ccPlay(){
  const chips = Object.entries(CC.open)
    .sort((a, b) => a[0].localeCompare(b[0]))          // ⚠ 값 순서로 줄 세우지 않습니다
    .map(([id, g]) => `<button class="mz-chip" data-action="cc-pick" data-id="${id}">${id} <b>${g}</b></button>`)
    .join('') || '<span class="mz-empty">비어 있음</span>';
  const closed = Object.entries(CC.closed).map(([id, g]) => `${id}(${g})`).join('   ') || '비어 있음';
  return `<div class="mz-wrap cc-wrap">
    <div class="mz-bar">
      <div><b>도시 배달</b> — 출발 a → 목적지 h</div>
      <div>헤맨 횟수 <b id="cc-miss">${CC.miss}</b></div>
    </div>
    <div class="mz-board">
      <div class="mz-col"><div class="mz-lab">도시 지도 — 이름 옆 숫자는 <b>a 에서 여기까지 걸린 시간</b></div>
        ${_ccMapHtml()}</div>
      <div class="mz-col">
        <div class="mz-lab">오픈 리스트 — 열어 볼 후보</div>
        <div class="mz-chips">${chips}</div>
        <div class="mz-lab" style="margin-top:14px">닫힌 리스트 — 이미 열어 본 곳</div>
        <div class="mz-closed">${closed}</div>
        <div id="cc-hint" class="cc-hint">${CC.hint || ''}</div>
      </div>
    </div>
    <div class="mz-ask" id="cc-say">${CC.say || '오픈 리스트에서 <b>어디를 골라야 할까요?</b>'}</div>
  </div>`;
}

function _ccResult(){
  const f = CC.facts;
  const best = CC_BEST == null ? '' : `<div class="mz-best">내 최고 기록 <b>${CC_BEST}번</b></div>`;
  return `<div class="mz-wrap cc-wrap">
    <div class="mz-title">배달 완료</div>
    <div class="mz-final">${CC.closed[CC_MAP.goal]}<span>분</span></div>
    <div class="mz-two">
      <div class="mz-two-row"><span class="mz-two-t">가장 싼 길</span>
        <span class="mz-two-s">${CC.path.join(' → ')}</span><b>${f.cost}분 · 길 ${f.hops}개</b></div>
      <div class="mz-two-row"><span class="mz-two-t">길이 적은 길</span>
        <span class="mz-two-s">${f.fewest.join(' → ')}</span><b>${f.fewestCost}분 · 길 ${f.fewestHops}개</b></div>
    </div>
    <div class="mz-speech">
      <b>길을 적게 지난다고 빠른 게 아닙니다.</b>
      ${f.fewest.join('→')} 는 길 ${f.fewestHops}개뿐이지만 ${f.fewestCost}분,
      ${CC.path.join('→')} 는 길 ${f.hops}개인데 ${f.cost}분입니다.
    </div>
    <div class="mz-speech cc-name">
      방금 여러분이 한 것 — 오픈 리스트에서 <b>a 에서 여기까지 걸린 시간이 가장 짧은 곳</b>부터 열어 본 것.<br>
      이것을 <b>균일 비용 탐색</b>이라고 합니다. 그 시간을 <b>누적 비용</b>이라고 하고요.
    </div>
    ${best}
    <button class="mz-btn" data-action="cc-start">다시 하기</button>
  </div>`;
}

/* ── 진행 ── */

function ccStart(){
  CC = {
    open: { [CC_MAP.start]: 0 }, closed: {}, parent: {},
    miss: 0, stepMiss: 0, path: null, justPicked: null,
    say: '', hint: '', over: false, facts: null,
  };
  return CC;
}

function ccPick(id){
  if(!CC || CC.over || CC.open[id] == null) return;
  const best = Object.entries(CC.open).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0];

  if(id !== best[0]){
    CC.miss++; CC.stepMiss++;
    /* 규칙을 바로 알려 주지 않습니다 — 두 번 헤매면 그때 실마리를 줍니다 */
    CC.say = CC.stepMiss >= 2
      ? '거기 말고 다른 곳이 낫습니다. <b>지금까지 걸린 시간</b>을 견줘 보세요.'
      : '음… 다른 곳을 먼저 열어 보는 게 좋았습니다.';
    if(CC.stepMiss >= 3)
      CC.hint = '실마리 — 목적지에 <b>싸게</b> 닿으려면, 지금까지 <b>가장 적게 걸린 곳</b>부터 열어 보세요.';
    render();
    return;
  }

  /* 맞게 골랐다 — 열어 보고 이웃을 오픈 리스트에 넣습니다 */
  const g = CC.open[id];
  delete CC.open[id];
  CC.closed[id] = g;
  CC.justPicked = id;
  CC.stepMiss = 0;
  CC.say = '';
  CC.hint = '';

  if(id === CC_MAP.goal){
    const path = []; let n = id;
    while(n){ path.push(n); n = CC.parent[n]; }
    CC.path = path.reverse();
    CC.facts = _ccFacts(CC.path, g);
    CC.over = true;
    ccFinish();
    return;
  }
  const notes = [];
  for(const [nb, w] of _ccAdj()[id]){
    if(CC.closed[nb] != null) continue;                    // 이미 열어 본 곳
    const ng = g + w;
    if(CC.open[nb] == null){ CC.open[nb] = ng; CC.parent[nb] = id; }
    else if(ng < CC.open[nb]){
      notes.push(`${nb} 는 ${CC.open[nb]}분이었는데 <b>${ng}분</b>으로 더 빨라졌습니다`);
      CC.open[nb] = ng; CC.parent[nb] = id;
    }
  }
  if(notes.length) CC.hint = notes.join(' · ');
  render();
}

/* 간선이 가장 적은 길 — 끝나고 견주어 보여 줍니다 */
function _ccFacts(path, cost){
  const adj = _ccAdj();
  const prev = { [CC_MAP.start]: null };
  const q = [CC_MAP.start];
  while(q.length){
    const cur = q.shift();
    if(cur === CC_MAP.goal) break;
    for(const [nb] of adj[cur]) if(!(nb in prev)){ prev[nb] = cur; q.push(nb); }
  }
  const few = []; let n = CC_MAP.goal;
  while(n){ few.push(n); n = prev[n]; }
  few.reverse();
  let fc = 0;
  for(let i = 1; i < few.length; i++)
    fc += adj[few[i - 1]].find(([v]) => v === few[i])[1];
  return { cost, hops: path.length - 1, fewest: few, fewestCost: fc, fewestHops: few.length - 1 };
}

async function ccFinish(){
  if(SEL_CLS && ST_USER){
    try {
      await saveGameScore(SEL_CLS.id, ST_USER.number, ST_USER.name,
                          1000 - Math.min(CC.miss, 999), 'city-cost');
    } catch(e){ console.warn('[도시 배달] 기록 저장 실패:', e.message || e); }
  }
  render();
  await ccLoadRank();
}

function ccLeave(){ CC = null; }

async function ccLoadRank(){
  if(!SEL_CLS) return;
  try {
    const all = await loadGameScores(SEL_CLS.id, 'city-cost');
    CC_RANK = Object.entries(all)
      .map(([num, v]) => ({ num, name: v.name, miss: 1000 - (v.best || 0) }))
      .sort((a, b) => a.miss - b.miss);
    const me = CC_RANK.find(r => r.num === ST_USER?.number);
    CC_BEST = me ? me.miss : null;
  } catch(e){ console.warn('[도시 배달] 순위 로드 실패:', e.message || e); }
  render();
}

function ccBoardForTeacher(){
  const rows = CC_RANK.slice(0, 5).map((r, i) => `
    <div class="pwt-row"><span class="pwt-n">${i + 1}</span>
      <span class="pwt-name">${esc(r.name || r.num)}</span>
      <span class="pwt-s">${r.miss}<i>번</i></span></div>`).join('');
  return `<div class="pwt">
    <div class="pwt-title">🏙 도시 배달</div>
    <div class="pwt-sub">각자 화면에서 시작하세요 · 헤맨 횟수가 적을수록 위로</div>
    <div class="pwt-rank">${rows || '<div class="pwt-empty">아직 기록이 없습니다</div>'}</div>
    <div class="pwt-cnt">참여 ${CC_RANK.length}명</div>
  </div>`;
}
