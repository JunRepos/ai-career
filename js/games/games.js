/* ═══════════════════════════════════════
   games/games.js — 실습 게임 목록

   실습 슬라이드(slides/{반}/decks/…/images 안의 {type:'game', gameId})와
   단원 구성(unitContent)에서 gameId 로 게임을 찾아 씁니다.

   게임을 새로 만들면 파일을 하나 만들고 여기에 한 줄만 더하면 됩니다.
   ⚠ index.html 에서 이 파일보다 게임 파일들이 먼저 실려야 합니다.
═══════════════════════════════════════ */
const GAMES = {
  'plant-water': {
    ico: '🌿', label: '식물 물 주기',
    desc: '4×4 화분에 30초 동안 물 주기 → 끝나면 방금 쓴 지능 요소를 되짚어 줍니다',
    view: () => vPlantWater(),
    leave: () => pwLeave(),
    loadRank: () => pwLoadRank(),
    teacherBoard: () => pwBoardForTeacher(),
  },
  'maze': {
    ico: '🧭', label: '미로 탐사',
    desc: '미로의 갈림길이 곧 탐색 트리의 상태 → 너비 우선·깊이 우선으로 직접 탐사',
    view: () => vMaze(),
    leave: () => mzLeave(),
    loadRank: () => mzLoadRank(),
    teacherBoard: () => mzBoardForTeacher(),
  },
  'puzzle-8': {
    ico: '🧩', label: '8퍼즐 맞추기',
    desc: '빈칸으로 타일을 밀어 목표 모양 만들기 → 적은 수로 맞출수록 높은 순위',
    view: () => vPuzzle8(),
    leave: () => p8Leave(),
    loadRank: () => p8LoadRank(),
    teacherBoard: () => p8BoardForTeacher(),
  },
};

// 모르는 id 가 와도 화면이 비지 않게 첫 게임으로 떨어집니다
function gameDef(id){ return GAMES[id] || GAMES['plant-water']; }
function gameView(id){ return gameDef(id).view(); }
function gameTeacherBoard(id){ return gameDef(id).teacherBoard(); }
function gameLoadRank(id){ return gameDef(id).loadRank(); }

// 실습 장을 벗어날 때 — 어느 게임이 돌고 있었는지 몰라도 되게 전부 정리
function gameLeaveAll(){
  for(const g of Object.values(GAMES)){
    try { g.leave(); } catch(e){ /* 아직 안 실린 게임은 넘어갑니다 */ }
  }
}
