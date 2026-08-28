/* 미로 판 만들기 — 손으로 그리지 않고 뽑아서 고릅니다.

   ① 격자를 파서 진짜 미로(고리 없는 완전 미로)를 만듭니다
   ② 갈림길과 막다른 곳을 '상태' 로 뽑습니다
   ③ 너비/깊이 우선 순서를 재서, 출구를 만나는 시점 차이가 큰 판만 남깁니다
   ④ 고른 판을 js/games/maze.js 에 넣을 수 있는 모양으로 찍어 줍니다

   쓰는 법
     node verify/maze-gen.mjs            # 쓸 만한 판 후보를 훑어봅니다
     node verify/maze-gen.mjs 1234       # 그 씨앗의 판을 자세히 + 코드로 찍어 줍니다
*/

const W = 15, H = 11;                    // 격자 (홀수 칸을 방으로 씁니다)
const CW = (W - 1) / 2, CH = (H - 1) / 2;   // 파낼 칸 7 × 5

/* 씨앗 고정 난수 — 같은 씨앗이면 늘 같은 판이 나옵니다 */
function rng(seed){
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const K = (x, y) => x + ',' + y;
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/* ① 격자 파기 — 되돌아가기 방식(randomized DFS) */
function carve(seed){
  const rnd = rng(seed);
  const open = new Set();
  const seen = new Set();
  const cell = (cx, cy) => [cx * 2 + 1, cy * 2 + 1];
  const st = [[0, 0]];
  seen.add('0,0');
  open.add(K(...cell(0, 0)));
  while(st.length){
    const [cx, cy] = st[st.length - 1];
    const cand = NB.map(([dx, dy]) => [cx + dx, cy + dy])
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < CW && ny < CH && !seen.has(K(nx, ny)));
    if(!cand.length){ st.pop(); continue; }
    const [nx, ny] = cand[Math.floor(rnd() * cand.length)];
    seen.add(K(nx, ny));
    const [ax, ay] = cell(cx, cy), [bx, by] = cell(nx, ny);
    open.add(K(bx, by));
    open.add(K((ax + bx) / 2, (ay + by) / 2));      // 사이 벽을 텁니다
    st.push([nx, ny]);
  }
  return open;
}

/* ② 갈림길·막다른 곳을 상태로 */
function analyse(open, entry){
  const deg = {};
  for(const k of open){
    const [x, y] = k.split(',').map(Number);
    deg[k] = NB.filter(([dx, dy]) => open.has(K(x + dx, y + dy))).length;
  }
  const root = K(...entry);
  const states = [...open].filter(k => k !== root && (deg[k] !== 2));
  return { deg, states: new Set(states) };
}

/* 상태끼리 이음 — 상태에서 복도를 따라가 다음 상태를 만납니다 */
function stateGraph(open, stateSet, start){
  const adj = {};
  const all = new Set([...stateSet, start]);
  for(const s of all){
    adj[s] = [];
    const [sx, sy] = s.split(',').map(Number);
    for(const [dx, dy] of NB){
      let px = sx, py = sy, cx = sx + dx, cy = sy + dy;
      if(!open.has(K(cx, cy))) continue;
      const mid = [];
      while(open.has(K(cx, cy)) && !all.has(K(cx, cy))){
        mid.push([cx, cy]);
        const nxt = NB.map(([ax, ay]) => [cx + ax, cy + ay])
          .filter(([ax, ay]) => open.has(K(ax, ay)) && !(ax === px && ay === py));
        if(nxt.length !== 1) break;
        px = cx; py = cy; [cx, cy] = nxt[0];
      }
      if(all.has(K(cx, cy))) adj[s].push({ to: K(cx, cy), mid });
    }
  }
  return adj;
}

/* ③ 뿌리에서 본 자식 관계 · 두 순서 */
function orders(adj, root){
  const kids = {}, seen = new Set([root]);
  (function walk(id){
    kids[id] = [];
    for(const e of (adj[id] || [])) if(!seen.has(e.to)){ seen.add(e.to); kids[id].push(e.to); walk(e.to); }
  })(root);
  const bfs = []; const q = [root];
  while(q.length){ const v = q.shift(); bfs.push(v); (kids[v] || []).forEach(c => q.push(c)); }
  const dfs = []; (function go(v){ dfs.push(v); (kids[v] || []).forEach(go); })(root);
  return { kids, bfs, dfs, reached: seen.size };
}

function build(seed){
  const entry = [1, 1];                       // 왼쪽 위에서 들어갑니다
  const open = carve(seed);
  const { states } = analyse(open, entry);
  const root = K(...entry);
  const adj = stateGraph(open, states, root);
  const { kids, bfs, dfs, reached } = orders(adj, root);
  if(reached !== states.size + 1) return null;          // 못 닿는 상태가 있으면 버립니다
  return { seed, open, states, root, adj, kids, bfs, dfs };
}

/* 출구 고르기 — 두 순서가 크게 갈리되, **학생이 타이핑할 만한 길이**여야 합니다.
   너비 우선 답이 5~9개, 깊이 우선이 12개 이하인 것 중에서 차이가 가장 큰 잎. */
function pickGoal(b){
  const leaves = b.bfs.filter(k => (b.kids[k] || []).length === 0);
  let best = null;
  for(const g of leaves){
    const gb = b.bfs.indexOf(g) + 1, gd = b.dfs.indexOf(g) + 1;
    if(gb < 5 || gb > 9 || gd > 12) continue;
    const gap = gd - gb;                                   // 깊이 우선이 더 헤매는 쪽
    if(!best || gap > best.gap) best = { g, gb, gd, gap };
  }
  return best;
}

const arg = process.argv[2];
if(!arg){
  console.log('씨앗   상태   너비   깊이   차이');
  const good = [];
  for(let seed = 1; seed <= 400; seed++){
    const b = build(seed);
    if(!b) continue;
    const n = b.states.size + 1;
    if(n < 11 || n > 15) continue;
    const g = pickGoal(b);
    if(!g || g.gap < 5) continue;
    good.push({ seed, n, ...g });
  }
  good.sort((a, b) => b.gap - a.gap);
  for(const x of good.slice(0, 12))
    console.log(String(x.seed).padEnd(6), String(x.n).padEnd(6), String(x.gb).padEnd(6),
                String(x.gd).padEnd(6), x.gap);
  console.log(`\n쓸 만한 판 ${good.length}개. 하나 골라 'node verify/maze-gen.mjs <씨앗>' 로 보세요.`);
  process.exit(0);
}

/* ④ 고른 판을 코드로 찍어 줍니다 */
const b = build(+arg);
if(!b){ console.error('✖ 그 씨앗으로는 판이 안 나옵니다.'); process.exit(1); }
const goal = pickGoal(b);

/* 이름 붙이기 — 너비 우선 순서대로 S, A, B, C … */
const NAMES = 'SABCDEFGHIJKLMNOPQRSTUVWXYZ';
const name = {};
b.bfs.forEach((k, i) => name[k] = NAMES[i]);

console.log(`씨앗 ${arg} · 상태 ${b.bfs.length}개 · 출구 ${name[goal.g]}`);
console.log(`너비 우선 — ${b.bfs.map(k => name[k]).join(' ')}`);
console.log(`깊이 우선 — ${b.dfs.map(k => name[k]).join(' ')}`);
console.log(`출구 ${name[goal.g]} — 너비 ${goal.gb}번째 · 깊이 ${goal.gd}번째 (차이 ${goal.gap})\n`);

for(let y = 0; y < H; y++){
  let row = '   ';
  for(let x = 0; x < W; x++){
    const k = K(x, y);
    row += name[k] ? ` ${name[k]} ` : (b.open.has(k) ? ' · ' : '███');
  }
  console.log(row);
}

/* 트리 그림 자리 — 잎부터 나눠 주고 부모는 자식들 가운데에 */
const depth = { [b.root]: 0 };
(function go(v){ for(const c of (b.kids[v] || [])){ depth[c] = depth[v] + 1; go(c); } })(b.root);
const maxD = Math.max(...Object.values(depth));
let slot = 0; const col = {};
(function place(id){
  const ch = b.kids[id] || [];
  if(!ch.length){ col[id] = slot++; return; }
  ch.forEach(place);
  col[id] = (col[ch[0]] + col[ch[ch.length - 1]]) / 2;
})(b.root);
const cols = Math.max(1, slot - 1);

const q = s => `'${s}'`;
console.log('\n── js/games/maze.js 에 넣을 것 ──\n');
console.log(`  main: {`);
console.log(`    w: ${W}, h: ${H},`);
console.log(`    entry: [1, 0],`);
console.log(`    goal: ${q(name[goal.g])},`);
console.log(`    states: {`);
let line = '     ';
b.bfs.forEach(k => {
  const [x, y] = k.split(',').map(Number);
  const s = ` ${name[k]}: [${x}, ${y}],`;
  if(line.length + s.length > 96){ console.log(line); line = '     '; }
  line += s;
});
console.log(line);
console.log(`    },`);
console.log(`    corridors: [`);
for(const [p, cs] of Object.entries(b.kids)) for(const c of cs){
  const e = b.adj[p].find(x => x.to === c);
  const mid = e.mid.map(([x, y]) => `[${x}, ${y}]`).join(', ');
  console.log(`      [${q(name[p])}, ${q(name[c])}, [${mid}]],`);
}
console.log(`    ],`);
console.log(`    tree: {`);
line = '     ';
b.bfs.forEach(k => {
  const x = cols === 0 ? 50 : Math.round(col[k] / cols * 100);
  const y = maxD === 0 ? 50 : Math.round(4 + depth[k] / maxD * 92);
  const s = ` ${name[k]}: [${x}, ${y}],`;
  if(line.length + s.length > 96){ console.log(line); line = '     '; }
  line += s;
});
console.log(line);
console.log(`    },`);
console.log(`    root: 'S',`);
console.log(`  },`);
