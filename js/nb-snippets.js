/* ═══════════════════════════════════════
   nb-snippets.js — 노트북 「함수 모음」 (2026-10-06)

   빈칸 채우기에서 백지로 넘어가는 중간 단계입니다.
   노트북 위쪽에 지금까지 배운 함수가 단추로 놓여 있고, 누르면
   **고른 코드 셀의 커서 자리에 주석과 함께** 들어갑니다. 그 뒤에 고쳐 쓰면 됩니다.

     [pd.read_csv()] 을 누르면
       # csv 파일을 읽어 표로 만들고 df 에 저장한다
       df = pd.read_csv("penguins_ko.csv")

   단추를 더하거나 고치려면 아래 표만 손보면 됩니다.
     label — 단추에 보이는 글자. **코드에 쓰는 모양 그대로** 적습니다.
     note  — 함께 들어갈 주석 한 줄. 무엇을 하는지만 적습니다.
     code  — 들어갈 코드. 열 이름은 펭귄 데이터의 실제 이름을 씁니다.
═══════════════════════════════════════ */

const NB_SNIPPETS = [
  { group: '준비', items: [
    { label: 'import',
      note: '표를 다루는 pandas 와 그래프를 그리는 seaborn 을 불러온다',
      code: 'import pandas as pd\nimport seaborn as sns' },
    { label: '!wget',
      note: '인터넷에서 펭귄 데이터 파일을 내려받는다',
      code: '!wget "https://junrepos.github.io/ai-career/data/penguins_ko.csv"' },
  ]},

  { group: '표 만들기', items: [
    { label: 'pd.read_csv()',
      note: 'csv 파일을 읽어 표로 만들고 df 에 저장한다',
      code: 'df = pd.read_csv("penguins_ko.csv")' },
  ]},

  { group: '살펴보기', items: [
    { label: 'df.head()',
      note: '처음 5행을 보여 준다 — 괄호 안 숫자를 바꾸면 그만큼 나온다',
      code: 'df.head(5)' },
    { label: 'df.info()',
      note: '열 이름, 값이 있는 칸의 개수, 자료형을 한눈에 보여 준다',
      code: 'df.info()' },
    { label: 'df.describe()',
      note: '수치형 열의 개수 · 평균 · 최솟값 · 최댓값 등을 보여 준다',
      code: 'df.describe()' },
    { label: 'df.shape',
      note: '(행 수, 열 수) 를 보여 준다 — shape 뒤에는 괄호를 붙이지 않는다',
      code: 'print(df.shape)' },
    { label: 'df["열"]',
      note: '열 하나를 고른다 — 열 이름은 큰따옴표 안에 그대로 쓴다',
      code: 'df["부리 길이(mm)"]' },
    { label: '.unique()',
      note: '그 열에 어떤 값들이 들어 있는지 한 번씩 보여 준다',
      code: 'df["성별"].unique()' },
    { label: '.value_counts()',
      note: '그 열의 값마다 몇 개씩 있는지 센다',
      code: 'df["종"].value_counts()' },
  ]},

  { group: '전처리', items: [
    { label: '.isnull().sum()',
      note: '열마다 빈칸이 몇 개인지 센다',
      code: 'df.isnull().sum()' },
    { label: '.dropna()',
      note: '빈칸이 있는 행을 뺀 결과를 df 에 다시 저장한다',
      code: 'df = df.dropna()' },
  ]},

  { group: '그래프', items: [
    { label: 'sns.scatterplot()',
      note: '산점도 — x 와 y 에 열 이름, hue 에 색을 나눌 열을 쓴다',
      code: 'sns.scatterplot(data=df, x="부리 길이(mm)", y="부리 깊이(mm)", hue="종")' },
    { label: 'sns.boxplot()',
      note: '상자그림 — 경계 밖의 값을 점으로 보여 준다',
      code: 'sns.boxplot(data=df, x="체질량(g)")' },
    { label: 'sns.countplot()',
      note: '값마다 몇 개인지 막대로 보여 준다',
      code: 'sns.countplot(data=df, x="종")' },
  ]},

  { group: '상관계수', items: [
    { label: 'df.corr()',
      note: '수치형 열끼리 상관계수를 구한다',
      code: 'df.corr(numeric_only=True)' },
    { label: 'sns.heatmap()',
      note: '상관계수 표를 색의 진하기로 칠해 보여 준다',
      code: 'sns.heatmap(df.corr(numeric_only=True), annot=True)' },
  ]},

  { group: '출력', items: [
    { label: 'print()',
      note: '괄호 안의 것을 화면에 보여 준다',
      code: 'print("여기에 보여 줄 것을 쓴다")' },
  ]},
];

/* 펼침 여부는 브라우저에 기억해 둡니다 (기본값 — 펼침) */
let NB_PALETTE_OPEN = (() => {
  try { return localStorage.getItem('nbPalette') !== 'off'; } catch (e) { return true; }
})();

function nbSetPaletteOpen(on){
  NB_PALETTE_OPEN = !!on;
  try { localStorage.setItem('nbPalette', NB_PALETTE_OPEN ? 'on' : 'off'); } catch (e) {}
}

/* 단추 하나가 넣을 글 — 주석 한 줄 + 코드 */
function nbSnippetText(gi, ii){
  const it = NB_SNIPPETS[gi] && NB_SNIPPETS[gi].items[ii];
  if(!it) return '';
  return '# ' + it.note + '\n' + it.code;
}
