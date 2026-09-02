/* ═══════════════════════════════════════
   games/cityastar.js — 🧭 도시 배달 A* (지능적 탐색)

   6차시(지능적 탐색) 실습. 균일 비용 실습(citycost.js)의 **다음 이야기**입니다.
   각 도시에 목적지까지의 **직선거리 h** 가 적혀 있고, 학생은 오픈 리스트에서
   **f = g + h 가 가장 작은 곳**을 고릅니다.

   ⚠ 규칙을 먼저 알려 주지 않습니다. "어디를 골라야 할까요?" 만 묻고,
     다 끝난 뒤에 "지금 한 것이 A* 탐색입니다" 라고 이름을 붙여 줍니다.

   판은 verify/cityastar-design.py 가 **설계하고 검산**했습니다.
     · 간선 비용을 두 도시 사이 직선거리 이상으로 잡아, 직선거리 h 가 늘 허용 가능합니다
     · 균일 비용 9개 테스트 → A* 5개 테스트 (4개 절약)
     · 두 방법이 찾는 경로는 a → c → e → g → i · 비용 25 로 같습니다
     · 간선이 가장 적은 길 a → c → k → i 는 3개뿐이지만 28 로 더 비쌉니다
   ⚠ 값을 손으로 고치지 말고 verify/cityastar-design.py 를 다시 돌리세요.

   ⚠ 진행 중에는 render() 를 부르되 타이머로 되풀이하지 않습니다.
═══════════════════════════════════════ */

/* ═══ 판 데이터 시작 — verify/cityastar-facts.json 에서 옮긴 값 ═══ */
const CA_MAP = {
  pos: {
    a: [3, 44], b: [24, 15], c: [23, 76], d: [43, 38], e: [50, 63],
    f: [68, 8], g: [62, 47], i: [96, 53], k: [65, 85],
  },
  edges: [
    ['a', 'b', 10], ['a', 'c', 8], ['b', 'd', 6], ['b', 'f', 10],
    ['c', 'd', 9], ['c', 'e', 6], ['c', 'k', 10], ['d', 'e', 7],
    ['d', 'f', 8], ['d', 'g', 6], ['e', 'g', 4], ['e', 'k', 7],
    ['f', 'g', 8], ['g', 'i', 7], ['g', 'k', 10], ['i', 'k', 10],
  ],
  /* 목적지 i 까지의 직선거리 — 휴리스틱값 */
  h: { a: 18, b: 16, c: 15, d: 11, e: 9, f: 10, g: 6, i: 0, k: 8 },
  start: 'a', goal: 'i',
  /* 검산 결과 (끝 화면에서 견주어 보여 줍니다) */
  facts: {
    uniformTested: 9, astarTested: 5,
    path: ['a', 'c', 'e', 'g', 'i'], cost: 25,
    hops: ['a', 'c', 'k', 'i'], hopsCost: 28,
  },
};
/* ═══ 판 데이터 끝 ═══ */

let CA = null;
let CA_RANK = [];
let CA_BEST = null;

function _caAdj(){
  const adj = {};
  for(const [u, v, w] of CA_MAP.edges){ (adj[u] ||= []).push([v, w]); (adj[v] ||= []).push([u, w]); }
  for(const k in adj) adj[k].sort((a, b) => a[0].localeCompare(b[0]));
  return adj;
}

/* ── 화면 ── */

function vCityAstar(){
  if(!CA) return _caIntro();
  if(CA.over) return _caResult();
  return _caPlay();
}

function _caIntro(){
  const best = CA_BEST == null ? ''
    : `<div class="mz-best">내 최고 기록 — 헤맨 횟수 <b>${CA_BEST}</b></div>`;
  return `<div class="mz-wrap cc-wrap">
    <div class="cc-sky"><i></i></div>
    <div class="cc-front">
      <div class="mz-title">도시 배달 — 지도를 보고</div>
      <div class="mz-sub">출발 a → 목적지 i · 이번에는 <b>직선거리</b>를 알고 있습니다</div>
      <div class="mz-speech">
        지난번처럼 길마다 걸리는 시간이 다릅니다. 그런데 이번에는 도시마다
        <b>목적지까지 곧게 잰 거리</b>가 하나 더 적혀 있어요.<br>
        이 값을 쓰면 <b>더 적게 열어 보고</b> 찾을 수 있을까요?
      </div>
      <div class="mz-speech cc-tip">
        지금까지 걸린 시간은 <b>g</b>, 목적지까지 곧게 잰 거리는 <b>h</b> 입니다.<br>
        <b>어디를 먼저 열어야 할까요?</b> 직접 정해 보세요.
      </div>
      ${best}
      <button class="mz-btn" data-action="ca-start">시작하기</button>
    </div>
  </div>`;
}

function _caMapHtml(){
  const P = CA_MAP.pos;
  const onPath = new Set();
  if(CA.path) for(let i = 1; i < CA.path.length; i++)
    onPath.add([CA.path[i - 1], CA.path[i]].sort().join(''));

  const lines = CA_MAP.edges.map(([u, v]) => {
    const a = P[u], b = P[v];
    const hot = onPath.has([u, v].sort().join(''));
    return `<line class="${hot ? 'hot' : ''}" x1="${a[0] * 10}" y1="${a[1] * 10}"
      x2="${b[0] * 10}" y2="${b[1] * 10}"/>`;
  }).join('');
  const labs = CA_MAP.edges.map(([u, v, w]) => {
    const a = P[u], b = P[v];
    return `<div class="cc-cost" style="left:${(a[0] + b[0]) / 2}%;top:${(a[1] + b[1]) / 2}%">${w}</div>`;
  }).join('');
  const nodes = Object.entries(P).map(([id, [x, y]]) => {
    let cls = 'cc-node';
    if(CA.closed[id] != null) cls += ' done';
    else if(CA.open[id] != null) cls += ' wait';
    if(id === CA_MAP.start) cls += ' start';
    if(id === CA_MAP.goal) cls += ' goal';
    if(id === CA.justPicked) cls += ' now';
    const g = CA.closed[id] != null ? CA.closed[id] : CA.open[id];
    /* 열어 보기 전에는 h 만, 열어 본 뒤에는 g+h 를 아래 줄에 보여 줍니다 */
    return `<div class="${cls}" style="left:${x}%;top:${y}%">${id}` +
      `<i class="ca-h">${g != null ? `${g}+${CA_MAP.h[id]}` : `h ${CA_MAP.h[id]}`}</i></div>`;
  }).join('');
  return `<div class="cc-map"><div class="cc-sky"><i></i></div><div class="mz-plane">
    <svg class="cc-lines" viewBox="0 0 1000 1000" preserveAspectRatio="none">${lines}</svg>
    ${labs}${nodes}</div></div>`;
}

function _caPlay(){
  const chips = Object.entries(CA.open)
    .sort((a, b) => a[0].localeCompare(b[0]))          // ⚠ 값 순서로 줄 세우지 않습니다
    .map(([id, g]) => `<button class="mz-chip ca-chip" data-action="ca-pick" data-id="${id}">${id}
      <b>${g + CA_MAP.h[id]}</b><em>${g}+${CA_MAP.h[id]}</em></button>`)
    .join('') || '<span class="mz-empty">비어 있음</span>';
  const closed = Object.entries(CA.closed).map(([id, g]) => `${id}(${g})`).join('   ') || '비어 있음';
  return `<div class="mz-wrap cc-wrap">
    <div class="mz-bar">
      <div><b>도시 배달 — 지도를 보고</b> · 출발 a → 목적지 i</div>
      <div>헤맨 횟수 <b id="ca-miss">${CA.miss}</b></div>
    </div>
    <div class="mz-board">
      <div class="mz-col"><div class="mz-lab">도시 지도 — 도시 아래 <b>h</b> 는 목적지까지 곧게 잰 거리</div>
        ${_caMapHtml()}</div>
      <div class="mz-col">
        <div class="mz-lab">오픈 리스트 — 큰 숫자는 <b>g + h</b></div>
        <div class="mz-chips">${chips}</div>
        <div class="mz-lab" style="margin-top:14px">닫힌 리스트 — 이미 열어 본 곳</div>
        <div class="mz-closed">${closed}</div>
        <div id="ca-hint" class="cc-hint">${CA.hint || ''}</div>
      </div>
    </div>
    <div class="mz-ask" id="ca-say">${CA.say || '오픈 리스트에서 <b>어디를 골라야 할까요?</b>'}</div>
  </div>`;
}

function _caResult(){
  const f = CA_MAP.facts;
  const best = CA_BEST == null ? '' : `<div class="mz-best">내 최고 기록 <b>${CA_BEST}번</b></div>`;
  return `<div class="mz-wrap cc-wrap">
    <div class="mz-title">배달 완료</div>
    <div class="mz-final">${CA.closed[CA_MAP.goal]}<span>분</span></div>
    <div class="mz-two">
      <div class="mz-two-row"><span class="mz-two-t">내가 열어 본 곳</span>
        <span class="mz-two-s">${CA.opened.join(' – ')}</span><b>${CA.opened.length}개</b></div>
      <div class="mz-two-row"><span class="mz-two-t">g 만 보고 열었다면</span>
        <span class="mz-two-s">균일 비용 탐색</span><b>${f.uniformTested}개</b></div>
    </div>
    <div class="mz-speech">
      찾은 길은 <b>${f.path.join(' → ')}</b> · ${f.cost}분으로 <b>지난번과 같습니다.</b>
      그런데 열어 본 곳은 ${f.uniformTested}개에서 <b>${f.astarTested}개</b>로 줄었습니다.
    </div>
    <div class="mz-speech cc-name">
      방금 여러분이 한 것 — <b>지금까지 걸린 시간(g)</b> 에 <b>목적지까지의 추정값(h)</b> 을 더해
      가장 작은 곳부터 열어 본 것.<br>
      이것을 <b>A* 탐색</b>이라고 합니다. 그 합을 <b>f(n) = g(n) + h(n)</b> 이라고 씁니다.
    </div>
    ${best}
    <button class="mz-btn" data-action="ca-start">다시 하기</button>
  </div>`;
}

/* ── 진행 ── */

function caStart(){
  CA = {
    open: { [CA_MAP.start]: 0 }, closed: {}, parent: {}, opened: [],
    miss: 0, stepMiss: 0, path: null, justPicked: null,
    say: '', hint: '', over: false,
  };
  return CA;
}

function caPick(id){
  if(!CA || CA.over || CA.open[id] == null) return;
  /* 골라야 할 곳 — f = g + h 가 가장 작은 곳 (같으면 이름 순) */
  const fOf = n => CA.open[n] + CA_MAP.h[n];
  const best = Object.entries(CA.open)
    .sort((a, b) => fOf(a[0]) - fOf(b[0]) || a[0].localeCompare(b[0]))[0];

  if(id !== best[0]){
    CA.miss++; CA.stepMiss++;
    CA.say = CA.stepMiss >= 2
      ? '거기 말고 다른 곳이 낫습니다. <b>걸린 시간과 남은 거리를 함께</b> 견줘 보세요.'
      : '음… 다른 곳을 먼저 열어 보는 게 좋았습니다.';
    if(CA.stepMiss >= 3)
      CA.hint = '실마리 — 지금까지 걸린 시간 <b>g</b> 와 목적지까지 곧게 잰 거리 <b>h</b> 를 <b>더해</b> 보세요.';
    render();
    return;
  }

  const g = CA.open[id];
  delete CA.open[id];
  CA.closed[id] = g;
  CA.opened.push(id);
  CA.justPicked = id;
  CA.stepMiss = 0;
  CA.say = '';
  CA.hint = '';

  if(id === CA_MAP.goal){
    const path = []; let n = id;
    while(n){ path.push(n); n = CA.parent[n]; }
    CA.path = path.reverse();
    CA.over = true;
    caFinish();
    return;
  }

  const notes = [];
  for(const [nb, w] of _caAdj()[id]){
    if(CA.closed[nb] != null) continue;
    const ng = g + w;
    if(CA.open[nb] == null){ CA.open[nb] = ng; CA.parent[nb] = id; }
    else if(ng < CA.open[nb]){
      notes.push(`${nb} 는 ${CA.open[nb]}분이었는데 <b>${ng}분</b>으로 더 빨라졌습니다`);
      CA.open[nb] = ng; CA.parent[nb] = id;
    }
  }
  if(notes.length) CA.hint = notes.join(' · ');
  render();
}

async function caFinish(){
  if(SEL_CLS && ST_USER){
    try {
      await saveGameScore(SEL_CLS.id, ST_USER.number, ST_USER.name,
                          1000 - Math.min(CA.miss, 999), 'city-astar');
    } catch(e){ console.warn('[도시 배달 A*] 기록 저장 실패:', e.message || e); }
  }
  render();
  await caLoadRank();
}

function caLeave(){ CA = null; }

async function caLoadRank(){
  if(!SEL_CLS) return;
  try {
    const all = await loadGameScores(SEL_CLS.id, 'city-astar');
    CA_RANK = Object.entries(all)
      .map(([num, v]) => ({ num, name: v.name, miss: 1000 - (v.best || 0) }))
      .sort((a, b) => a.miss - b.miss);
    const me = CA_RANK.find(r => r.num === ST_USER?.number);
    CA_BEST = me ? me.miss : null;
  } catch(e){ console.warn('[도시 배달 A*] 순위 로드 실패:', e.message || e); }
  render();
}

function caBoardForTeacher(){
  const rows = CA_RANK.slice(0, 5).map((r, i) => `
    <div class="pwt-row"><span class="pwt-n">${i + 1}</span>
      <span class="pwt-name">${esc(r.name || r.num)}</span>
      <span class="pwt-s">${r.miss}<i>번</i></span></div>`).join('');
  return `<div class="pwt">
    <div class="pwt-title">🧭 도시 배달 — 지도를 보고</div>
    <div class="pwt-sub">각자 화면에서 시작하세요 · 헤맨 횟수가 적을수록 위로</div>
    <div class="pwt-rank">${rows || '<div class="pwt-empty">아직 기록이 없습니다</div>'}</div>
    <div class="pwt-cnt">참여 ${CA_RANK.length}명</div>
  </div>`;
}
