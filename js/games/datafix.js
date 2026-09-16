/* ═══════════════════════════════════════
   games/datafix.js — 데이터를 바꾸면 모델이 달라진다 (11차시 · 학습지 ⑥ 「좋은 모델」)

   프로그램(규칙)은 한 줄도 고치지 않고 **학습 데이터만** 바꿔 가며 모델을 다시 만든다.
     1단계  치우친 데이터로 학습    — 밝은 곳에서 세워 찍은 사진만
     2단계  시험                   — 눕혀 찍은 펜 · 어두운 곳 사진에서 틀린다
     3단계  데이터를 골라 다시 학습 — 어떤 사진을 더 찍을지 학생이 고른다

   모델은 흉내가 아니라 진짜로 돕니다 — 학습 사진 중 가장 비슷한 것의 이름을 따르는
   1-최근접 이웃(가장 가까운 이웃) 분류기입니다. 사진의 특징은 세로 길이 · 가로 길이 · 밝기 셋.
═══════════════════════════════════════ */

const DF_FEAT = ['세로 길이', '가로 길이', '밝기'];
let DF = null;

/* 사진 한 장 — cls: 'pen' | 'eraser', rot: 세운 것(0) · 눕힌 것(1), light: 밝기 0~1 */
function dfShot(cls, rot, light, id){
  const long = cls === 'pen' ? 4.0 : 1.5, short = cls === 'pen' ? 1.0 : 1.2;
  return { id, cls, rot, light, h: rot ? short : long, w: rot ? long : short, b: light };
}

function dfMakeSets(){
  const A = [], T = [];
  for(let i = 0; i < 6; i++) A.push(dfShot('pen', 0, 0.95, 'a' + i));        // 밝은 곳 · 세운 펜
  for(let i = 0; i < 6; i++) A.push(dfShot('eraser', 0, 0.95, 'b' + i));     // 밝은 곳 · 지우개
  T.push(dfShot('pen', 0, 0.95, 't0'), dfShot('eraser', 0, 0.95, 't1'),      // 시험 — 배운 것과 같은 것 둘
         dfShot('pen', 1, 0.9, 't2'), dfShot('pen', 1, 0.45, 't3'),          // 눕힌 펜
         dfShot('eraser', 0, 0.4, 't4'), dfShot('pen', 0, 0.4, 't5'));       // 어두운 곳
  return { train: A, test: T };
}

/* 더 찍어 올 사진 묶음 — 학생이 고릅니다 */
const DF_PACKS = {
  same: { label: '같은 자리에서 더 찍기', sub: '밝은 곳에서 세워 찍은 펜 · 지우개 12장',
          make: () => { const o = []; for(let i = 0; i < 6; i++){ o.push(dfShot('pen', 0, 0.95, 's' + i)); o.push(dfShot('eraser', 0, 0.95, 'u' + i)); } return o; } },
  vary: { label: '여러 각도 · 여러 밝기로 찍기', sub: '눕혀 찍은 펜, 어두운 곳에서 찍은 펜 · 지우개 12장',
          make: () => { const o = []; for(let i = 0; i < 3; i++){ o.push(dfShot('pen', 1, 0.9, 'v' + i)); o.push(dfShot('pen', 1, 0.45, 'w' + i)); o.push(dfShot('pen', 0, 0.4, 'x' + i)); o.push(dfShot('eraser', 0, 0.4, 'y' + i)); } return o; } },
  pen:  { label: '펜만 잔뜩 찍기', sub: '밝은 곳에서 세워 찍은 펜 12장',
          make: () => { const o = []; for(let i = 0; i < 12; i++) o.push(dfShot('pen', 0, 0.95, 'p' + i)); return o; } },
};

/* ── 모델 — 학습 사진 중 가장 비슷한 것의 이름을 따른다 ── */
function dfDist(a, b){
  return Math.sqrt((a.h - b.h) ** 2 + (a.w - b.w) ** 2 + ((a.b - b.b) * 3) ** 2);
}
function dfPredict(train, s){
  let best = null, bd = Infinity;
  for(const t of train){ const d = dfDist(t, s); if(d < bd){ bd = d; best = t; } }
  return { cls: best.cls, near: best, d: bd };
}
function dfScore(train, test){
  const rows = test.map(s => { const p = dfPredict(train, s); return { s, p, ok: p.cls === s.cls }; });
  return { rows, hit: rows.filter(r => r.ok).length, n: rows.length };
}

/* ── 사진 그리기 (CSS 도형 — 학생 기기에서 그림 파일 없이 뜹니다) ── */
function dfPhoto(s, mark){
  const long = 46, short = 13;
  const w = s.cls === 'pen' ? (s.rot ? long : short) : 22;
  const h = s.cls === 'pen' ? (s.rot ? short : long) : 20;
  const col = s.cls === 'pen' ? '#2f6fd0' : '#d06a2f';
  const bg = s.light > 0.6 ? '#f7f6f3' : '#3a3a3a';
  const badge = mark === undefined ? '' :
    `<span class="df-mk ${mark ? 'o' : 'x'}">${mark ? '○' : '✕'}</span>`;
  return `<div class="df-ph" style="background:${bg}">
    <div style="width:${w}px;height:${h}px;background:${col};border-radius:${s.cls === 'pen' ? '4px' : '3px'};opacity:${0.35 + s.light * 0.65}"></div>${badge}</div>`;
}
const dfName = s => s.cls === 'pen' ? '펜' : '지우개';

/* ── 화면 ── */
function vDataFix(){
  if(!DF){
    const st = dfMakeSets();
    DF = { step: 1, train: st.train, test: st.test, trained: null, result: null, pack: null, again: null, busy: false };
  }
  return `<div class="df-wrap">${dfBody()}</div>`;
}
function dfRepaint(){ const w = document.querySelector('.df-wrap'); if(w) w.innerHTML = dfBody(); }
function dfLeave(){ DF = null; }
function dfLoadRank(){ return Promise.resolve([]); }
function dfBoardForTeacher(){
  return `<div class="df-tc">학생 화면에서 <b>데이터만 바꿔</b> 모델을 두 번 학습시킵니다.
    1단계 치우친 데이터 → 2단계 시험에서 <b>눕힌 펜 · 어두운 사진</b>을 틀림 → 3단계에서 어떤 사진을 더 찍을지 고르고 다시 학습.
    「여러 각도 · 여러 밝기」 를 고른 모둠만 다 맞힙니다. 프로그램은 한 줄도 고치지 않았다는 것을 짚어 주세요.</div>`;
}

function dfBody(){
  const s = DF;
  const head = `<div class="df-head"><b>데이터를 바꾸면 모델이 달라진다</b>
    <span>프로그램(규칙)은 한 줄도 고치지 않습니다. 바꾸는 것은 <b>학습 데이터</b>뿐입니다.</span></div>`;

  /* 1단계 */
  let h1 = `<div class="df-card ${s.step === 1 ? 'on' : ''}">
    <div class="df-t"><i>1</i> 이 사진으로 학습시키기</div>
    <div class="df-sub">하람이가 찍어 온 사진 12장입니다. 모두 <b>밝은 곳</b>에서 <b>세워서</b> 찍었습니다.</div>
    <div class="df-grid">${s.train.slice(0, 12).map(x => dfPhoto(x)).join('')}</div>
    <div class="df-lg">${s.train.slice(0, 12).map(x => `<span>${dfName(x)}</span>`).join('')}</div>`;
  h1 += s.trained
    ? `<div class="df-ok">학습 끝 — 사진 ${s.trained.length}장으로 모델을 만들었습니다.</div>`
    : `<button class="btn-p" onclick="dfTrain(1)" ${s.busy ? 'disabled' : ''}>${s.busy ? '학습하고 있습니다…' : '학습 시작'}</button>`;
  h1 += '</div>';

  /* 2단계 */
  let h2 = '';
  if(s.trained){
    h2 = `<div class="df-card ${s.step === 2 ? 'on' : ''}">
      <div class="df-t"><i>2</i> 새 사진으로 시험</div>
      <div class="df-sub">배울 때 없던 사진도 들어 있습니다 — <b>눕혀 찍은 펜</b>, <b>어두운 곳</b>에서 찍은 사진.</div>
      <div class="df-grid">${s.test.map(x => dfPhoto(x, s.result ? s.result.rows.find(r => r.s.id === x.id).ok : undefined)).join('')}</div>
      <div class="df-lg">${s.test.map(x => `<span>${dfName(x)}</span>`).join('')}</div>`;
    h2 += s.result
      ? `<div class="df-res"><b>정확도 ${Math.round(s.result.hit / s.result.n * 100)}%</b> — ${s.result.n}장 중 ${s.result.hit}장 맞힘
           <div class="df-why">${s.result.rows.filter(r => !r.ok).map(r =>
             `<div>✕ <b>${dfName(r.s)}</b> 을 <b>${dfName({ cls: r.p.cls })}</b> 라고 답했습니다 — 배운 사진 중 가장 비슷한 것이 ${dfName(r.p.near)} 사진이었기 때문입니다.</div>`).join('')}</div></div>`
      : `<button class="btn-p" onclick="dfTest()">시험하기</button>`;
    h2 += '</div>';
  }

  /* 3단계 */
  let h3 = '';
  if(s.result){
    const pk = Object.entries(DF_PACKS).map(([k, v]) =>
      `<button class="df-pk ${s.pack === k ? 'on' : ''}" onclick="dfPick('${k}')"><b>${v.label}</b><span>${v.sub}</span></button>`).join('');
    h3 = `<div class="df-card ${s.step === 3 ? 'on' : ''}">
      <div class="df-t"><i>3</i> 어떤 사진을 더 찍어 올까?</div>
      <div class="df-sub">프로그램은 그대로 둡니다. <b>사진 12장만 더 보태서</b> 다시 학습시킵니다. 어느 쪽을 찍어 올까요?</div>
      <div class="df-pks">${pk}</div>`;
    if(s.pack) h3 += `<button class="btn-p" onclick="dfTrain(2)" ${s.busy ? 'disabled' : ''}>${s.busy ? '다시 학습하고 있습니다…' : '이 사진을 보태서 다시 학습'}</button>`;
    if(s.again){
      const a = Math.round(s.again.hit / s.again.n * 100), b = Math.round(s.result.hit / s.result.n * 100);
      h3 += `<div class="df-grid" style="margin-top:10px">${s.test.map(x => dfPhoto(x, s.again.rows.find(r => r.s.id === x.id).ok)).join('')}</div>
        <div class="df-res"><b>정확도 ${b}% → ${a}%</b>
        <div class="df-why"><div>${a > b ? '사진을 다양하게 모으니 처음 보는 사진도 알아봅니다.' : a === b ? '같은 사진만 더 모아서는 달라지지 않습니다.' : '한쪽 물건만 모으면 오히려 나빠집니다.'}</div>
        <div><b>프로그램은 한 줄도 고치지 않았습니다.</b> 바꾼 것은 학습 데이터뿐입니다.</div></div></div>
        <button class="btn-g" onclick="dfReset()">다른 사진으로 다시 해 보기</button>`;
    }
    h3 += '</div>';
  }
  return head + h1 + h2 + h3;
}

/* ── 동작 ── */
function dfTrain(which){
  const s = DF; if(s.busy) return;
  s.busy = true; dfRepaint();
  setTimeout(() => {
    if(which === 1){ s.trained = s.train.slice(0, 12); s.step = 2; }
    else {
      const add = DF_PACKS[s.pack].make();
      s.trained = s.train.slice(0, 12).concat(add);
      s.again = dfScore(s.trained, s.test);
    }
    s.busy = false; dfRepaint();
  }, 900);
}
function dfTest(){ DF.result = dfScore(DF.trained, DF.test); DF.step = 3; dfRepaint(); }
function dfPick(k){ DF.pack = k; DF.again = null; dfRepaint(); }
function dfReset(){ DF.pack = null; DF.again = null; DF.trained = DF.train.slice(0, 12); dfRepaint(); }
