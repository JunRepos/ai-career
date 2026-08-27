/* ═══════════════════════════════════════
   games/hideseek.js — 🙈 숨바꼭질 · 이번엔 내가 숨는다

   5차시(지능적 탐색) 도입에서 앞 차시(맹목적 탐색)를 활동으로 닫습니다.

   술래는 컴퓨터입니다. 학생은 **숨습니다.** 술래가 어떤 순서로 올지는 미리 알려 줍니다.
     1라운드 — 술래가 너비 우선으로 온다
     2라운드 — 술래가 깊이 우선으로 온다 (같은 집)
     3라운드 — 술래 둘이 차례로 온다. 점수는 **더 빨리 잡힌 쪽**
   점수 = 잡히기까지 술래가 연 방의 수 (많을수록 좋음).

   ⚠ 오래 버티려면 머릿속으로 탐색 순서를 실제로 굴려야 합니다. 그게 노림수입니다.
     1라운드 정답(이불)을 2라운드에 그대로 쓰면 13 → 9 로 확 줄어듭니다.
     여기서 "두 순서가 다르구나"가 설명 없이 박힙니다.

   판은 verify/hideseek.mjs 로 검산했습니다. HS_ROOMS 를 고치면 **거기서 먼저 돌리세요.**
     1라운드 정답 이불(13) · 2라운드 정답 식탁(13) · 3라운드 정답 욕조(최악 11) · 만점 37

   ⚠ 술래가 움직이는 동안 render() 를 부르지 않습니다. 다시 그리면 누르는 순간
     버튼이 사라져 클릭이 먹지 않습니다. 값만 갈아끼웁니다.
═══════════════════════════════════════ */

/* 집 — 배열 순서가 곧 id 입니다(HS_ROOMS[id]). 형제 순서 = 배열에 적은 순서(왼쪽부터).
   자식이 없는 방이 '숨을 수 있는 곳' 입니다.
   ⚠ 오른쪽 갈래(부엌)를 얕게, 깊은 방(이불)을 가운데 갈래에 둔 것이 이 판의 핵심입니다.
     그래야 너비 우선 정답과 깊이 우선 정답이 서로 반대쪽이 됩니다. */
const HS_ROOMS = [
  { id:  0, name: '현관', ico: '🚪', parent: null },
  { id:  1, name: '거실', ico: '🛋️', parent: 0 },
  { id:  2, name: '복도', ico: '🚶', parent: 0 },
  { id:  3, name: '부엌', ico: '🍳', parent: 0 },
  { id:  4, name: '소파', ico: '🧸', parent: 1 },
  { id:  5, name: '커튼', ico: '🪟', parent: 1 },
  { id:  6, name: '안방', ico: '🛌', parent: 2 },
  { id:  7, name: '욕실', ico: '🚿', parent: 2 },
  { id:  8, name: '식탁', ico: '🍽', parent: 3 },
  { id:  9, name: '침대', ico: '🛏', parent: 6 },
  { id: 10, name: '옷장', ico: '🧥', parent: 6 },
  { id: 11, name: '욕조', ico: '🛁', parent: 7 },
  { id: 12, name: '이불', ico: '🧺', parent: 10 },
];

const HS_ROUNDS = [
  { modes: ['bfs'], label: '너비 우선 술래',
    tip: '술래는 <b>한 층을 남김없이</b> 열고 아래층으로 · 같은 층은 <b>왼쪽부터</b>' },
  { modes: ['dfs'], label: '깊이 우선 술래',
    tip: '술래는 <b>한 갈래를 끝까지</b> 내려가고, 막히면 <b>갈라졌던 자리로 되돌아와</b> 다음 갈래로' },
  { modes: ['bfs', 'dfs'], label: '술래 둘이 차례로',
    tip: '점수는 <b>더 빨리 잡힌 쪽</b>입니다 · 어느 술래가 와도 오래 버틸 곳은?' },
];

const HS_MODE_NAME = { bfs: '너비 우선', dfs: '깊이 우선' };
const HS_STEP_MS = 430;          // 술래가 방 하나 여는 데 걸리는 시간

let HS = null;                   // 진행 중 상태 (null = 대기 화면)
let HS_BEST = null;              // 내 최고 점수
let HS_RANK = [];                // [{num,name,score}]
let HS_TIMER = null;

/* ── 집 구조 ── */

const _hsKids = (() => {
  const k = {};
  HS_ROOMS.forEach(r => { if(r.parent !== null) (k[r.parent] ||= []).push(r.id); });
  return k;
})();
const hsKids = id => _hsKids[id] || [];
const hsLeaf = id => !hsKids(id).length;
const HS_HIDE = HS_ROOMS.filter(r => hsLeaf(r.id)).map(r => r.id);   // 숨을 수 있는 곳

const HS_DEPTH = (() => {
  const d = {};
  const go = id => d[id] ??= (HS_ROOMS[id].parent === null ? 0 : go(HS_ROOMS[id].parent) + 1);
  HS_ROOMS.forEach(r => go(r.id));
  return d;
})();
const HS_MAXD = Math.max(...HS_ROOMS.map(r => HS_DEPTH[r.id]));

/* 자리 — 잎부터 나눠 주고 부모는 자식들 가운데에 (덱 생성기의 tree 배치와 같은 방법) */
const HS_POS = (() => {
  let slot = 0; const col = {};
  (function place(id){
    const ch = hsKids(id);
    if(!ch.length){ col[id] = slot++; return; }
    ch.forEach(place);
    col[id] = (col[ch[0]] + col[ch[ch.length - 1]]) / 2;
  })(0);
  const cols = Math.max(1, slot - 1);
  const pos = {};
  HS_ROOMS.forEach(r => {
    pos[r.id] = { x: col[r.id] / cols * 100, y: HS_DEPTH[r.id] / HS_MAXD * 100 };
  });
  return pos;
})();

/* 술래가 방을 여는 순서 */
function hsOrder(mode){
  if(mode === 'bfs'){
    const q = [0], out = [];
    while(q.length){ const v = q.shift(); out.push(v); hsKids(v).forEach(c => q.push(c)); }
    return out;
  }
  const out = [];
  (function go(v){ out.push(v); hsKids(v).forEach(go); })(0);
  return out;
}
const HS_ORDER = { bfs: hsOrder('bfs'), dfs: hsOrder('dfs') };

// 그 자리에 숨었을 때 술래가 연 방의 수 (잡힌 방 포함)
const hsOpened = (mode, leaf) => HS_ORDER[mode].indexOf(leaf) + 1;
// 이 라운드에서 그 자리의 점수 — 술래가 여럿이면 가장 나쁜 쪽
const hsScoreAt = (r, leaf) => Math.min(...r.modes.map(m => hsOpened(m, leaf)));
// 이 라운드에서 가장 오래 버틸 수 있는 자리
const hsBestSpot = r => HS_HIDE.reduce((a, b) => hsScoreAt(r, b) > hsScoreAt(r, a) ? b : a);
const HS_MAX = HS_ROUNDS.reduce((s, r) => s + hsScoreAt(r, hsBestSpot(r)), 0);

/* ── 화면 ── */

function vHideSeek(){
  if(!HS) return _hsIntro();
  if(HS.over) return _hsResult();
  return _hsPlay();
}

function _hsIntro(){
  const best = HS_BEST === null ? ''
    : `<div class="hs-best">내 최고 기록 <b>${HS_BEST}개</b></div>`;
  const rules = HS_ROUNDS.map((r, i) => `
    <div class="hs-rule"><span class="hs-rule-n">${i + 1}</span>
      <div><b>${r.label}</b><br><i>${r.tip.replace(/<\/?b>/g, '')}</i></div></div>`).join('');
  return `<div class="hs-wrap">
    <div class="hs-intro">
      <div class="hs-title">숨바꼭질 — 이번엔 내가 숨는다</div>
      <div class="hs-lead">술래는 컴퓨터입니다. <b>어떤 순서로 방을 열지 미리 알려 줍니다.</b><br>
        그 순서를 머릿속으로 굴려서 <b>가장 늦게 걸릴 곳</b>에 숨으세요.</div>
      <div class="hs-rules">${rules}</div>
      <div class="hs-note">점수는 잡히기까지 <b>술래가 연 방의 수</b>. 많을수록 좋아요. (만점 ${HS_MAX})</div>
      ${best}
      <button class="hs-start" data-action="hs-start">${HS_BEST === null ? '시작하기' : '다시 도전'}</button>
      ${_hsRankHtml()}
    </div>
  </div>`;
}

function _hsRoomHtml(r){
  const p = HS_POS[r.id];
  const leaf = hsLeaf(r.id);
  const can = HS.phase === 'pick' && leaf;
  const cls = ['hs-room'];
  if(can) cls.push('hint');                        // 고를 수 있는 곳은 반짝입니다
  if(HS.hide === r.id) cls.push('mine');
  return `<button class="${cls.join(' ')}" style="left:${p.x}%;top:${p.y}%"
      ${can ? `data-action="hs-hide" data-room="${r.id}"` : ''} id="hs-r${r.id}">
      <i class="hs-ico">${HS.hide === r.id ? '🙋' : r.ico}</i>
      <span class="hs-name">${r.name}</span>
      <em class="hs-no"></em>
    </button>`;
}

function _hsLinesHtml(){
  const seg = HS_ROOMS.filter(r => r.parent !== null).map(r => {
    const a = HS_POS[r.parent], b = HS_POS[r.id];
    return `<line x1="${a.x * 10}" y1="${a.y * 10}" x2="${b.x * 10}" y2="${b.y * 10}"/>`;
  }).join('');
  return `<svg class="hs-lines" viewBox="0 0 1000 1000" preserveAspectRatio="none"
    aria-hidden="true">${seg}</svg>`;
}

function _hsPlay(){
  const R = HS_ROUNDS[HS.round];
  return `<div class="hs-wrap">
    <div class="hs-hud">
      <div class="hs-round"><b>${HS.round + 1}라운드</b><span>${R.label}</span></div>
      <div class="hs-miss">지금까지 <b id="hs-total">${HS.total}</b></div>
    </div>
    <div class="hs-tip">${R.tip}</div>
    <div class="hs-tree">
      <div class="hs-plane">
        ${_hsLinesHtml()}
        ${HS_ROOMS.map(_hsRoomHtml).join('')}
      </div>
    </div>
    <div class="hs-say" id="hs-say">어디에 숨을까요? <b>반짝이는 방</b> 중에서 고르세요</div>
    <div id="hs-after"></div>
  </div>`;
}

function _hsResult(){
  const isBest = HS_BEST !== null && HS.total >= HS_BEST;
  const rows = HS.done.map((d, i) => `
    <div class="hs-log-row">
      <span class="hs-log-l">${i + 1}R</span>
      <span class="hs-log-w">${HS_ROOMS[d.hide].name}</span>
      <span class="hs-log-s">${d.detail} → <b>${d.got}개</b></span>
    </div>`).join('');
  return `<div class="hs-wrap">
    <div class="hs-intro">
      <div class="hs-done">술래에게서 버틴 방의 수</div>
      <div class="hs-final">${HS.total}<span>/ ${HS_MAX}</span></div>
      ${isBest ? '<div class="hs-newbest">내 최고 기록!</div>' : ''}
      <div class="hs-log">${rows}</div>
      <div class="hs-note">같은 집인데 <b>라운드마다 가장 좋은 자리가 달랐습니다.</b>
        술래가 방을 여는 순서가 다르기 때문입니다.</div>
      <button class="hs-start" data-action="hs-start">다시 도전</button>
      ${_hsRankHtml()}
    </div>
  </div>`;
}

function _hsRankHtml(){
  const mine = HS_BEST != null
    ? `<div class="hs-rank-row me"><span class="hs-rank-n">나</span>
        <span class="hs-rank-name">내 최고</span>
        <span class="hs-rank-s">${HS_BEST}<i>개</i></span></div>` : '';
  if(!HS_RANK.length)
    return `<div class="hs-rank"><div class="hs-rank-t">순위 <i>많이 버틸수록 위</i></div>
      ${mine}<div class="hs-rank-empty">아직 기록이 없어요. 첫 번째가 되어보세요!</div></div>`;
  const rows = HS_RANK.slice(0, 10).map((x, i) => `
    <div class="hs-rank-row${x.num === ST_USER?.number ? ' me' : ''}">
      <span class="hs-rank-n">${i + 1}</span>
      <span class="hs-rank-name">${esc(x.name || x.num)}</span>
      <span class="hs-rank-s">${x.score}<i>개</i></span></div>`).join('');
  return `<div class="hs-rank"><div class="hs-rank-t">순위 <i>많이 버틸수록 위</i></div>${rows}</div>`;
}

/* ── 진행 ── */

function hsStart(){
  if(HS_TIMER){ clearTimeout(HS_TIMER); HS_TIMER = null; }
  HS = { round: 0, total: 0, phase: 'pick', hide: null, done: [], over: false };
  return HS;
}

/* 숨을 곳을 골랐다 → 술래가 온다 */
function hsHide(leaf){
  if(!HS || HS.phase !== 'pick' || !hsLeaf(leaf)) return;
  HS.hide = leaf;
  HS.phase = 'seek';
  HS.queue = HS_ROUNDS[HS.round].modes.slice();
  HS.runs = [];
  _hsLockRooms();
  _hsRunNextSeeker();
}

function _hsRunNextSeeker(){
  const mode = HS.queue.shift();
  if(mode === undefined) return _hsEndRound();
  const order = HS_ORDER[mode];
  _hsClearMarks();
  _hsSay(`<b>${HS_MODE_NAME[mode]}</b> 술래가 찾기 시작합니다…`);

  let i = 0;
  const tick = () => {
    const id = order[i];
    _hsMark(id, i + 1, id === HS.hide);
    if(id === HS.hide){
      HS.runs.push({ mode, opened: i + 1 });
      _hsSay(`<b>${HS_MODE_NAME[mode]}</b> 술래가 <b>${HS_ROOMS[id].name}</b>에서 찾았습니다 — <b>${i + 1}번째</b>`);
      HS_TIMER = setTimeout(_hsRunNextSeeker, 1200);
      return;
    }
    i++;
    HS_TIMER = setTimeout(tick, HS_STEP_MS);
  };
  HS_TIMER = setTimeout(tick, 520);
}

function _hsEndRound(){
  const R = HS_ROUNDS[HS.round];
  const got = Math.min(...HS.runs.map(x => x.opened));
  const detail = HS.runs.map(x => `${HS_MODE_NAME[x.mode]} ${x.opened}`).join(' · ');
  HS.total += got;
  HS.phase = 'done';
  HS.done.push({ hide: HS.hide, got, detail });

  const best = hsBestSpot(R);
  const bestScore = hsScoreAt(R, best);
  const perfect = HS.hide === best;
  const last = HS.round === HS_ROUNDS.length - 1;

  _hsPaint('hs-total', HS.total);
  const el = document.getElementById('hs-after');
  if(el) el.innerHTML = `
    <div class="hs-log">
      <div class="hs-log-row">
        <span class="hs-log-l">${HS.round + 1}R</span>
        <span class="hs-log-w">${HS_ROOMS[HS.hide].name}</span>
        <span class="hs-log-s">${detail} → <b>${got}개</b></span>
      </div>
    </div>
    <div class="hs-note">${perfect
      ? '이 라운드에서 <b>가장 오래 버틸 수 있는 자리</b>였습니다.'
      : `가장 오래 버틸 수 있던 곳은 <b>${HS_ROOMS[best].name}</b> (${bestScore}개) 였습니다.`}</div>
    <button class="hs-start" data-action="${last ? 'hs-finish' : 'hs-next'}">
      ${last ? '결과 보기' : '다음 라운드'}</button>`;
}

function hsNextRound(){
  if(!HS) return;
  HS.round++;
  HS.phase = 'pick';
  HS.hide = null;
  render();
}

/* ── 화면 갱신 — render() 대신 값만 갈아끼웁니다 ── */

function _hsSay(html){
  const el = document.getElementById('hs-say');
  if(el) el.innerHTML = html;
}
function _hsPaint(id, v){
  const el = document.getElementById(id);
  if(el) el.textContent = v;
}
function _hsMark(id, n, caught){
  const el = document.getElementById('hs-r' + id);
  if(!el) return;
  el.classList.add(caught ? 'found' : 'open');
  const no = el.querySelector('.hs-no');
  if(no) no.textContent = n;
}
function _hsClearMarks(){
  HS_ROOMS.forEach(r => {
    const el = document.getElementById('hs-r' + r.id);
    if(!el) return;
    el.classList.remove('open', 'found');
    const no = el.querySelector('.hs-no');
    if(no) no.textContent = '';
  });
}
/* 고르고 나면 더 못 고르게 — 내가 숨은 방만 표시해 둡니다 */
function _hsLockRooms(){
  HS_ROOMS.forEach(r => {
    const el = document.getElementById('hs-r' + r.id);
    if(!el) return;
    el.classList.remove('hint');
    el.removeAttribute('data-action');
    if(r.id === HS.hide){
      el.classList.add('mine');
      const ico = el.querySelector('.hs-ico');
      if(ico) ico.textContent = '🙋';
    }
  });
}

/* ── 끝내기 · 기록 ── */

async function hsFinish(){
  if(!HS) return;
  const score = HS.total;
  HS.over = true;
  if(SEL_CLS && ST_USER){
    try {
      /* 점수는 '많을수록 좋음' 이라 그대로 넣습니다 (8퍼즐처럼 뒤집지 않습니다) */
      await saveGameScore(SEL_CLS.id, ST_USER.number, ST_USER.name, score, 'hide-seek');
    } catch(e){ console.warn('[숨바꼭질] 기록 저장 실패:', e.message || e); }
  }
  render();                        // 결과 화면부터 먼저 (순위는 뒤늦게 와도 됩니다)
  await hsLoadRank();
}

function hsLeave(){
  if(HS_TIMER){ clearTimeout(HS_TIMER); HS_TIMER = null; }
  HS = null;
}

async function hsLoadRank(){
  if(!SEL_CLS){ render(); return; }
  try {
    const all = await loadGameScores(SEL_CLS.id, 'hide-seek');
    HS_RANK = Object.entries(all)
      .map(([num, v]) => ({ num, name: v.name, score: v.best || 0 }))
      .sort((a, b) => b.score - a.score);          // 많을수록 위
    const me = HS_RANK.find(r => r.num === ST_USER?.number);
    HS_BEST = me ? me.score : null;
  } catch(e){
    console.warn('[숨바꼭질] 순위 로드 실패:', e.message || e);
  }
  render();
}

/* 선생님 발표 화면용 — 실시간 순위판 */
function hsBoardForTeacher(){
  const rows = HS_RANK.slice(0, 5).map((r, i) => `
    <div class="pwt-row">
      <span class="pwt-n">${i + 1}</span>
      <span class="pwt-name">${esc(r.name || r.num)}</span>
      <span class="pwt-s">${r.score}<i>개</i></span>
    </div>`).join('');
  return `<div class="pwt">
    <div class="pwt-title">🙈 숨바꼭질 — 이번엔 내가 숨는다</div>
    <div class="pwt-sub">각자 화면에서 시작하세요 · 술래에게서 오래 버틸수록 위로 (만점 ${HS_MAX})</div>
    <div class="pwt-rank">${rows || '<div class="pwt-empty">아직 기록이 없습니다</div>'}</div>
    <div class="pwt-cnt">참여 ${HS_RANK.length}명</div>
  </div>`;
}
