/* ═══════════════════════════════════════
   games/maze.js — 🧭 미로 탐사 (너비 우선 · 깊이 우선)

   0막 — 미로와 트리는 같은 것이다 (슬라이드에서 본 a~f 트리를 미로로)
   1막 — 너비 우선 순서를 **직접 입력**하면 캐릭터가 그대로 미로를 걷습니다
   2막 — 같은 미로를 깊이 우선으로

   순서가 틀리면 캐릭터가 **그 자리에서 넘어지고**, 알고리즘을 띄워 주고 다시 하게 합니다.

   ⚠ 판은 verify/maze.mjs 가 **이 파일을 직접 읽어서** 검사합니다.
     새 판은 verify/maze-gen.mjs 로 뽑습니다 (진짜 미로를 파서 갈림길·막다른 곳을
     상태로 뽑고, 두 순서가 크게 갈리는 것만 남깁니다).

   ⚠ 캐릭터가 걷는 동안 render() 를 부르지 않습니다. 다시 그리면 걷다 말고 튑니다.
     값과 자리만 갈아끼웁니다.

   균일 비용 탐색은 **따로 게임으로 뺐습니다** — js/games/citycost.js

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
    tree: { a: [51, 4], b: [17, 50], c: [85, 50], d: [0, 96], e: [34, 96], f: [85, 96] },
    root: 'a',
  },

  /* 1·2막 — verify/maze-gen.mjs 씨앗 59 로 뽑은 진짜 미로.
     출구 E 를 너비 우선은 6번째, 깊이 우선은 11번째에 만납니다. */
  main: {
    w: 15, h: 11,
    entry: [1, 0],
    goal: 'E',
    states: {
      S: [1, 1], A: [1, 5], B: [3, 9], C: [1, 3], D: [13, 7], E: [1, 9], F: [13, 9], G: [11, 1],
      H: [13, 1], I: [9, 5], J: [11, 5], K: [9, 7],
    },
    corridors: [
      ['S', 'A', [[2, 1], [3, 1], [3, 2], [3, 3], [4, 3], [5, 3], [5, 2], [5, 1], [6, 1], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7], [6, 7], [5, 7], [5, 6], [5, 5], [4, 5], [3, 5], [2, 5]]],
      ['A', 'B', [[1, 6], [1, 7], [2, 7], [3, 7], [3, 8]]],
      ['A', 'C', [[1, 4]]],
      ['B', 'D', [[4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [11, 8], [11, 7], [12, 7]]],
      ['B', 'E', [[2, 9]]],
      ['D', 'F', [[13, 8]]],
      ['D', 'G', [[13, 6], [13, 5], [13, 4], [13, 3], [12, 3], [11, 3], [11, 2]]],
      ['G', 'H', [[12, 1]]],
      ['G', 'I', [[10, 1], [9, 1], [9, 2], [9, 3], [9, 4]]],
      ['I', 'J', [[10, 5]]],
      ['I', 'K', [[9, 6]]],
    ],
    tree: {
      S: [74, 4], A: [74, 19], B: [49, 35], C: [100, 35], D: [18, 50], E: [80, 50], F: [0, 65],
      G: [35, 65], H: [20, 81], I: [50, 81], J: [40, 96], K: [60, 96],
    },
    root: 'S',
  },
};
/* ═══ 판 데이터 끝 ═══ */

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
  { n: 1, title: '너비 우선 탐색으로 탐사', mode: 'bfs', kor: '너비 우선 탐색',
    rule: '한 층을 <b>남김없이</b> 열고 아래층으로 · 같은 깊이는 <b>왼쪽부터</b>',
    algo: ['① 초기 상태가 목표 상태이면 마친다.',
           '② 초기 상태에서 갈 수 있는 간선에 따라 자식 상태를 생성한다.',
           '③ 다음 순서의 상태가 목표 상태인지 테스트한다.',
           '　· 같은 깊이(층)를 <b>왼쪽에서 오른쪽으로</b> 모두 테스트한다.',
           '　· 그 층을 다 본 뒤에야 <b>아래층</b>으로 내려간다.'] },
  { n: 2, title: '같은 미로를 깊이 우선 탐색으로', mode: 'dfs', kor: '깊이 우선 탐색',
    rule: '한 갈래를 <b>끝까지</b> · 막히면 <b>갈라졌던 자리로 되돌아와</b> 다음 갈래로',
    algo: ['① 초기 상태가 목표 상태이면 마친다.',
           '② 자식 상태를 <b>하나</b> 생성해 더 내려간다.',
           '③ 그 상태가 목표 상태인지 테스트한다.',
           '　· 목표가 아니면 <b>거기서 또 내려간다</b>.',
           '　· 더 내려갈 데가 없으면 <b>갈라졌던 자리로 되돌아와</b> 남은 갈래로 간다.'] },
];

const MZ_STEP_MS = 65;           // 한 칸 걷는 시간 (너비 우선 한 판이 6초쯤)

let MZ = null;                   // 진행 중 상태 (null = 대기 화면)
let MZ_RANK = [];
let MZ_BEST = null;
let MZ_TIMER = null;

/* ── 판 계산 ── */

function mzOpenCells(b){
  const set = new Set();
  const key = (x, y) => x + ',' + y;
  set.add(key(...b.entry));
  for(const [x, y] of Object.values(b.states)) set.add(key(x, y));
  for(const [, , mid] of b.corridors) for(const [x, y] of mid) set.add(key(x, y));
  return set;
}

function mzKids(b){
  const k = {}, seen = new Set([b.root]), adj = {};
  for(const [u, v] of b.corridors){ (adj[u] ||= []).push(v); (adj[v] ||= []).push(u); }
  (function walk(id){
    k[id] = [];
    for(const n of (adj[id] || [])) if(!seen.has(n)){ seen.add(n); k[id].push(n); walk(n); }
  })(b.root);
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

/* 미로 안에서 두 상태를 잇는 길 (칸 단위) — 캐릭터가 실제로 걸어갈 자리.
   너비 우선은 갈래를 건너뛰므로, 되돌아가는 길도 그대로 걷습니다. */
function mzWalkPath(b, from, to){
  const open = mzOpenCells(b);
  const K = (x, y) => x + ',' + y;
  const start = K(...b.states[from]), end = K(...b.states[to]);
  const prev = { [start]: null };
  const q = [start];
  while(q.length){
    const cur = q.shift();
    if(cur === end) break;
    const [x, y] = cur.split(',').map(Number);
    for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
      const k = K(x + dx, y + dy);
      if(open.has(k) && !(k in prev)){ prev[k] = cur; q.push(k); }
    }
  }
  const path = [];
  for(let k = end; k && k !== start; k = prev[k]) path.push(k.split(',').map(Number));
  return path.reverse();                       // 출발 칸은 빼고 도착 칸까지
}

/* ── 화면 ── */

function vMaze(){
  if(!MZ) return _mzIntro();
  if(MZ.over) return _mzResult();
  if(MZ.act === 0) return _mzAct0();
  return _mzWalk();
}

function _mzHead(){
  const a = MZ_ACTS[MZ.act];
  return `<div class="mz-bar">
    <div><b>${a.n}막</b> ${a.title}</div>
    <div>다시 한 횟수 <b id="mz-miss">${MZ.miss}</b></div>
  </div>` + (a.rule ? `<div class="mz-rule">${a.rule}</div>` : '');
}

function _mzIntro(){
  const best = MZ_BEST == null ? ''
    : `<div class="mz-best">내 최고 기록 — 다시 한 횟수 <b>${MZ_BEST}</b></div>`;
  return `<div class="mz-wrap">
    <div class="mz-title">미로 탐사</div>
    <div class="mz-sub">너비 우선 탐색 · 깊이 우선 탐색</div>
    <div class="mz-speech">
      미로의 <b>갈림길과 막다른 곳</b>이 곧 탐색 트리의 <b>상태</b>입니다.<br>
      탐색 순서를 직접 적어 주면 <b>캐릭터가 그대로 미로를 걷습니다.</b>
    </div>
    <div class="mz-acts">
      <div class="mz-act"><span class="mz-n">0</span><div><b>미로와 트리는 같은 것</b>
        <i>슬라이드에서 본 그 트리를 미로에서 찾기</i></div></div>
      <div class="mz-act"><span class="mz-n">1</span><div><b>너비 우선 탐색으로 탐사</b>
        <i>순서를 적으면 캐릭터가 그대로 걷습니다</i></div></div>
      <div class="mz-act"><span class="mz-n">2</span><div><b>같은 미로를 깊이 우선 탐색으로</b>
        <i>두 순서를 나란히 놓고 보기</i></div></div>
    </div>
    ${best}
    <button class="mz-btn" data-action="mz-start">시작하기</button>
  </div>`;
}

/* 미로 그림 */
function _mzMazeHtml(b, opt = {}){
  const open = mzOpenCells(b);
  const byCell = {};
  for(const [id, [x, y]] of Object.entries(b.states)) byCell[x + ',' + y] = id;
  const ek = b.entry.join(',');
  let cells = '';
  for(let y = 0; y < b.h; y++) for(let x = 0; x < b.w; x++){
    const k = x + ',' + y;
    const id = byCell[k];
    let cls = 'mz-cell' + (open.has(k) ? ' floor' : ' wall');
    if(k === ek) cls += ' entry';
    let inner = '';
    if(id){
      const shown = opt.shown && opt.shown.has(id);
      const n = opt.nums ? opt.nums.indexOf(id) : -1;
      cls += ' spot';
      if(shown || n >= 0) cls += ' named';
      if(opt.goal === id) cls += ' goal';
      const face = opt.nums ? id : (shown ? id : '?');
      inner = `<span class="mz-mark" id="mz-m-${id}">${face}`
        + `<em class="mz-no" id="mz-n-${id}">${n >= 0 ? n + 1 : ''}</em></span>`;
    }
    cells += `<div class="${cls}" style="grid-column:${x + 1};grid-row:${y + 1}"
      ${opt.clickable && id ? `data-action="mz-spot" data-id="${id}"` : ''}>${inner}</div>`;
  }
  const hero = opt.hero
    ? `<div class="mz-hero" id="mz-hero" style="left:${(b.entry[0] + .5) / b.w * 100}%;`
      + `top:${(b.entry[1] + .5) / b.h * 100}%"></div>` : '';
  return `<div class="mz-maze" style="aspect-ratio:${b.w}/${b.h};`
    + `grid-template-columns:repeat(${b.w},1fr);grid-template-rows:repeat(${b.h},1fr)">`
    + `${cells}${hero}</div>`;
}

/* 트리 그림 */
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
      + `<em class="mz-no" id="mz-tn-${id}">${n >= 0 ? n + 1 : ''}</em></div>`;
  }
  return `<div class="mz-tree" style="aspect-ratio:${b.w}/${b.h}"><div class="mz-plane">
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
      <div class="mz-col"><div class="mz-lab">미로</div>
        ${_mzMazeHtml(b, { shown: MZ.shown, clickable: !done })}</div>
      <div class="mz-col"><div class="mz-lab">탐색 트리</div>
        ${_mzTreeHtml(b, { shown: MZ.shown, ask: done ? null : step.id })}</div>
    </div>
    <div class="mz-say" id="mz-say">${done
      ? '<b>미로의 여섯 곳이 트리의 여섯 상태와 하나씩 짝지어졌습니다.</b>'
      : step.ask}</div>
    <div id="mz-after">${done ? `
      <div class="mz-speech">미로에서 <b>갈림길</b>과 <b>막다른 곳</b>이 상태입니다.
        이제 더 큰 미로를 직접 탐사합니다.</div>
      <button class="mz-btn" data-action="mz-next">1막으로</button>` : ''}</div>
  </div>`;
}

/* 1·2막 — 순서를 적고 캐릭터를 보냅니다 */
function _mzWalk(){
  const b = MZ_BOARDS.main;
  const a = MZ_ACTS[MZ.act];
  return `<div class="mz-wrap">
    ${_mzHead()}
    <div class="mz-board">
      <div class="mz-col"><div class="mz-lab">미로 — 입구 ${b.root} · 출구 ${b.goal}</div>
        ${_mzMazeHtml(b, { nums: MZ.tested, goal: b.goal, hero: true })}</div>
      <div class="mz-col"><div class="mz-lab">탐색 트리</div>
        ${_mzTreeHtml(b, { nums: MZ.tested, goal: b.goal })}</div>
    </div>
    ${MZ.cleared ? _mzActEnd() : `
      <div class="mz-ask">직접 <b>${a.kor}</b> 으로,
        캐릭터가 어디로 가야 하는지 알려주세요!</div>
      <div class="mz-form">
        <input id="mz-in" class="mz-input" type="text" autocomplete="off" spellcheck="false"
          placeholder="예)  ${b.root} A B ..." value="${esc(MZ.typed || '')}">
        <button class="mz-btn go" data-action="mz-run">출발</button>
      </div>
      <div class="mz-say" id="mz-say">입구 <b>${b.root}</b> 에서 출발해 출구 <b>${b.goal}</b> 까지,
        테스트하는 순서를 적으세요. 띄어쓰기는 있어도 없어도 됩니다.</div>`}
    <div class="mz-pop" id="mz-pop"></div>
  </div>`;
}

function _mzActEnd(){
  const b = MZ_BOARDS.main;
  const cut = o => o.slice(0, o.indexOf(b.goal) + 1);
  if(MZ.act === 1){
    const B = cut(mzOrder(b, 'bfs'));
    return `<div class="mz-speech"><b>출구 ${b.goal} 도착!</b>
      ${B.length}곳을 테스트했습니다. 같은 미로를 이번에는 <b>깊이 우선 탐색</b>으로 갑니다.</div>
      <button class="mz-btn" data-action="mz-next">2막으로</button>`;
  }
  const B = cut(mzOrder(b, 'bfs')), D = cut(mzOrder(b, 'dfs'));
  return `<div class="mz-two">
      <div class="mz-two-row"><span class="mz-two-t">너비 우선</span>
        <span class="mz-two-s">${B.join(' – ')}</span><b>${B.length}곳</b></div>
      <div class="mz-two-row"><span class="mz-two-t">깊이 우선</span>
        <span class="mz-two-s">${D.join(' – ')}</span><b>${D.length}곳</b></div>
    </div>
    <div class="mz-speech">같은 미로인데 깊이 우선은 <b>${D.length - B.length}곳을 더</b> 열었습니다.
      왼쪽 갈래를 끝까지 파고든 뒤에야 출구 쪽으로 왔기 때문입니다.</div>
    <button class="mz-btn" data-action="mz-finish">끝내기</button>`;
}

/* 틀렸을 때 뜨는 창 — 알고리즘을 다시 보여 줍니다 */
function _mzPopup(msg){
  const a = MZ_ACTS[MZ.act];
  const el = document.getElementById('mz-pop');
  if(!el) return;
  el.innerHTML = `<div class="mz-pop-box">
    <div class="mz-pop-t">알고리즘을 확인하고 다시 해보세요!</div>
    <div class="mz-pop-why">${msg}</div>
    <div class="mz-pop-algo"><b>${a.kor}</b>
      ${a.algo.map(l => `<div>${l}</div>`).join('')}</div>
    <button class="mz-btn" data-action="mz-retry">다시 하기</button>
  </div>`;
  el.classList.add('on');
}

function _mzRankHtml(){
  const rows = MZ_RANK.slice(0, 10).map((x, i) => `
    <div class="mz-rank-row${x.num === ST_USER?.number ? ' me' : ''}">
      <span class="mz-rank-n">${i + 1}</span>
      <span class="mz-rank-name">${esc(x.name || x.num)}</span>
      <span class="mz-rank-s">${x.miss}<i>번</i></span></div>`).join('');
  return `<div class="mz-rank"><div class="mz-rank-t">순위 <i>다시 한 횟수가 적을수록 위</i></div>
    ${rows || '<div class="mz-rank-empty">아직 기록이 없어요.</div>'}</div>`;
}

function _mzResult(){
  const best = MZ_BEST == null ? '' : `<div class="mz-best">내 최고 기록 <b>${MZ_BEST}번</b></div>`;
  return `<div class="mz-wrap">
    <div class="mz-title">탐사 끝</div>
    <div class="mz-final">${MZ.miss}<span>번 다시 함</span></div>
    <div class="mz-speech">
      미로의 <b>갈림길과 막다른 곳</b>이 탐색 트리의 상태입니다.<br>
      <b>너비 우선</b>은 층을 다 훑고 내려가고, <b>깊이 우선</b>은 한 갈래를 끝까지 파고듭니다.
    </div>
    ${best}
    <button class="mz-btn" data-action="mz-start">다시 하기</button>
    ${_mzRankHtml()}
  </div>`;
}

/* ── 진행 ── */

function mzStart(){
  if(MZ_TIMER){ clearTimeout(MZ_TIMER); MZ_TIMER = null; }
  MZ = { act: 0, step: 0, miss: 0, shown: new Set(), tested: [], typed: '', cleared: false };
  return MZ;
}

function mzSpot(id){
  if(!MZ || MZ.act !== 0 || MZ.step >= MZ_INTRO_STEPS.length) return;
  const step = MZ_INTRO_STEPS[MZ.step];
  if(id === step.id){
    MZ.shown.add(id); MZ.step++; render();
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

function mzNext(){
  if(!MZ) return;
  MZ.act++;
  MZ.tested = []; MZ.typed = ''; MZ.cleared = false;
  render();
}

/* 입력을 상태 이름 배열로 — 'sabc', 'S A B C', 's,a,b' 다 받습니다 */
function mzParse(b, text){
  const ids = Object.keys(b.states);
  const out = [];
  for(const ch of String(text || '').toUpperCase()) if(ids.includes(ch)) out.push(ch);
  return out;
}

function mzRun(){
  if(!MZ || MZ.act === 0 || MZ.walking || MZ.cleared) return;
  const b = MZ_BOARDS.main;
  const input = document.getElementById('mz-in');
  MZ.typed = input ? input.value : '';
  const typed = mzParse(b, MZ.typed);
  const say = document.getElementById('mz-say');

  if(!typed.length){
    if(say) say.innerHTML = `<span class="mz-warn">상태 이름을 적어 주세요. 예) ${b.root} A B ...</span>`;
    return;
  }
  if(typed[0] !== b.root){
    if(say) say.innerHTML = `<span class="mz-warn">탐색은 입구 <b>${b.root}</b> 에서 시작합니다.</span>`;
    return;
  }

  const want = mzOrder(b, MZ_ACTS[MZ.act].mode);
  const goalAt = want.indexOf(b.goal);
  let bad = -1;                                  // 처음 어긋난 자리
  for(let i = 0; i < typed.length; i++) if(typed[i] !== want[i]){ bad = i; break; }

  MZ.walking = true;
  MZ.tested = [b.root];
  _mzPaintNums();
  if(input) input.disabled = true;
  if(say) say.innerHTML = '캐릭터가 걷고 있습니다…';

  /* 걸어갈 칸을 미리 다 펼쳐 둡니다 */
  const legs = [];
  const upto = bad >= 0 ? bad : Math.min(typed.length - 1, goalAt);
  for(let i = 1; i <= upto; i++)
    legs.push({ to: typed[i], cells: mzWalkPath(b, typed[i - 1], typed[i]), wrong: bad === i });

  let li = 0, ci = 0;
  const hero = document.getElementById('mz-hero');
  const place = ([x, y]) => {
    if(!hero) return;
    hero.style.left = ((x + .5) / b.w * 100) + '%';
    hero.style.top  = ((y + .5) / b.h * 100) + '%';
  };
  if(hero) hero.classList.add('walk');
  place(b.states[b.root]);

  const tick = () => {
    if(li >= legs.length) return _mzArrive(typed, goalAt);
    const leg = legs[li];
    if(ci >= leg.cells.length){
      if(leg.wrong) return _mzTrip(leg.to, want[bad]);
      MZ.tested.push(leg.to);
      _mzPaintNums();
      li++; ci = 0;
      MZ_TIMER = setTimeout(tick, 170);
      return;
    }
    place(leg.cells[ci++]);
    MZ_TIMER = setTimeout(tick, MZ_STEP_MS);
  };
  MZ_TIMER = setTimeout(tick, 260);
}

function _mzPaintNums(){
  const b = MZ_BOARDS.main;
  for(const id of Object.keys(b.states)){
    const n = MZ.tested.indexOf(id);
    for(const el of [document.getElementById('mz-n-' + id), document.getElementById('mz-tn-' + id)])
      if(el) el.textContent = n >= 0 ? n + 1 : '';
    for(const el of [document.getElementById('mz-m-' + id)?.closest('.mz-cell'),
                     document.getElementById('mz-t-' + id)])
      if(el) el.classList.toggle('named', n >= 0);
  }
}

/* 순서를 어겼다 — 캐릭터가 넘어지고 알고리즘 창이 뜹니다 */
function _mzTrip(got, want){
  MZ.walking = false;
  MZ.miss++;
  const m = document.getElementById('mz-miss');
  if(m) m.textContent = MZ.miss;
  const hero = document.getElementById('mz-hero');
  if(hero){ hero.classList.remove('walk'); hero.classList.add('fall'); }
  const say = document.getElementById('mz-say');
  if(say) say.innerHTML = `<span class="mz-warn">${got} 에서 넘어졌습니다.</span>`;
  MZ_TIMER = setTimeout(() => _mzPopup(
    `<b>${got}</b> 로 가면 안 됩니다. 이 자리에서는 <b>${want}</b> 를 테스트할 차례였습니다.`), 750);
}

function _mzArrive(typed, goalAt){
  MZ.walking = false;
  const b = MZ_BOARDS.main;
  const hero = document.getElementById('mz-hero');
  if(hero) hero.classList.remove('walk');
  if(MZ.tested[MZ.tested.length - 1] === b.goal && typed.length >= goalAt + 1){
    MZ.cleared = true;
    render();
    return;
  }
  MZ.miss++;
  const m = document.getElementById('mz-miss');
  if(m) m.textContent = MZ.miss;
  _mzPopup(`아직 출구 <b>${b.goal}</b> 에 닿지 않았습니다. 순서를 <b>출구까지</b> 이어서 적어 주세요.`);
}

function mzRetry(){
  const el = document.getElementById('mz-pop');
  if(el){ el.classList.remove('on'); el.innerHTML = ''; }
  if(!MZ) return;
  MZ.tested = [];
  MZ.walking = false;
  render();
}

/* ── 끝내기 · 기록 ── */

async function mzFinish(){
  if(!MZ) return;
  MZ.over = true;
  if(SEL_CLS && ST_USER){
    try {
      /* 저장 함수가 '클수록 좋음' 이라 다시 한 횟수를 빼서 넣습니다 */
      await saveGameScore(SEL_CLS.id, ST_USER.number, ST_USER.name,
                          1000 - Math.min(MZ.miss, 999), 'maze');
    } catch(e){ console.warn('[미로] 기록 저장 실패:', e.message || e); }
  }
  render();
  await mzLoadRank();
}

function mzLeave(){
  if(MZ_TIMER){ clearTimeout(MZ_TIMER); MZ_TIMER = null; }
  MZ = null;
}

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
      <span class="pwt-s">${r.miss}<i>번</i></span></div>`).join('');
  return `<div class="pwt">
    <div class="pwt-title">🧭 미로 탐사</div>
    <div class="pwt-sub">각자 화면에서 시작하세요 · 다시 한 횟수가 적을수록 위로</div>
    <div class="pwt-rank">${rows || '<div class="pwt-empty">아직 기록이 없습니다</div>'}</div>
    <div class="pwt-cnt">참여 ${MZ_RANK.length}명</div>
  </div>`;
}
