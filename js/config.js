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
  {id:'ai-2A',    label:'인공지능 기초 2-A',emoji:'🧠',type:'ai'},
  {id:'ai-2B',    label:'인공지능 기초 2-B',emoji:'🧠',type:'ai'},
  {id:'career-2A',label:'진로 2-A',        emoji:'🧭',type:'career'},
  {id:'career-2B',label:'진로 2-B',        emoji:'🧭',type:'career'},
];

const KNOWN_CLS = new Set(CLASSES.map(c=>c.id));

// JDoodle 컴파일러 API — https://www.jdoodle.com/compiler-api 에서 무료 발급
// ★ 발급 후 아래 값을 교체하세요 ★
const JDOODLE_CLIENT_ID     = '98099d68721fe90c54db498ded8c9150';
const JDOODLE_CLIENT_SECRET = '6f159835f4cd31c43ebfe98cf79e5d3d887afc71f0f5a4146e73b58edd0768d9';
