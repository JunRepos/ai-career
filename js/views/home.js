/* ═══════════════════════════════════════
   views/home.js — 진입 화면 (과목 선택 → 반 선택)

   1) 과목 선택: 진로와 직업 / 인공지능 기초
   2) 도트 전환 애니메이션
   3) 반 선택 → 학생 로그인
═══════════════════════════════════════ */

// ── 1) 과목 선택 ──
function vHome(){
  const cards = SUBJECTS.map(s => {
    const n = classesOf(s.key).length;
    return `<button class="subj-card" data-action="pick-subject" data-key="${s.key}" style="--tint:${s.tint}">
      <div class="subj-dots">${_dotGrid(s.key)}</div>
      <div class="subj-body">
        <div class="subj-label">${esc(s.label)}</div>
        <div class="subj-tagline">${esc(s.tagline)}</div>
        <div class="subj-meta">${n}개 반</div>
      </div>
      <div class="subj-go">→</div>
    </button>`;
  }).join('');

  return `<div class="enter">
    <div class="enter-head">
      <div class="enter-title">어떤 수업으로 갈까요?</div>
      <div class="enter-sub">과목을 선택하면 반 목록이 나옵니다</div>
    </div>
    <div class="subj-grid">${cards}</div>
  </div>`;
}

// 도트 패턴 — 같은 문자열이면 항상 같은 모양(랜덤 아님). 과목 카드·반 썸네일 공용.
function _dotGrid(key){
  let seedBase = 0;
  for(let i = 0; i < key.length; i++) seedBase = (seedBase * 31 + key.charCodeAt(i)) % 97;
  seedBase = seedBase % 9 + 2;
  let out = '';
  for(let i = 0; i < 36; i++){
    // 결정적 의사난수 — 같은 과목은 항상 같은 패턴
    const v = (i * seedBase * 17 + seedBase * 31) % 11;
    const lit = v > 5 ? ' on' : '';
    out += `<i class="sd${lit}" style="--d:${(i % 6) * 30 + Math.floor(i / 6) * 40}ms"></i>`;
  }
  return out;
}

// ── 2) 반 선택 ──
function vClasses(){
  const subj = SUBJECT_MAP[SEL_SUBJECT];
  if(!subj) return emptyBox('📚', '과목을 먼저 선택하세요.');

  const cards = classesOf(SEL_SUBJECT).map((c, i) => `
    <button class="cls-card" data-action="pick-class" data-cid="${c.id}" style="--tint:${subj.tint};--i:${i}">
      <div class="cls-thumb" title="${esc(_iconCaption(SEL_SUBJECT, i))}">${_dotIcon(SEL_SUBJECT, i)}</div>
      <div class="cls-name">${esc(c.short || c.label)}반</div>
      <div class="cls-sub">${esc(subj.label)}</div>
    </button>`).join('');

  return `<div class="enter">
    <div class="enter-head">
      <button class="enter-back" data-action="back-subjects">← 과목 다시 선택</button>
      <div class="enter-title" style="--tint:${subj.tint}"><span class="enter-dot"></span>${esc(subj.label)}</div>
      <div class="enter-sub">반을 선택하세요</div>
    </div>
    <div class="cls-grid">${cards}</div>
  </div>`;
}

// ── 반 썸네일 도트 아이콘 (9×9) ──
//   과목을 상징하는 그림을 도트로 그립니다. 같은 과목 안에서는 한 부분만 달라져서
//   "같은 과목의 다른 반"임이 한눈에 보입니다.
//     진로     = 나침반. 바늘 방향이 반마다 다름 (2-1 북 … 2-6 남서)
//     인공지능 = 마이크로칩. 가운데 코어 무늬가 반마다 다름 (2B X / 2D 사각)
//   기호: '.' 없음 / 'o' 중간(테두리·핀) / '#' 진하게(바늘·코어)

// 나침반 몸통 — 반지름 4 원. 바늘은 아래에서 얹습니다.
const ICON_COMPASS_RING = [
  '..ooooo..',
  '.oo...oo.',
  'oo.....oo',
  'o.......o',
  'o.......o',
  'o.......o',
  'oo.....oo',
  '.oo...oo.',
  '..ooooo..',
];
// 바늘 — [바늘칸 2개, 반대쪽 꼬리 1칸]. 중심(4,4)은 항상 진하게.
const COMPASS_NEEDLES = [
  { dir: '북',   tip: [[3,4],[2,4]], tail: [5,4] },
  { dir: '북동', tip: [[3,5],[2,6]], tail: [5,3] },
  { dir: '동',   tip: [[4,5],[4,6]], tail: [4,3] },
  { dir: '남동', tip: [[5,5],[6,6]], tail: [3,3] },
  { dir: '남',   tip: [[5,4],[6,4]], tail: [3,4] },
  { dir: '남서', tip: [[5,3],[6,2]], tail: [3,5] },
  { dir: '서',   tip: [[4,3],[4,2]], tail: [4,5] },
  { dir: '북서', tip: [[3,3],[2,2]], tail: [5,5] },
];

// 마이크로칩 몸통 — 바깥 핀 + 사각 테두리. 가운데 3×3 이 코어 자리.
const ICON_CHIP_BODY = [
  '..o.o.o..',
  '.ooooooo.',
  'oo.....oo',
  '.o.....o.',
  'oo.....oo',
  '.o.....o.',
  'oo.....oo',
  '.ooooooo.',
  '..o.o.o..',
];
// 코어 무늬 (3×3) — 반마다 다름
const CHIP_CORES = [
  { name: 'X형',   rows: ['#.#', '.#.', '#.#'] },
  { name: '사각형', rows: ['###', '#.#', '###'] },
];

// 반 index 로 9×9 패턴(문자열 배열) 만들기
function _iconPattern(subjectKey, idx){
  if(subjectKey === 'ai'){
    const grid = ICON_CHIP_BODY.map(r => r.split(''));
    const core = CHIP_CORES[idx % CHIP_CORES.length].rows;
    for(let r = 0; r < 3; r++) for(let c = 0; c < 3; c++) grid[3 + r][3 + c] = core[r][c];
    return grid.map(r => r.join(''));
  }
  // 진로 — 나침반 테두리 + 바늘
  const grid = ICON_COMPASS_RING.map(r => r.split(''));
  const n = COMPASS_NEEDLES[idx % COMPASS_NEEDLES.length];
  grid[4][4] = '#';                                  // 축
  for(const [r, c] of n.tip) grid[r][c] = '#';       // 바늘 끝
  grid[n.tail[0]][n.tail[1]] = 'o';                  // 반대쪽 꼬리
  return grid.map(r => r.join(''));
}

// 패턴 → 7×7 정사각 도트 아이콘. 담는 곳(썸네일/사이드바/로그인)마다 크기만 다름.
function _dotIcon(subjectKey, idx){
  const cells = _iconPattern(subjectKey, idx).join('').split('')
    .map(ch => `<i class="sd${ch === '#' ? ' hi' : ch === 'o' ? ' on' : ''}"></i>`)
    .join('');
  return `<div class="dot-icon">${cells}</div>`;
}

// 아이콘 설명 (툴팁)
function _iconCaption(subjectKey, idx){
  if(subjectKey === 'ai') return `마이크로칩 ${CHIP_CORES[idx % CHIP_CORES.length].name} 코어`;
  return `나침반 ${COMPASS_NEEDLES[idx % COMPASS_NEEDLES.length].dir}쪽`;
}

// ── 3) 도트 전환 애니메이션 ──
//   과목을 고르면 화면 전체를 도트가 덮었다가(가운데→바깥) 걷히면서 다음 화면이 드러남.
//   next() 는 도트가 화면을 완전히 덮은 순간 호출 — 화면 교체가 보이지 않게.
const DOT_COLS = 18, DOT_ROWS = 10;
function dotTransition(tint, next){
  const host = document.getElementById('modal-root');
  if(!host){ next(); return; }

  const cx = (DOT_COLS - 1) / 2, cy = (DOT_ROWS - 1) / 2;
  let cells = '';
  for(let r = 0; r < DOT_ROWS; r++){
    for(let c = 0; c < DOT_COLS; c++){
      // 가운데에서의 거리 → 지연시간. 물결처럼 퍼짐.
      const dist = Math.hypot(c - cx, (r - cy) * 1.6);
      cells += `<i style="--d:${Math.round(dist * 26)}ms"></i>`;
    }
  }
  host.innerHTML = `<div class="dotfx" style="--tint:${tint};--cols:${DOT_COLS}">${cells}</div>`;

  const fx = host.firstElementChild;
  requestAnimationFrame(() => fx.classList.add('in'));

  // 덮인 시점에 화면 교체 → 이어서 걷어냄
  setTimeout(() => {
    next();
    const fx2 = document.querySelector('.dotfx');
    if(!fx2){ return; }
    fx2.classList.add('out');
    setTimeout(() => { host.innerHTML = ''; }, 700);
  }, 600);
}
