/* ═══════════════════════════════════════
   games/rulecar-sim.js — 🚗 자율주행차 규칙 만들기 · 주행 시험 장면

   rulecar.js 의 판정(rcRun) 결과를 도로 장면으로 보여 줍니다. 판정은 바꾸지 않습니다.
   · 통과 — 정답 행동대로 달림 (「확인한다」 가 불리면 레이더가 퍼지고 드러난 사실이 뜸)
   · 사고(쾅) — 위험한 실수 : 빨간불에 교차로로 들어감 · 앞차를 못 피함 ·
                가야 할 때 서서 뒤차가 받음 · 충돌(행동이 둘)이면 휘청하다 쾅
   · 실격(삐빅) — 위험하진 않지만 틀림 : 멈춘다↔기다린다 · 출발한다↔앞으로 움직인다 ·
                  확인 안 함 · 규칙 없음(하던 대로 감)
   장면은 그릴 때마다 새 이름의 @keyframes 를 만들어 CSS 로만 움직입니다 (프레임마다 도는 타이머 없음).
   verify/rulecar.py ⑥ 이 판정마다 장면 종류를 확인하고 교사용 표로 뽑습니다.
═══════════════════════════════════════ */

const RS = { Y: 93, runX: 10, waitX: 366 };   // 우리 차선 차 윗변 · 달리던 차 · 정지선 앞에 선 차
let RS_NONCE = 0;

/* 차가 실제로 어떻게 움직이는가 */
function _rsPhys(sc, r){
  const run = sc.facts.includes('run');
  if(r.verdict === 'conflict') return 'spin';
  const drive = r.acts.filter(a => a !== 'check');
  if(!drive.length) return run ? 'coast' : 'stay';        // 규칙 없음 — 하던 대로
  const a = drive[0];
  if(a === 'go' || a === 'start') return 'drive';
  if(a === 'slow') return run ? 'slow' : 'creep';
  return run ? 'brake' : 'stay';                          // 멈춘다 · 기다린다
}

/* 장면 종류 — pass · crash(cross 교차로 / front 선 앞차 / chase 가는 앞차 / rear 뒤차 / spin 충돌) · dq 실격 */
function rcOutcome(sc, r){
  const phys = _rsPhys(sc, r);
  const o = { kind: 'dq', crash: null, phys, checked: r.acts.includes('check') };
  if(r.verdict === 'pass'){ o.kind = 'pass'; return o; }
  const crash = c => { o.kind = 'crash'; o.crash = c; return o; };
  if(phys === 'spin') return crash('spin');
  if(['drive', 'coast', 'slow', 'creep'].includes(phys)){
    if(sc.facts.includes('red')) return crash('cross');
    if(sc.hidden.includes('still')) return crash('front');
    if(sc.hidden.includes('ahead') && (phys === 'drive' || phys === 'coast')) return crash('chase');
    return o;
  }
  if(['go', 'start', 'slow'].includes(sc.expect)) return crash('rear');   // 가야 할 때 섬
  return o;
}

/* 움직임 대본 — 점 하나 = [초, x, y, 회전, 다음 구간 속도곡선] */
function _rsScript(sc, r, o){
  const Y = RS.Y, run = sc.facts.includes('run'), red = sc.facts.includes('red'), P = o.phys;
  const x0 = run ? RS.runX : RS.waitX;
  const still = sc.hidden.includes('still'), moving = sc.hidden.includes('ahead');
  const obsX = !sc.facts.includes('obs') ? null : still ? (run ? 600 : 530) : (red ? 540 : 560);
  const obsV = moving ? (red ? 60 : 44) : 0;
  const s = { D: 3.2, tEnd: 2.2, me: null, obs: null, rear: null, cross: null,
              boom: null, stamp: null, honk: null, tChk: o.checked ? (run ? 0.7 : 0.4) : null };
  s.tDec = s.tChk == null ? 0.3 : s.tChk + 0.5;

  if(o.kind === 'crash'){
    let t = 1.5;
    if(o.crash === 'cross' || o.crash === 'front'){
      const xh = o.crash === 'cross' ? 386 : obsX - 60;             // 부딪히는 자리
      if(run){
        t = P === 'slow' ? 2.1 : (xh - 10) / 300;
        s.me = P === 'slow' ? [[0, 10], [0.8, 250, Y, 0, 'ease-out'], [t, xh]] : [[0, 10], [t, xh]];
      } else {
        t = P === 'creep' ? 1.6 : 1.1;
        s.me = [[0, x0], [0.3, x0, Y, 0, 'ease-in'], [t, xh]];
      }
      if(o.crash === 'cross'){
        s.me.push([t + 0.3, xh + 6, Y + 5, 9]);
        s.cross = [[0, 444, -70], [t - 0.8, 444, -70], [t, 444, 33], [t + 0.3, 440, 38, -12]];
        s.boom = [t, 452, 96];
      } else {
        s.me.push([t + 0.25, xh - 8, Y, -3]);
        s.obs = [[0, obsX], [t, obsX], [t + 0.25, obsX + 12, Y, 4]];
        s.boom = [t, obsX, 104];
      }
    } else if(o.crash === 'chase'){
      t = 1.9;
      const xo = obsX + obsV * t;                                     // 부딪히는 순간 앞차 자리
      s.me = [[0, 10], [t, xo - 60], [t + 0.25, xo - 68, Y, -3]];
      s.obs = [[0, obsX], [t, xo], [t + 0.25, xo + 18, Y, 5]];
      s.boom = [t, xo, 104];
    } else if(o.crash === 'rear'){
      if(run){
        t = 1.25;
        s.me = [[0, 10], [0.6, 190, Y, 0, 'ease-out'], [1.05, 250], [t, 250], [t + 0.2, 264, Y, 3]];
        s.rear = [[0, -120], [t, 190], [t + 0.2, 184, Y, -4]];
        s.boom = [t, 250, 104];
      } else {
        s.me = [[0, x0], [t, x0], [t + 0.25, x0 + 12, Y, 3]];
        s.rear = [[0, 150], [0.4, 150, Y, 0, 'ease-in'], [t, x0 - 60], [t + 0.25, x0 - 66, Y, -4]];
        s.boom = [t, x0, 104];
        s.honk = 0.7;
      }
    } else {                                                          // spin — 행동이 둘
      const xs = run ? 370 : x0 + 40;
      s.me = run ? [[0, 10], [0.3, 100, Y, 10], [0.6, 190, Y, -10], [0.9, 270, Y, 12], [t, xs, Y + 30, 200]]
                 : [[0, x0], [0.25, x0, Y, 8], [0.5, x0, Y, -8], [0.75, x0, Y, 8], [1.0, x0, Y, -6], [t, xs, Y + 30, 160]];
      s.me.push([t + 0.3, xs + 6, Y + 24, run ? 190 : 150]);
      s.boom = [t, xs + 30, 136];
    }
    s.D = t + 1.6;
    s.tEnd = t + 0.15;
    s.tDec = Math.min(s.tDec, Math.max(0.1, t - 0.5));
  } else {
    if(P === 'stay'){ s.me = [[0, x0]]; s.D = 2.8; s.tEnd = 1.5; }
    else if(P === 'drive' || P === 'coast'){
      s.me = run ? [[0, 10], [2.6, 780]] : [[0, x0], [0.5, x0, Y, 0, 'ease-in'], [2.6, 780]];
      s.D = 3.0; s.tEnd = 1.8;
    }
    else if(P === 'slow'){ s.me = [[0, 10], [0.8, 250, Y, 0, 'ease-out'], [3.2, 540]]; s.D = 3.4; s.tEnd = 2.4; }
    else if(P === 'creep'){ s.me = [[0, x0], [0.6, x0, Y, 0, 'ease-in'], [3.0, 540]]; s.D = 3.2; s.tEnd = 2.0; }
    else if(still){ s.me = [[0, 10], [0.8, 250, Y, 0, 'ease-out'], [2.3, obsX - 72]]; s.tEnd = 2.3; }   // 앞차 뒤에 섬
    else { s.me = [[0, 10, Y, 0, 'ease-out'], [2.0, RS.waitX]]; s.tEnd = 2.1; }                         // 정지선에 섬
    if(o.kind === 'dq') s.stamp = s.tEnd;
    if(red){ const t0 = run ? 1.4 : 0.3; s.cross = [[0, 444, -70], [t0, 444, -70], [t0 + 1.8, 444, 210]]; }
    if(['start', 'go', 'slow'].includes(sc.expect)) s.rear = s.me.map(p => [p[0] + 0.15, p[1] - 140, Y, 0, p[4]]);
  }
  if(obsX != null && !s.obs) s.obs = [[0, obsX], [s.D, obsX + obsV * s.D]];
  return s;
}

/* ── 그리기 ── */

const RS_STAR = Array.from({ length: 24 }, (_, j) => {
  const a = Math.PI * j / 12, rr = j % 2 ? 15 : 34;
  return `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`;
}).join(' ');

const RS_CRASH = {
  cross: '빨간불에 교차로로 들어가 옆에서 오던 차와 부딪혔습니다',
  front: '멈춰 있는 앞차를 피하지 못하고 들이받았습니다',
  chase: '앞차보다 빨리 달려 뒤에서 들이받았습니다',
  rear: '가야 할 때 서 버려서 뒤따르던 차가 받았습니다',
  spin: '서로 다른 행동이 한꺼번에 나와 차가 휘청였습니다 (충돌)',
};

/* 대본 → @keyframes (처음·끝 점을 채워 0%~100%) */
function _rsKF(name, tr, D){
  const pts = tr.map(p => [p[0], p[1], p[2] == null ? RS.Y : p[2], p[3] || 0, p[4]]);
  if(pts[0][0] > 0) pts.unshift([0, pts[0][1], pts[0][2], pts[0][3]]);
  const last = pts[pts.length - 1];
  if(last[0] < D) pts.push([D, last[1], last[2], last[3]]);
  return `@keyframes ${name}{` + pts.map(([t, x, y, r, e]) =>
    `${Math.min(100, t / D * 100).toFixed(2)}%{transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r}deg)` +
    `${e ? ';animation-timing-function:' + e : ''}}`).join('') + '}';
}

function _rsRoad(light){          // 'red' · 'green' · null = 신호등 없는 길
  if(!light) return `<rect class="rs-grass" width="720" height="170"/>
    <rect class="rs-road" y="55" width="720" height="70"/><path class="rs-dash" d="M0 90H720"/><path class="rs-rail" d="M0 129H720"/>`;
  const red = light === 'red';
  return `<rect class="rs-grass" width="720" height="170"/>
    <rect class="rs-road" y="55" width="720" height="70"/><rect class="rs-road" x="440" width="70" height="170"/>
    <path class="rs-dash" d="M0 90H440M510 90H720M475 0V55M475 125V170"/>
    <path class="rs-stop" d="M430 90V125"/><path class="rs-rail" d="M0 129H396M520 129H720"/>
    <g transform="translate(404 131)"><rect class="rs-pole" width="20" height="36" rx="4"/>
      <circle class="rs-red${red ? ' on' : ''}" cx="10" cy="10" r="6"/><circle class="rs-green${red ? '' : ' on'}" cx="10" cy="26" r="6"/></g>`;
}

function _rsCar(cls, inner){
  return `<g class="rs-car ${cls}"><rect class="b" width="60" height="28" rx="7"/>
    <rect class="w" x="39" y="4" width="11" height="20" rx="3"/><rect class="w" x="8" y="5" width="8" height="18" rx="2"/>${inner || ''}</g>`;
}
function _rsCarV(){   // 교차로를 위에서 아래로 지나가는 차
  return `<g class="rs-car rs-x"><rect class="b" width="28" height="60" rx="7"/>
    <rect class="w" x="4" y="39" width="20" height="11" rx="3"/><rect class="w" x="5" y="8" width="18" height="8" rx="2"/></g>`;
}

/* 차 위 말풍선 — 추론 엔진이 고른 행동 */
function _rsSay(r){
  const d = r.acts.filter(a => a !== 'check').map(a => RC_TXT.act[a]);
  if(!d.length) return '규칙 없음 …?';
  return d.length > 1 ? '⚡ ' + d.join(' + ') : d[0];
}

function _rsResult(sc, r, o){
  if(o.kind === 'pass') return '통과';
  if(o.kind === 'crash') return '쾅! ' + RS_CRASH[o.crash];
  const why = r.verdict === 'none' ? (o.checked ? '확인한 뒤 행동을 정하는 규칙이 없습니다' : '이 상황에 맞는 규칙이 없습니다')
    : r.verdict === 'nocheck' ? '장애물이 움직이는지 먼저 확인해야 합니다'
    : `여기서는 「${RC_TXT.act[sc.expect]}」 가 맞습니다`;
  return '삐빅! 실격 — ' + why;
}

/* 상황 i 장면 — 그릴 때마다 처음부터 한 번 움직이고 끝 모습에서 멈춤 */
function rcScene(i){
  const sc = RC_DATA.scenarios[i], r = RC.results[i], o = rcOutcome(sc, r), s = _rsScript(sc, r, o);
  const n = ++RS_NONCE, D = s.D, css = [];
  const mv = (key, tr, inner) => {
    const name = `rs${n}${key}`;
    css.push(_rsKF(name, tr, D));
    return `<g class="rs-mv" style="animation:${name} ${D}s linear forwards">${inner}</g>`;
  };
  const follow = (tr, dx, dy, half) => tr.map(p => [p[0],
    Math.min(716 - half, Math.max(half + 4, p[1] + dx)), (p[2] == null ? RS.Y : p[2]) + dy, 0, p[4]]);
  const d2 = v => v.toFixed(2);
  let g = '';
  if(s.cross) g += mv('x', s.cross, _rsCarV());
  if(s.obs){
    const tag = o.checked && sc.hidden.length
      ? `<text class="rs-tag" x="30" y="45" style="animation-delay:${d2(s.tChk + 0.4)}s">${sc.hidden.includes('still') ? '멈춰 있음' : '움직이는 중'}</text>` : '';
    g += mv('o', s.obs, _rsCar('rs-o', tag));
  }
  if(s.rear) g += mv('r', s.rear, _rsCar('rs-r'));
  g += mv('m', s.me, _rsCar('rs-me'));
  if(s.tChk != null) g += mv('p', follow(s.me, 60, 14, 0), `<circle class="rs-ping" r="12" style="animation-delay:${d2(s.tChk)}s"/>`);
  const say = _rsSay(r), w = say.length * 12 + 22;
  g += mv('b', follow(s.me, 30, -8, w / 2), `<g class="rs-say" style="animation-delay:${d2(s.tDec)}s">
    <rect x="${-w / 2}" y="-24" width="${w}" height="22" rx="6"/><text y="-8">${esc(say)}</text></g>`);
  if(s.honk != null) g += mv('h', follow(s.rear, 30, -8, 24), `<g class="rs-say rs-honk" style="animation-delay:${d2(s.honk)}s">
    <rect x="-22" y="-24" width="44" height="22" rx="6"/><text y="-8">빵!</text></g>`);
  if(s.boom) g += `<g transform="translate(${s.boom[1].toFixed(1)} ${s.boom[2]})"><g class="rs-boom" style="animation-delay:${d2(s.boom[0])}s">
    <polygon points="${RS_STAR}"/><text y="7">쾅!</text></g></g>`;
  if(s.stamp != null) g += `<g transform="translate(360 64)"><g class="rs-stamp" style="animation-delay:${d2(s.stamp)}s">
    <rect x="-66" y="-24" width="132" height="48" rx="8"/><text y="10">실격</text></g></g>`;
  if(o.kind === 'pass') g += `<g transform="translate(360 32)"><g class="rs-ok" style="animation-delay:${d2(s.tEnd)}s">
    <rect x="-46" y="-17" width="92" height="34" rx="17"/><text y="6">통과!</text></g></g>`;
  const hit = o.kind === 'crash' ? ` rs-hit" style="animation-delay:${d2(s.boom[0])}s` : '';
  const need = (sc.needCheck ? esc(RC_TXT.act.check) + ' → ' : '') + esc(RC_TXT.act[sc.expect]);
  return `<div class="rs-stage" id="rc-stage"><style>${css.join('')}</style>
    <svg class="rs-svg${hit}" viewBox="0 0 720 170" role="img" aria-label="상황 ${sc.id} 주행 장면">${_rsRoad(sc.facts.includes('red') ? 'red' : sc.facts.includes('green') ? 'green' : null)}${g}</svg>
    <div class="rs-cap"><b>상황 ${sc.id}/${RC_DATA.scenarios.length}</b> ${esc(sc.name)}
      <span class="rs-need">해야 할 행동 — ${need}</span>
      <div class="rs-res ${o.kind}" style="animation-delay:${d2(s.tEnd)}s">${esc(_rsResult(sc, r, o))}</div></div></div>`;
}

function rcStageIdle(){
  return `<div class="rs-stage" id="rc-stage"><svg class="rs-svg" viewBox="0 0 720 170" aria-hidden="true">${_rsRoad('red')}
      <g transform="translate(${RS.waitX} ${RS.Y})">${_rsCar('rs-me')}</g></svg>
    <div class="rs-cap rs-idle">규칙을 넣고 <b>주행 시험 하기</b>를 누르면 상황 1부터 ${RC_DATA.scenarios.length}까지 차례로 달립니다 —
      실수하면 <b>쾅</b>, 사고가 납니다.</div></div>`;
}

function rcStageDone(){
  const os = RC_DATA.scenarios.map((sc, i) => rcOutcome(sc, RC.results[i]));
  const p = os.filter(o => o.kind === 'pass').length, c = os.filter(o => o.kind === 'crash').length;
  const head = p === os.length ? '🏁 완주! 모든 상황을 통과했습니다' : `통과 ${p} · 사고 ${c} · 실격 ${os.length - p - c}`;
  return `<div class="rs-stage rs-sum" id="rc-stage"><div class="rs-sum-h">${head}</div>
    <div class="rs-sum-s">상황 카드를 누르면 그 장면을 다시 봅니다</div></div>`;
}
