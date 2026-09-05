/* verify/layout-check.mjs — diagram 좌표 검사 (불러 쓰는 도구)

   직접 실행하면 아무 일도 안 합니다. 좌표를 손으로 놓을 때 작은 .mjs 를 만들어
   import { check } from '../verify/layout-check.mjs' 로 씁니다.

   diagram 좌표 검사 — deck-build.mjs 의 drawGraph 기하를 그대로 흉내 냅니다.
   ① 노드끼리 겹치는가  ② 간선이 상관없는 노드를 스치고 지나가는가 */
const M = { x:1.15, right:18.85, w:17.70, top:2.60, bottom:10.62 };
const bodyH = () => M.bottom - M.top;

function textWidth(s, size){
  let em = 0;
  for(const ch of String(s)){
    if(/[가-힣㄰-㆏一-鿿]/.test(ch)) em += 1;
    else if(ch === ' ') em += 0.32; else em += 0.52;
  }
  return em * size / 72;
}

/* 선분과 축에 나란한 네모의 최단 거리 */
function segRectGap(x1,y1,x2,y2, r){
  let best = Infinity;
  const N = 200;
  for(let i=0;i<=N;i++){
    const t=i/N, px=x1+(x2-x1)*t, py=y1+(y2-y1)*t;
    const dx = Math.max(r.x0-px, 0, px-r.x1);
    const dy = Math.max(r.y0-py, 0, py-r.y1);
    best = Math.min(best, Math.hypot(dx,dy));
  }
  return best;
}

export function check(nodes, edges=[], {foot=true, side=false, nodeH=0.92, label=''}={}){
  const footH = foot ? 0.95 : 0, pad = 0.75, NH = nodeH;
  const sideW = side ? 5.9 : 0;
  const gW = M.w - (sideW ? sideW + 0.55 : 0);
  const A = { x:M.x+pad, y:M.top+NH/2+0.1, w:gW-pad*2, h:bodyH()-footH-NH-0.3 };
  const xs = [...new Set(nodes.map(n=>n.x))].sort((a,b)=>a-b);
  let colGap = Infinity;
  for(let i=1;i<xs.length;i++) colGap = Math.min(colGap,(xs[i]-xs[i-1])/100*A.w);
  const maxW = colGap===Infinity ? 99 : Math.max(1.1, colGap-0.22);
  const pos = {};
  for(const n of nodes){
    const w = Math.min(maxW, Math.max(1.9, textWidth(n.label,24)+0.85));
    const cx = A.x+A.w*n.x/100, cy = A.y+A.h*n.y/100;
    pos[n.id] = { cx, cy, w, h:NH, x0:cx-w/2, x1:cx+w/2, y0:cy-NH/2, y1:cy+NH/2 };
  }
  const bad = [];
  const ids = nodes.map(n=>n.id);
  for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){
    const a=pos[ids[i]], b=pos[ids[j]];
    const gx = Math.abs(a.cx-b.cx) - (a.w+b.w)/2;
    const gy = Math.abs(a.cy-b.cy) - (a.h+b.h)/2;
    if(Math.max(gx,gy) < 0.18)
      bad.push(`노드 ${ids[i]}–${ids[j]} 너무 가까움 (가로 ${gx.toFixed(2)}" 세로 ${gy.toFixed(2)}")`);
  }
  /* 간선이 제3의 노드를 스치는가 — deck-build 와 같은 방식으로 붙는 자리를 구합니다 */
  for(const e of edges){
    const a=pos[e.from], b=pos[e.to];
    if(!a||!b) continue;
    const vertical = Math.abs(b.cy-a.cy) >= Math.abs(b.cx-a.cx);
    const sy = b.cy>a.cy?1:-1, sx = b.cx>a.cx?1:-1;
    const x1 = vertical ? a.cx : a.cx+sx*a.w/2;
    const y1 = vertical ? a.cy+sy*NH/2 : a.cy;
    const x2 = vertical ? b.cx : b.cx-sx*b.w/2;
    const y2 = vertical ? b.cy-sy*NH/2 : b.cy;
    for(const id of ids){
      if(id===e.from||id===e.to) continue;
      const g = segRectGap(x1,y1,x2,y2, pos[id]);
      if(g < 0.35) bad.push(`간선 ${e.from}–${e.to} 가 노드 ${id} 를 스침 (여유 ${g.toFixed(2)}")`);
    }
  }
  console.log(`[${label}] 그림칸 ${A.w.toFixed(2)}×${A.h.toFixed(2)}"  노드폭 ${maxW.toFixed(2)}"`);
  if(bad.length){ console.log('  ✖'); bad.forEach(b=>console.log('   ',b)); }
  else console.log('  ✔ 겹침·스침 없음');
  return bad.length===0;
}
