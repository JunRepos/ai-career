/* ═══════════════════════════════════════
   games/puzzleastar.js — 🧠 8퍼즐 A* 탐색 (6차시 활동)

   교과서 37쪽 활동3 을 앱에서 그대로 합니다.
     · 초기 상태  2 8 3 / 1 6 4 / 7 _ 5
     · 목표 상태  1 2 3 / 8 _ 4 / 7 6 5
     · h(n) = 목표 상태와 일치하지 않는 숫자 타일의 수 (공백 제외)
     · 빈 타일을 옮기는 순서 — 위쪽, 아래쪽, 왼쪽, 오른쪽

   ⚠ 보기만 하는 실습이 아닙니다. 학생이 **g·h·f 를 직접 계산해 넣습니다.**
     값이 다 맞아야 다음으로 넘어가고, 그다음 f 가 가장 작은 상태를 직접 고릅니다.

   판·정답은 verify/lesson6.py 가 돌린 값과 같습니다
     해답 위쪽 → 위쪽 → 왼쪽 → 아래쪽 → 오른쪽 (5수) · 확장 7개

   ⚠ 진행 중에는 앱 전체 render() 를 부르지 않고 #pa-app 안만 다시 그립니다.
     입력칸에 적은 값은 다시 그리기 전에 상태로 옮겨 담습니다.
═══════════════════════════════════════ */

const PA_START = [2, 8, 3, 1, 6, 4, 7, 0, 5];   // 0 = 공백
const PA_GOAL  = [1, 2, 3, 8, 0, 4, 7, 6, 5];
/* 교과서 37쪽 3번 — 빈 타일을 옮기는 순서 */
const PA_DIRS  = [[-3, '위쪽'], [3, '아래쪽'], [-1, '왼쪽'], [1, '오른쪽']];

let PA = null;
let PA_RANK = [];
let PA_BEST = null;

/* ── 판 다루기 ── */
const _paKey = b => b.join('');
const _paSame = (a, b) => _paKey(a) === _paKey(b);

function _paH(state){                     // 목표와 일치하지 않는 숫자 타일의 수
  let n = 0;
  for(let i = 0; i < 9; i++) if(state[i] && state[i] !== PA_GOAL[i]) n++;
  return n;
}
function _paMoves(state){
  const z = state.indexOf(0), r = Math.floor(z / 3), c = z % 3, out = [];
  for(const [d, name] of PA_DIRS){
    if(d === -3 && r === 0) continue;
    if(d === 3 && r === 2) continue;
    if(d === -1 && c === 0) continue;
    if(d === 1 && c === 2) continue;
    const s = state.slice();
    s[z] = s[z + d]; s[z + d] = 0;
    out.push({ state: s, dir: name });
  }
  return out;
}

/* ── 화면 ── */
function vPuzzleAstar(){
  return `<div class="mz-wrap pa-wrap" id="pa-app">${_paInner()}</div>`;
}
function _paInner(){
  if(!PA) return _paIntro();
  if(PA.over) return _paResult();
  return PA.phase === 'input' ? _paInputView() : _paPickView();
}
function _paRepaint(){
  const el = document.getElementById('pa-app');
  if(el) el.innerHTML = _paInner();
}

function _paBoard(state, cls){
  const cells = state.map(v => v
    ? `<i class="p8-cell">${v}</i>`
    : `<i class="p8-cell blank"></i>`).join('');
  return `<div class="p8-grid ${cls || 'mini'}">${cells}</div>`;
}

function _paIntro(){
  const best = PA_BEST == null ? ''
    : `<div class="mz-best">내 최고 기록 — 틀린 횟수 <b>${PA_BEST}</b></div>`;
  return `<div class="cc-front">
    <div class="mz-title">8퍼즐을 A* 알고리즘으로 탐색해 보기</div>
    <div class="pa-pair">
      <div class="pa-one">${_paBoard(PA_START, 'mid')}<div class="pa-cap">초기 상태</div></div>
      <div class="pa-arrow">→</div>
      <div class="pa-one">${_paBoard(PA_GOAL, 'mid')}<div class="pa-cap">목표 상태</div></div>
    </div>
    <div class="mz-speech">
      <b>f(n) = g(n) + h(n)</b><br>
      · <b>g(n)</b> 초기 상태에서 현재 상태까지의 비용 — 지금까지 옮긴 횟수<br>
      · <b>h(n)</b> 휴리스틱값, 목표 상태와 <b>일치하지 않는 숫자 타일의 수</b> (공백 제외)<br>
      · <b>f(n)</b> 최종 비용 추정치
    </div>
    <div class="mz-speech cc-tip">
      빈 타일을 옮기는 순서는 <b>위쪽 → 아래쪽 → 왼쪽 → 오른쪽</b> 입니다.<br>
      만들어진 상태마다 <b>g·h·f 를 직접 계산해 넣고</b>, f 가 가장 작은 것을 고르세요.
    </div>
    ${best}
    <button class="mz-btn" data-action="pa-start">시작하기</button>
  </div>`;
}

/* 값 채우기 화면 — 방금 테스트한 상태의 자식들 */
function _paInputView(){
  const rows = PA.pending.map((n, i) => {
    const bad = PA.wrong[i] || {};
    const v = PA.typed[i] || {};
    const cell = (k, ph) => `<input class="pa-in${bad[k] ? ' bad' : ''}" id="pa-${k}-${i}"
      inputmode="numeric" maxlength="2" value="${v[k] != null ? v[k] : ''}" placeholder="${ph}">`;
    return `<div class="pa-row">
      <div class="pa-rb">${_paBoard(n.state)}<div class="pa-cap">${n.dir}</div></div>
      <div class="pa-ins">
        <label>g</label>${cell('g', 'g')}
        <label>h</label>${cell('h', 'h')}
        <label>f</label>${cell('f', 'f')}
      </div>
    </div>`;
  }).join('');
  return `<div class="mz-bar">
      <div><b>8퍼즐 A*</b> — ${PA.closed.length}번째 테스트를 마쳤습니다</div>
      <div>틀린 횟수 <b>${PA.miss}</b></div>
    </div>
    <div class="pa-top">
      <div class="pa-one">${_paBoard(PA.cur.state, 'mid')}<div class="pa-cap">방금 테스트한 상태</div></div>
      <div class="pa-arrow">→</div>
      <div class="pa-mk">여기서 만들 수 있는 상태 <b>${PA.pending.length}개</b></div>
      <div class="pa-one">${_paBoard(PA_GOAL, 'mid')}<div class="pa-cap">목표 상태</div></div>
    </div>
    <div class="pa-rows">${rows}</div>
    <div class="mz-ask" id="pa-say">${PA.say || 'g · h · f 를 계산해 넣고 <b>값 확인</b>을 누르세요'}</div>
    <div class="pa-btns"><button class="mz-btn" data-action="pa-check">값 확인</button></div>`;
}

/* 고르기 화면 — 오픈 리스트에서 f 가 가장 작은 것 */
function _paPickView(){
  const chips = PA.open.map((n, i) => `<button class="mz-chip pa-chip" data-action="pa-pick" data-i="${i}">
      ${_paBoard(n.state)}<em>${n.dir}</em><b>f = ${n.g} + ${n.h} = ${n.f}</b>
    </button>`).join('');
  return `<div class="mz-bar">
      <div><b>8퍼즐 A*</b> — 오픈 리스트에서 고르기</div>
      <div>틀린 횟수 <b>${PA.miss}</b></div>
    </div>
    <div class="pa-chips">${chips}</div>
    <div class="mz-lab" style="margin-top:14px">테스트가 끝난 닫힌 리스트</div>
    <div class="mz-closed">${PA.closed.map(n => `${n.dir || '초기'}(f=${n.f})`).join('   ')}</div>
    <div class="mz-ask" id="pa-say">${PA.say || '오픈 리스트에서 <b>f 가 가장 작은 상태</b>를 고르세요'}</div>`;
}

function _paResult(){
  const best = PA_BEST == null ? '' : `<div class="mz-best">내 최고 기록 <b>${PA_BEST}번</b></div>`;
  return `<div class="cc-front">
    <div class="mz-title">목표 상태에 닿았습니다</div>
    <div class="mz-final">${PA.solution.length}<span>수</span></div>
    <div class="mz-two">
      <div class="mz-two-row"><span class="mz-two-t">빈칸이 간 순서</span>
        <span class="mz-two-s">${PA.solution.join(' → ')}</span><b>${PA.solution.length}수</b></div>
      <div class="mz-two-row"><span class="mz-two-t">테스트한 상태</span>
        <span class="mz-two-s">9! = 362,880 가지 중에서</span><b>${PA.closed.length}개</b></div>
    </div>
    <div class="mz-speech">
      틀린 횟수 <b>${PA.miss}</b>번. f = g + h 가 가장 작은 상태만 골라 갔기 때문에,
      모든 상태를 다 보지 않고도 <b>가장 적은 횟수로 옮기는 길</b>을 찾았습니다.
    </div>
    ${best}
    <button class="mz-btn" data-action="pa-start">다시 하기</button>
  </div>`;
}

/* ── 진행 ── */
function paStart(){
  const root = { state: PA_START.slice(), g: 0, h: _paH(PA_START), dir: '초기 상태', path: [] };
  root.f = root.g + root.h;
  PA = { open: [], closed: [], cur: root, pending: [], typed: {}, wrong: {},
         miss: 0, say: '', phase: 'input', over: false, solution: [] };
  _paExpand(root);
  return PA;
}

/* 그 상태의 자식을 만들어 값 채우기 단계로 */
function _paExpand(node){
  PA.closed.push(node);
  const seen = new Set(PA.closed.map(n => _paKey(n.state)).concat(PA.open.map(n => _paKey(n.state))));
  PA.pending = _paMoves(node.state)
    .filter(m => !seen.has(_paKey(m.state)))
    .map(m => ({ state: m.state, dir: m.dir, g: node.g + 1, h: _paH(m.state),
                 f: node.g + 1 + _paH(m.state), path: node.path.concat(m.dir) }));
  PA.cur = node;
  PA.typed = {}; PA.wrong = {};
  PA.phase = 'input';
  PA.say = '';
}

/* 입력칸의 값을 상태로 옮겨 담습니다 (다시 그리기 전에) */
function _paCollect(){
  PA.pending.forEach((n, i) => {
    const get = k => {
      const el = document.getElementById(`pa-${k}-${i}`);
      return el && el.value.trim() !== '' ? parseInt(el.value, 10) : null;
    };
    PA.typed[i] = { g: get('g'), h: get('h'), f: get('f') };
  });
}

function paCheck(){
  if(!PA || PA.phase !== 'input') return;
  _paCollect();
  PA.wrong = {};
  let bad = 0, blank = 0;
  PA.pending.forEach((n, i) => {
    const t = PA.typed[i] || {};
    const w = {};
    for(const k of ['g', 'h', 'f']){
      if(t[k] == null){ blank++; w[k] = true; }
      else if(t[k] !== n[k]){ bad++; w[k] = true; }
    }
    if(Object.keys(w).length) PA.wrong[i] = w;
  });

  if(blank){
    PA.say = '아직 비어 있는 칸이 있습니다.';
  } else if(bad){
    PA.miss++;
    const anyH = Object.values(PA.wrong).some(w => w.h);
    const anyG = Object.values(PA.wrong).some(w => w.g);
    PA.say = anyH
      ? '빨간 칸을 다시 보세요. <b>h</b> 는 목표 상태와 <b>일치하지 않는 숫자 타일의 수</b>입니다 — 공백은 세지 않습니다.'
      : anyG
        ? '빨간 칸을 다시 보세요. <b>g</b> 는 초기 상태에서 <b>지금까지 옮긴 횟수</b>입니다.'
        : '빨간 칸을 다시 보세요. <b>f = g + h</b> 입니다.';
  } else {
    /* 다 맞았다 — 오픈 리스트에 넣고 고르기 단계로 */
    PA.open = PA.open.concat(PA.pending);
    PA.pending = [];
    PA.phase = 'pick';
    PA.say = '';
  }
  _paRepaint();
}

function paPick(i){
  if(!PA || PA.phase !== 'pick') return;
  const node = PA.open[i];
  if(!node) return;
  const best = Math.min(...PA.open.map(n => n.f));
  if(node.f !== best){
    PA.miss++;
    PA.say = `f 가 더 작은 상태가 남아 있습니다. 가장 작은 f 는 <b>${best}</b> 입니다.`;
    _paRepaint();
    return;
  }
  PA.open.splice(i, 1);
  if(_paSame(node.state, PA_GOAL)){
    PA.closed.push(node);
    PA.solution = node.path;
    PA.over = true;
    paFinish();
    return;
  }
  _paExpand(node);
  _paRepaint();
}

async function paFinish(){
  if(SEL_CLS && ST_USER){
    try {
      await saveGameScore(SEL_CLS.id, ST_USER.number, ST_USER.name,
                          1000 - Math.min(PA.miss, 999), 'puzzle-astar');
    } catch(e){ console.warn('[8퍼즐 A*] 기록 저장 실패:', e.message || e); }
  }
  _paRepaint();
  await paLoadRank();
}

function paLeave(){ PA = null; }

async function paLoadRank(){
  if(!SEL_CLS) return;
  try {
    const all = await loadGameScores(SEL_CLS.id, 'puzzle-astar');
    PA_RANK = Object.entries(all)
      .map(([num, v]) => ({ num, name: v.name, miss: 1000 - (v.best || 0) }))
      .sort((a, b) => a.miss - b.miss);
    const me = PA_RANK.find(r => r.num === ST_USER?.number);
    PA_BEST = me ? me.miss : null;
  } catch(e){ console.warn('[8퍼즐 A*] 순위 로드 실패:', e.message || e); }
  _paRepaint();
}

function paBoardForTeacher(){
  const rows = PA_RANK.slice(0, 5).map((r, i) => `
    <div class="pwt-row"><span class="pwt-n">${i + 1}</span>
      <span class="pwt-name">${esc(r.name || r.num)}</span>
      <span class="pwt-s">${r.miss}<i>번</i></span></div>`).join('');
  return `<div class="pwt">
    <div class="pwt-title">🧠 8퍼즐 A* 탐색</div>
    <div class="pwt-sub">각자 화면에서 g·h·f 를 계산해 넣습니다 · 틀린 횟수가 적을수록 위로</div>
    <div class="pwt-rank">${rows || '<div class="pwt-empty">아직 기록이 없습니다</div>'}</div>
    <div class="pwt-cnt">참여 ${PA_RANK.length}명</div>
  </div>`;
}
