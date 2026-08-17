/* ═══════════════════════════════════════
   constants.js — 앱 전체 상수

   매직 넘버와 반복되는 문자열을 한 곳에서 관리합니다.
   값을 바꿀 때 여기만 수정하면 됩니다.
═══════════════════════════════════════ */

const MAX_FILE_SIZE    = 50 * 1024 * 1024; // 50MB
const MAX_TITLE_LEN    = 200;
const MAX_CONTENT_LEN  = 5000;
const MAX_MEMO_LEN     = 1000;
const MAX_NAME_LEN     = 50;

const AT_STATUS = {
  OK:   '출석',
  LATE: '지각',
  ABS:  '결석',
};

const AT_REASONS = ['질병', '인정', '미인정'];

// 수업 단원 — 학생 사이드바 '수업' 그룹 + 선생님 수업 등록 시 분류용
// 키는 DB의 assignments/{}/unit 과 unitContent/{unitKey} 에 저장(반별로 저장되므로
// 과목끼리 키가 겹쳐도 섞이지 않지만, 읽기 쉽게 과목별 접두사를 붙였습니다).
// 반의 type 으로 어떤 단원 체계를 쓸지 결정 — CLASSES(config.js)의 type 과 짝을 이룹니다.
const SUBJECT_UNITS = {
  // 정보 (informatics 레포에서 쓰던 체계 — 이 앱에선 반이 없어 화면에 안 나오지만
  //       나중에 CLASSES 에 info 반을 다시 넣으면 그대로 동작하도록 남겨둡니다)
  info: [
    { key: 'computing',   roman: 'Ⅰ', label: '컴퓨팅 시스템' },
    { key: 'bigdata',     roman: 'Ⅱ', label: '데이터' },
    { key: 'programming', roman: 'Ⅲ', label: '프로그래밍' },
    { key: 'ai',          roman: 'Ⅳ', label: '인공지능' },
  ],
  // 인공지능 기초
  ai: [
    { key: 'aib-understand', roman: 'Ⅰ', label: '인공지능의 이해' },
    { key: 'aib-learning',   roman: 'Ⅱ', label: '인공지능과 학습' },
    { key: 'aib-impact',     roman: 'Ⅲ', label: '인공지능의 사회적 영향' },
    { key: 'aib-project',    roman: 'Ⅳ', label: '인공지능 프로젝트' },
  ],
  // 진로와 직업 — 단원 구분 없이 '수업' 하나로 운영 (빈 배열이면 단원 메뉴가 안 나옴)
  career: [],
};

// 단원 체계를 쓰는 반(=교과 수업 반)인지. 일반 학급은 단원 없이 '수업' 단일 탭.
function isSubjectCls(cls){
  return !!SUBJECT_UNITS[cls?.type];
}

// 지금 보고 있는 반의 단원 목록 — 학생은 SEL_CLS, 선생님은 TC_CLS 기준.
// (기존 코드가 쓰던 ASSIGN_UNITS 를 이 함수로 대체했습니다)
function assignUnits(){
  const cls = (IS_TC ? TC_CLS : SEL_CLS) || TC_CLS || SEL_CLS;
  return SUBJECT_UNITS[cls?.type] || [];
}

// 단원 key → 단원 객체 (없으면 undefined)
function assignUnit(key){
  return assignUnits().find(u => u.key === key);
}
