/* 숨바꼭질(숨는 쪽) 판 검산
   ① 너비 우선에 제일 좋은 자리와 깊이 우선에 제일 좋은 자리가 **달라야** 합니다
   ② 둘 다 대비하는 자리(최악이 가장 큰 곳)가 **또 다른 곳**이어야 3라운드가 성립합니다
   ③ 320px 화면에서 방이 겹치지 않아야 합니다
   게임 파일(js/games/hideseek.js)의 HS_ROOMS 와 값이 같아야 합니다. */

export const ROOMS = [
  { name: '현관', parent: null },
  { name: '거실', parent: 0 },
  { name: '복도', parent: 0 },
  { name: '부엌', parent: 0 },
  { name: '소파', parent: 1 },
  { name: '커튼', parent: 1 },
  { name: '안방', parent: 2 },
  { name: '욕실', parent: 2 },
  { name: '식탁', parent: 3 },
  { name: '침대', parent: 6 },
  { name: '옷장', parent: 6 },
  { name: '욕조', parent: 7 },
  { name: '이불', parent: 10 },
];

const kids = {};
ROOMS.forEach((r, i) => { if(r.parent !== null) (kids[r.parent] ||= []).push(i); });
export const kidsOf = id => kids[id] || [];
export const isLeaf = id => !kidsOf(id).length;
export const LEAVES = ROOMS.map((_, i) => i).filter(isLeaf);

const depth = {};
ROOMS.forEach((_, i) => {
  const go = id => depth[id] ??= (ROOMS[id].parent === null ? 0 : go(ROOMS[id].parent) + 1);
  go(i);
});
export const DEPTH = depth;

/* 너비 우선 — 층을 다 훑고 내려감, 같은 층은 왼쪽부터 */
export function bfs(){
  const q = [0], out = [];
  while(q.length){ const v = q.shift(); out.push(v); kidsOf(v).forEach(c => q.push(c)); }
  return out;
}
/* 깊이 우선 — 한 갈래를 끝까지, 형제는 왼쪽부터 (전위 순회) */
export function dfs(){
  const out = [];
  (function go(v){ out.push(v); kidsOf(v).forEach(go); })(0);
  return out;
}

/* 그 자리에 숨었을 때 술래가 연 방의 수 (잡힌 방 포함) */
export const opened = (order, leaf) => order.indexOf(leaf) + 1;

function main(){
  const B = bfs(), D = dfs();
  const nm = i => ROOMS[i].name;
  console.log(`방 ${ROOMS.length}개 · 숨을 수 있는 곳 ${LEAVES.length}군데 · 최대 깊이 ${Math.max(...Object.values(DEPTH))}`);
  console.log('너비 우선 —', B.map(nm).join(' '));
  console.log('깊이 우선 —', D.map(nm).join(' '));

  const rows = LEAVES.map(l => ({
    자리: nm(l), 깊이: DEPTH[l], 너비: opened(B, l), 깊이우선: opened(D, l),
    최악: Math.min(opened(B, l), opened(D, l)),
  }));
  console.log('\n숨는 자리별 — 술래가 연 방의 수 (많을수록 오래 버팀)');
  const pad = (v, n) => String(v).padEnd(n, ' ');
  console.log('  ' + pad('자리',7) + pad('깊이',5) + pad('너비우선',10) + pad('깊이우선',10) + '최악');
  for(const r of rows)
    console.log('  ' + pad(r.자리,7) + pad(r.깊이,5) + pad(r.너비,10) + pad(r.깊이우선,10) + r.최악);

  const bestB = rows.reduce((a, b) => b.너비 > a.너비 ? b : a);
  const bestD = rows.reduce((a, b) => b.깊이우선 > a.깊이우선 ? b : a);
  const bestBoth = rows.reduce((a, b) => b.최악 > a.최악 ? b : a);

  console.log('\n1라운드(너비 우선) 정답 — %s (%d개)', bestB.자리, bestB.너비);
  console.log('2라운드(깊이 우선) 정답 — %s (%d개)', bestD.자리, bestD.깊이우선);
  console.log('3라운드(둘 다) 정답   — %s (최악 %d개)', bestBoth.자리, bestBoth.최악);
  console.log('만점 — %d개', bestB.너비 + bestD.깊이우선 + bestBoth.최악);

  const ok = [];
  const T = (cond, msg) => { ok.push(cond); console.log((cond ? '  ✔ ' : '  ✖ ') + msg); };
  console.log('\n검사');
  T(bestB.자리 !== bestD.자리, '1·2라운드 정답이 서로 다르다');
  T(bestBoth.자리 !== bestB.자리 && bestBoth.자리 !== bestD.자리,
    '3라운드 정답이 앞의 둘과 또 다르다');
  T(bestB.깊이우선 <= bestD.깊이우선 - 3,
    `1라운드 정답(${bestB.자리})을 2라운드에 그대로 쓰면 확실히 손해다 (${bestB.깊이우선} vs ${bestD.깊이우선})`);
  T(Math.max(...rows.map(r => r.최악)) >= 10, '3라운드 정답이 충분히 오래 버틴다');
  const deepest = rows.reduce((a, b) => b.깊이 > a.깊이 ? b : a);
  T(deepest.자리 !== bestD.자리, '가장 깊은 곳이 두 라운드 모두의 정답은 아니다 (생각 없이 못 고름)');

  /* ③ 좁은 화면에서 방이 겹치지 않는지 — 잎 개수로 칸을 나눕니다 */
  console.log('\n좁은 화면 검사 (방 이름 칸 최소 46px 필요)');
  for(const w of [320, 360, 390, 900]){
    const per = (w - 16) / LEAVES.length;
    console.log(`  ${String(w).padEnd(5)}px → 한 칸 ${per.toFixed(1)}px  ${per >= 46 ? '✔' : '✖ 좁음'}`);
    ok.push(per >= 46);
  }
  if(!ok.every(Boolean)){ console.error('\n✖ 통과 못 한 검사가 있습니다.'); process.exit(1); }
  console.log('\n✔ 전부 통과');
}

main();
