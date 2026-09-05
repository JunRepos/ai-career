import { check } from '../../verify/layout-check.mjs';
const C = { a:[0,50], b:[26,8], c:[26,88], d:[62,48], e:[98,20] };
const HH = { a:12, b:9, c:7, d:5, e:0 };
check(Object.entries(C).map(([id,[x,y]])=>({id,x,y,label:id})), {label:'도시 지도 (이름만)'});
check(Object.entries(C).map(([id,[x,y]])=>({id,x,y,label:`${id}  ${HH[id]}`})), {label:'도시 지도 + 직선거리'});
