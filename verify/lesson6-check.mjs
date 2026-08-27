import { check } from './lesson6-layout.mjs';

/* 산 판 — 지금 덱이 쓰는 자리 */
const P = {
  T:[100, 4], G:[80,26], C:[20,36], A:[40,56], B:[80,66],
  H:[100,74], E:[20,80], F:[ 0,86], D:[40,92], S:[60,98],
};
const H = {S:200,A:600,B:500,C:800,D:300,E:400,F:350,G:900,H:450,T:1200};
const ME = [['S','A'],['S','B'],['A','C'],['A','D'],['C','E'],['C','F'],
            ['B','G'],['B','H'],['G','T']];
const mn = () => Object.entries(P).map(([id,[x,y]]) => ({id,x,y,label:`${id} ${H[id]}`}));
const me = () => ME.map(([a,b])=>({from:a,to:b}));
check(mn(), me(), {label:'산 판 (foot)'});
check(mn(), me(), {label:'산 판 (side 설명칸)', side:true, foot:false});

/* 도시 지도 */
const C = { a:[0,50], b:[26,8], c:[26,88], d:[62,48], e:[98,20] };
const CH = { a:12, b:9, c:7, d:5, e:0 };
const CE = [['a','b'],['a','c'],['b','c'],['b','d'],['b','e'],['c','d'],['d','e']];
check(Object.entries(C).map(([id,[x,y]])=>({id,x,y,label:id})),
      CE.map(([a,b])=>({from:a,to:b})), {label:'도시 지도 (이름만)'});
check(Object.entries(C).map(([id,[x,y]])=>({id,x,y,label:`${id}  ${CH[id]}`})),
      CE.map(([a,b])=>({from:a,to:b})), {label:'도시 지도 + 직선거리'});
