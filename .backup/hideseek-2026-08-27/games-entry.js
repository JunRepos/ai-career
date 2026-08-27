  'hide-seek': {
    ico: '🙈', label: '숨바꼭질 · 내가 숨는다',
    desc: '술래(컴퓨터)가 올 순서를 보고 가장 늦게 걸릴 방에 숨기 → 오래 버틸수록 높은 순위',
    view: () => vHideSeek(),
    leave: () => hsLeave(),
    loadRank: () => hsLoadRank(),
    teacherBoard: () => hsBoardForTeacher(),
  },
