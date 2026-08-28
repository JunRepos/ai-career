/* 미로 탐사 판 검산
   js/games/maze.js 의 '판 데이터' 블록을 **직접 읽어서** 검사합니다.
   그래서 게임과 검산기가 어긋날 수 없습니다.

   검사하는 것
     ① 미로가 나무인가 — 뚫린 칸에 고리(순환)가 없어야 미로가 됩니다
     ② 뚫린 칸이 전부 입구에서 이어져 있는가
     ③ 복도 칸이 갈래를 만들지 않는가 — 갈림길은 반드시 상태여야 합니다
     ④ 상태끼리의 이음이 미로에서 실제로 걸어갈 수 있는 길과 같은가
     ⑤ 너비/깊이 우선 순서가 슬라이드와 같은가
*/
import fs from 'node:fs';

const src = fs.readFileSync('js/games/maze.js', 'utf8');
const m = src.match(/═══ 판 데이터 시작 ═══[\s\S]*?const MZ_BOARDS = ([\s\S]*?);\r?\n\/\* ═══ 판 데이터 끝/);
if(!m){ console.error('✖ js/games/maze.js 에서 판 데이터 블록을 못 찾았습니다.'); process.exit(1); }
const BOARDS = eval('(' + m[1] + ')');

const K = (x, y) => x + ',' + y;
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function openCells(b){
  const s = new Set([K(...b.entry)]);
  for(const [x, y] of Object.values(b.states)) s.add(K(x, y));
  for(const [, , mid] of b.corridors) for(const [x, y] of mid) s.add(K(x, y));
  return s;
}

/* 슬라이드와 맞춰 둔 기대값 */
const EXPECT = {
  intro: {
    edges: [['a', 'b'], ['a', 'c'], ['b', 'd'], ['b', 'e'], ['c', 'f']],
    bfs: 'a b c d e f',
    dfs: 'a b d e c f',
  },
  /* verify/maze-gen.mjs 씨앗 59 로 뽑은 판 */
  main: {
    edges: [['S','A'],['A','B'],['A','C'],['B','D'],['B','E'],['D','F'],
            ['D','G'],['G','H'],['G','I'],['I','J'],['I','K']],
    bfs: 'S A B C D E F G H I J K',
    dfs: 'S A B D F G H I J K E C',
    goalAt: { bfs: 6, dfs: 11 },     // 출구 E 를 몇 번째에 만나는가
  },
};

let allOk = true;
for(const [name, b] of Object.entries(BOARDS)){
  console.log(`\n■ ${name} — ${b.w}×${b.h} · 상태 ${Object.keys(b.states).length}개`);
  const ok = [];
  const T = (c, msg) => { ok.push(c); console.log((c ? '  ✔ ' : '  ✖ ') + msg); };

  const open = openCells(b);
  const cells = [...open];
  const deg = {};
  let edgeCount = 0;
  for(const k of cells){
    const [x, y] = k.split(',').map(Number);
    deg[k] = 0;
    for(const [dx, dy] of NB) if(open.has(K(x + dx, y + dy))){ deg[k]++; edgeCount++; }
  }
  edgeCount /= 2;

  // ① 나무인가 — 칸 수 − 1 = 이음 수 (그리고 ② 로 연결성 확인)
  T(edgeCount === cells.length - 1,
    `미로에 고리가 없다 (칸 ${cells.length}개 · 이음 ${edgeCount}개)`);

  // ② 전부 이어져 있는가
  const seen = new Set([K(...b.entry)]);
  const st = [K(...b.entry)];
  while(st.length){
    const [x, y] = st.pop().split(',').map(Number);
    for(const [dx, dy] of NB){
      const k = K(x + dx, y + dy);
      if(open.has(k) && !seen.has(k)){ seen.add(k); st.push(k); }
    }
  }
  T(seen.size === cells.length, `뚫린 칸이 전부 입구에서 이어져 있다 (${seen.size}/${cells.length})`);

  // ③ 갈림길은 반드시 상태 — 복도 칸의 이웃은 2개 이하
  const stateKeys = new Set(Object.values(b.states).map(p => K(...p)));
  const entryK = K(...b.entry);
  const badFork = cells.filter(k => !stateKeys.has(k) && k !== entryK && deg[k] > 2);
  T(badFork.length === 0,
    badFork.length ? `상태가 아닌 칸에 갈림길이 있다 — ${badFork.join(' / ')}`
                   : '갈림길은 모두 상태 위에 있다');

  // 막다른 곳도 상태여야 합니다 (입구 제외)
  const badDead = cells.filter(k => !stateKeys.has(k) && k !== entryK && deg[k] === 1);
  T(badDead.length === 0,
    badDead.length ? `상태가 아닌 막다른 곳이 있다 — ${badDead.join(' / ')}`
                   : '막다른 곳은 모두 상태 위에 있다');

  // ④ 상태 연결이 미로에서 실제로 걸어갈 수 있는 길과 같은가
  //    (상태에서 출발해 다른 상태를 만날 때까지 복도를 따라갑니다)
  const walk = new Set();
  for(const [id, [sx, sy]] of Object.entries(b.states)){
    for(const [dx, dy] of NB){
      let px = sx, py = sy, cx = sx + dx, cy = sy + dy;
      if(!open.has(K(cx, cy))) continue;
      while(open.has(K(cx, cy)) && !stateKeys.has(K(cx, cy))){
        const nxt = NB.map(([ax, ay]) => [cx + ax, cy + ay])
          .filter(([ax, ay]) => open.has(K(ax, ay)) && !(ax === px && ay === py));
        if(nxt.length !== 1) break;                 // 입구 끝 등
        px = cx; py = cy; [cx, cy] = nxt[0];
      }
      const hit = Object.entries(b.states).find(([, p]) => p[0] === cx && p[1] === cy);
      if(hit) walk.add([id, hit[0]].sort().join('-'));
    }
  }
  const declared = new Set(b.corridors.map(([u, v]) => [u, v].sort().join('-')));
  const same = walk.size === declared.size && [...declared].every(x => walk.has(x));
  T(same, `상태 연결이 미로 길과 같다  선언 [${[...declared].join(', ')}]  실제 [${[...walk].join(', ')}]`);

  // ⑤ 탐색 순서
  const exp = EXPECT[name];
  if(exp){
    const declaredE = new Set(exp.edges.map(e => e.sort().join('-')));
    T(declared.size === declaredE.size && [...declaredE].every(x => declared.has(x)),
      '트리 구조가 슬라이드와 같다');

    const kids = {}, seenT = new Set([b.root]), adj = {};
    for(const [u, v] of b.corridors){ (adj[u] ||= []).push(v); (adj[v] ||= []).push(u); }
    (function w(id){ kids[id] = [];
      for(const n of (adj[id] || [])) if(!seenT.has(n)){ seenT.add(n); kids[id].push(n); w(n); } })(b.root);

    const bfs = []; const q = [b.root];
    while(q.length){ const v = q.shift(); bfs.push(v); (kids[v] || []).forEach(c => q.push(c)); }
    const dfs = []; (function go(v){ dfs.push(v); (kids[v] || []).forEach(go); })(b.root);

    T(bfs.join(' ') === exp.bfs, `너비 우선 — ${bfs.join(' ')}`);
    T(dfs.join(' ') === exp.dfs, `깊이 우선 — ${dfs.join(' ')}`);
    if(exp.goalAt){
      const gb = bfs.indexOf(b.goal) + 1, gd = dfs.indexOf(b.goal) + 1;
      T(gb === exp.goalAt.bfs && gd === exp.goalAt.dfs,
        `출구 ${b.goal} — 너비 우선 ${gb}번째 · 깊이 우선 ${gd}번째`);
      T(Math.abs(gb - gd) >= 3, '두 방법의 차이가 뚜렷하다 (3개 이상)');
    }
  }

  // 눈으로도 한 번
  console.log('');
  for(let y = 0; y < b.h; y++){
    let row = '   ';
    for(let x = 0; x < b.w; x++){
      const k = K(x, y);
      const id = Object.entries(b.states).find(([, p]) => p[0] === x && p[1] === y)?.[0];
      row += id ? ` ${id} ` : (k === K(...b.entry) ? ' ↓ ' : (open.has(k) ? ' · ' : '███'));
    }
    console.log(row);
  }
  if(!ok.every(Boolean)) allOk = false;
}

if(!allOk){ console.error('\n✖ 통과 못 한 검사가 있습니다.'); process.exit(1); }
console.log('\n✔ 전부 통과');
