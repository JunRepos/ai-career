/* ═══════════════════════════════════════
   games/maze.js — 🧭 미로 탐사

   5차시(균일 비용 탐색) 도입에서 앞 차시(맹목적 탐색)를 손으로 굴려 보는 활동입니다.

     0막 — 미로와 트리는 같은 것이다 (슬라이드에서 본 a~f 트리를 미로로)
     1막 — 너비 우선으로 미로 탐사 (직접 클릭)
     2막 — 같은 미로를 깊이 우선으로
     3막 — 복도마다 시간이 다르다면 (오픈 리스트에서 누적 비용 최소를 직접 꺼내기)

   ⚠ 판은 verify/maze.mjs 가 **이 파일을 직접 읽어서** 검사합니다.
     아래 '판 데이터' 블록의 모양(주석 표시)을 바꾸면 검산기도 같이 고쳐야 합니다.
     검사하는 것 — 미로가 나무인가(고리 없음) · 모든 칸이 이어져 있는가 ·
     복도 칸이 갈래를 만들지 않는가 · 상태 연결이 트리와 정확히 같은가 · 탐색 순서

   ⚠ 진행 중에는 render() 를 부르지 않습니다. 다시 그리면 누르는 순간
     버튼이 사라져 클릭이 먹지 않습니다. 값만 갈아끼웁니다.

   그래픽은 선생님이 주신 search_lab_bfs_dfs.html 의 도트 톤을 그대로 가져왔습니다.
═══════════════════════════════════════ */

/* ═══ 판 데이터 시작 ═══ */
const MZ_BOARDS = {
  /* 0막 — 슬라이드 3~6장에서 본 그 트리(a~f) 를 그대로 미로로 옮긴 것 */
  intro: {
    w: 9, h: 7,
    entry: [4, 0],
    states: { a: [4, 1], b: [2, 3], c: [6, 3], d: [1, 5], e: [4, 5], f: [7, 5] },
    corridors: [
      ['a', 'b', [[3, 1], [2, 1], [2, 2]]],
      ['a', 'c', [[5, 1], [6, 1], [6, 2]]],
      ['b', 'd', [[2, 4], [1, 4]]],
      ['b', 'e', [[3, 3], [4, 3], [4, 4]]],
      ['c', 'f', [[7, 3], [7, 4]]],
    ],
    /* 트리 그림 자리 — 슬라이드(verify/lesson5-check.mjs)와 같은 값 */
    tree: { a: [51, 4], b: [17, 50], c: [85, 50], d: [0, 96], e: [34, 96], f: [85, 96] },
    root: 'a',
  },

  /* 1·2막 — 직접 탐사할 미로. 출구는 F.
     왼쪽 갈래를 크게 만들어서 깊이 우선이 한참 헤매도록 했습니다.
     너비 우선은 7번째, 깊이 우선은 11번째에 출구를 만납니다. */
  main: {
    w: 13, h: 9,
    entry: [6, 0],
    goal: 'F',
    states: {
      S: [6, 1], A: [4, 3], B: [10, 3], C: [2, 5], D: [6, 5],
      E: [9, 5], F: [11, 5], G: [1, 7], H: [3, 7], I: [5, 7], J: [7, 7],
    },
    corridors: [
      ['S', 'A', [[5, 1], [4, 1], [4, 2]]],
      ['S', 'B', [[7, 1], [8, 1], [9, 1], [10, 1], [10, 2]]],
      ['A', 'C', [[3, 3], [2, 3], [2, 4]]],
      ['A', 'D', [[5, 3], [6, 3], [6, 4]]],
      ['B', 'E', [[9, 3], [9, 4]]],
      ['B', 'F', [[11, 3], [11, 4]]],
      ['C', 'G', [[1, 5], [1, 6]]],
      ['C', 'H', [[3, 5], [3, 6]]],
      ['D', 'I', [[5, 5], [5, 6]]],
      ['D', 'J', [[7, 5], [7, 6]]],
    ],
    tree: {
      S: [60, 4], A: [30, 36], B: [90, 36],
      C: [10, 68], D: [50, 68], E: [80, 68], F: [100, 68],
      G: [0, 96], H: [20, 96], I: [40, 96], J: [60, 96],
    },
    root: 'S',
  },
};
/* ═══ 판 데이터 끝 ═══ */

/* 3막 — 교과서 32쪽 도시 지도 (그림 Ⅰ-10).
   ⚠ 미로는 길이 하나뿐이라 '가장 싼 길' 을 고를 여지가 없습니다.
     그래서 3막만 길이 여러 개인 지도로 갑니다. 슬라이드에서 쓴 그 판입니다.
   값은 verify/lesson5-uniform.py 로 검산했습니다 — a→c→d→e · 비용 12 · 테스트 5개 */
const MZ_CITY = {
  pos: { a: [2, 50], b: [26, 8], c: [26, 90], d: [62, 48], e: [96, 22] },
  edges: [['a', 'b', 5], ['a', 'c', 4], ['b', 'c', 5], ['b', 'd', 8],
          ['b', 'e', 9], ['c', 'd', 3], ['d', 'e', 5]],
  start: 'a', goal: 'e',
};

/* 0막에서 짝을 맞추는 순서와, 틀렸을 때 해 줄 말 */
const MZ_INTRO_STEPS = [
  { id: 'a', ask: '트리의 뿌리 <b>a</b> 는 미로의 어디일까요?',
    hint: '입구로 들어가서 <b>처음 만나는 갈림길</b>입니다.' },
  { id: 'b', ask: '<b>b</b> 는 미로의 어디일까요?',
    hint: 'a 에서 <b>왼쪽</b>으로 간 다음 만나는 갈림길입니다.' },
  { id: 'c', ask: '<b>c</b> 는 미로의 어디일까요?',
    hint: 'a 에서 <b>오른쪽</b>으로 간 쪽입니다.' },
  { id: 'd', ask: 'b 의 첫 자식 <b>d</b> 는 미로의 어디일까요?',
    hint: 'b 에서 <b>왼쪽</b> 갈래를 끝까지 간 막다른 곳입니다.' },
  { id: 'e', ask: 'b 의 둘째 자식 <b>e</b> 는 미로의 어디일까요?',
    hint: 'b 에서 <b>오른쪽</b> 갈래를 끝까지 간 막다른 곳입니다.' },
  { id: 'f', ask: 'c 의 자식 <b>f</b> 는 미로의 어디일까요?',
    hint: 'c 에서 더 내려간 막다른 곳입니다.' },
];

const MZ_ACTS = [
  { n: 0, title: '미로와 트리는 같은 것' },
  { n: 1, title: '너비 우선으로 탐사', mode: 'bfs',
    rule: '한 층을 <b>남김없이</b> 열고 아래층으로 · 같은 깊이는 <b>왼쪽부터</b>' },
  { n: 2, title: '같은 미로를 깊이 우선으로', mode: 'dfs',
    rule: '한 갈래를 <b>끝까지</b> · 막히면 <b>갈라졌던 자리로 되돌아와</b> 다음 갈래로' },
  { n: 3, title: '길마다 걸리는 시간이 다르다면' },
];

let MZ = null;            // 진행 중 상태 (null = 대기 화면)
let MZ_RANK = [];
let MZ_BEST = null;

/* ── 판 계산 ── */

// 미로에서 실제로 뚫려 있는 칸 (상태 + 복도 + 입구)
function mzOpenCells(b){
  const set = new Set();
  const key = (x, y) => x + ',' + y;
  set.add(key(...b.entry));
  for(const [x, y] of Object.values(b.states)) set.add(key(x, y));
  for(const [, , mid] of b.corridors) for(const [x, y] of mid) set.add(key(x, y));
  return set;
}

// 상태끼리의 이음 (트리의 간선)
function mzEdges(b){ return b.corridors.map(([u, v]) => [u, v]); }

function mzKids(b){
  const k = {};
  const seen = new Set([b.root]);
  const adj = {};
  for(const [u, v] of mzEdges(b)){ (adj[u] ||= []).push(v); (adj[v] ||= []).push(u); }
  const walk = id => {
    k[id] = [];
    for(const n of (adj[id] || [])) if(!seen.has(n)){ seen.add(n); k[id].push(n); walk(n); }
  };
  walk(b.root);
  return k;
}

function mzOrder(b, mode){
  const kids = mzKids(b), out = [];
  if(mode === 'bfs'){
    const q = [b.root];
    while(q.length){ const v = q.shift(); out.push(v); (kids[v] || []).forEach(c => q.push(c)); }
  } else {
    (function go(v){ out.push(v); (kids[v] || []).forEach(go); })(b.root);
  }
  return out;
}

/* ── 화면 ── */

function vMaze(){
  if(!MZ) return _mzIntro();
  if(MZ.over) return _mzResult();
  if(MZ.act === 0) return _mzAct0();
  if(MZ.act === 3) return _mzAct3();
  return _mzAct12();
}

/* 막마다 같은 머리띠 */
function _mzHead(){
  const a = MZ_ACTS[MZ.act];
  return `<div class="mz-bar">
    <div><b>${a.n}막</b> ${a.title}</div>
    <div>어긴 횟수 <b id="mz-miss">${MZ.miss}</b></div>
  </div>` + (a.rule ? `<div class="mz-rule">${a.rule}</div>` : '');
}

function _mzIntro(){
  const best = MZ_BEST == null ? ''
    : `<div class="mz-best">내 최고 기록 — 어긴 횟수 <b>${MZ_BEST}</b></div>`;
  return `<div class="mz-wrap">
    <div class="mz-title">미로 탐사</div>
    <div class="mz-sub">너비 우선 탐색 · 깊이 우선 탐색</div>
    <div class="mz-speech">
      미로의 <b>갈림길과 막다른 곳</b>이 곧 탐색 트리의 <b>상태</b>입니다.<br>
      먼저 둘이 같은 것임을 확인하고, 미로를 직접 탐사합니다.
    </div>
    <div class="mz-acts">
      <div class="mz-act"><span class="mz-n">0</span><div><b>미로와 트리는 같은 것</b>
        <i>슬라이드에서 본 그 트리를 미로에서 찾기</i></div></div>
      <div class="mz-act"><span class="mz-n">1</span><div><b>너비 우선으로 탐사</b>
        <i>다음에 열 곳을 직접 고르기</i></div></div>
      <div class="mz-act"><span class="mz-n">2</span><div><b>같은 미로를 깊이 우선으로</b>
        <i>두 순서를 나란히 놓고 보기</i></div></div>
      <div class="mz-act"><span class="mz-n">3</span><div><b>복도마다 걸리는 시간이 다르다면</b>
        <i>누적 비용이 가장 작은 것을 꺼내기</i></div></div>
    </div>
    ${best}
    <button class="mz-btn go" data-action="mz-start">시작하기</button>
  </div>`;
}

/* 미로 그림 — 벽과 바닥을 칸으로 깔고 상태 표지판을 얹습니다 */
function _mzMazeHtml(b, opt = {}){
  const open = mzOpenCells(b);
  const byCell = {};
  for(const [id, [x, y]] of Object.entries(b.states)) byCell[x + ',' + y] = id;
  const ek = b.entry.join(',');
  let cells = '';
  for(let y = 0; y < b.h; y++) for(let x = 0; x < b.w; x++){
    const k = x + ',' + y;
    const isOpen = open.has(k);
    const id = byCell[k];
    let cls = 'mz-cell' + (isOpen ? ' floor' : ' wall');
    if(k === ek) cls += ' entry';
    let inner = '';
    if(id){
      const shown = opt.shown && opt.shown.has(id);
      const n = opt.nums ? opt.nums.indexOf(id) : -1;   // 몇 번째로 테스트했나
      cls += ' spot';
      if(shown || n >= 0) cls += ' named';
      if(opt.goal === id) cls += ' goal';
      const face = opt.nums ? id : (shown ? id : '?');
      inner = `<span class="mz-mark" id="mz-m-${id}">${face}`
        + (n >= 0 ? `<em class="mz-no">${n + 1}</em>` : '') + '</span>';
    }
    const act = opt.nums ? 'mz-cell' : 'mz-spot';
    cells += `<div class="${cls}" style="grid-column:${x + 1};grid-row:${y + 1}"
      ${id && opt.clickable ? `data-action="${act}" data-id="${id}"` : ''}>${inner}</div>`;
  }
  return `<div class="mz-maze" style="grid-template-columns:repeat(${b.w},1fr);
    grid-template-rows:repeat(${b.h},1fr)">${cells}</div>`;
}

/* 트리 그림 — 슬라이드와 같은 자리 */
function _mzTreeHtml(b, opt = {}){
  const kids = mzKids(b);
  const lines = [];
  for(const [p, cs] of Object.entries(kids)) for(const c of cs){
    const a = b.tree[p], z = b.tree[c];
    lines.push(`<line x1="${a[0] * 10}" y1="${a[1] * 10}" x2="${z[0] * 10}" y2="${z[1] * 10}"/>`);
  }
  let nodes = '';
  for(const [id, [x, y]] of Object.entries(b.tree)){
    const n = opt.nums ? opt.nums.indexOf(id) : -1;
    let cls = 'mz-node';
    if((opt.shown && opt.shown.has(id)) || n >= 0) cls += ' named';
    if(opt.goal === id) cls += ' goal';
    if(opt.ask === id) cls += ' ask';
    nodes += `<div class="${cls}" id="mz-t-${id}" style="left:${x}%;top:${y}%">${id}`
      + (n >= 0 ? `<em class="mz-no">${n + 1}</em>` : '') + '</div>';
  }
  return `<div class="mz-tree"><div class="mz-plane">
    <svg class="mz-lines" viewBox="0 0 1000 1000" preserveAspectRatio="none">${lines.join('')}</svg>
    ${nodes}</div></div>`;
}

function _mzAct0(){
  const b = MZ_BOARDS.intro;
  const step = MZ_INTRO_STEPS[MZ.step];
  const done = MZ.step >= MZ_INTRO_STEPS.length;
  return `<div class="mz-wrap">
    ${_mzHead()}
    <div class="mz-board">
      <div class="mz-col">
        <div class="mz-lab">미로</div>
        ${_mzMazeHtml(b, { shown: MZ.shown, clickable: !done })}
      </div>
      <div class="mz-col">
        <div class="mz-lab">탐색 트리</div>
        ${_mzTreeHtml(b, { shown: MZ.shown, ask: done ? null : step.id })}
      </div>
    </div>
    <div class="mz-say" id="mz-say">${done
      ? '<b>미로의 여섯 곳이 트리의 여섯 상태와 하나씩 짝지어졌습니다.</b>'
      : step.ask}</div>
    <div id="mz-after">${done ? `
      <div class="mz-speech">미로에서 <b>갈림길</b>과 <b>막다른 곳</b>이 상태입니다.
        이제 이 미로를 직접 탐사합니다.</div>
      <button class="mz-btn go" data-action="mz-next">1막으로</button>` : ''}</div>
  </div>`;
}

/* ── 진행 ── */

function mzStart(){
  MZ = { act: 0, step: 0, miss: 0, shown: new Set() };
  return MZ;
}

function mzSpot(id){
  if(!MZ || MZ.step >= MZ_INTRO_STEPS.length) return;
  const step = MZ_INTRO_STEPS[MZ.step];
  if(id === step.id){
    MZ.shown.add(id);
    MZ.step++;
    render();
  } else {
    MZ.miss++;
    const el = document.getElementById('mz-m-' + id);
    if(el) el.closest('.mz-cell').animate(
      [{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }],
      { duration: 200, iterations: 2 });
    const say = document.getElementById('mz-say');
    if(say) say.innerHTML = step.ask + `<div class="mz-hint">${step.hint}</div>`;
    const m = document.getElementById('mz-miss');
    if(m) m.textContent = MZ.miss;
  }
}

/* ── 1·2막 — 미로를 직접 탐사 ───────────────────────── */

function _mzDepth(b){
  const kids = mzKids(b), d = { [b.root]: 0 };
  (function go(v){ for(const c of (kids[v] || [])){ d[c] = d[v] + 1; go(c); } })(b.root);
  return d;
}
function _mzParent(b){
  const kids = mzKids(b), p = {};
  for(const [v, cs] of Object.entries(kids)) for(const c of cs) p[c] = v;
  return p;
}

function _mzAct12(){
  const b = MZ_BOARDS.main;
  const done = MZ.tested[MZ.tested.length - 1] === b.goal;
  return `<div class="mz-wrap">
    ${_mzHead()}
    <div class="mz-board">
      <div class="mz-col">
        <div class="mz-lab">미로 — 출구 ${b.goal}</div>
        ${_mzMazeHtml(b, { nums: MZ.tested, goal: b.goal, clickable: !done })}
      </div>
      <div class="mz-col">
        <div class="mz-lab">탐색 트리</div>
        ${_mzTreeHtml(b, { nums: MZ.tested, goal: b.goal })}
      </div>
    </div>
    <div class="mz-say" id="mz-say">${done
      ? `<b>출구 ${b.goal} 를 ${MZ.tested.length}번째에 만났습니다.</b>`
      : '다음에 열 곳을 미로에서 고르세요.'}</div>
    <div id="mz-after">${done ? _mzActEnd() : ''}</div>
  </div>`;
}

function _mzActEnd(){
  const b = MZ_BOARDS.main;
  if(MZ.act === 1)
    return `<div class="mz-speech">같은 미로를 이번에는 <b>깊이 우선</b>으로 탐사합니다.</div>
      <button class="mz-btn" data-action="mz-next">2막으로</button>`;
  const cut = o => o.slice(0, o.indexOf(b.goal) + 1);
  const B = cut(mzOrder(b, 'bfs')), D = cut(mzOrder(b, 'dfs'));
  return `<div class="mz-two">
      <div class="mz-two-row"><span class="mz-two-t">너비 우선</span>
        <span class="mz-two-s">${B.join(' – ')}</span><b>${B.length}번째</b></div>
      <div class="mz-two-row"><span class="mz-two-t">깊이 우선</span>
        <span class="mz-two-s">${D.join(' – ')}</span><b>${D.length}번째</b></div>
    </div>
    <div class="mz-speech">같은 미로인데 깊이 우선은 <b>${D.length - B.length}곳을 더</b> 열었습니다.
      왼쪽 갈래를 끝까지 파고든 뒤에야 오른쪽으로 왔기 때문입니다.</div>
    <button class="mz-btn" data-action="mz-next">3막으로</button>`;
}

/* 왜 그 곳이 아닌지 — 규칙에 비추어 말해 줍니다 */
function _mzWhy(b, mode, want, got){
  const dep = _mzDepth(b), par = _mzParent(b);
  if(MZ.tested.includes(got)) return '이미 테스트한 곳입니다.';
  if(par[got] && !MZ.tested.includes(par[got]))
    return '아직 거기까지 가는 길이 안 뚫렸습니다. 열어 본 곳에서 <b>이어진 곳</b>만 갈 수 있습니다.';
  if(mode === 'bfs'){
    if(dep[got] > dep[want])
      return `아직 <b>깊이 ${dep[want]}</b> 에 안 연 곳이 남았습니다. 한 층을 다 열고 내려갑니다.`;
    return '같은 깊이에서는 <b>왼쪽부터</b> 엽니다.';
  }
  if(dep[got] <= dep[want]) return '지금 내려가던 갈래를 <b>끝까지</b> 먼저 갑니다.';
  return '막다른 곳에서는 <b>갈라졌던 자리로 되돌아와</b> 남은 갈래로 갑니다.';
}

function mzPick(id){
  if(!MZ || MZ.act === 0 || MZ.act === 3) return;
  const b = MZ_BOARDS.main;
  const mode = MZ_ACTS[MZ.act].mode;
  const seq = mzOrder(b, mode);
  if(MZ.tested[MZ.tested.length - 1] === b.goal) return;
  const want = seq[MZ.tested.length];
  if(id === want){
    MZ.tested.push(id);
    render();
  } else {
    MZ.miss++;
    const cell = document.getElementById('mz-m-' + id);
    if(cell) cell.closest('.mz-cell').animate(
      [{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }],
      { duration: 200, iterations: 2 });
    const say = document.getElementById('mz-say');
    if(say) say.innerHTML = '다음에 열 곳을 미로에서 고르세요.'
      + `<div class="mz-hint">${_mzWhy(b, mode, want, id)}</div>`;
    const m = document.getElementById('mz-miss');
    if(m) m.textContent = MZ.miss;
  }
}

/* ── 3막 — 길이 여러 개인 지도에서 균일 비용 ────────── */

function _mzCityAdj(){
  const adj = {};
  for(const [u, v, w] of MZ_CITY.edges){ (adj[u] ||= []).push([v, w]); (adj[v] ||= []).push([u, w]); }
  for(const k in adj) adj[k].sort((a, b) => a[0].localeCompare(b[0]));
  return adj;
}

function _mzMapHtml(){
  const P = MZ_CITY.pos;
  const lines = MZ_CITY.edges.map(([u, v]) => {
    const a = P[u], b = P[v];
    return `<line x1="${a[0] * 10}" y1="${a[1] * 10}" x2="${b[0] * 10}" y2="${b[1] * 10}"/>`;
  }).join('');
  const labs = MZ_CITY.edges.map(([u, v, w]) => {
    const a = P[u], b = P[v];
    return `<div class="mz-cost" style="left:${(a[0] + b[0]) / 2}%;top:${(a[1] + b[1]) / 2}%">${w}</div>`;
  }).join('');
  const nodes = Object.entries(P).map(([id, [x, y]]) => {
    /* 색 뜻을 1·2막과 맞춥니다 — 초록은 '테스트 끝', 크림은 '오픈 리스트에서 대기' */
    let cls = 'mz-node';
    if(MZ.closed[id] != null) cls += ' named';
    else if(MZ.open[id] != null) cls += ' wait';
    if(id === MZ.justPicked) cls += ' ask';
    const g = MZ.closed[id] != null ? MZ.closed[id] : MZ.open[id];
    return `<div class="${cls}" style="left:${x}%;top:${y}%">${id}${g != null ? `<i>${g}</i>` : ''}</div>`;
  }).join('');
  return `<div class="mz-tree"><div class="mz-plane">
    <svg class="mz-lines" viewBox="0 0 1000 1000" preserveAspectRatio="none">${lines}</svg>
    ${labs}${nodes}</div></div>`;
}

function _mzAct3(){
  const done = MZ.closed[MZ_CITY.goal] != null;
  const chips = Object.entries(MZ.open).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([id, g]) => `<button class="mz-chip" data-action="mz-open" data-id="${id}">${id} <b>${g}</b></button>`)
    .join('') || '<span class="mz-empty">비어 있음</span>';
  const closed = Object.entries(MZ.closed).map(([id, g]) => `${id}(${g})`).join(' · ') || '비어 있음';
  return `<div class="mz-wrap">
    ${_mzHead()}
    <div class="mz-speech">미로는 길이 하나뿐이었습니다. 이 지도는 <b>길이 여러 개</b>입니다.
      선 위의 숫자는 그 길을 지나는 데 걸리는 <b>시간</b> · 출발 <b>a</b> → 목적지 <b>e</b></div>
    <div class="mz-board">
      <div class="mz-col">
        <div class="mz-lab">지도 — 도시 옆 숫자는 누적 비용</div>
        ${_mzMapHtml()}
      </div>
      <div class="mz-col">
        <div class="mz-lab">오픈 리스트 — 누적 비용이 가장 작은 것을 꺼내세요</div>
        <div class="mz-chips">${done ? '<span class="mz-empty">종료</span>' : chips}</div>
        <div class="mz-lab" style="margin-top:14px">닫힌 리스트</div>
        <div class="mz-closed">${closed}</div>
      </div>
    </div>
    <div class="mz-say" id="mz-say">${done
      ? `<b>목적지 e 도착! 경로 비용 ${MZ.closed.e} · ${Object.keys(MZ.closed).length}개를 테스트했습니다.</b>`
      : '오픈 리스트에서 <b>누적 비용이 가장 작은 것</b>을 고르세요.'}</div>
    <div id="mz-after">${done ? `
      <div class="mz-speech">가장 싼 길 — <b>${MZ.path.join(' → ')}</b> · 비용 <b>${MZ.closed.e}</b><br>
        누적 비용이 작은 것부터 꺼냈기 때문에, 목적지를 꺼내는 순간 그보다 싼 길은 이미 다 확인한 뒤입니다.</div>
      <button class="mz-btn" data-action="mz-finish">끝내기</button>` : ''}</div>
  </div>`;
}

function mzOpenPick(id){
  if(!MZ || MZ.act !== 3) return;
  const best = Object.entries(MZ.open).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0];
  if(!best) return;
  if(id !== best[0]){
    MZ.miss++;
    const say = document.getElementById('mz-say');
    if(say) say.innerHTML = '오픈 리스트에서 <b>누적 비용이 가장 작은 것</b>을 고르세요.'
      + `<div class="mz-hint">${id}(${MZ.open[id]}) 보다 <b>더 작은 누적 비용</b>이 오픈 리스트에 남아 있습니다.</div>`;
    const m = document.getElementById('mz-miss');
    if(m) m.textContent = MZ.miss;
    return;
  }
  /* 교과서 32쪽 안내 ③④ — 꺼내서 테스트하고, 자식을 오픈 리스트에 */
  const g = MZ.open[id];
  delete MZ.open[id];
  MZ.closed[id] = g;
  MZ.justPicked = id;
  if(id === MZ_CITY.goal){
    const path = []; let n = id;
    while(n){ path.push(n); n = MZ.parent[n]; }
    MZ.path = path.reverse();
  } else {
    for(const [nb, w] of _mzCityAdj()[id]){
      if(MZ.closed[nb] != null) continue;                 // 이미 테스트된 것은 제외
      const ng = g + w;
      if(MZ.open[nb] == null || ng < MZ.open[nb]){        // 같은 도시면 작은 것만 남긴다
        MZ.open[nb] = ng; MZ.parent[nb] = id;
      }
    }
  }
  render();
}

/* ── 막 넘기기 · 끝내기 ── */

function mzNext(){
  if(!MZ) return;
  MZ.act++;
  if(MZ.act === 3){
    MZ.open = { [MZ_CITY.start]: 0 };
    MZ.closed = {}; MZ.parent = {}; MZ.path = []; MZ.justPicked = null;
  } else {
    MZ.tested = [MZ_BOARDS.main.root];
  }
  render();
}

async function mzFinish(){
  if(!MZ) return;
  MZ.over = true;
  if(SEL_CLS && ST_USER){
    try {
      /* 저장 함수가 '클수록 좋음' 이라 어긴 횟수를 빼서 넣습니다 */
      await saveGameScore(SEL_CLS.id, ST_USER.number, ST_USER.name,
                          1000 - Math.min(MZ.miss, 999), 'maze');
    } catch(e){ console.warn('[미로] 기록 저장 실패:', e.message || e); }
  }
  render();
  await mzLoadRank();
}

function _mzResult(){
  const best = MZ_BEST == null ? '' : `<div class="mz-best">내 최고 기록 — 어긴 횟수 <b>${MZ_BEST}</b></div>`;
  return `<div class="mz-wrap">
    <div class="mz-title">탐사 끝</div>
    <div class="mz-final">${MZ.miss}<span>번 어김</span></div>
    <div class="mz-speech">
      미로의 <b>갈림길과 막다른 곳</b>이 탐색 트리의 상태입니다.<br>
      <b>너비 우선</b>은 층을 다 훑고 내려가고, <b>깊이 우선</b>은 한 갈래를 끝까지 파고듭니다.<br>
      길마다 걸리는 시간이 다르면 <b>누적 비용이 가장 작은 것부터</b> 꺼냅니다.
    </div>
    ${best}
    <button class="mz-btn" data-action="mz-start">다시 하기</button>
  </div>`;
}

function mzLeave(){ MZ = null; }

async function mzLoadRank(){
  if(!SEL_CLS) return;
  try {
    const all = await loadGameScores(SEL_CLS.id, 'maze');
    MZ_RANK = Object.entries(all)
      .map(([num, v]) => ({ num, name: v.name, miss: 1000 - (v.best || 0) }))
      .sort((a, b) => a.miss - b.miss);
    const me = MZ_RANK.find(r => r.num === ST_USER?.number);
    MZ_BEST = me ? me.miss : null;
  } catch(e){ console.warn('[미로] 순위 로드 실패:', e.message || e); }
  render();
}

function mzBoardForTeacher(){
  const rows = MZ_RANK.slice(0, 5).map((r, i) => `
    <div class="pwt-row"><span class="pwt-n">${i + 1}</span>
      <span class="pwt-name">${esc(r.name || r.num)}</span>
      <span class="pwt-s">${r.miss}<i>번 어김</i></span></div>`).join('');
  return `<div class="pwt">
    <div class="pwt-title">🧭 미로 탐사</div>
    <div class="pwt-sub">각자 화면에서 시작하세요 · 순서를 적게 어길수록 위로</div>
    <div class="pwt-rank">${rows || '<div class="pwt-empty">아직 기록이 없습니다</div>'}</div>
    <div class="pwt-cnt">참여 ${MZ_RANK.length}명</div>
  </div>`;
}
