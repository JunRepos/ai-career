/* 숨바꼭질 게임의 집 구조 검산 — 게임 코드에 넣기 전에 순서를 확인합니다 */
const ROOMS = [
  { id: 0, name: '현관', parent: null },
  { id: 1, name: '거실', parent: 0 },
  { id: 2, name: '복도', parent: 0 },
  { id: 3, name: '소파', parent: 1 },
  { id: 4, name: '커튼', parent: 1 },
  { id: 5, name: '안방', parent: 2 },
  { id: 6, name: '욕실', parent: 2 },
  { id: 7, name: '침대', parent: 5 },
  { id: 8, name: '옷장', parent: 5 },
  { id: 9, name: '욕조', parent: 6 },
];

const kids = {};
ROOMS.forEach(r => { if (r.parent !== null) (kids[r.parent] ||= []).push(r.id); });

const bfs = () => { const q = [0], out = []; while (q.length) { const v = q.shift(); out.push(v); (kids[v] || []).forEach(c => q.push(c)); } return out; };
const dfs = () => { const out = []; (function go(v){ out.push(v); (kids[v] || []).forEach(go); })(0); return out; };

const nm = ids => ids.map(i => ROOMS[i].name).join(' – ');

/* 자리 — deck-build.mjs 의 tree 배치와 같은 방법 */
const depth = {};
const dep = id => depth[id] ??= (ROOMS[id].parent === null ? 0 : dep(ROOMS[id].parent) + 1);
ROOMS.forEach(r => dep(r.id));
let slot = 0; const col = {};
(function place(id){
  const ch = kids[id] || [];
  if (!ch.length) { col[id] = slot++; return; }
  ch.forEach(place);
  col[id] = (col[ch[0]] + col[ch[ch.length - 1]]) / 2;
})(0);
const cols = Math.max(1, slot - 1);
const maxD = Math.max(...ROOMS.map(r => depth[r.id]));

console.log('방', ROOMS.length, '개 · 깊이', maxD, '· 잎(숨을 수 있는 곳)',
  ROOMS.filter(r => !kids[r.id]).map(r => r.name).join(' · '));
console.log('너비 우선 —', nm(bfs()));
console.log('깊이 우선 —', nm(dfs()));

console.log('\n자리 (x%, y%) · 같은 층 최대', Math.max(...Object.values(
  ROOMS.reduce((a, r) => (a[depth[r.id]] = (a[depth[r.id]] || 0) + 1, a), {}))), '칸');
for (const r of ROOMS)
  console.log('  %s  깊이 %d  x %s%%  y %s%%', r.name, depth[r.id],
    (col[r.id] / cols * 100).toFixed(1), (depth[r.id] / maxD * 100).toFixed(0));

/* 같은 층 안에서 칸이 얼마나 떨어져 있는지 — 좁은 화면에서 겹치는지 봅니다.
   층이 다르면 세로로 떨어져 있으므로 비교하지 않습니다. */
let gap = Infinity;
for (let d = 0; d <= maxD; d++) {
  const xs = ROOMS.filter(r => depth[r.id] === d)
    .map(r => col[r.id] / cols * 100).sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) gap = Math.min(gap, xs[i] - xs[i - 1]);
}
console.log('\n같은 층 안에서 가장 좁은 간격 %s%%', gap.toFixed(1));
for (const w of [320, 360, 430, 560]) {
  const nw = Math.min(78, Math.max(54, w * 0.16));   // 칸 너비 clamp(54px,16vw,78px)
  const plane = w - nw - 4;                          // 좌우로 칸 절반씩 비워 둡니다
  const px = gap / 100 * plane;
  console.log('화면 %dpx → 칸 %dpx · 간격 %dpx · 칸 사이 빈 곳 %dpx %s',
    w, Math.round(nw), Math.round(px), Math.round(px - nw), px - nw >= 6 ? '✔' : '✖ 겹침');
}

/* 숨은 곳별로 몇 번째에 찾는지 */
console.log('\n숨은 곳별 — 몇 번째에 찾나 (현관 여는 것부터 셈)');
const bo = bfs(), dO = dfs();
for (const r of ROOMS.filter(r => !kids[r.id]))
  console.log('  %s → 너비 %d번째 · 깊이 %d번째', r.name, bo.indexOf(r.id) + 1, dO.indexOf(r.id) + 1);
