/* ═══════════════════════════════════════
   aiactivity-data.js — 학습지 정의

   학습지에는 두 종류가 있습니다.
     ① 코드에 박아둔 기본 학습지 — 아래 AIA_LIST
     ② 선생님이 앱에서 직접 만든 학습지 — Firebase 에 저장 (AIA_CUSTOM)
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

  /* 인공지능 2차시 — 실생활 인공지능을 '지능의 요소'로 뜯어보기

     설계 의도
       1차시에 물주기 게임으로 인식·추론·예측·문제해결·학습을 '몸으로' 겪었고,
       생성만 안 썼습니다. 이번 시간엔 그 잣대를 실제 서비스에 들이댑니다.
       "AI는 똑똑하다" 가 아니라 "이 AI는 무엇으로 똑똑한가" 를 말하게 하는 게 목표.

     흐름
       고른다 → 하나를 6요소로 분해한다 → 없는 요소를 찾는다(핵심) →
       사람과 견준다 → 안 되는 걸 찾는다 → 내가 설계해본다
     ※ 2번에서 고른 서비스가 3번 표에 자동으로 들어갑니다(fillFrom).
  */
  {
    id: 'ai-s2-traits',
    title: '이 인공지능은 무엇으로 똑똑한가?',
    subtitle: '2차시',
    subjects: ['ai'],
    intro: '지난 시간 물주기에서 여러분은 인식·추론·예측·문제 해결·학습을 직접 썼습니다. 이번엔 그 잣대를 실제 인공지능에 들이대 봅니다. "똑똑하다"는 말 대신, 무엇으로 똑똑한지 말할 수 있게 되는 것이 오늘의 목표입니다.',
    questions: [
      // ── 0. 잣대 정리 ──
      { id: 'recap', type: 'note',
        text: '오늘 쓸 여섯 개의 잣대',
        desc: '인식 — 주변을 감지하고 무엇인지 분별한다 · 추론 — 아는 것에서 새로운 것을 이끌어낸다 · 학습 — 경험에서 패턴을 얻어 적응한다 · 예측 — 지금까지로 앞일을 헤아린다 · 문제 해결 — 전략을 세워 상황을 풀어낸다 · 생성 — 이미지·글·소리를 새로 만들어낸다' },

      // ── 1. 고르기 ──
      { id: 'pickAI', type: 'check', cols: 3,
        text: '오늘(또는 이번 주)에 내가 실제로 쓴 인공지능을 모두 고르세요',
        desc: '쓴 적 없는 건 고르지 마세요. 뒤에서 이 중 하나를 깊게 뜯어봅니다.',
        options: ['유튜브 추천', '인스타·틱톡 추천', '챗GPT 등 AI 챗봇', '번역기(파파고·딥엘)',
                  '얼굴인식 잠금해제', '음성비서(시리·빅스비)', '카메라 필터·보정',
                  '지도 길찾기', '스팸 메일 분류', '음악 추천(스포티파이·멜론)',
                  'AI 그림 생성', '자동완성·맞춤법 검사'] },
      { id: 'pickOther', text: '위에 없는데 내가 쓴 인공지능이 있다면?', rows: 2 },

      // ── 2. 분해 (핵심 활동) ──
      { id: 'breakdown', type: 'table',
        text: '고른 인공지능이 각각 어떤 요소를 쓰는지 표시하세요',
        desc: '쓰는 요소에 O, 안 쓰는 것 같으면 X. 확신이 없으면 △ 로 두고 나중에 이야기해 봅시다.',
        cols: ['인공지능', '인식', '추론', '학습', '예측', '문제 해결', '생성'],
        fillFrom: ['pickAI'],
        extra: 3 },

      // ── 3. 하나를 깊게 ──
      { id: 'oneName', text: '위 중에서 가장 자주 쓰는 것 하나를 고르면?', rows: 1 },
      { id: 'oneHow',
        text: '그 인공지능이 나에게 무엇을 해주는지, 겪은 그대로 적어보세요',
        desc: '예) 내가 본 영상이랑 비슷한 걸 첫 화면에 올려준다',
        rows: 3 },
      { id: 'oneCore',
        text: '그 일을 해내려면 여섯 요소 중 무엇이 가장 중요할까요? 왜 그렇게 생각했나요?',
        desc: '요소 이름 + 그렇게 생각한 근거를 함께 적으세요',
        rows: 4 },

      // ── 4. 없는 것 찾기 (여기가 진짜 목표) ──
      { id: 'missing',
        text: '반대로, 그 인공지능이 쓰지 않는 요소는 무엇인가요?',
        desc: '지난 시간 물주기 게임이 "생성"을 안 썼던 것처럼, 모든 인공지능이 여섯 개를 다 쓰지는 않습니다.',
        rows: 3 },

      // ── 5. 사람과 견주기 ──
      { id: 'vsHuman', type: 'table',
        text: '같은 일을 사람이 한다면? 사람과 인공지능을 견줘 보세요',
        desc: '예: "영상 추천" — 사람(친구)은 내 기분까지 봐서 골라준다 / AI는 수백만 명의 기록에서 패턴을 찾는다',
        cols: ['견주는 점', '사람이 하면', '이 인공지능이 하면'],
        fixed: ['속도·양', '틀렸을 때', '왜 그렇게 했는지 설명'],
        extra: 2 },

      // ── 6. 한계 ──
      { id: 'fail',
        text: '그 인공지능이 엉뚱하게 굴었던 순간이 있나요? 왜 그랬을 것 같나요?',
        desc: '이상한 추천, 어색한 번역, 못 알아듣는 음성인식 등 겪은 일을 떠올려 보세요',
        rows: 4 },

      // ── 7. 설계해보기 ──
      { id: 'design',
        text: '내가 인공지능을 하나 만든다면, 어떤 요소를 쓰는 무엇을 만들고 싶나요?',
        desc: '무엇을 해주는 인공지능인지 + 여섯 요소 중 무엇을 쓸지 함께 적으세요',
        rows: 4 },

      { id: 'question',
        text: '오늘 내용에서 아직 헷갈리거나 더 알고 싶은 점',
        rows: 2 },
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

// 선생님이 만든 학습지 — loadCustomActivities() 가 채웁니다 (반별)
let AIA_CUSTOM = [];

// 기본 + 직접 만든 학습지를 합쳐서, 지금 반의 과목에 해당하는 것만
function aiaListFor(cls){
  const t = cls?.type;
  const builtin = AIA_LIST.filter(a => !a.subjects || a.subjects.includes(t));
  return [...builtin, ...AIA_CUSTOM];
}

/* 실제로 쓰는 학습지 — 숨긴 것은 뺍니다.
   선생님 관리 화면만 aiaListFor() 로 전부 보고(되돌리려고), 나머지는 이걸 씁니다. */
function aiaVisibleFor(cls){
  return aiaListFor(cls).filter(a => !AIA_HIDDEN[a.id]);
}

function aiaById(id){
  return AIA_LIST.find(a => a.id === id) || AIA_CUSTOM.find(a => a.id === id) || null;
}

// 학습지의 모든 문항 id (CSV 내보내기·작성률 계산용)
function aiaFieldIds(act){
  return (act.questions || []).filter(q => q.type !== 'note').map(q => q.id);
}

// 학생에게 열어둔 학습지만 (선생님이 '학생에게 보내기' 를 누른 것)
function aiaOpenFor(cls){
  return aiaVisibleFor(cls).filter(a => AIA_OPEN[a.id]);
}
