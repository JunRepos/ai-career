/* ═══════════════════════════════════════
   config.js — Firebase 설정 & 반 목록

   앱 전체에서 사용하는 설정값을 관리합니다.
   Firebase 프로젝트를 변경하려면 여기만 수정하세요.
═══════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAnizrBWkqStaoWxIOpd8HFUS_CuqXjw2k",
  authDomain:        "sindong-informatics.firebaseapp.com",
  databaseURL:       "https://sindong-informatics-default-rtdb.firebaseio.com",
  projectId:         "sindong-informatics",
  storageBucket:     "sindong-informatics.firebasestorage.app",
  messagingSenderId: "542931253736",
  appId:             "1:542931253736:web:d83620fe9079c3f0998c5d"
};

// 반 목록 — 반을 추가/제거하려면 여기를 수정
//
// type 은 어떤 단원 체계·메뉴를 쓸지 결정합니다 (constants.js 의 SUBJECT_UNITS 와 짝).
//   'ai'     → 인공지능 기초
//   'career' → 진로와 직업
//   'info'   → 정보 (이 앱에는 반이 없음. informatics 레포가 담당)
//   'normal' → 일반 학급 (단원 없이 '수업' 단일 탭)
//
// ⚠ 반 id 를 새로 만들면 database.rules.json 과 storage.rules 의 반 id 정규식에도
//   같은 id 를 추가하고 firebase deploy 를 해야 저장이 됩니다.
//   Firebase 프로젝트는 informatics 와 공유하지만, 데이터는 반 id 로 완전히 갈립니다.
const CLASSES = [
  // 인공지능 기초 — 수강반 2개 (2026학년도 2학기)
  {id:'ai-2B', label:'인공지능 기초 2B', short:'2B', type:'ai', room:'203', when:'수요일 3교시'},
  {id:'ai-2D', label:'인공지능 기초 2D', short:'2D', type:'ai', room:'202', when:'월요일 2교시'},
  // 진로와 직업 — 학급 6개
  {id:'career-2-1', label:'진로 2-1', short:'2-1', type:'career'},
  {id:'career-2-2', label:'진로 2-2', short:'2-2', type:'career'},
  {id:'career-2-3', label:'진로 2-3', short:'2-3', type:'career'},
  {id:'career-2-4', label:'진로 2-4', short:'2-4', type:'career'},
  {id:'career-2-5', label:'진로 2-5', short:'2-5', type:'career'},
  {id:'career-2-6', label:'진로 2-6', short:'2-6', type:'career'},
];

// 과목 — 첫 화면(과목 선택)과 반 선택 화면에서 사용.
// key 는 CLASSES 의 type 및 SUBJECT_UNITS(constants.js) 의 키와 같아야 합니다.
const SUBJECTS = [
  { key:'career', label:'진로와 직업',  tagline:'나를 알고 직업 세계를 탐색합니다', tint:'#F2A65A' },
  { key:'ai',     label:'인공지능 기초', tagline:'인공지능의 원리를 배우고 직접 만듭니다', tint:'#B08BEB' },
];

const SUBJECT_MAP = Object.fromEntries(SUBJECTS.map(s => [s.key, s]));

// 과목에 속한 반 목록
function classesOf(subjectKey){
  return CLASSES.filter(c => c.type === subjectKey);
}

const KNOWN_CLS = new Set(CLASSES.map(c=>c.id));

// JDoodle 컴파일러 API — https://www.jdoodle.com/compiler-api 에서 무료 발급
// ★ 발급 후 아래 값을 교체하세요 ★
const JDOODLE_CLIENT_ID     = '98099d68721fe90c54db498ded8c9150';
const JDOODLE_CLIENT_SECRET = '6f159835f4cd31c43ebfe98cf79e5d3d887afc71f0f5a4146e73b58edd0768d9';
