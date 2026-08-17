/* ═══════════════════════════════════════
   aiactivity-data.js — 활동지 정의

   활동지에는 두 종류가 있습니다.
     ① 코드에 박아둔 기본 활동지 — 아래 AIA_LIST
     ② 선생님이 앱에서 직접 만든 활동지 — Firebase 에 저장 (AIA_CUSTOM)
   둘 다 아래 형태로 맞춰서 같은 화면이 그립니다.

     { id, title, subtitle, intro, subjects:[과목키], questions:[ ... ] }

   문항 type (없으면 'text'):
     text  — 질문 + 줄노트 답변칸        { text, desc, rows, imageUrl }
     note  — 읽기만 하는 안내 상자        { text, desc, url }
     check — 보기 중 고르기(여러 개 가능) { text, desc, options:[], cols }
     table — 표 채우기                   { text, desc, cols:[], fixed:[], extra, fillFrom:[] }

   답안은 문항 id 를 키로 저장됩니다.
     text  → 문자열
     check → 고른 보기 배열
     table → { 행번호: { 열번호: 값 } }
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

  /* 진로 1차시 — 선생님이 쓰시던 종이 학습지를 그대로 옮긴 것 */
  {
    id: 'career-s2-start',
    title: '2학기를 시작하며',
    subtitle: '1차시',
    subjects: ['career'],
    intro: '방학을 돌아보고, 새 학기 계획을 세워봅시다',
    questions: [
      // ── 영상 보고 느낀 점 ──
      { id: 'videoNote', type: 'note',
        text: '영상 보고 느낀 점 작성하기',
        desc: '"3학년 2학기까지 봅니다" 내신·수능 다 바뀌는 2028 대입 전에 꼭 알아야 할 것 | 입시 뉴스 | 입시의 정석',
        url: 'https://www.youtube.com/watch?v=NsHFuOsdwrw' },
      { id: 'videoFeel', text: '느낀 점', rows: 4 },

      // ── 방학 돌아보기 ──
      { id: 'vacPlan', type: 'table',
        text: '방학 전에 계획했던 일을 수행했는지 확인하기',
        desc: '계획을 적고 어느 정도 달성했는지 확인하기',
        cols: ['계획했던 일', '달성 정도'], extra: 4 },
      { id: 'vacFree', text: '방학 동안 어떤 것을 했는지 자유롭게 작성해보기!', rows: 4 },

      // ── 2학기 계획 ──
      { id: 'pickNote', type: 'note', text: '2학기 계획 세워보기',
        desc: '자신이 듣는 2학기 과목을 선택해주세요!' },
      { id: 'pick2', type: 'check', text: '6개 중 택 2', cols: 2,
        options: ['일본어 회화', '중국어 회화', '인공지능 기초', '음악 감상과 비평', '미술 감상과 비평'] },
      { id: 'pick3', type: 'check', text: '9개 중 택 3', cols: 3,
        options: ['기하', '한국지리 탐구', '동아시아 역사 기행', '경제', '윤리와 사상',
                  '역학과 에너지', '물질과 에너지', '세포와 물질대사', '지구시스템과학'] },

      { id: 'subjectGoal', type: 'table',
        text: '각 과목별 목표 등급과 하고 싶은 세부 활동은?',
        desc: '진로와 교과를 연계한 아이디어가 있나요?',
        cols: ['선택 과목', '목표 등급', '하고 싶은 세부 탐구 활동(있으면 적기!)'],
        fixed: ['독서와 작문(공통)', '미적분Ⅰ(공통)', '영어Ⅱ(공통)', '스포츠 생활2(공통, ABCDE)'],
        // 위에서 고른 과목이 '선택 과목' 칸에 자동으로 들어옵니다 (이 학습지 전용)
        fillFrom: ['pick2', 'pick3'],
        extra: 5 },

      { id: 'wantDo', text: '2학기 동안 하고 싶은 활동이 있나요?',
        desc: 'SLAT, 동아리에서 무엇을 하기, 자율 활동 등등 자유롭게 작성해보기', rows: 4 },
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
  return (act.questions || []).filter(q => q.type !== 'note').map(q => q.id);
}

// 학생에게 열어둔 활동지만 (선생님이 '학생에게 보내기' 를 누른 것)
function aiaOpenFor(cls){
  return aiaListFor(cls).filter(a => AIA_OPEN[a.id]);
}
