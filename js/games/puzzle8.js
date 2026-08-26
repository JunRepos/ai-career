/* ═══════════════════════════════════════
   games/puzzle8.js — 🧩 8퍼즐 맞추기

   4차시(문제 해결과 탐색) 몰입용 실습.
   탐색·트리 이야기는 하나도 하지 않습니다. 그냥 맞춰 보는 것만.

     · 목표 상태는 교과서와 같은  1 2 3 / 8 _ 4 / 7 6 5
     · 목표에서 무작위로 되돌려 섞으므로 항상 풀 수 있습니다
     · 몇 수 만에 맞췄는지로 순위 — 적을수록 좋음
     · 타일은 지우고 다시 그리지 않고 자리(transform)만 옮겨 미끄러지게 합니다

   ⚠ 진행 중에는 render() 를 부르지 않습니다. 다시 그리면 누르는 순간
     버튼이 사라져 클릭이 먹지 않습니다. 값만 갈아끼우는 _p8Paint() 를 씁니다.
═══════════════════════════════════════ */

const P8_GOAL     = [1, 2, 3, 8, 0, 4, 7, 6, 5];   // 0 = 빈칸
const P8_SHUFFLE  = 30;                            // 섞는 횟수

/* 순위 저장 — 공용 저장 함수가 '높을수록 좋음(최고 기록)' 이라서,
   적은 수가 좋은 이 게임은 1000에서 빼서 넣습니다. */
const P8_BASE     = 1000;
const p8ToScore   = moves => P8_BASE - moves;
const p8ToMoves   = score => P8_BASE - score;

let P8 = null;            // 진행 중 상태 (null = 대기 화면)
let P8_BEST = null;       // 내 최소 수
let P8_RANK = [];         // [{num,name,moves}]
let P8_LOADING = false;

/* ── 화면 ── */
function vPuzzle8(){
  if(!P8) return _p8Intro();
  if(P8.done) return _p8Result();
  return _p8Board();
}

function _p8MiniBoard(arr, cls){
  const cells = arr.map(v => v
    ? `<i class="p8-mini-t">${v}</i>`
    : `<i class="p8-mini-t blank"></i>`).join('');
  return `<div class="p8-mini${cls ? ' ' + cls : ''}">${cells}</div>`;
}

function _p8Intro(){
  const best = P8_BEST === null ? ''
    : `<div class="p8-best">내 최소 기록 <b>${P8_BEST}수</b></div>`;
  return `<div class="p8-wrap">
    <div class="p8-intro">
      <div class="p8-title">8퍼즐 맞추기</div>
      <div class="p8-lead">빈칸 옆의 타일을 눌러 밀어 넣으세요.<br>아래 모양으로 만들면 끝!</div>
      <div class="p8-goalbox">
        <div class="p8-goal-label">목표 모양</div>
        ${_p8MiniBoard(P8_GOAL, 'goal')}
      </div>
      ${best}
      <button class="p8-start" data-action="p8-start">${P8_BEST === null ? '시작하기' : '다시 도전'}</button>
      ${_p8RankHtml()}
    </div>
  </div>`;
}

function _p8Board(){
  /* 타일은 처음 한 번만 만들고, 그다음부터는 자리만 옮깁니다 */
  const tiles = [];
  for(let n = 1; n <= 8; n++){
    const s = P8.slot[n];
    tiles.push(`<button class="p8-tile" data-action="p8-move" data-n="${n}"
      style="--col:${s % 3};--row:${Math.floor(s / 3)}">${n}</button>`);
  }
  return `<div class="p8-wrap">
    <div class="p8-hud">
      <div class="p8-moves"><b>${P8.moves}</b><span>수</span></div>
      <div class="p8-time" id="p8-time">00:00</div>
      <button class="p8-reshuffle" data-action="p8-start">다시 섞기</button>
    </div>
    <div class="p8-board">${tiles.join('')}</div>
    <div class="p8-tip">빈칸 옆 타일을 누르면 밀려 들어갑니다</div>
    <div class="p8-goalmini">
      <span>목표</span>${_p8MiniBoard(P8_GOAL, 'goal tiny')}
    </div>
  </div>`;
}

function _p8Result(){
  const isBest = P8_BEST !== null && P8.moves <= P8_BEST;
  return `<div class="p8-wrap">
    <div class="p8-intro">
      <div class="p8-done">맞췄어요!</div>
      <div class="p8-final"><b>${P8.moves}</b><span>수</span></div>
      <div class="p8-stat"><span>걸린 시간 <b>${_p8Clock(P8.sec)}</b></span></div>
      ${isBest ? `<div class="p8-newbest">최소 기록을 세웠어요!</div>` : ''}
      <div class="p8-again-q">더 적은 수로도 맞출 수 있을까요?</div>
      <button class="p8-start" data-action="p8-start">다시 도전</button>
      ${_p8RankHtml()}
    </div>
  </div>`;
}

function _p8Clock(sec){
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
}

function _p8RankHtml(){
  if(P8_LOADING) return `<div class="p8-rank"><div class="p8-rank-t">순위</div><div class="p8-rank-empty">불러오는 중…</div></div>`;
  if(!P8_RANK.length) return `<div class="p8-rank"><div class="p8-rank-t">순위</div><div class="p8-rank-empty">아직 기록이 없어요. 첫 번째가 되어보세요!</div></div>`;
  const me = ST_USER?.number;
  const top = P8_RANK.slice(0, 5).map((r, i) => `
    <div class="p8-rank-row${r.num === me ? ' me' : ''}">
      <span class="p8-rank-n">${i + 1}</span>
      <span class="p8-rank-name">${esc(r.name || r.num)}</span>
      <span class="p8-rank-s">${r.moves}수</span>
    </div>`).join('');
  const myIdx = P8_RANK.findIndex(r => r.num === me);
  const mine = (myIdx >= 5)
    ? `<div class="p8-rank-row me out"><span class="p8-rank-n">${myIdx + 1}</span>
       <span class="p8-rank-name">나</span><span class="p8-rank-s">${P8_RANK[myIdx].moves}수</span></div>`
    : '';
  return `<div class="p8-rank"><div class="p8-rank-t">순위 <i>적은 수가 위로</i></div>${top}${mine}</div>`;
}

/* ── 진행 ── */

// slot[n] = 숫자 n 이 놓인 칸(0~8) · blank = 빈칸이 있는 칸
function _p8FromArray(arr){
  const slot = {};
  let blank = 0;
  arr.forEach((v, i) => { if(v) slot[v] = i; else blank = i; });
  return { slot, blank };
}

function _p8Neighbors(i){
  const r = Math.floor(i / 3), c = i % 3, out = [];
  if(r > 0) out.push(i - 3);
  if(r < 2) out.push(i + 3);
  if(c > 0) out.push(i - 1);
  if(c < 2) out.push(i + 1);
  return out;
}

/* 목표에서 무작위로 되돌려 섞습니다 — 이렇게 하면 항상 풀 수 있습니다 */
function _p8Shuffle(){
  const arr = P8_GOAL.slice();
  let blank = arr.indexOf(0), prev = -1;
  for(let k = 0; k < P8_SHUFFLE; k++){
    const cand = _p8Neighbors(blank).filter(i => i !== prev);
    const pick = cand[Math.floor(Math.random() * cand.length)];
    arr[blank] = arr[pick]; arr[pick] = 0;
    prev = blank; blank = pick;
  }
  return arr;
}

function p8Start(){
  let arr = _p8Shuffle();
  // 어쩌다 맞춰진 채로 시작하지 않게
  let guard = 0;
  while(_p8SolvedArray(arr) && guard++ < 10) arr = _p8Shuffle();

  const { slot, blank } = _p8FromArray(arr);
  clearInterval(P8?.timer);
  P8 = { slot, blank, moves: 0, sec: 0, done: false, timer: null };
  render();
  P8.timer = setInterval(_p8Tick, 1000);
}

function _p8SolvedArray(arr){
  return arr.every((v, i) => v === P8_GOAL[i]);
}

function _p8Solved(){
  for(let n = 1; n <= 8; n++) if(P8.slot[n] !== P8_GOAL.indexOf(n)) return false;
  return true;
}

function _p8Tick(){
  if(!P8 || P8.done) return;
  P8.sec++;
  const el = document.getElementById('p8-time');
  if(el) el.textContent = _p8Clock(P8.sec);
}

function p8Move(n){
  if(!P8 || P8.done) return;
  const s = P8.slot[n];
  if(s === undefined) return;
  if(!_p8Neighbors(P8.blank).includes(s)) return;    // 빈칸과 붙어 있지 않으면 못 움직임

  P8.slot[n] = P8.blank;
  P8.blank = s;
  P8.moves++;
  _p8Paint();

  if(_p8Solved()) p8End();
}

/* 진행 중에는 DOM 을 새로 만들지 않고 자리와 숫자만 갈아끼웁니다 */
function _p8Paint(){
  const board = document.querySelector('.p8-board');
  if(!board || !P8 || P8.done) return;
  for(let n = 1; n <= 8; n++){
    const el = board.querySelector(`.p8-tile[data-n="${n}"]`);
    if(!el) continue;
    const s = P8.slot[n];
    el.style.setProperty('--col', s % 3);
    el.style.setProperty('--row', Math.floor(s / 3));
  }
  const mv = document.querySelector('.p8-moves b');
  if(mv) mv.textContent = P8.moves;
}

async function p8End(){
  clearInterval(P8.timer);
  P8.done = true;

  if(SEL_CLS && ST_USER && (P8_BEST === null || P8.moves < P8_BEST)){
    try {
      await saveGameScore(SEL_CLS.id, ST_USER.number, ST_USER.name, p8ToScore(P8.moves), 'puzzle-8');
      P8_BEST = P8_BEST === null ? P8.moves : Math.min(P8_BEST, P8.moves);
    } catch(e){ console.warn('[8퍼즐] 기록 저장 실패:', e.message || e); }
  }
  render();
  p8LoadRank();
}

async function p8LoadRank(){
  if(!SEL_CLS) return;
  P8_LOADING = true;
  try {
    const all = await loadGameScores(SEL_CLS.id, 'puzzle-8');
    P8_RANK = Object.entries(all)
      .map(([num, v]) => ({ num, name: v.name, moves: p8ToMoves(v.best || 0) }))
      .sort((a, b) => a.moves - b.moves);
    const me = P8_RANK.find(r => r.num === ST_USER?.number);
    if(me) P8_BEST = me.moves;
  } catch(e){ console.warn('[8퍼즐] 순위 로드 실패:', e.message || e); }
  P8_LOADING = false;
  render();
}

function p8Leave(){
  if(P8?.timer) clearInterval(P8.timer);
  P8 = null;
}

/* 선생님 발표 화면용 — 실시간 순위판 */
function p8BoardForTeacher(){
  const rows = P8_RANK.slice(0, 5).map((r, i) => `
    <div class="pwt-row">
      <span class="pwt-n">${i + 1}</span>
      <span class="pwt-name">${esc(r.name || r.num)}</span>
      <span class="pwt-s">${r.moves}<i>수</i></span>
    </div>`).join('');
  return `<div class="pwt">
    <div class="pwt-title">🧩 8퍼즐 맞추기</div>
    <div class="pwt-sub">각자 화면에서 시작하세요 · 적은 수로 맞출수록 위로</div>
    <div class="pwt-rank">${rows || '<div class="pwt-empty">아직 기록이 없습니다</div>'}</div>
    <div class="pwt-cnt">참여 ${P8_RANK.length}명</div>
  </div>`;
}
