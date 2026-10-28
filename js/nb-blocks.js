/* ═══════════════════════════════════════
   nb-blocks.js — 노트북 「🧩 블록 셀」 (2026-10-15)

   엔트리처럼 블록을 끌어다 놓고, 바꿔야 할 자리만 드롭다운으로 고릅니다.
   블록의 **얼굴이 파이썬 그대로**이고, 그 아래에 교과서 문장을 붙였습니다.
   (2026-10-10 선생님 「A 로 가되 설명을 C 처럼 밑에 넣어줘」)

   ━━ 어떻게 돌아가나 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   블록 셀도 **보통 코드 셀과 같은 셀**입니다. 다른 점은 `cell.blocks` 가 있다는 것뿐입니다.
     cell.blocks = [{k:'load', a:{f:'penguins_ko.csv'}}, …]
     cell.source = 그 블록들이 만든 파이썬  ← 실행 · 저장 · ipynb 내려받기가 쓰는 값
   블록을 건드릴 때마다 `source` 를 다시 만들어 넣습니다. 그래서 **실행 · 채점 · 진도 저장은
   하나도 고치지 않아도** 지금 그대로 돕니다. 숫자도 덱 · 가이드북과 어긋나지 않습니다.

   ━━ 모델 이름은 교과서를 따릅니다 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   결정트리는 `dt`, 최근접 이웃은 `knn` 입니다 (교과서 112 · 114쪽 · 가이드북 · 노트북과 같게).
   그래서 fit · 정확도 · 혼동 행렬 블록에는 **어느 모델인지 고르는 드롭다운**이 하나 더 있습니다.

   ━━ 말을 지어내지 않습니다 (CLAUDE.md 5-1 · 5-2) ━━━━━━━━━━━━━━━━━━
   `say` 는 **교과서 문장을 그대로** 옮긴 것이고 `src` 에 나온 쪽을 적었습니다.
   교과서에 없는 것은 `src` 를 비워 둡니다 (지금은 classification_report 하나).

   ━━ 블록을 더하려면 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   아래 NB_BLOCK_DEFS 에 한 줄 넣고 NB_BLOCK_GROUPS 의 묶음에 이름을 적으면 됩니다.
     cat   — 왼쪽 띠 색 (prep · look · clean · plot · ml)
     name  — 서랍에 보이는 이름
     slots — 드롭다운. {키:{opt, def}}
             opt 가 'cols'/'num' 이면 **그 셀이 불러온 데이터의 실제 열 이름**이 들어갑니다.
             opt 가 배열이면 그 배열 그대로. def 는 배열일 때 값, 'cols'/'num' 일 때 자리 번호.
     tpl   — 파이썬. {키} 가 드롭다운 자리입니다.
     say   — 블록 아래 설명 (교과서 문장 그대로)
     src   — 그 말이 나온 교과서 쪽
═══════════════════════════════════════ */

/* ── 데이터마다 실제 열 이름 ──
   드롭다운에 이 이름만 넣으므로 오타로 멈출 일이 없습니다.
   data/*.csv 의 첫 줄과 **글자 그대로** 같아야 합니다. */
const NB_DATASETS = {
  'penguins_ko.csv': {
    cols: ['종', '서식지', '부리 길이(mm)', '부리 깊이(mm)', '날개 길이(mm)', '체질량(g)', '성별'],
    num:  ['부리 길이(mm)', '부리 깊이(mm)', '날개 길이(mm)', '체질량(g)'],
  },
  'fruit_ko.csv': {
    cols: ['종류', '산지', '무게(g)', '지름(mm)', '당도(Brix)', '껍질 두께(mm)'],
    num:  ['무게(g)', '지름(mm)', '당도(Brix)', '껍질 두께(mm)'],
  },
  'drinks_ko.csv': {
    cols: ['이름', '분류', '용량(ml)', '가격(원)', '칼로리(kcal)', '당류(g)', '카페인(mg)'],
    num:  ['용량(ml)', '가격(원)', '칼로리(kcal)', '당류(g)', '카페인(mg)'],
  },
  /* ── 2차 수행평가용 두 개 (2026-10-28) ──
     학생이 **문제 상황을 고르고 그 상황의 데이터를 고릅니다.**
     아래 NB_DATA_ASSESS 에 올려 두어, 평가용 노트북 바깥에서는
     「데이터 불러오기」 드롭다운에 **보이지 않습니다.**
     wildcam(야생동물) · recycle(재활용) 은 **뺐습니다** — 상황을 둘로 줄였습니다
     (2026-10-28 선생님. 재활용은 정보 시간에 이미 다뤘습니다). */
  'farmland_ko.csv': {
    cols: ['쓰임', '위성', '식생지수', '지표면 온도(℃)', '밤 불빛 밝기', '높낮이 변화(m)'],
    num:  ['식생지수', '지표면 온도(℃)', '밤 불빛 밝기', '높낮이 변화(m)'],
  },
  'firewatch_ko.csv': {
    cols: ['판정', '관측소', '온도(℃)', '습도(%)', '미세먼지(㎍/㎥)', '일산화탄소(ppm)'],
    num:  ['온도(℃)', '습도(%)', '미세먼지(㎍/㎥)', '일산화탄소(ppm)'],
  },
};
const NB_DATA_FILES = Object.keys(NB_DATASETS);
const NB_DATA_DEFAULT = 'penguins_ko.csv';

/* 평가용 데이터 — **평가용 노트북 안에서만** 고를 수 있습니다 (2026-10-27 선생님
   「수행평가 선생님 계정이나 test 계정해서만 실행해볼 수 있도록 해줘」).

   평가용 노트북은 nbGate 가 달려 있고(js/nb-open.js), 문이 닫혀 있는 동안은
   **선생님과 test 계정만** 그 노트북을 엽니다. 그래서 문이 닫힌 지금은
   이 세 파일을 선생님과 test 계정만 고를 수 있고, 평가 당일 문을 열면
   그 노트북 안의 학생도 고릅니다. **다른 차시에서는 이름조차 안 보입니다.**

   ⚠ 가릴 수 없는 것 — CSV 자체는 사이트에 있어야 wget 으로 받힙니다.
     주소를 아는 사람은 파일을 받을 수 있습니다. 데이터만으로는 답이 되지
     않지만(어느 지표가 중요한지는 상황 글에도 안 적혀 있습니다) 알아 두십시오. */
const NB_DATA_ASSESS = ['farmland_ko.csv', 'firewatch_ko.csv'];

/* ── 평가용 노트북에서 **가리는 블록** (2026-10-28) ──
   2차 수행평가는 정밀도·재현율을 **학생이 혼동 행렬을 보고 직접 계산**합니다
   (선생님 「애들이 혼동 행렬 보고 직접 계산하라고 할 거야」).
   `classification_report` 블록을 서랍에 남겨 두면 끌어다 놓고 값만 베낍니다.
   그래서 **문이 달린 노트북 안에서만** 이 블록을 서랍에서 뺍니다.
   다른 차시에서는 그대로 보입니다 — 수업에서는 써야 합니다. */
const NB_BLOCK_ASSESS_HIDE = ['report'];

/* 지금 보고 있는 노트북이 평가용(문이 달린 것)인가 */
function nbInAssess(){
  try {
    const nb = (typeof SEL_NOTEBOOK !== 'undefined') ? SEL_NOTEBOOK : null;
    const cid = (typeof IS_TC !== 'undefined' && IS_TC)
      ? ((typeof TC_CLS !== 'undefined' && TC_CLS) ? TC_CLS.id : null)
      : ((typeof ST_USER !== 'undefined' && ST_USER) ? ST_USER.classId : null);
    return !!(nb && cid && typeof nbIsGated === 'function' && nbIsGated(cid, nb.id));
  } catch(err){ return false; }
}

/* 서랍에 보여 줄 블록인가 — 이미 셀에 놓인 블록은 그대로 그립니다 */
function nbBlockInDrawer(k){
  return !(nbInAssess() && NB_BLOCK_ASSESS_HIDE.indexOf(k) >= 0);
}

function nbDataFilesNow(){
  let gated = false;
  try {
    const nb = (typeof SEL_NOTEBOOK !== 'undefined') ? SEL_NOTEBOOK : null;
    const cid = (typeof IS_TC !== 'undefined' && IS_TC)
      ? ((typeof TC_CLS !== 'undefined' && TC_CLS) ? TC_CLS.id : null)
      : ((typeof ST_USER !== 'undefined' && ST_USER) ? ST_USER.classId : null);
    gated = !!(nb && cid && typeof nbIsGated === 'function' && nbIsGated(cid, nb.id));
  } catch(err){ gated = false; }
  return gated ? NB_DATA_FILES
               : NB_DATA_FILES.filter(f => NB_DATA_ASSESS.indexOf(f) < 0);
}
const NB_DATA_URL = 'https://junrepos.github.io/ai-career/data/';

const NB_BLOCK_DEFS = {

  /* ── 준비 ── */
  imp: {
    guide: 'c_setup',   // 준비 — 라이브러리 가져오기
    cat: 'prep', name: '판다스 · 시본 가져오기',
    imp: 'import pandas as pd\nimport seaborn as sns',
    tpl: '',
    say: 'pandas 는 데이터 프레임(표)을 다루는 라이브러리, seaborn 은 그래프를 그리는 라이브러리입니다.',
  },
  load: {
    guide: 'c_load',   // 데이터 불러오기
    cat: 'prep', name: '데이터 불러오기',
    // opt 'files' — 보기 목록을 **그릴 때마다** 구합니다 (nbDataFilesNow).
    // ask 1 — 끌어다 놓으면 「고르세요」로 비어 있습니다. 수행평가에서 학생이
    //          **상황에 맞는 데이터를 고르는 것**이 평가요소 ④ 입니다 (2026-10-27).
    slots: { f: { opt: 'files', def: NB_DATA_DEFAULT, ask: 1 } },
    tpl: '!wget "' + NB_DATA_URL + '{f}"\ndf = pd.read_csv("{f}")',
    say: '파일을 읽어 데이터 프레임 만들기',
    src: '교과서 79쪽',
  },

  /* ── 살펴보기 ── */
  head: {
    guide: 'c_head',   // 처음 몇 행 보기
    cat: 'look', name: '처음 몇 행 보기',
    slots: { f: { kind: 'text', def: '', ans: 'head', ask: 1 }, n: { opt: ['3', '5', '10'], def: '5' } },
    tpl: 'df.{f}({n})',
    say: '처음 5행 보기', src: '교과서 79쪽',
  },
  shape: {
    guide: 'c_shape',   // 행과 열 수
    cat: 'look', name: '행과 열 수 보기',
    slots: { f: { kind: 'text', def: '', ans: 'shape', ask: 1 } },
    tpl: 'print(df.{f})',
    say: '(행 수, 열 수) 입니다.',
    src: '교과서 95쪽',
  },
  info: {
    guide: 'c_info',   // 열 이름과 자료형
    cat: 'look', name: '열 이름과 자료형 보기',
    slots: { f: { kind: 'text', def: '', ans: 'info', ask: 1 } },
    tpl: 'df.{f}()',
    say: '열마다 값의 개수와 자료형', src: '교과서 79쪽',
  },
  vc: {
    guide: 'c_vc',   // 값마다 개수 세기
    cat: 'look', name: '값마다 개수 세기',
    slots: { c: { opt: 'cols', def: 0 }, f: { kind: 'text', def: '', ans: 'value_counts', ask: 1 } },
    tpl: 'df["{c}"].{f}()',
    say: '값마다 개수 세기 (도수분포)', src: '교과서 87쪽',
  },

  /* ── 전처리 ── */
  isnull: {
    guide: 'c_isnull',   // 결측치 세기
    cat: 'clean', name: '열마다 결측치 세기',
    slots: { f: { kind: 'text', def: '', ans: 'isnull', ask: 1 } },
    tpl: 'df.{f}().sum()',
    say: '열마다 결측치 세기', src: '교과서 80쪽',
  },
  dropna: {
    guide: 'c_dropna',   // 결측치 행 삭제
    cat: 'clean', name: '결측치가 있는 행 삭제',
    slots: { f: { kind: 'text', def: '', ans: 'dropna', ask: 1 } },
    tpl: 'df = df.{f}()',
    say: '결측치가 있는 행 삭제하기. df = 로 다시 저장해야 df 가 바뀝니다.',
    src: '교과서 80쪽',
  },
  uniq: {
    guide: 'c_unique',   // 값의 종류 보기
    cat: 'clean', name: '값의 종류 보기 (이상치 찾기)',
    slots: { c: { opt: 'cols', def: 1 }, f: { kind: 'text', def: '', ans: 'unique', ask: 1 } },
    tpl: 'df["{c}"].{f}()',
    say: 'unique() 함수로 속성별로 중복되지 않는 고유한 값의 종류를 출력하여 이상치가 있는지 확인합니다.',
    src: '교과서 81쪽',
  },
  findrow: {
    guide: 'c_findbad',   // 그 값을 가진 행 찾기
    cat: 'clean', name: '그 값을 가진 행 찾기',
    slots: { c: { opt: 'cols', def: 1 }, v: { kind: 'text', def: '.' } },
    tpl: 'df[df["{c}"] == "{v}"]',
    say: '잘못된 값이 있는 행의 인덱스를 확인합니다.',
    src: '교과서 81쪽',
  },
  droprow: {
    guide: 'c_drop',   // 행 번호로 삭제
    cat: 'clean', name: '행 번호로 행 삭제 (이상치)',
    slots: { f: { kind: 'text', def: '', ans: 'drop', ask: 1 }, n: { kind: 'num', def: '336' } },
    tpl: 'df = df.{f}({n}, axis=0)',
    say: '확인한 인덱스에 해당하는 행을 데이터 프레임에서 삭제합니다. ' +
         '괄호 안 숫자가 삭제할 행의 인덱스입니다.',
    src: '교과서 81쪽',
  },

  /* ── 그래프 ── */
  scat: {
    guide: 'c_scatter',   // 산점도
    cat: 'plot', name: '산점도',
    slots: { x: { opt: 'num', def: 0 }, y: { opt: 'num', def: 2 }, h: { opt: 'cols', def: 0 } },
    tpl: 'sns.scatterplot(data=df, x="{x}", y="{y}", hue="{h}")',
    say: '산점도 — 두 속성의 관계. hue 에 넣은 속성의 값마다 색이 달라집니다.',
    src: '교과서 82쪽',
  },
  box: {
    guide: 'c_box',   // 상자그림
    cat: 'plot', name: '상자그림',
    slots: { c: { opt: 'num', def: 3 } },
    tpl: 'sns.boxplot(data=df, x="{c}")',
    say: '상자그림 — 값이 퍼진 모양과 범위를 벗어난 값', src: '교과서 81쪽',
  },
  corr: {
    guide: 'c_corr',   // 상관계수
    cat: 'plot', name: '상관계수',
    tpl: 'df.corr(numeric_only=True)',
    say: '상관계수 — 두 속성의 상관 정도를 수치로 나타낸 값', src: '교과서 77 · 83쪽',
  },

  /* ── 기계학습 ── */
  xy: {
    guide: 'c_xy',   // 특징과 타깃
    cat: 'ml', name: '특징과 타깃 정하기',
    // ask:1 — 끌어다 놓았을 때 **고르지 않은 채**로 나옵니다.
    // 기본값이 곧 정답이면 끌어 놓는 순간 답이 완성됩니다 (2026-10-22 선생님).
    // def 는 검산용 정답으로 그대로 둡니다 (verify/nb_house.py 가 씁니다).
    slots: { a: { opt: 'num', def: 0, ask: 1 }, b: { opt: 'num', def: 1, ask: 1 },
             c: { opt: 'num', def: 2, ask: 1 }, t: { opt: 'cols', def: 0, ask: 1 } },
    // print 가 없으면 셀을 돌려도 아무것도 안 나옵니다 — 노트북 8의 「확인」 은
    // (333, 3) 과 (333,) 가 나온다고 적혀 있습니다 (2026-10-21 고침)
    tpl: 'X = df[["{a}", "{b}", "{c}"]]\ny = df["{t}"]\nprint(X.shape, y.shape)',
    say: '타깃은 예측하려는 속성이고, 특징은 타깃을 예측하려고 사용하는 속성입니다.',
    src: '교과서 106쪽',
  },
  // 특징 개수가 셋으로 고정되지 않는 판 (2026-10-26 선생님 —
  // 「저 안에 속성 "" 이거 지켜서 넣으라고 하면 되지 않을까」).
  // 두 개만 쓰거나 네 개를 다 쓰는 문제에서는 위 xy 로는 만들 수 없습니다.
  // 속성 이름은 **따옴표와 쉼표까지 학생이 그대로** 적습니다.
  // ⚠ 위 xy 는 건드리지 않습니다 — 이미 학생이 푼 노트북이 그 칸 이름(a·b·c)을
  //   저장해 두어서, 틀을 바꾸면 옛 노트북의 블록이 빈칸으로 보입니다.
  xyn: {
    guide: 'c_xy',   // 특징과 타깃
    cat: 'ml', name: '특징을 직접 적고 타깃 정하기',
    slots: { f: { kind: 'text', def: '', ans: '"무게(g)", "지름(mm)"', ask: 1 },
             t: { opt: 'cols', def: 0, ask: 1 } },
    tpl: 'X = df[[{f}]]\ny = df["{t}"]\nprint(X.shape, y.shape)',
    say: '타깃은 예측하려는 속성이고, 특징은 타깃을 예측하려고 사용하는 속성입니다.',
    src: '교과서 106쪽',
  },
  split: {
    guide: 'c_split',   // 훈련 · 테스트 나누기
    cat: 'ml', name: '훈련 · 테스트로 나누기',
    slots: { r: { opt: ['0.2', '0.3', '0.4'], def: '0.3' } },
    // 「확인」 은 (233, 3) (100, 3) 이 나온다고 적혀 있습니다 — print 를 넣습니다 (2026-10-21)
    imp: 'from sklearn.model_selection import train_test_split',
    tpl:          'X_train, X_test, y_train, y_test = train_test_split(\n' +
         '    X, y, test_size={r}, stratify=y, random_state=42)\n' +
         'print(X_train.shape, X_test.shape)',
    say: '훈련 데이터와 테스트 데이터로 나누기. random_state 는 무작위성을 제어하기 위한 시드(seed)값입니다.',
    src: '교과서 100 · 111쪽',
  },
  dt: {
    guide: 'c_dt',   // 결정트리
    cat: 'ml', name: '결정트리 모델 만들기',
    slots: { d: { opt: ['None', '1', '2', '3', '4', '5'], def: 'None' } },
    imp: 'from sklearn.tree import DecisionTreeClassifier',
    tpl:          'dt = DecisionTreeClassifier(max_depth={d}, random_state=42)',
    say: '결정트리는 트리 구조 기반의 알고리즘입니다. 트리의 루트 노드에서부터 각 분기마다 ' +
         '특징에 대한 분할 기준을 만들어 데이터를 분할합니다. 각 특징값을 기준으로 분할하므로 ' +
         '데이터 정규화가 필요 없습니다.',
    src: '교과서 107쪽',
  },
  knn: {
    guide: 'c_knn',   // k-최근접 이웃
    cat: 'ml', name: 'kNN 모델 만들기',
    slots: { k: { opt: ['1', '3', '5', '7', '9'], def: '5' } },
    imp: 'from sklearn.neighbors import KNeighborsClassifier',
    tpl:          'knn = KNeighborsClassifier(n_neighbors={k})',
    say: '예측 데이터에서 가장 가까운 k개의 데이터로 예측하는 방법입니다. 분류를 할 경우 ' +
         'k개의 가장 가까운 데이터 중 다수의 레이블이 예측 데이터의 클래스를 결정합니다.',
    src: '교과서 107쪽',
  },
  fit: {
    guide: 'c_dt',   // 학습 — 결정트리 자리에 함께 있습니다
    cat: 'ml', name: '학습시키기',
    // d — 학습에 **어느 데이터**를 쓸지. 테스트 데이터로 학습하면 틀립니다.
    //     수행평가 ② 「정확하게 학습」 이 이 선택입니다 (2026-10-22 선생님).
    slots: { m: { opt: ['dt', 'knn'], def: 'dt' },
             d: { opt: ['train', 'test'], def: '', ans: 'train', ask: 1 } },
    tpl: '{m}.fit(X_{d}, y_{d})',
    say: '모델을 학습시키기. 학습에는 훈련 데이터를 씁니다.', src: '교과서 100쪽',
  },
  score: {
    guide: 'c_dtscore',   // 분류 정확도
    cat: 'ml', name: '분류 정확도 재기',
    // d — **어느 데이터로 잴지**. 모델의 성능은 테스트 데이터로 봅니다.
    //     수행평가 ③ 「정확하게 평가」 가 이 선택입니다 (2026-10-22 선생님).
    slots: { m: { opt: ['dt', 'knn'], def: 'dt' },
             d: { opt: ['train', 'test'], def: '', ans: 'test', ask: 1 } },
    tpl: 'print({m}.score(X_{d}, y_{d}))',
    say: '분류 정확도는 전체 데이터 중 예측값과 실젯값이 같은 데이터 개수의 비율입니다. ' +
         '모델의 성능은 학습에 쓰지 않은 테스트 데이터로 봅니다.',
    src: '교과서 108 · 112쪽',
  },
  scoret: {
    guide: 'c_dtscore',   // 분류 정확도
    cat: 'ml', name: '정확도 재기 — 테스트 데이터',
    slots: { m: { opt: ['dt', 'knn'], def: 'dt' } },
    tpl: 'print({m}.score(X_test, y_test))',
    say: '테스트 데이터는 학습에 사용하지 않은 데이터입니다. ' +
         '훈련 데이터 점수보다 테스트 데이터 점수가 많이 낮으면 과적합입니다.',
    src: '교과서 95 · 112쪽',
  },
  cm: {
    guide: 'c_cm',   // 혼동 행렬
    cat: 'ml', name: '혼동 행렬',
    slots: { m: { opt: ['dt', 'knn'], def: 'dt' } },
    imp: 'from sklearn.metrics import confusion_matrix',
    tpl:          'print(confusion_matrix(y_test, {m}.predict(X_test)))',
    say: '혼동 행렬은 실제 클래스와 예측 클래스를 비교하여 모델이 각 클래스를 얼마나 ' +
         '정확하게 예측했는지 표시한 행렬입니다.',
    src: '교과서 108 · 115쪽',
  },
  report: {
    guide: 'c_metrics',   // 정밀도 · 재현율
    cat: 'ml', name: '정밀도 · 재현율 표',
    slots: { m: { opt: ['dt', 'knn'], def: 'dt' } },
    imp: 'from sklearn.metrics import classification_report',
    tpl:          'print(classification_report(y_test, {m}.predict(X_test)))',
    say: '정밀도는 모델이 참이라고 분류한 것 중에서 실제 참인 것의 비율이고, ' +
         '재현율은 실제 참인 것 중에서 모델이 참이라고 예측한 것의 비율입니다.',
    src: '교과서 115쪽',
  },
  /* 새로운 데이터로 예측 — 2026-10-28.
     수행평가 ③ 의 4·5점은 「새로운 데이터의 결과를 예측함」 인데, 그 칸이 없어서
     노트북만으로는 3점이 상한이었습니다 (tools/samples/assess2-rubric.md).
     판은 교과서 109쪽 그대로입니다 — `print(knn.predict([[2,5]]))`.
     값은 특징을 고른 순서대로 적어야 하므로 **적는 칸**으로 둡니다. */
  pred: {
    guide: 'c_dtscore',   // 성능 평가 — 예측이 같은 자리에 있습니다
    cat: 'ml', name: '새로운 데이터로 예측하기',
    slots: { m: { opt: ['dt', 'knn'], def: 'dt' },
             v: { kind: 'text', def: '', ans: '2, 5', ask: 1, ph: '값, 값' } },
    tpl: 'print({m}.predict([[{v}]]))',
    say: 'model.predict(): 새로운 데이터에 대한 예측을 수행한다. ' +
         '값은 특징을 고른 순서대로 적는다.',
    src: '교과서 101 · 109쪽',
  },
  tree: {
    guide: 'c_tree',   // 트리 그리기
    cat: 'ml', name: '결정트리 그림 그리기',
    slots: { d: { opt: ['1', '2', '3'], def: '2' } },
    imp: 'import matplotlib.pyplot as plt\nfrom sklearn.tree import plot_tree',
    tpl:          'plt.figure(figsize=(20, 10))\n' +
         'plot_tree(dt, feature_names=X.columns, max_depth={d}, filled=True)\n' +
         'plt.show()',
    say: 'feature_names 는 각 노드에서 분류 결정에 사용된 특징 이름을 지정하고, ' +
         'max_depth 는 트리 최대 깊이이며, filled=True 는 노드 색상으로 채웁니다.',
    src: '교과서 112쪽',
  },
};

const NB_BLOCK_GROUPS = [
  ['준비',     ['imp', 'load']],
  ['살펴보기', ['shape', 'head', 'info', 'vc']],
  ['전처리',   ['isnull', 'dropna', 'uniq', 'findrow', 'droprow']],
  ['그래프',   ['scat', 'box', 'corr']],
  ['기계학습', ['xy', 'xyn', 'split', 'dt', 'knn', 'fit', 'score', 'cm', 'report',
                'pred', 'tree']],
];

/* ── 블록 하나 만들기 — 드롭다운은 기본값으로 ── */
function nbMakeBlock(k, file){
  const d = NB_BLOCK_DEFS[k];
  if(!d) return null;
  const a = {};
  for(const s in (d.slots || {})) a[s] = nbSlotDefault(d.slots[s], file);
  return { k, a };
}

/* 드롭다운 하나의 보기 목록 — 'cols'/'num' 이면 그 데이터의 실제 열 이름 */
function nbSlotOptions(slot, file){
  if(slot.kind) return null;          // 숫자 · 글 입력 칸 — 고를 목록이 없습니다
  if(slot.opt === 'files') return nbDataFilesNow();
  if(slot.opt === 'cols' || slot.opt === 'num'){
    const ds = NB_DATASETS[file] || NB_DATASETS[NB_DATA_DEFAULT];
    return ds[slot.opt];
  }
  return slot.opt;
}
function nbSlotDefault(slot, file){
  if(slot.ask) return '';            // 학생이 고를 자리 — 비워 둡니다
  if(slot.kind) return slot.def;
  const opts = nbSlotOptions(slot, file);
  if(typeof slot.def === 'number') return opts[Math.min(slot.def, opts.length - 1)];
  return opts.includes(slot.def) ? slot.def : opts[0];
}

/* ═══ 빈칸을 선생님이 정합니다 (2026-10-28) ═══════════════════
   예전에는 빈칸 여부가 **블록 정의의 `ask`** 하나였습니다. 그래서 같은 블록이
   모든 셀에서 똑같이 비어 있거나 똑같이 채워져 있었고, 「3절에서는 채워 두고
   5절에서는 비우고」를 앱에서 할 수 없었습니다 (생성기의 show= 로만 됐습니다).

   이제 **블록 하나하나**가 `q` 를 가집니다 — 그 블록에서 학생이 채울 자리 목록입니다.
     cell.blocks = [{k:'score', a:{m:'dt', d:''}, q:['d']}]
   `q` 가 없으면 지금까지와 똑같이 정의의 `ask` 를 씁니다. 그래서 **학생이 이미
   저장해 둔 노트북은 하나도 달라지지 않습니다.** */
function nbSlotAsk(d, b, key){
  const slot = d && d.slots && d.slots[key];
  if(!slot) return false;
  if(b && Array.isArray(b.q)) return b.q.indexOf(key) >= 0;
  return !!slot.ask;
}

/* 지금 이 블록의 빈칸 목록 — `q` 가 없으면 정의의 `ask` 에서 만들어 냅니다.
   선생님이 토글을 처음 누르는 순간 이 값이 `q` 로 굳습니다. */
function nbBlkAskList(d, b){
  if(b && Array.isArray(b.q)) return b.q.slice();
  return Object.keys((d && d.slots) || {}).filter(s => d.slots[s].ask);
}

/* 선생님이 「채워 둠」 으로 바꿀 때 넣을 값.
   적는 칸은 `ans`(검산용 정답)를, 고르는 칸은 `def` 를 넣습니다. */
function nbSlotFill(slot, file){
  if(slot.ans) return slot.ans;
  if(slot.kind) return slot.def;
  const opts = nbSlotOptions(slot, file);
  if(typeof slot.def === 'number') return opts[Math.min(slot.def, opts.length - 1)];
  return opts.includes(slot.def) ? slot.def : opts[0];
}

/* ═══ 블록의 이름과 설명을 선생님이 고칩니다 (2026-10-28) ═══════
   고친 글은 **반 DB** 에 있습니다 — `aiactivity/submissions/{반}/nbBlockText/{블록키}`.
   (`notebooks/{반}` 아래에 두면 loadNotebooks 가 그걸 노트북 하나로 셉니다.)
   정의의 글은 그대로 두므로 「↺ 처음 글로」 가 됩니다.

   ⚠ 설명을 고치면 **교과서 쪽 표시(`src`)를 떼어 냅니다.** 교과서 문장이 아닌데
     쪽을 달아 두면 학생이 거기서 찾습니다 (CLAUDE.md 5-1). 「고침」 같은 표시는
     자료에 넣지 않습니다 (CLAUDE.md 16). */
let NB_BLK_TEXT = {};

function nbBlkName(k){
  const t = NB_BLK_TEXT[k];
  return (t && t.name) || (NB_BLOCK_DEFS[k] && NB_BLOCK_DEFS[k].name) || k;
}
function nbBlkSay(k){
  const d = NB_BLOCK_DEFS[k] || {};
  const t = NB_BLK_TEXT[k];
  if(t && t.say) return {say: t.say, src: '', edited: true};
  return {say: d.say || '', src: d.src || '', edited: false};
}

/* ── 이 셀이 쓰는 데이터 파일 ──
   같은 셀의 「데이터 불러오기」 블록을 먼저 보고, 없으면 앞 셀들에서 찾습니다. */
function nbCellDataFile(cell, allCells){
  const pick = bs => {
    for(let i = (bs || []).length - 1; i >= 0; i--) if(bs[i].k === 'load') return bs[i].a.f;
    return null;
  };
  const here = pick(cell && cell.blocks);
  if(here) return here;
  const list = allCells || [];
  const at = list.indexOf(cell);
  for(let i = (at < 0 ? list.length : at) - 1; i >= 0; i--){
    const f = pick(list[i].blocks);
    if(f) return f;
  }
  return NB_DATA_DEFAULT;
}

/* ── 블록 → 파이썬 ──
   이 결과가 cell.source 가 되고, 실행 · 저장 · 내려받기가 모두 이것을 씁니다. */
/* 블록 → 파이썬.
   noImp 가 참이면 **import 줄을 뺍니다** — 노트북 맨 앞에서 한 번에 선언해 둔
   경우입니다 (2026-10-27 선생님 · 수행평가 노트북). 표시가 없으면 지금까지와
   똑같이 import 를 붙여 내보내므로 옛 노트북은 하나도 달라지지 않습니다. */
function nbBlockCode(blocks, noImp){
  return (blocks || []).map(b => {
    const d = NB_BLOCK_DEFS[b.k];
    if(!d) return '';
    const NL = String.fromCharCode(10);
    const body = (noImp || !d.imp) ? (d.tpl || '')
               : (d.tpl ? d.imp + NL + d.tpl : d.imp);
    return body.replace(/\{(\w+)\}/g, (_, s) => {
      const v = b.a ? b.a[s] : null;
      return (v === undefined || v === null || v === '') ? '___' : v;   // 아직 안 고른 자리
    });
  }).filter(Boolean).join('\n');
}

/* 데이터를 바꾸면 열 이름 드롭다운의 값도 새 데이터의 것으로 바꿉니다 */
function nbRefitBlocks(blocks, file){
  (blocks || []).forEach(b => {
    const d = NB_BLOCK_DEFS[b.k];
    for(const s in (d && d.slots || {})){
      const slot = d.slots[s];
      if(slot.kind) continue;
      if(slot.opt !== 'cols' && slot.opt !== 'num') continue;
      const opts = nbSlotOptions(slot, file);
      // 아직 안 고른 빈칸은 그대로 둡니다. (예전에는 `return` 이라 **그 블록의 남은
      //   칸까지 건너뛰었습니다** — 2026-10-28 고침)
      if(nbSlotAsk(d, b, s) && (b.a[s] === '' || b.a[s] == null)) continue;
      if(!opts.includes(b.a[s])) b.a[s] = nbSlotDefault(slot, file);
    }
  });
  return blocks;
}
