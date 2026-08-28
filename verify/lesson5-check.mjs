import { check } from './lesson6-layout.mjs';

/* 교과서 a~f 트리 — 지난 시간 복습용. 자식 수가 달라 tree 자동배치가 기울어서 손으로 놓습니다 */
const T = { a:[51,4], b:[17,50], c:[85,50], d:[0,96], e:[34,96], f:[85,96] };
const TE = [['a','b'],['a','c'],['b','d'],['b','e'],['c','f']];
const tn = lab => Object.entries(T).map(([id,[x,y]]) => ({id,x,y,label:lab(id)}));
const te = () => TE.map(([a,b])=>({from:a,to:b}));
check(tn(id=>id), te(), {label:'a~f 트리 (이름만)'});
check(tn(id=>`① ${id}`), te(), {label:'a~f 트리 + 순서번호'});
check(tn(id=>`① ${id}`), te(), {label:'a~f 트리 + side', side:true, foot:false});

/* 도시 지도 — 균일 비용 시연에 씁니다. 누적 비용을 함께 적습니다 */
const C = { a:[0,50], b:[26,8], c:[26,88], d:[62,48], e:[98,20] };
const CE = [['a','b'],['a','c'],['b','c'],['b','d'],['b','e'],['c','d'],['d','e']];
const cn = lab => Object.entries(C).map(([id,[x,y]]) => ({id,x,y,label:lab(id)}));
const ce = () => CE.map(([a,b])=>({from:a,to:b}));
check(cn(id=>id), ce(), {label:'도시 지도 (이름만)'});
check(cn(id=>`${id} 12`), ce(), {label:'도시 지도 + 누적비용'});
check(cn(id=>`${id} 12`), ce(), {label:'도시 지도 + side 설명칸', side:true, foot:false});
