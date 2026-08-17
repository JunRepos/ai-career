/* ═══════════════════════════════════════
   aiactivity-data.js — 🧠 인공지능 활동지 정의

   인공지능 단원 학습지를 정의한다. 새 활동을 추가하려면
   AIA_LIST 배열에 항목을 추가하면 된다.

   sections 타입:
   - 'card-fields' : 카드형 textarea 여러 개 (각 필드별 icon/label/placeholder)
   - 'single-text' : 단일 textarea (제목 + 답안 칸)
   - 'rich-text'   : 자유 서술 (긴 textarea)

   학생 답안 저장 키: 각 필드의 id가 답안 객체의 키가 된다.
═══════════════════════════════════════ */

const AIA_LIST = [
  {
    id: 'orientation-ai',
    icon: '🧭',
    title: '나와 인공지능',
    subtitle: '1차시 오리엔테이션',
    subjects: ['ai'],          // 이 활동을 보여줄 과목 (CLASSES 의 type)
    intro: '한 학기를 함께 시작하기 전에, 여러분이 어떤 사람이고 인공지능을 어떻게 만나고 있는지 듣고 싶습니다. 정답이 없는 질문이니 솔직하게 적어주세요. 여기 적은 내용은 선생님만 봅니다.',
    sections: [
      {
        id: 'aboutMe',
        title: '① 나에 대해',
        type: 'card-fields',
        fields: [
          { id: 'careerField', icon: '🧭', label: '진로 및 관심 분야는?',
            placeholder: '아직 정하지 못했다면 "요즘 관심 가는 것" 을 적어도 좋아요.', rows: 3 },
          { id: 'whyThisClass', icon: '🙋', label: '인공지능 기초 과목을 선택한 이유',
            placeholder: '거창하지 않아도 됩니다. 솔직한 이유를 적어주세요.', rows: 3 },
        ],
      },
      {
        id: 'myAI',
        title: '② 내가 만난 인공지능',
        type: 'card-fields',
        fields: [
          { id: 'usingAI', icon: '💬', label: '자주 사용하고 있는 인공지능은?',
            placeholder: '예: ChatGPT, 유튜브 추천, 번역기, 사진 보정 앱 … 무엇을 할 때 쓰는지도 적어주세요.', rows: 3 },
          { id: 'curious', icon: '❓', label: '인공지능 서비스를 쓰면서 궁금했던 점이 있었나요?',
            placeholder: '"이건 어떻게 아는 거지?", "왜 이런 걸 추천하지?" 처럼 지나쳤던 의문도 좋습니다.', rows: 4 },
          { id: 'wantExplore', icon: '🔍', label: '한번 탐구해보고 싶은 인공지능 프로그램·서비스는?',
            placeholder: '직접 써보고 싶거나, 어떻게 만들어졌는지 뜯어보고 싶은 것.', rows: 3 },
        ],
      },
      {
        id: 'semester',
        title: '③ 이번 학기',
        type: 'card-fields',
        fields: [
          { id: 'goal', icon: '🎯', label: '2학기 인공지능 과목을 들으면서 목표는?',
            placeholder: '학기가 끝났을 때 "이건 할 수 있게 됐다" 고 말하고 싶은 것.', rows: 3 },
          { id: 'toTeacher', icon: '✉️', label: '선생님에게 하고 싶은 말이 있나요?',
            placeholder: '바라는 점, 걱정되는 점, 부탁하고 싶은 것 무엇이든 좋아요. (없으면 비워두세요)', rows: 3 },
        ],
      },
    ],
  },
  {
    id: 'agent-design',
    subjects: ['ai', 'info'],
    icon: '🎯',
    title: '실생활 및 진로 분야에서 필요한 지능 에이전트를 설계해보기',
    subtitle: '활동',
    intro: '실생활 또는 본인의 진로 분야와 관련해 도움이 될 만한 지능 에이전트를 직접 설계해봅시다. 에이전트 이름과 간단 설명을 먼저 정한 뒤, 4요소(목표·환경·인식·학습 및 추론·행동)를 차근차근 채우고, 가장 도움이 될 사람도 함께 적어주세요.',
    sections: [
      {
        id: 'agentInfo',
        title: '🤖 내 에이전트 소개',
        type: 'card-fields',
        fields: [
          { id: 'agentName', icon: '🪪', label: '이 름',     placeholder: '예: 진로 도우미 봇',                                       rows: 1 },
          { id: 'agentDesc', icon: '📝', label: '간단 설명', placeholder: '어떤 에이전트인지 한두 문장으로 소개해보세요.',           rows: 2 },
        ],
      },
      {
        id: 'fourElements',
        title: '내 진로 에이전트의 4요소 설계',
        type: 'card-fields',
        fields: [
          { id: 'goal',     icon: '🎯', label: '목 표',           placeholder: '내 에이전트가 사용자에게 무엇을 해주는가?',         rows: 3 },
          { id: 'env',      icon: '🌐', label: '환 경',           placeholder: '이 에이전트가 활동할 공간/상황',                 rows: 3 },
          { id: 'perceive', icon: '👁️', label: '인 식',           placeholder: '어떤 데이터를 어떻게 받아오는가?',                rows: 3 },
          { id: 'learn',    icon: '🧠', label: '학습 및 추론',     placeholder: '받아온 데이터로 무엇을 학습하고 어떻게 판단하는가?', rows: 5 },
          { id: 'act',      icon: '⚙️', label: '행 동',           placeholder: '어떤 결과를 출력하거나 실행하는가?',              rows: 3 },
        ],
      },
      {
        id: 'audience',
        title: '이 에이전트가 가장 도움이 될 사람은?',
        type: 'single-text',
        icon: '👥',
        placeholder: '예: 진로를 고민하는 고등학생 / 시간 관리가 어려운 직장인 ...',
        rows: 2,
      },
    ],
  },
];

function aiaById(id){ return AIA_LIST.find(a => a.id === id) || null; }

// 지금 보고 있는 반의 과목에 해당하는 활동만 — subjects 가 없으면 모든 과목에 노출
function aiaListFor(cls){
  const t = cls?.type;
  return AIA_LIST.filter(a => !a.subjects || a.subjects.includes(t));
}

// 활동지 답안에서 모든 필드 id 추출 (CSV 내보내기 등에서 사용)
function aiaFieldIds(act){
  const ids = [];
  for(const sec of (act.sections || [])){
    if(sec.type === 'card-fields'){
      (sec.fields || []).forEach(f => ids.push(f.id));
    } else if(sec.type === 'single-text' || sec.type === 'rich-text'){
      ids.push(sec.id);
    }
  }
  return ids;
}
