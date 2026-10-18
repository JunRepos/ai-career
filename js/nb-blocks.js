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
};
const NB_DATA_FILES = Object.keys(NB_DATASETS);
const NB_DATA_DEFAULT = 'penguins_ko.csv';
const NB_DATA_URL = 'https://junrepos.github.io/ai-career/data/';

const NB_BLOCK_DEFS = {

  /* ── 준비 ── */
  imp: {
    cat: 'prep', name: '판다스 · 시본 가져오기',
    tpl: 'import pandas as pd\nimport seaborn as sns',
    say: 'pandas 는 데이터 프레임(표)을 다루는 라이브러리, seaborn 은 그래프를 그리는 라이브러리입니다.',
  },
  load: {
    cat: 'prep', name: '데이터 불러오기',
    slots: { f: { opt: NB_DATA_FILES, def: NB_DATA_DEFAULT } },
    tpl: '!wget "' + NB_DATA_URL + '{f}"\ndf = pd.read_csv("{f}")',
    say: '파일을 읽어 데이터 프레임 만들기',
    src: '교과서 79쪽',
  },

  /* ── 살펴보기 ── */
  head: {
    cat: 'look', name: '처음 몇 행 보기',
    slots: { n: { opt: ['3', '5', '10'], def: '5' } },
    tpl: 'df.head({n})',
    say: '처음 5행 보기', src: '교과서 79쪽',
  },
  info: {
    cat: 'look', name: '열 이름과 자료형 보기',
    tpl: 'df.info()',
    say: '열마다 값의 개수와 자료형', src: '교과서 79쪽',
  },
  vc: {
    cat: 'look', name: '값마다 개수 세기',
    slots: { c: { opt: 'cols', def: 0 } },
    tpl: 'df["{c}"].value_counts()',
    say: '값마다 개수 세기 (도수분포)', src: '교과서 87쪽',
  },

  /* ── 전처리 ── */
  isnull: {
    cat: 'clean', name: '열마다 결측치 세기',
    tpl: 'df.isnull().sum()',
    say: '열마다 결측치 세기', src: '교과서 80쪽',
  },
  dropna: {
    cat: 'clean', name: '결측치가 있는 행 삭제',
    tpl: 'df = df.dropna()',
    say: '결측치가 있는 행 삭제하기. df = 로 다시 저장해야 df 가 바뀝니다.',
    src: '교과서 80쪽',
  },
  uniq: {
    cat: 'clean', name: '값의 종류 보기 (이상치 찾기)',
    slots: { c: { opt: 'cols', def: 1 } },
    tpl: 'df["{c}"].unique()',
    say: 'unique() 함수로 속성별로 중복되지 않는 고유한 값의 종류를 출력하여 이상치가 있는지 확인합니다.',
    src: '교과서 81쪽',
  },
  findrow: {
    cat: 'clean', name: '그 값을 가진 행 찾기',
    slots: { c: { opt: 'cols', def: 1 }, v: { kind: 'text', def: '.' } },
    tpl: 'df[df["{c}"] == "{v}"]',
    say: '잘못된 값이 있는 행의 인덱스를 확인합니다.',
    src: '교과서 81쪽',
  },
  droprow: {
    cat: 'clean', name: '행 번호로 행 삭제 (이상치)',
    slots: { n: { kind: 'num', def: '336' } },
    tpl: 'df = df.drop({n}, axis=0)',
    say: '확인한 인덱스에 해당하는 행을 데이터 프레임에서 삭제합니다. ' +
         '괄호 안 숫자가 삭제할 행의 인덱스입니다.',
    src: '교과서 81쪽',
  },

  /* ── 그래프 ── */
  scat: {
    cat: 'plot', name: '산점도',
    slots: { x: { opt: 'num', def: 0 }, y: { opt: 'num', def: 2 }, h: { opt: 'cols', def: 0 } },
    tpl: 'sns.scatterplot(data=df, x="{x}", y="{y}", hue="{h}")',
    say: '산점도 — 두 속성의 관계. hue 에 넣은 속성의 값마다 색이 달라집니다.',
    src: '교과서 82쪽',
  },
  box: {
    cat: 'plot', name: '상자그림',
    slots: { c: { opt: 'num', def: 3 } },
    tpl: 'sns.boxplot(data=df, x="{c}")',
    say: '상자그림 — 값이 퍼진 모양과 범위를 벗어난 값', src: '교과서 81쪽',
  },
  corr: {
    cat: 'plot', name: '상관계수',
    tpl: 'df.corr(numeric_only=True)',
    say: '상관계수 — 두 속성의 상관 정도를 수치로 나타낸 값', src: '교과서 77 · 83쪽',
  },

  /* ── 기계학습 ── */
  xy: {
    cat: 'ml', name: '특징과 타깃 정하기',
    slots: { a: { opt: 'num', def: 0 }, b: { opt: 'num', def: 1 },
             c: { opt: 'num', def: 2 }, t: { opt: 'cols', def: 0 } },
    tpl: 'X = df[["{a}", "{b}", "{c}"]]\ny = df["{t}"]',
    say: '타깃은 예측하려는 속성이고, 특징은 타깃을 예측하려고 사용하는 속성입니다.',
    src: '교과서 106쪽',
  },
  split: {
    cat: 'ml', name: '훈련 · 테스트로 나누기',
    slots: { r: { opt: ['0.2', '0.3', '0.4'], def: '0.3' } },
    tpl: 'from sklearn.model_selection import train_test_split\n' +
         'X_train, X_test, y_train, y_test = train_test_split(\n' +
         '    X, y, test_size={r}, stratify=y, random_state=42)',
    say: '훈련 데이터와 테스트 데이터로 나누기. random_state 는 무작위성을 제어하기 위한 시드(seed)값입니다.',
    src: '교과서 100 · 111쪽',
  },
  dt: {
    cat: 'ml', name: '결정트리 모델 만들기',
    slots: { d: { opt: ['None', '1', '2', '3', '4', '5'], def: 'None' } },
    tpl: 'from sklearn.tree import DecisionTreeClassifier\n' +
         'dt = DecisionTreeClassifier(max_depth={d}, random_state=42)',
    say: '결정트리는 트리 구조 기반의 알고리즘입니다. 트리의 루트 노드에서부터 각 분기마다 ' +
         '특징에 대한 분할 기준을 만들어 데이터를 분할합니다. 각 특징값을 기준으로 분할하므로 ' +
         '데이터 정규화가 필요 없습니다.',
    src: '교과서 107쪽',
  },
  knn: {
    cat: 'ml', name: 'kNN 모델 만들기',
    slots: { k: { opt: ['1', '3', '5', '7', '9'], def: '5' } },
    tpl: 'from sklearn.neighbors import KNeighborsClassifier\n' +
         'knn = KNeighborsClassifier(n_neighbors={k})',
    say: '예측 데이터에서 가장 가까운 k개의 데이터로 예측하는 방법입니다. 분류를 할 경우 ' +
         'k개의 가장 가까운 데이터 중 다수의 레이블이 예측 데이터의 클래스를 결정합니다.',
    src: '교과서 107쪽',
  },
  fit: {
    cat: 'ml', name: '학습시키기',
    slots: { m: { opt: ['dt', 'knn'], def: 'dt' } },
    tpl: '{m}.fit(X_train, y_train)',
    say: '기계학습 모델을 학습시키기', src: '교과서 100쪽',
  },
  score: {
    cat: 'ml', name: '정확도 재기 — 훈련 데이터',
    slots: { m: { opt: ['dt', 'knn'], def: 'dt' } },
    tpl: 'print({m}.score(X_train, y_train))',
    say: '정확도는 전체 데이터 중 예측값과 실젯값이 같은 데이터 개수의 비율입니다. ' +
         '훈련 데이터로 학습한 모델이 그 훈련 데이터를 얼마나 맞히는지 봅니다.',
    src: '교과서 108 · 112쪽',
  },
  scoret: {
    cat: 'ml', name: '정확도 재기 — 테스트 데이터',
    slots: { m: { opt: ['dt', 'knn'], def: 'dt' } },
    tpl: 'print({m}.score(X_test, y_test))',
    say: '테스트 데이터는 학습에 사용하지 않은 데이터입니다. ' +
         '훈련 데이터 점수보다 테스트 데이터 점수가 많이 낮으면 과적합입니다.',
    src: '교과서 95 · 112쪽',
  },
  cm: {
    cat: 'ml', name: '혼동 행렬',
    slots: { m: { opt: ['dt', 'knn'], def: 'dt' } },
    tpl: 'from sklearn.metrics import confusion_matrix\n' +
         'print(confusion_matrix(y_test, {m}.predict(X_test)))',
    say: '혼동 행렬은 실제 클래스와 예측 클래스를 비교하여 모델이 각 클래스를 얼마나 ' +
         '정확하게 예측했는지 표시한 행렬입니다.',
    src: '교과서 108 · 115쪽',
  },
  report: {
    cat: 'ml', name: '정밀도 · 재현율 표',
    slots: { m: { opt: ['dt', 'knn'], def: 'dt' } },
    tpl: 'from sklearn.metrics import classification_report\n' +
         'print(classification_report(y_test, {m}.predict(X_test)))',
    say: '정밀도는 모델이 참이라고 분류한 것 중에서 실제 참인 것의 비율이고, ' +
         '재현율은 실제 참인 것 중에서 모델이 참이라고 예측한 것의 비율입니다.',
    src: '교과서 115쪽',
  },
  tree: {
    cat: 'ml', name: '결정트리 그림 그리기',
    slots: { d: { opt: ['1', '2', '3'], def: '2' } },
    tpl: 'import matplotlib.pyplot as plt\n' +
         'from sklearn.tree import plot_tree\n' +
         'plt.figure(figsize=(20, 10))\n' +
         'plot_tree(dt, feature_names=X.columns, max_depth={d}, filled=True)\n' +
         'plt.show()',
    say: 'feature_names 는 각 노드에서 분류 결정에 사용된 특징 이름을 지정하고, ' +
         'max_depth 는 트리 최대 깊이이며, filled=True 는 노드 색상으로 채웁니다.',
    src: '교과서 112쪽',
  },
};

const NB_BLOCK_GROUPS = [
  ['준비',     ['imp', 'load']],
  ['살펴보기', ['head', 'info', 'vc']],
  ['전처리',   ['isnull', 'dropna', 'uniq', 'findrow', 'droprow']],
  ['그래프',   ['scat', 'box', 'corr']],
  ['기계학습', ['xy', 'split', 'dt', 'knn', 'fit', 'score', 'scoret', 'cm', 'report', 'tree']],
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
  if(slot.opt === 'cols' || slot.opt === 'num'){
    const ds = NB_DATASETS[file] || NB_DATASETS[NB_DATA_DEFAULT];
    return ds[slot.opt];
  }
  return slot.opt;
}
function nbSlotDefault(slot, file){
  if(slot.kind) return slot.def;
  const opts = nbSlotOptions(slot, file);
  if(typeof slot.def === 'number') return opts[Math.min(slot.def, opts.length - 1)];
  return opts.includes(slot.def) ? slot.def : opts[0];
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
function nbBlockCode(blocks){
  return (blocks || []).map(b => {
    const d = NB_BLOCK_DEFS[b.k];
    if(!d) return '';
    return d.tpl.replace(/\{(\w+)\}/g, (_, s) => (b.a && b.a[s] != null) ? b.a[s] : '');
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
      if(!opts.includes(b.a[s])) b.a[s] = nbSlotDefault(slot, file);
    }
  });
  return blocks;
}
