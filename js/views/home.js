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

// ── 반 썸네일 도트 아이콘 ──
//   7×7 도트로 과목을 상징하는 그림을 그립니다. 반마다 한 군데씩만 달라지게 해서
//   "같은 과목인데 다른 반"이 한눈에 보이도록 했습니다.
//     진로   = 나침반. 바늘이 가리키는 방향이 반마다 다름 (6개 반 = 6방향)
//     인공지능 = 신경망. 층 구성이 반마다 다름 (2-A는 3-2-1, 2-B는 2-3-1)
//   기호: '.' 없음 / 'o' 보통 / '#' 강조

// 나침반 테두리 (바늘 없는 상태)
const ICON_COMPASS_RING = [
  '..ooo..',
  '.o...o.',
  'o.....o',
  'o.....o',
  'o.....o',
  '.o...o.',
  '..ooo..',
];
// 바늘 방향 8개 중 반 순서대로 사용 — [행,열] 2칸
const COMPASS_NEEDLES = [
  [[2,3],[1,3]],  // 북
  [[2,4],[1,5]],  // 북동
  [[3,4],[3,5]],  // 동
  [[4,4],[5,5]],  // 남동
  [[4,3],[5,3]],  // 남
  [[4,2],[5,1]],  // 남서
  [[3,2],[3,1]],  // 서
  [[2,2],[1,1]],  // 북서
];
const COMPASS_DIRS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];

// 신경망 — 층 구성별 패턴
const ICON_NETS = [
  [ // 3-2-1
    '.......',
    '#.o....',
    '.o.#.o.',
    '#.o.o.#',
    '.o.#.o.',
    '#.o....',
    '.......',
  ],
  [ // 2-3-1
    '.......',
    '...#.o.',
    '#.o....',
    '.o.#.o#',
    '#.o....',
    '...#.o.',
    '.......',
  ],
];

// 반 index 로 7×7 패턴(문자열 배열) 만들기
function _iconPattern(subjectKey, idx){
  if(subjectKey === 'ai') return ICON_NETS[idx % ICON_NETS.length];
  // 진로 — 나침반 테두리에 바늘을 얹음
  const grid = ICON_COMPASS_RING.map(r => r.split(''));
  grid[3][3] = '#';                                   // 축
  for(const [r, c] of COMPASS_NEEDLES[idx % COMPASS_NEEDLES.length]) grid[r][c] = '#';
  return grid.map(r => r.join(''));
}

// 패턴 → 7×7 정사각 도트 아이콘. 담는 곳(썸네일/사이드바/로그인)마다 크기만 다름.
function _dotIcon(subjectKey, idx){
  const cells = _iconPattern(subjectKey, idx).join('').split('')
    .map(ch => `<i class="sd${ch === '#' ? ' hi' : ch === 'o' ? ' on' : ''}"></i>`)
    .join('');
  return `<div class="dot-icon">${cells}</div>`;
}

// 카드 아래 설명 — 아이콘이 무엇을 뜻하는지
function _iconCaption(subjectKey, idx){
  if(subjectKey === 'ai') return idx % 2 === 0 ? '신경망 3-2-1' : '신경망 2-3-1';
  return `나침반 ${COMPASS_DIRS[idx % COMPASS_DIRS.length]}쪽`;
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
