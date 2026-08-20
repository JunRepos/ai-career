/* ═══════════════════════════════════════
   games/plantwater.js — 🌿 식물 물 주기

   1차시 실습. 지능의 네 요소(인식·추론·학습·문제해결)를 몸으로 겪게 하는 게임.
     · 4×4 화분. 시든 화분에 물을 주면 +2
     · 멀쩡한 화분에 주면 -1, 시든 채 3초가 지나 썩으면 -2
     · 30초. 뒤로 갈수록 시드는 속도가 빨라짐
     · 각자 시작, 여러 번 도전 가능(최고점 기록), 순위 5등까지 실명
═══════════════════════════════════════ */

const PW_ROWS = 4, PW_COLS = 4;
const PW_TIME = 30;            // 초
const PW_ROT  = 3.0;           // 시든 뒤 썩기까지(초)

let PW = null;                 // 진행 중 상태 (null=대기 화면)
let PW_BEST = null;            // 내 최고점 (null=아직 안 읽음)
let PW_RANK = [];              // [{num,name,best}] 상위권
let PW_LOADING = false;

/* ── 화면 ── */
function vPlantWater(){
  if(!PW) return _pwIntro();
  if(PW.done) return _pwResult();
  return _pwBoard();
}

function _pwIntro(){
  const best = PW_BEST === null ? '' :
    `<div class="pw-best">내 최고점 <b>${PW_BEST}점</b></div>`;
  return `<div class="pw-wrap">
    <div class="pw-intro">
      <div class="pw-title">식물 물 주기</div>
      <div class="pw-lead">${PW_TIME}초 동안 시든 화분에 물을 주세요.<br>시간이 갈수록 시드는 속도가 빨라집니다.</div>
      <div class="pw-rules">
        <div class="pw-rule"><span class="pw-pt plus">+2</span>시든 화분에 물 주기</div>
        <div class="pw-rule"><span class="pw-pt warn">-1</span>멀쩡한 화분에 물 주기</div>
        <div class="pw-rule"><span class="pw-pt bad">-2</span>못 줘서 썩음</div>
      </div>
      ${best}
      <button class="pw-start" data-action="pw-start">${PW_BEST === null ? '시작하기' : '다시 도전'}</button>
      ${_pwRankHtml()}
    </div>
  </div>`;
}

function _pwBoard(){
  const left = Math.max(0, PW.left).toFixed(1);
  const pct  = Math.max(0, PW.left) / PW_TIME * 100;
  const cells = PW.cells.map((c, i) => {
    const cls = c.state === 'wilt' ? ' wilt' : '';
    const hit = c.fx ? ` fx-${c.fx}` : '';
    // 시든 뒤 남은 시간을 화분 아래 막대로 — '곧 썩겠다'를 눈으로 알 수 있게
    const bar = c.state === 'wilt'
      ? `<i class="pw-fuse" style="width:${Math.max(0, 1 - (PW.t - c.since) / PW_ROT) * 100}%"></i>` : '';
    return `<button class="pw-cell${cls}${hit}" data-action="pw-hit" data-i="${i}">
      <span class="pw-plant">🌿</span>${bar}
    </button>`;
  }).join('');

  return `<div class="pw-wrap">
    <div class="pw-hud">
      <div class="pw-score">${PW.score}<span>점</span></div>
      <div class="pw-timebar"><i style="width:${pct}%"></i></div>
      <div class="pw-left">${left}<span>초</span></div>
    </div>
    <div class="pw-grid">${cells}</div>
    <div class="pw-tip">시든 화분(누렇게 변한 것)만 누르세요</div>
  </div>`;
}

function _pwResult(){
  const r = PW.res;
  return `<div class="pw-wrap">
    <div class="pw-intro">
      <div class="pw-done-label">끝!</div>
      <div class="pw-final">${PW.score}<span>점</span></div>
      <div class="pw-stat">
        <span>살림 <b>${r.saved}</b></span>
        <span>헛물 <b>${r.waste}</b></span>
        <span>썩음 <b>${r.rot}</b></span>
      </div>
      ${PW_BEST !== null && PW.score >= PW_BEST
        ? `<div class="pw-newbest">최고 기록을 세웠어요!</div>` : ''}
      ${_pwReflect()}
      <button class="pw-start" data-action="pw-start">다시 도전</button>
      ${_pwRankHtml()}
    </div>
  </div>`;
}

/* ── 지능 요소 되짚기 (이 활동의 핵심) ──
   방금 한 행동이 지능의 어느 요소였는지 이어서 보여줍니다.
   '생성' 은 이 게임에서 안 쓰인 요소라 흐리게 — 6요소를 구분해서 알게 하는 장치. */
const PW_FACULTIES = [
  { key:'인식',      used:true,  desc:'16칸을 훑어보며 시든 화분이 어디인지 찾아냈어요.' },
  { key:'추론',      used:true,  desc:'잎이 갈색에 가까울수록 남은 시간이 적다는 걸 알아냈어요.' },
  { key:'예측',      used:true,  desc:'곧 썩을 화분을 미리 헤아려 먼저 물을 줬어요.' },
  { key:'문제 해결', used:true,  desc:'30초 안에 어떤 순서로 물을 줄지 전략을 세웠어요.' },
  { key:'학습',      used:true,  desc:'다시 할수록 시드는 패턴에 익숙해지며 점수가 올라가요.' },
  { key:'생성',      used:false, desc:'물을 주는 대신 새로운 식물을 그려내야 했다면 필요했을 능력이에요.' },
];

function _pwReflect(){
  const rows = PW_FACULTIES.map(f => `
    <div class="pw-fac${f.used ? '' : ' off'}">
      <div class="pw-fac-k">${esc(f.key)}${f.used ? '' : '<span class="pw-fac-tag">이 게임에선 안 씀</span>'}</div>
      <div class="pw-fac-d">${esc(f.desc)}</div>
    </div>`).join('');
  return `<div class="pw-reflect">
    <div class="pw-reflect-t">방금 내가 쓴 지능</div>
    <div class="pw-reflect-s">게임을 하는 동안 이런 능력들을 쓰고 있었어요.</div>
    <div class="pw-facs">${rows}</div>
  </div>`;
}

function _pwRankHtml(){
  if(PW_LOADING) return `<div class="pw-rank"><div class="pw-rank-t">순위</div><div class="pw-rank-empty">불러오는 중…</div></div>`;
  if(!PW_RANK.length) return `<div class="pw-rank"><div class="pw-rank-t">순위</div><div class="pw-rank-empty">아직 기록이 없어요. 첫 번째가 되어보세요!</div></div>`;
  const me = ST_USER?.number;
  const top = PW_RANK.slice(0, 5).map((r, i) => `
    <div class="pw-rank-row${r.num === me ? ' me' : ''}">
      <span class="pw-rank-n">${i + 1}</span>
      <span class="pw-rank-name">${esc(r.name || r.num)}</span>
      <span class="pw-rank-s">${r.best}점</span>
    </div>`).join('');
  const myIdx = PW_RANK.findIndex(r => r.num === me);
  const mine = (myIdx >= 5)
    ? `<div class="pw-rank-row me out"><span class="pw-rank-n">${myIdx + 1}</span>
       <span class="pw-rank-name">나</span><span class="pw-rank-s">${PW_RANK[myIdx].best}점</span></div>`
    : '';
  return `<div class="pw-rank"><div class="pw-rank-t">순위</div>${top}${mine}</div>`;
}

/* ── 진행 ── */
function pwStart(){
  PW = {
    t: 0, left: PW_TIME, score: 0, done: false,
    cells: Array.from({ length: PW_ROWS * PW_COLS }, () => ({ state: 'ok', since: 0, fx: null })),
    nextWilt: 1.0,
    res: { saved: 0, waste: 0, rot: 0 },
  };
  render();
  clearInterval(PW.timer);
  PW.timer = setInterval(pwTick, 100);
}

/* 시드는 간격 — 뒤로 갈수록 촘촘하게. 구간 경계에서 뚝 끊기지 않게 부드럽게 잇습니다.
     0–10초 1.4 · 10–20초 0.9 · 20–27초 0.55 · 27–30초 0.35
   마지막 3초는 손이 확 바빠지는 구간. */
const PW_CURVE = [[0,1.4],[10,0.9],[20,0.55],[27,0.35],[30,0.35]];
function _pwInterval(t){
  for(let i = 0; i < PW_CURVE.length - 1; i++){
    const [t0, v0] = PW_CURVE[i], [t1, v1] = PW_CURVE[i + 1];
    if(t < t1){
      const r = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * Math.max(0, Math.min(1, r));
    }
  }
  return PW_CURVE[PW_CURVE.length - 1][1];
}

// 같은 시각에 시들어 있을 수 있는 최대 개수 (구간별)
function _pwMaxWilt(t){
  if(t < 10) return 2;
  if(t < 20) return 3;
  if(t < 27) return 4;
  return 5;
}

function pwTick(){
  if(!PW || PW.done) return;
  PW.t += 0.1; PW.left -= 0.1;

  // 시들게 하기
  PW.nextWilt -= 0.1;
  if(PW.nextWilt <= 0){
    // 한꺼번에 너무 많이 시들어 손쓸 수 없게 되지 않도록 구간별 상한을 둡니다
    const wilting = PW.cells.filter(c => c.state === 'wilt').length;
    if(wilting < _pwMaxWilt(PW.t)){
      const ok = PW.cells.map((c, i) => c.state === 'ok' ? i : -1).filter(i => i >= 0);
      if(ok.length){
        const i = ok[Math.floor(Math.random() * ok.length)];
        PW.cells[i] = { state: 'wilt', since: PW.t, fx: null };
      }
    }
    PW.nextWilt = _pwInterval(PW.t);
  }

  // 썩기
  PW.cells.forEach((c, i) => {
    if(c.state === 'wilt' && PW.t - c.since >= PW_ROT){
      PW.score -= 2; PW.res.rot++;
      PW.cells[i] = { state: 'ok', since: PW.t, fx: 'rot' };
      setTimeout(() => { if(PW && PW.cells[i]) PW.cells[i].fx = null; _pwPaint(); }, 300);
    }
  });

  if(PW.left <= 0) return pwEnd();
  _pwPaint();
}

/* ⚠ 게임 중에는 render() 를 부르면 안 됩니다.
   0.1초마다 화면을 통째로 다시 그리면, 누르는 순간(mousedown~mouseup 사이)에
   버튼이 사라져서 click 이벤트가 아예 생기지 않습니다 — "클릭해도 물이 안 줘짐".
   그래서 진행 중에는 있는 DOM 의 값만 바꿔칩니다. */
function _pwPaint(){
  const grid = document.querySelector('.pw-grid');
  if(!grid || !PW || PW.done){ render(); return; }

  const scoreEl = document.querySelector('.pw-score');
  if(scoreEl) scoreEl.innerHTML = `${PW.score}<span>점</span>`;
  const leftEl = document.querySelector('.pw-left');
  if(leftEl) leftEl.innerHTML = `${Math.max(0, PW.left).toFixed(1)}<span>초</span>`;
  const barEl = document.querySelector('.pw-timebar i');
  if(barEl) barEl.style.width = (Math.max(0, PW.left) / PW_TIME * 100) + '%';

  const nodes = grid.children;
  PW.cells.forEach((c, i) => {
    const el = nodes[i];
    if(!el) return;
    el.classList.toggle('wilt', c.state === 'wilt');
    el.classList.toggle('fx-water', c.fx === 'water');
    el.classList.toggle('fx-miss',  c.fx === 'miss');
    el.classList.toggle('fx-rot',   c.fx === 'rot');

    let fuse = el.querySelector('.pw-fuse');
    if(c.state === 'wilt'){
      if(!fuse){ fuse = document.createElement('i'); fuse.className = 'pw-fuse'; el.appendChild(fuse); }
      fuse.style.width = Math.max(0, 1 - (PW.t - c.since) / PW_ROT) * 100 + '%';
    } else if(fuse){ fuse.remove(); }
  });
}

async function pwEnd(){
  clearInterval(PW.timer);
  PW.done = true; PW.left = 0;
  const score = PW.score;
  if(PW_BEST === null || score > PW_BEST){
    try {
      await saveGameScore(SEL_CLS.id, ST_USER.number, ST_USER.name, score);
      PW_BEST = Math.max(PW_BEST === null ? -999 : PW_BEST, score);
    } catch(e){ console.warn('[물주기] 점수 저장 실패:', e.message || e); }
  }
  render();
  pwLoadRank();
}

function pwHit(i){
  if(!PW || PW.done) return;
  const c = PW.cells[i];
  if(!c) return;
  if(c.state === 'wilt'){
    PW.score += 2; PW.res.saved++;
    PW.cells[i] = { state: 'ok', since: PW.t, fx: 'water' };
  } else {
    PW.score -= 1; PW.res.waste++;
    PW.cells[i] = { ...c, fx: 'miss' };
  }
  setTimeout(() => { if(PW && PW.cells[i]) { PW.cells[i].fx = null; _pwPaint(); } }, 200);
  _pwPaint();
}

async function pwLoadRank(){
  if(!SEL_CLS) return;
  PW_LOADING = true;
  try {
    const all = await loadGameScores(SEL_CLS.id);
    PW_RANK = Object.entries(all)
      .map(([num, v]) => ({ num, name: v.name, best: v.best || 0 }))
      .sort((a, b) => b.best - a.best);
    const me = PW_RANK.find(r => r.num === ST_USER?.number);
    if(me) PW_BEST = me.best;
    else if(PW_BEST === null) PW_BEST = null;
  } catch(e){ console.warn('[물주기] 순위 로드 실패:', e.message || e); }
  PW_LOADING = false;
  render();
}

function pwLeave(){
  if(PW?.timer) clearInterval(PW.timer);
  PW = null;
}

/* 선생님 발표 화면용 — 실시간 순위판 */
function pwBoardForTeacher(){
  const rows = PW_RANK.slice(0, 5).map((r, i) => `
    <div class="pwt-row">
      <span class="pwt-n">${i + 1}</span>
      <span class="pwt-name">${esc(r.name || r.num)}</span>
      <span class="pwt-s">${r.best}<i>점</i></span>
    </div>`).join('');
  return `<div class="pwt">
    <div class="pwt-title">🌿 식물 물 주기</div>
    <div class="pwt-sub">각자 화면에서 시작하세요 · 여러 번 도전할 수 있어요</div>
    <div class="pwt-rank">${rows || '<div class="pwt-empty">아직 기록이 없습니다</div>'}</div>
    <div class="pwt-cnt">참여 ${PW_RANK.length}명</div>
  </div>`;
}
