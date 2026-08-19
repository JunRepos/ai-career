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
      <button class="pw-start" data-action="pw-start">다시 도전</button>
      ${_pwRankHtml()}
    </div>
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

// 남은 시간에 따라 시드는 간격을 좁힘 — 마지막 10초는 에임 테스트처럼
function _pwInterval(t){
  if(t < 10) return 1.8;
  if(t < 20) return 1.0;
  return 0.45;
}

function pwTick(){
  if(!PW || PW.done) return;
  PW.t += 0.1; PW.left -= 0.1;

  // 시들게 하기
  PW.nextWilt -= 0.1;
  if(PW.nextWilt <= 0){
    const ok = PW.cells.map((c, i) => c.state === 'ok' ? i : -1).filter(i => i >= 0);
    if(ok.length){
      const i = ok[Math.floor(Math.random() * ok.length)];
      PW.cells[i] = { state: 'wilt', since: PW.t, fx: null };
    }
    PW.nextWilt = _pwInterval(PW.t);
  }

  // 썩기
  PW.cells.forEach((c, i) => {
    if(c.state === 'wilt' && PW.t - c.since >= PW_ROT){
      PW.score -= 2; PW.res.rot++;
      PW.cells[i] = { state: 'ok', since: PW.t, fx: 'rot' };
      setTimeout(() => { if(PW && PW.cells[i]) PW.cells[i].fx = null; }, 300);
    }
  });

  if(PW.left <= 0) return pwEnd();
  if(ST_TAB === 'slides' || VIEW === 'student') render();
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
  setTimeout(() => { if(PW && PW.cells[i]) { PW.cells[i].fx = null; } }, 200);
  render();
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
