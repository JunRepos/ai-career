/* ═══════════════════════════════════════
   games/puzzle8.js — 🧩 8퍼즐 탐색 활동

   4~5차시(맹목적 탐색) 복습용. 학습지 앞면과 **같은 판**을 씁니다.

     · 초기 상태  _ 1 3 / 8 2 4 / 7 6 5      (학습지 판)
     · 목표 상태  1 2 3 / 8 _ 4 / 7 6 5      (교과서 목표)
     · 최단 2수 — 오른쪽 → 아래쪽            (슬라이드 '학습지 앞면 답' 과 같음)

   흐름
     ① 대기   — 초기 상태·목표 상태를 나란히 보여주고 [시작하기]
     ② 진행   — '몇 번째 이동' 과 빈칸이 간 방향을 쌓아 보여줍니다.
                직전 상태로 돌아가면 그 이동을 지웁니다(롤백).
     ③ 완료   — 지나온 상태를 **탐색 트리**로 그립니다.
                노드마다 판, 간선에 빈칸이 간 방향, 내 경로는 굵게.

   ⚠ 그리는 방식 (2026-08-31 에 갈아엎음)
     예전에는 타일을 transform 으로 옮기고 document 전체에서 판을 찾아 값만
     갈아끼웠습니다. 그러다 **내부 상태와 화면이 어긋나** 타일이 남을 뛰어넘고
     '수'가 0에 멈추는 일이 생겼습니다.
     지금은 상태가 바뀔 때마다 **#p8-app 안을 통째로 다시 그립니다.**
     화면은 언제나 상태에서 나옵니다. 문서 전체를 훑는 선택자를 쓰지 마세요.
     (진행 중 render() 를 부르지 않는 규칙은 그대로입니다 — 이 게임 칸만 다시 그립니다)
═══════════════════════════════════════ */

const P8_START = [0, 1, 3, 8, 2, 4, 7, 6, 5];   // 0 = 빈칸 · 학습지 앞면 초기 상태
const P8_GOAL  = [1, 2, 3, 8, 0, 4, 7, 6, 5];   // 교과서 목표 상태

/* 순위 저장 — 공용 저장 함수가 '높을수록 좋음(최고 기록)' 이라서,
   적은 수가 좋은 이 게임은 1000에서 빼서 넣습니다. */
const P8_BASE     = 1000;
const p8ToScore   = moves => P8_BASE - moves;
const p8ToMoves   = score => P8_BASE - score;

let P8 = null;            // 진행 중 상태 (null = 대기 화면)
let P8_BEST = null;       // 내 최소 이동 횟수
let P8_RANK = [];         // [{num,name,moves}]
let P8_LOADING = false;

/* ── 판 다루기 ── */

const _p8Key = b => b.join('');
const _p8Same = (a, b) => _p8Key(a) === _p8Key(b);

/* 빈칸이 갈 수 있는 곳 — [옮겨올 타일의 칸, 빈칸이 가는 방향] */
function _p8Moves(board){
  const z = board.indexOf(0), r = Math.floor(z / 3), c = z % 3, out = [];
  if(r > 0) out.push([z - 3, '위쪽']);
  if(r < 2) out.push([z + 3, '아래쪽']);
  if(c > 0) out.push([z - 1, '왼쪽']);
  if(c < 2) out.push([z + 1, '오른쪽']);
  return out;
}

/* 그 칸의 타일을 빈칸으로 밀었을 때의 새 판 */
function _p8Apply(board, from){
  const z = board.indexOf(0), b = board.slice();
  b[z] = b[from]; b[from] = 0;
  return b;
}

/* 지금 판에서 이 칸을 누를 수 있나 — 빈칸과 붙어 있어야 합니다 */
function _p8CanMove(board, i){
  return _p8Moves(board).some(([from]) => from === i);
}

/* ── 화면 ── */

function vPuzzle8(){
  return `<div class="p8-wrap" id="p8-app">${_p8Inner()}</div>`;
}

function _p8Inner(){
  if(!P8) return _p8Intro();
  if(P8.done) return _p8Result();
  return _p8Playing();
}

/* 게임 칸만 다시 그립니다 — 앱 전체 render() 는 부르지 않습니다 */
function _p8Repaint(){
  const app = document.getElementById('p8-app');
  if(app) app.innerHTML = _p8Inner();
}

/* 판 하나 그리기 — size: 'big'(플레이) · 'mid'(초기/목표) · 'mini'(트리 옆) */
function _p8BoardHtml(board, opt){
  const o = opt || {};
  const cells = board.map((v, i) => {
    if(!v) return `<i class="p8-cell blank"></i>`;
    const can  = o.play && _p8CanMove(board, i);
    const attr = can ? ` data-action="p8-move" data-i="${i}"` : '';
    return `<${can ? 'button' : 'i'} class="p8-cell${can ? ' can' : ''}"${attr}>${v}</${can ? 'button' : 'i'}>`;
  }).join('');
  return `<div class="p8-grid ${o.size || 'mid'}${o.play ? ' play' : ''}">${cells}</div>`;
}

function _p8Intro(){
  const best = P8_BEST === null ? ''
    : `<div class="p8-best">내 최소 기록 <b>${P8_BEST}번</b></div>`;
  return `<div class="p8-intro">
    <div class="p8-title">8퍼즐 — 초기 상태에서 목표 상태로</div>
    <div class="p8-pair">
      <div class="p8-pair-one">
        <div class="p8-pair-label">초기 상태</div>
        ${_p8BoardHtml(P8_START, { size: 'mid' })}
      </div>
      <div class="p8-pair-arrow">→</div>
      <div class="p8-pair-one">
        <div class="p8-pair-label goal">목표 상태</div>
        ${_p8BoardHtml(P8_GOAL, { size: 'mid' })}
      </div>
    </div>
    <div class="p8-lead">빈칸과 <b>붙어 있는</b> 타일을 누르면 빈칸으로 밀려 들어갑니다</div>
    ${best}
    <button class="p8-start" data-action="p8-start">${P8_BEST === null ? '시작하기' : '다시 도전'}</button>
    ${_p8RankHtml()}
  </div>`;
}

/* 지금까지의 이동 — 1번째, 2번째 … 되돌아가면 뒤에서부터 지워집니다 */
function _p8StepsHtml(){
  const rows = P8.path.slice(1).map((n, i) =>
    `<div class="p8-step${i === P8.path.length - 2 ? ' now' : ''}">
       <span class="p8-step-n">${i + 1}번째 이동</span>
       <span class="p8-step-d">빈칸을 <b>${n.dir}</b>으로</span>
     </div>`).join('');
  const roll = P8.rolledBack
    ? `<div class="p8-rollback">되돌아왔습니다 — ${P8.rolledBack}번째 이동을 지웠습니다</div>` : '';
  return `<div class="p8-steps">
    <div class="p8-steps-head">${P8.path.length}번째 이동을 할 차례</div>
    ${rows || '<div class="p8-steps-none">아직 옮기지 않았습니다</div>'}
    ${roll}
  </div>`;
}

function _p8Playing(){
  const cur = P8.path[P8.path.length - 1].board;
  return `<div class="p8-hud">
      <div class="p8-turn"><b>${P8.path.length}</b><span>번째 이동</span></div>
      <div class="p8-time" id="p8-time">${_p8Clock(P8.sec)}</div>
      <button class="p8-reshuffle" data-action="p8-start">처음부터</button>
    </div>
    <div class="p8-play">
      <div class="p8-play-main">
        ${_p8BoardHtml(cur, { size: 'big', play: true })}
        <div class="p8-tip">빈칸과 <b>붙어 있는</b> 타일만 눌립니다 · 총 ${P8.total}번 옮김</div>
      </div>
      <div class="p8-play-side">
        <div class="p8-goalbox">
          <div class="p8-pair-label goal">목표 상태</div>
          ${_p8BoardHtml(P8_GOAL, { size: 'mini' })}
        </div>
        ${_p8StepsHtml()}
      </div>
    </div>`;
}

function _p8Result(){
  const isBest = P8_BEST !== null && P8.total <= P8_BEST;
  return `<div class="p8-intro">
      <div class="p8-done">목표 상태를 만들었습니다</div>
      <div class="p8-final"><b>${P8.path.length - 1}</b><span>수 경로</span>
        <em>총 ${P8.total}번 옮김 · ${_p8Clock(P8.sec)}</em></div>
      ${isBest ? `<div class="p8-newbest">가장 적은 횟수예요</div>` : ''}
    </div>
    <div class="p8-treebox">
      <div class="p8-tree-title">내가 지나온 탐색 트리</div>
      <div class="p8-tree-lead">간선에 적힌 것은 <b>빈칸이 간 방향</b>입니다 ·
        <span class="p8-tree-key"><i class="on"></i>초기 상태에서 목표 상태까지의 경로</span></div>
      <div class="p8-tree-scroll">${_p8TreeSvg()}</div>
    </div>
    <div class="p8-intro">
      <button class="p8-start" data-action="p8-start">다시 도전</button>
      ${_p8RankHtml()}
    </div>`;
}

function _p8Clock(sec){
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
}

/* ── 탐색 트리 그리기 ── */

const P8_NODE = 62;    // 노드(작은 판) 한 변
const P8_GAPX = 26;    // 옆 노드와의 사이
const P8_ROWH = 118;   // 깊이 한 층

/* 자식들을 넣은 순서대로 늘어놓고, 부모는 자식들 가운데에 둡니다 */
function _p8Layout(){
  const kids = k => P8.order.filter(x => P8.tree[x].parent === k);
  const pos = {};
  let cursor = 0;

  const place = (k, depth) => {
    const cs = kids(k);
    if(!cs.length){
      pos[k] = { x: cursor + P8_NODE / 2, y: depth * P8_ROWH };
      cursor += P8_NODE + P8_GAPX;
      return pos[k].x;
    }
    const xs = cs.map(c => place(c, depth + 1));
    pos[k] = { x: (xs[0] + xs[xs.length - 1]) / 2, y: depth * P8_ROWH };
    return pos[k].x;
  };
  place(P8.order[0], 0);

  const maxDepth = Math.max(...P8.order.map(k => P8.tree[k].depth));
  return { pos, w: cursor + P8_GAPX, h: maxDepth * P8_ROWH + P8_NODE + 34 };
}

/* 노드 하나 — 3×3 판 */
function _p8NodeSvg(board, x, y, on){
  const c = P8_NODE / 3;
  const cells = board.map((v, i) => {
    const cx = x + (i % 3) * c, cy = y + Math.floor(i / 3) * c;
    return `<rect x="${cx}" y="${cy}" width="${c}" height="${c}"
              class="p8n-cell${v ? '' : ' blank'}"/>` +
      (v ? `<text x="${cx + c / 2}" y="${cy + c / 2}" class="p8n-t">${v}</text>` : '');
  }).join('');
  return `<g class="p8n${on ? ' on' : ''}">
    <rect x="${x}" y="${y}" width="${P8_NODE}" height="${P8_NODE}" class="p8n-box"/>
    ${cells}
  </g>`;
}

function _p8TreeSvg(){
  const { pos, w, h } = _p8Layout();
  const onPath = new Set(P8.path.map(n => n.key));

  const edges = P8.order.filter(k => P8.tree[k].parent).map(k => {
    const n = P8.tree[k], p = pos[n.parent], q = pos[k];
    const on = onPath.has(k) && onPath.has(n.parent);
    const x1 = p.x, y1 = p.y + P8_NODE, x2 = q.x, y2 = q.y;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="p8e${on ? ' on' : ''}"/>
      <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2}" class="p8e-t${on ? ' on' : ''}">${n.dir}</text>`;
  }).join('');

  const nodes = P8.order.map(k => {
    const n = P8.tree[k], p = pos[k];
    const x = p.x - P8_NODE / 2;
    let tag = '';
    if(!n.parent)             tag = `<text x="${p.x}" y="${p.y - 9}" class="p8n-tag">초기 상태</text>`;
    else if(_p8Same(n.board, P8_GOAL)) tag = `<text x="${p.x}" y="${p.y + P8_NODE + 17}" class="p8n-tag goal">목표 상태</text>`;
    return tag + _p8NodeSvg(n.board, x, p.y, onPath.has(k));
  }).join('');

  return `<svg class="p8-tree" viewBox="0 -16 ${w} ${h}" width="${w}" height="${h}"
      xmlns="http://www.w3.org/2000/svg">${edges}${nodes}</svg>`;
}

/* ── 순위 ── */

function _p8RankHtml(){
  if(P8_LOADING) return `<div class="p8-rank"><div class="p8-rank-empty">기록을 불러오는 중…</div></div>`;
  if(!P8_RANK.length) return '';
  const rows = P8_RANK.slice(0, 10).map((r, i) => `
    <div class="p8-rank-row${r.num === ST_USER?.number ? ' me' : ''}">
      <span class="p8-rank-n">${i + 1}</span>
      <span class="p8-rank-name">${esc(r.name || r.num)}</span>
      <span class="p8-rank-s">${r.moves}<i>번</i></span>
    </div>`).join('');
  return `<div class="p8-rank">
    <div class="p8-rank-head">적게 옮긴 순서</div>${rows}</div>`;
}

/* ── 진행 ── */

function p8Start(){
  clearInterval(P8?.timer);
  const key = _p8Key(P8_START);
  P8 = {
    tree: { [key]: { board: P8_START.slice(), parent: null, dir: null, depth: 0 } },
    order: [key],                                   // 트리에 넣은 순서
    path:  [{ key, board: P8_START.slice(), dir: null }],   // 초기 상태 → 지금까지
    total: 0, sec: 0, done: false, rolledBack: 0, timer: null,
  };
  _p8Repaint();
  P8.timer = setInterval(_p8Tick, 1000);
}

function _p8Tick(){
  if(!P8 || P8.done) return;
  P8.sec++;
  const el = document.getElementById('p8-time');   // 시간 글자만 갈아끼웁니다
  if(el) el.textContent = _p8Clock(P8.sec);
}

/* 그 칸의 타일을 눌렀습니다 — 빈칸과 붙어 있어야 움직입니다 */
function p8Move(i){
  if(!P8 || P8.done) return;
  const cur = P8.path[P8.path.length - 1].board;
  const hit = _p8Moves(cur).find(([from]) => from === i);
  if(!hit) return;                                  // 붙어 있지 않으면 아무 일도 없음

  const [from, dir] = hit;
  const next = _p8Apply(cur, from);
  const key  = _p8Key(next);
  P8.total++;
  P8.rolledBack = 0;

  // ① 직전 상태로 되돌아갔으면 마지막 이동을 지웁니다(롤백)
  if(P8.path.length >= 2 && P8.path[P8.path.length - 2].key === key){
    P8.rolledBack = P8.path.length - 1;
    P8.path.pop();
  }
  // ② 이미 지나온 상태면 그 노드까지의 경로로 돌아갑니다
  else if(P8.tree[key]){
    P8.path = _p8PathTo(key);
  }
  // ③ 처음 보는 상태 — 트리에 새 노드로 답니다
  else {
    const parent = P8.path[P8.path.length - 1].key;
    P8.tree[key] = { board: next, parent, dir, depth: P8.tree[parent].depth + 1 };
    P8.order.push(key);
    P8.path.push({ key, board: next, dir });
  }

  if(_p8Same(next, P8_GOAL)){ p8End(); return; }
  _p8Repaint();
}

/* 트리에서 루트까지 거슬러 올라가 경로를 만듭니다 */
function _p8PathTo(key){
  const out = [];
  for(let k = key; k; k = P8.tree[k].parent){
    const n = P8.tree[k];
    out.unshift({ key: k, board: n.board, dir: n.dir });
  }
  return out;
}

async function p8End(){
  clearInterval(P8.timer);
  P8.done = true;

  if(SEL_CLS && ST_USER && (P8_BEST === null || P8.total < P8_BEST)){
    try {
      await saveGameScore(SEL_CLS.id, ST_USER.number, ST_USER.name, p8ToScore(P8.total), 'puzzle-8');
      P8_BEST = P8_BEST === null ? P8.total : Math.min(P8_BEST, P8.total);
    } catch(e){ console.warn('[8퍼즐] 기록 저장 실패:', e.message || e); }
  }
  _p8Repaint();
  p8LoadRank();
}

async function p8LoadRank(){
  if(!SEL_CLS) return;
  P8_LOADING = true;
  _p8Repaint();
  try {
    const all = await loadGameScores(SEL_CLS.id, 'puzzle-8');
    P8_RANK = Object.entries(all)
      .map(([num, v]) => ({ num, name: v.name, moves: p8ToMoves(v.best || 0) }))
      .sort((a, b) => a.moves - b.moves);
    const me = P8_RANK.find(r => r.num === ST_USER?.number);
    if(me) P8_BEST = me.moves;
  } catch(e){ console.warn('[8퍼즐] 순위 로드 실패:', e.message || e); }
  P8_LOADING = false;
  _p8Repaint();
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
      <span class="pwt-s">${r.moves}<i>번</i></span>
    </div>`).join('');
  return `<div class="pwt">
    <div class="pwt-title">🧩 8퍼즐 — 초기 상태에서 목표 상태로</div>
    <div class="pwt-sub">각자 화면에서 시작하세요 · 적게 옮길수록 위로</div>
    <div class="pwt-rank">${rows || '<div class="pwt-empty">아직 기록이 없습니다</div>'}</div>
    <div class="pwt-cnt">참여 ${P8_RANK.length}명</div>
  </div>`;
}
