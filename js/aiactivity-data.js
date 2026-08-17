/* ═══════════════════════════════════════
   aiactivity-data.js — 활동지 정의

   활동지에는 두 종류가 있습니다.
     ① 코드에 박아둔 기본 활동지 — 아래 AIA_LIST
     ② 선생님이 앱에서 직접 만든 활동지 — Firebase 에 저장 (AIA_CUSTOM)
   둘 다 아래 형태로 맞춰서 같은 화면이 그립니다.

     { id, title, intro, subjects:[과목키], questions:[ {id, text, rows, imageUrl} ] }

   questions 가 화면에 1, 2, 3 … 번호가 붙은 문항으로 그려집니다.
   답안은 문항 id 를 키로 저장됩니다.
═══════════════════════════════════════ */

const AIA_LIST = [
  {
    id: 'orientation-ai',
    title: '나와 인공지능',
    subtitle: '1차시 오리엔테이션',
    subjects: ['ai'],
    intro: '한 학기를 함께 시작하기 전에 여러분을 알고 싶습니다. 정답이 없는 질문이니 솔직하게 적어주세요. 여기 적은 내용은 선생님만 봅니다.',
    questions: [
      { id: 'careerField',  text: '진로 및 관심 분야는?', rows: 3 },
      { id: 'whyThisClass', text: '인공지능 기초 과목을 선택한 이유', rows: 3 },
      { id: 'usingAI',      text: '자주 사용하고 있는 인공지능은?', rows: 3 },
      { id: 'curious',      text: '인공지능 서비스를 사용하면서 궁금했던 점이 있었나요?', rows: 4 },
      { id: 'wantExplore',  text: '한번 탐구해보고 싶은 인공지능 프로그램 및 서비스는?', rows: 3 },
      { id: 'goal',         text: '2학기 인공지능 과목을 들으면서 목표는?', rows: 3 },
      { id: 'toTeacher',    text: '선생님에게 하고 싶은 말이 있나요?', rows: 3 },
    ],
  },
];

// 선생님이 만든 활동지 — loadCustomActivities() 가 채웁니다 (반별)
let AIA_CUSTOM = [];

// 기본 + 직접 만든 활동지를 합쳐서, 지금 반의 과목에 해당하는 것만
function aiaListFor(cls){
  const t = cls?.type;
  const builtin = AIA_LIST.filter(a => !a.subjects || a.subjects.includes(t));
  return [...builtin, ...AIA_CUSTOM];
}

function aiaById(id){
  return AIA_LIST.find(a => a.id === id) || AIA_CUSTOM.find(a => a.id === id) || null;
}

// 활동지의 모든 문항 id (CSV 내보내기·작성률 계산용)
function aiaFieldIds(act){
  return (act.questions || []).map(q => q.id);
}
