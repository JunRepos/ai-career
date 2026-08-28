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
  return _mzAct0();
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
      cls += ' spot' + (shown ? ' named' : '');
      if(opt.pick === id) cls += ' pick';
      inner = `<span class="mz-mark" id="mz-m-${id}">${shown ? id : '?'}</span>`;
    }
    cells += `<div class="${cls}" style="grid-column:${x + 1};grid-row:${y + 1}"
      ${id && opt.clickable ? `data-action="mz-spot" data-id="${id}"` : ''}>${inner}</div>`;
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
    let cls = 'mz-node';
    if(opt.shown && opt.shown.has(id)) cls += ' named';
    if(opt.ask === id) cls += ' ask';
    nodes += `<div class="${cls}" id="mz-t-${id}" style="left:${x}%;top:${y}%">${id}</div>`;
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
    <div class="mz-bar">
      <div><b>0막</b> 미로와 트리는 같은 것</div>
      <div>어긴 횟수 <b id="mz-miss">${MZ.miss}</b></div>
    </div>
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

function mzNext(){
  /* 1막부터는 다음 단계에서 만듭니다 */
  const el = document.getElementById('mz-after');
  if(el) el.innerHTML = '<div class="mz-speech">1막은 아직 만드는 중입니다.</div>';
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
