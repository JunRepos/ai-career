/* ═══════════════════════════════════════
   games/hideseek.js — 🙈 숨바꼭질 · 방 찾기

   5차시(지능적 탐색) 도입에서 앞 차시(맹목적 탐색)를 손으로 굴려 보고 닫는 활동입니다.

     · 집이 트리로 이어져 있고 친구가 잎(소파·커튼·침대·옷장·욕조) 한 곳에 숨습니다
     · 1라운드는 너비 우선, 2라운드는 깊이 우선 순서로만 열 수 있습니다
     · 순서를 어기면 열리지 않고 왜 안 되는지 알려 줍니다 (어긴 횟수를 셉니다)
     · 기록 = 어긴 횟수(적을수록 좋음), 같으면 걸린 시간이 짧은 쪽

   순서·자리는 verify/hideseek.mjs 로 검산했습니다.
     너비 우선 — 현관 거실 복도 소파 커튼 안방 욕실 침대 옷장 욕조
     깊이 우선 — 현관 거실 소파 커튼 복도 안방 침대 옷장 욕실 욕조

   ⚠ 진행 중에는 render() 를 부르지 않습니다. 다시 그리면 누르는 순간
     버튼이 사라져 클릭이 먹지 않습니다. 값만 갈아끼우는 _hsPaint() 를 씁니다.
═══════════════════════════════════════ */

/* 집 — 배열 순서가 곧 id 입니다(ROOMS[id]). 형제 순서 = 배열에 적은 순서(왼쪽부터). */
const HS_ROOMS = [
  { id: 0, name: '현관', ico: '🚪', parent: null },
  { id: 1, name: '거실', ico: '🛋️', parent: 0 },
  { id: 2, name: '복도', ico: '🚶', parent: 0 },
  { id: 3, name: '소파', ico: '🛏', parent: 1 },
  { id: 4, name: '커튼', ico: '🪟', parent: 1 },
  { id: 5, name: '안방', ico: '🛌', parent: 2 },
  { id: 6, name: '욕실', ico: '🚿', parent: 2 },
  { id: 7, name: '침대', ico: '🛏', parent: 5 },
  { id: 8, name: '옷장', ico: '🧥', parent: 5 },
  { id: 9, name: '욕조', ico: '🛁', parent: 6 },
];

const HS_ROUNDS = [
  { mode: 'bfs', label: '너비 우선', tip: '한 층을 <b>남김없이</b> 열고 나서 아래층으로 · 같은 층은 <b>왼쪽부터</b>' },
  { mode: 'dfs', label: '깊이 우선', tip: '한 갈래를 <b>끝까지</b> 내려가고, 막히면 <b>갈라졌던 자리로 되돌아와</b> 다음 갈래로' },
];

/* 기록 — 공용 저장 함수가 '높을수록 좋음' 이라 어김·시간을 빼서 넣습니다.
   score = 100000 − 어김×1000 − 초   (어김 99 · 초 999 에서 자릅니다) */
const HS_BASE = 100000;
const hsToScore = (miss, sec) =>
  HS_BASE - Math.min(miss, 99) * 1000 - Math.min(sec, 999);
const hsFromScore = score => {
  const rest = HS_BASE - score;
  return { miss: Math.floor(rest / 1000), sec: rest % 1000 };
};

let HS = null;          // 진행 중 상태 (null = 대기 화면)
let HS_BEST = null;     // { miss, sec }
let HS_RANK = [];       // [{num,name,miss,sec}]
let HS_LOADING = false;

/* ── 집 구조 계산 ── */

const _hsKids = (() => {
  const k = {};
  HS_ROOMS.forEach(r => { if(r.parent !== null) (k[r.parent] ||= []).push(r.id); });
  return k;
})();
const hsKids  = id => _hsKids[id] || [];
const hsLeaf  = id => !hsKids(id).length;
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

/* ── 화면 ── */

function vHideSeek(){
  if(!HS) return _hsIntro();
  if(HS.done) return _hsResult();
  return _hsPlay();
}

function _hsIntro(){
  const best = HS_BEST === null ? ''
    : `<div class="hs-best">내 최고 기록 <b>어김 ${HS_BEST.miss}번</b> · ${_hsClock(HS_BEST.sec)}</div>`;
  return `<div class="hs-wrap">
    <div class="hs-intro">
      <div class="hs-title">숨바꼭질 — 방 찾기</div>
      <div class="hs-lead">친구가 이 집 어딘가에 숨었습니다.<br>
        <b>정해진 순서대로만</b> 열어서 친구를 찾으세요.</div>
      <div class="hs-rules">
        <div class="hs-rule"><span class="hs-rule-n">1</span>
          <div><b>1라운드 — 너비 우선</b><br><i>한 층을 다 열고 아래층으로</i></div></div>
        <div class="hs-rule"><span class="hs-rule-n">2</span>
          <div><b>2라운드 — 깊이 우선</b><br><i>한 갈래를 끝까지, 막히면 되돌아와서</i></div></div>
      </div>
      <div class="hs-note">순서를 어기면 문이 <b>안 열립니다.</b> 어긴 횟수가 적을수록 좋은 기록이에요.</div>
      ${best}
      <button class="hs-start" data-action="hs-start">${HS_BEST === null ? '시작하기' : '다시 도전'}</button>
      ${_hsRankHtml()}
    </div>
  </div>`;
}

function _hsRoomHtml(r){
  const p = HS_POS[r.id];
  const cls = ['hs-room'];
  if(HS && HS.opened.has(r.id)) cls.push('open');
  if(HS && HS.found === r.id) cls.push('found');
  if(HS && HS.hint && HS.order[HS.step] === r.id) cls.push('hint');
  const face = (HS && HS.found === r.id) ? '🙋' : r.ico;
  return `<button class="${cls.join(' ')}" data-action="hs-open" data-id="${r.id}"
    style="left:${p.x}%;top:${p.y}%">
      <i class="hs-ico">${face}</i><span class="hs-name">${r.name}</span>
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
      <div class="hs-miss">어김 <b>${HS.miss}</b></div>
      <div class="hs-time" id="hs-time">${_hsClock(HS.sec)}</div>
    </div>
    <div class="hs-tip">${R.tip}</div>
    <div class="hs-tree">
      <div class="hs-plane">
        ${_hsLinesHtml()}
        ${HS_ROOMS.map(_hsRoomHtml).join('')}
      </div>
    </div>
    <div class="hs-say" id="hs-say">${HS.step === 0
      ? '<b>현관</b>부터 열어 보세요'
      : `지금까지 <b>${HS.step}곳</b> 열었어요`}</div>
  </div>`;
}

function _hsResult(){
  const isBest = HS_BEST !== null
    && (HS.miss < HS_BEST.miss || (HS.miss === HS_BEST.miss && HS.sec <= HS_BEST.sec));
  const rows = HS.log.map(g => `
    <div class="hs-log-row">
      <span class="hs-log-l">${HS_ROUNDS[g.round].label}</span>
      <span class="hs-log-w">${HS_ROOMS[g.hide].name}</span>
      <span class="hs-log-s"><b>${g.opens}</b>번째에 찾음 · 어김 <b>${g.miss}</b></span>
    </div>`).join('');
  return `<div class="hs-wrap">
    <div class="hs-intro">
      <div class="hs-done">두 라운드 끝!</div>
      <div class="hs-final"><b>${HS.miss}</b><span>번 어김</span></div>
      <div class="hs-stat">걸린 시간 <b>${_hsClock(HS.sec)}</b></div>
      ${isBest ? '<div class="hs-newbest">최고 기록을 세웠어요!</div>' : ''}
      <div class="hs-log">${rows}</div>
      <button class="hs-start" data-action="hs-start">다시 도전</button>
      ${_hsRankHtml()}
    </div>
  </div>`;
}

function _hsClock(sec){
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
}

function _hsRankHtml(){
  if(HS_LOADING)
    return `<div class="hs-rank"><div class="hs-rank-t">순위</div><div class="hs-rank-empty">불러오는 중…</div></div>`;
  if(!HS_RANK.length)
    return `<div class="hs-rank"><div class="hs-rank-t">순위</div><div class="hs-rank-empty">아직 기록이 없어요. 첫 번째가 되어보세요!</div></div>`;
  const me = ST_USER?.number;
  const row = (r, i) => `
    <div class="hs-rank-row${r.num === me ? ' me' : ''}">
      <span class="hs-rank-n">${i + 1}</span>
      <span class="hs-rank-name">${esc(r.name || r.num)}</span>
      <span class="hs-rank-s">어김 ${r.miss}<i> · ${_hsClock(r.sec)}</i></span>
    </div>`;
  const top = HS_RANK.slice(0, 5).map(row).join('');
  const myIdx = HS_RANK.findIndex(r => r.num === me);
  const mine = myIdx >= 5
    ? `<div class="hs-rank-row me out"><span class="hs-rank-n">${myIdx + 1}</span>
       <span class="hs-rank-name">나</span>
       <span class="hs-rank-s">어김 ${HS_RANK[myIdx].miss}<i> · ${_hsClock(HS_RANK[myIdx].sec)}</i></span></div>`
    : '';
  return `<div class="hs-rank"><div class="hs-rank-t">순위 <i>어김이 적을수록 위로</i></div>${top}${mine}</div>`;
}

/* ── 진행 ── */

function hsStart(){
  clearInterval(HS?.timer);
  HS = { round: -1, miss: 0, sec: 0, done: false, timer: null, log: [] };
  _hsNextRound();
  HS.timer = setInterval(_hsTick, 1000);
}

function _hsNextRound(){
  HS.round++;
  const R = HS_ROUNDS[HS.round];
  HS.order  = hsOrder(R.mode);
  HS.hide   = HS_HIDE[Math.floor(Math.random() * HS_HIDE.length)];
  HS.opened = new Set();
  HS.step   = 0;
  HS.found  = null;
  HS.hint   = false;
  HS.rmiss  = 0;            // 이번 라운드에서 어긴 횟수
  render();
}

function _hsTick(){
  if(!HS || HS.done) return;
  HS.sec++;
  const el = document.getElementById('hs-time');
  if(el) el.textContent = _hsClock(HS.sec);
}

function hsOpen(id){
  if(!HS || HS.done || HS.found !== null) return;
  const need = HS.order[HS.step];

  if(id !== need){                       // ── 순서를 어겼다 ──
    HS.miss++; HS.rmiss++;
    if(HS.rmiss >= 2) HS.hint = true;    // 두 번 어기면 다음에 열 곳을 알려 줍니다
    _hsSay(_hsWhyNot(id, need), true);
    _hsShake(id);
    _hsPaint();
    return;
  }

  HS.opened.add(id);
  HS.step++;
  if(id === HS.hide){                    // ── 찾았다 ──
    HS.found = id;
    _hsPaint();
    _hsSay(`<b>${HS_ROOMS[id].name}</b>에 있었어요! <b>${HS.step}번째</b>에 찾았습니다`, false);
    HS.log.push({ round: HS.round, hide: HS.hide, opens: HS.step, miss: HS.rmiss });
    setTimeout(_hsAfterRound, 1400);
    return;
  }
  _hsPaint();
  _hsSay(`<b>${HS_ROOMS[id].name}</b> — 없네요. 다음 곳을 여세요`, false);
}

/* 왜 못 여는지 — 학생이 규칙을 스스로 고칠 수 있게 이유를 말해 줍니다 */
function _hsWhyNot(id, need){
  if(HS.opened.has(id)) return '이미 열어 본 곳이에요';
  if(HS.step === 0) return '두 방법 모두 <b>현관</b>부터 시작합니다';
  const mode = HS_ROUNDS[HS.round].mode;
  if(mode === 'bfs'){
    if(HS_DEPTH[id] > HS_DEPTH[need]) return '아직 <b>윗층</b>이 남았어요 — 한 층을 다 열고 내려갑니다';
    if(HS_DEPTH[id] < HS_DEPTH[need]) return '그 층은 이미 다 봤어요 — <b>아래층</b>으로 내려갑니다';
    return '같은 층에서는 <b>왼쪽부터</b> 열어요';
  }
  if(HS_ROOMS[id].parent !== null && !HS.opened.has(HS_ROOMS[id].parent))
    return '거기로 가는 <b>길목</b>을 아직 안 열었어요';
  return '내려가던 갈래를 <b>끝까지</b> 먼저 가고, 막히면 갈라졌던 자리로 되돌아옵니다';
}

function _hsAfterRound(){
  if(!HS || HS.done) return;
  if(HS.round + 1 < HS_ROUNDS.length){ _hsNextRound(); return; }
  hsEnd();
}

/* 진행 중에는 DOM 을 새로 만들지 않고 상태만 갈아끼웁니다 */
function _hsPaint(){
  if(!HS || HS.done) return;
  for(const r of HS_ROOMS){
    const el = document.querySelector(`.hs-room[data-id="${r.id}"]`);
    if(!el) continue;
    const isOpen = HS.opened.has(r.id), isFound = HS.found === r.id;
    el.classList.toggle('open', isOpen);
    el.classList.toggle('found', isFound);
    el.classList.toggle('hint', !!HS.hint && HS.order[HS.step] === r.id && !isFound);
    const ico = el.querySelector('.hs-ico');
    if(ico) ico.textContent = isFound ? '🙋' : r.ico;
    const no = el.querySelector('.hs-no');
    if(no) no.textContent = isOpen ? [...HS.opened].indexOf(r.id) + 1 : '';
  }
  const m = document.querySelector('.hs-miss b');
  if(m) m.textContent = HS.miss;
}

function _hsSay(html, bad){
  const el = document.getElementById('hs-say');
  if(!el) return;
  el.innerHTML = html;
  el.classList.toggle('bad', !!bad);
}

function _hsShake(id){
  const el = document.querySelector(`.hs-room[data-id="${id}"]`);
  if(!el) return;
  el.classList.add('no');
  setTimeout(() => el.classList.remove('no'), 340);
}

async function hsEnd(){
  clearInterval(HS.timer);
  HS.done = true;

  const better = HS_BEST === null
    || HS.miss < HS_BEST.miss
    || (HS.miss === HS_BEST.miss && HS.sec < HS_BEST.sec);
  if(SEL_CLS && ST_USER && better){
    try {
      await saveGameScore(SEL_CLS.id, ST_USER.number, ST_USER.name,
        hsToScore(HS.miss, HS.sec), 'hide-seek');
      HS_BEST = { miss: HS.miss, sec: HS.sec };
    } catch(e){ console.warn('[숨바꼭질] 기록 저장 실패:', e.message || e); }
  }
  render();
  hsLoadRank();
}

async function hsLoadRank(){
  if(!SEL_CLS) return;
  HS_LOADING = true;
  try {
    const all = await loadGameScores(SEL_CLS.id, 'hide-seek');
    HS_RANK = Object.entries(all)
      .map(([num, v]) => ({ num, name: v.name, ...hsFromScore(v.best || 0) }))
      .sort((a, b) => a.miss - b.miss || a.sec - b.sec);
    const me = HS_RANK.find(r => r.num === ST_USER?.number);
    if(me) HS_BEST = { miss: me.miss, sec: me.sec };
  } catch(e){ console.warn('[숨바꼭질] 순위 로드 실패:', e.message || e); }
  HS_LOADING = false;
  render();
}

function hsLeave(){
  if(HS?.timer) clearInterval(HS.timer);
  HS = null;
}

/* 선생님 발표 화면용 — 실시간 순위판 */
function hsBoardForTeacher(){
  const rows = HS_RANK.slice(0, 5).map((r, i) => `
    <div class="pwt-row">
      <span class="pwt-n">${i + 1}</span>
      <span class="pwt-name">${esc(r.name || r.num)}</span>
      <span class="pwt-s">${r.miss}<i>번 어김</i></span>
    </div>`).join('');
  return `<div class="pwt">
    <div class="pwt-title">🙈 숨바꼭질 · 방 찾기</div>
    <div class="pwt-sub">각자 화면에서 시작하세요 · 순서를 적게 어길수록 위로</div>
    <div class="pwt-rank">${rows || '<div class="pwt-empty">아직 기록이 없습니다</div>'}</div>
    <div class="pwt-cnt">참여 ${HS_RANK.length}명</div>
  </div>`;
}
