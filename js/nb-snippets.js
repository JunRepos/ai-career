/* ═══════════════════════════════════════
   nb-snippets.js — 노트북 「함수 모음」 (2026-10-06)

   빈칸 채우기에서 백지로 넘어가는 중간 단계입니다.
   사이드바 「🧩 함수」 탭에 지금까지 배운 함수가 놓여 있고, 누르면
   **고른 코드 셀의 커서 자리에 주석과 함께** 들어갑니다. 그 뒤에 고쳐 쓰면 됩니다.

     [pd.read_csv()] 을 누르면
       # csv 파일을 읽어 표로 만든다
       df = pd.read_csv("파일명.csv")

   **열 이름은 "속성명", 파일 이름은 "파일명.csv" 로 둡니다** — 어느 데이터에 쓸지
   모르므로 학생이 그 자리를 자기 데이터의 것으로 바꿔 쓰게 합니다.
   !wget 의 주소만 그대로 둡니다 — 눌러서 바로 내려받아야 하는 줄이라서입니다.

   단추를 더하거나 고치려면 아래 표만 손보면 됩니다.
     label — 단추에 보이는 글자. **코드에 쓰는 모양 그대로** 적습니다.
     note  — 한 줄 설명. 사이드바에 작은 글씨로 보이고, 그대로 주석이 됩니다.
             한 줄에 들어가게 20자 안팎으로 짧게 씁니다.
     tip   — (없어도 됨) 마우스를 올렸을 때 나오는 덧붙임. 자주 틀리는 것을 적습니다.
     code  — 들어갈 코드.
═══════════════════════════════════════ */

const NB_SNIPPETS = [
  { group: '준비', items: [
    { label: 'import',
      note: 'pandas 와 seaborn 을 불러온다',
      tip: 'pd 는 표를 다루고, sns 는 그래프를 그립니다',
      code: 'import pandas as pd\nimport seaborn as sns' },
    { label: '!wget',
      note: '인터넷에서 파일을 내려받는다',
      code: '!wget "https://junrepos.github.io/ai-career/data/penguins_ko.csv"' },
  ]},

  { group: '표 만들기', items: [
    { label: 'pd.read_csv()',
      note: 'csv 파일을 읽어 표로 만든다',
      tip: '파일명.csv 자리에 위에서 내려받은 파일 이름을 그대로 적습니다',
      code: 'df = pd.read_csv("파일명.csv")' },
  ]},

  { group: '살펴보기', items: [
    { label: 'df.head()',
      note: '처음 몇 행을 보여 준다',
      tip: '괄호 안 숫자를 바꾸면 그만큼 나옵니다',
      code: 'df.head(5)' },
    { label: 'df.info()',
      note: '열 이름과 자료형을 보여 준다',
      tip: '값이 있는 칸의 개수도 함께 나와 빈칸을 가늠할 수 있습니다',
      code: 'df.info()' },
    { label: 'df.describe()',
      note: '평균 · 최솟값 · 최댓값을 보여 준다',
      code: 'df.describe()' },
    { label: 'df.shape',
      note: '행 수와 열 수를 보여 준다',
      tip: 'shape 뒤에는 괄호를 붙이지 않습니다',
      code: 'print(df.shape)' },
    { label: 'df["속성명"]',
      note: '열 하나를 고른다',
      tip: '열 이름은 큰따옴표 안에 띄어쓰기까지 그대로 씁니다',
      code: 'df["속성명"]' },
    { label: '.unique()',
      note: '어떤 값들이 있는지 보여 준다',
      code: 'df["속성명"].unique()' },
    { label: '.value_counts()',
      note: '값마다 몇 개인지 센다',
      code: 'df["속성명"].value_counts()' },
  ]},

  { group: '전처리', items: [
    { label: '.isnull().sum()',
      note: '열마다 빈칸이 몇 개인지 센다',
      code: 'df.isnull().sum()' },
    { label: '.dropna()',
      note: '빈칸이 있는 행을 지운다',
      tip: '앞에 df = 를 붙여야 지운 결과가 df 에 저장됩니다',
      code: 'df = df.dropna()' },
  ]},

  { group: '그래프', items: [
    { label: 'sns.scatterplot()',
      note: '산점도 — 두 속성의 관계를 본다',
      tip: 'hue 에 넣은 열의 값마다 색이 달라집니다',
      code: 'sns.scatterplot(data=df, x="속성명", y="속성명", hue="속성명")' },
    { label: 'sns.boxplot()',
      note: '상자그림 — 이상치를 본다',
      tip: 'x 만 쓰면 전체, x 와 y 를 함께 쓰면 집단별로 나뉩니다',
      code: 'sns.boxplot(data=df, x="속성명")' },
    { label: 'sns.countplot()',
      note: '막대그래프 — 값마다 개수를 본다',
      code: 'sns.countplot(data=df, x="속성명")' },
  ]},

  { group: '상관계수', items: [
    { label: 'df.corr()',
      note: '열끼리 상관계수를 구한다',
      tip: 'numeric_only=True 는 수치형 열끼리만 계산하라는 뜻입니다',
      code: 'df.corr(numeric_only=True)' },
    { label: 'sns.heatmap()',
      note: '상관계수를 색으로 칠해 보여 준다',
      code: 'sns.heatmap(df.corr(numeric_only=True), annot=True)' },
  ]},

  { group: '출력', items: [
    { label: 'print()',
      note: '괄호 안의 것을 보여 준다',
      code: 'print("여기에 보여 줄 것을 쓴다")' },
  ]},

  { group: '기계학습 준비', items: [
    { label: 'X = df[[ ]]',
      note: '특징 — 예측에 쓸 속성들',
      tip: '대괄호를 두 번 씁니다. 속성 이름을 쉼표로 이어 적습니다',
      code: 'X = df[["속성명", "속성명", "속성명"]]' },
    { label: 'y = df[ ]',
      note: '타깃 — 예측할 속성 하나',
      tip: '대괄호를 한 번만 씁니다',
      code: 'y = df["속성명"]' },
    { label: 'train_test_split()',
      note: '훈련 · 테스트 데이터로 나눈다',
      tip: 'test_size=0.3 은 테스트를 30% 로 하라는 뜻입니다',
      code: 'from sklearn.model_selection import train_test_split\n'
          + 'X_train, X_test, y_train, y_test = train_test_split(\n'
          + '    X, y, test_size=0.3, stratify=y, random_state=42)\n'
          + 'print(X_train.shape, X_test.shape)' },
  ]},

  { group: '모델 만들기', items: [
    { label: 'DecisionTreeClassifier()',
      note: '결정트리 분류 모델을 만든다',
      tip: 'random_state=42 를 쓰면 돌릴 때마다 같은 트리가 나옵니다',
      code: 'from sklearn.tree import DecisionTreeClassifier\n'
          + 'dt = DecisionTreeClassifier(random_state=42)' },
    { label: 'KNeighborsClassifier()',
      note: 'kNN 분류 모델을 만든다',
      tip: 'n_neighbors 가 k 입니다 — 가까운 이웃을 몇 개 볼지 정합니다',
      code: 'from sklearn.neighbors import KNeighborsClassifier\n'
          + 'knn = KNeighborsClassifier(n_neighbors=5)' },
    { label: 'LinearRegression()',
      note: '선형 회귀 모델을 만든다',
      tip: '수치를 예측할 때 씁니다',
      code: 'from sklearn.linear_model import LinearRegression\n'
          + 'model = LinearRegression()' },
    { label: '.fit()',
      note: '훈련 데이터로 학습시킨다',
      tip: '모델 이름(dt · knn · model)을 자기가 만든 것으로 바꿉니다',
      code: 'dt.fit(X_train, y_train)' },
  ]},

  { group: '예측 · 점수', items: [
    { label: '.score()',
      note: '점수를 구한다',
      tip: '분류는 정확도, 회귀는 결정계수가 나옵니다',
      code: 'print(dt.score(X_train, y_train))\nprint(dt.score(X_test, y_test))' },
    { label: '.predict()',
      note: '테스트 데이터의 결과를 예측한다',
      code: 'dt_pred = dt.predict(X_test)\nprint(dt_pred[:10])' },
    { label: '새 데이터 예측',
      note: '값을 직접 넣어 예측한다',
      tip: 'X 와 열 이름·차례가 같아야 합니다',
      code: 'new = pd.DataFrame([[0, 0, 0]], columns=X.columns)\nprint(dt.predict(new))' },
  ]},

  { group: '분류 모델 평가', items: [
    { label: 'confusion_matrix()',
      note: '혼동 행렬 — 무엇을 무엇으로 예측했나',
      tip: '행은 실젯값, 열은 예측값입니다. classes_ 의 차례로 놓입니다',
      code: 'from sklearn.metrics import confusion_matrix\n'
          + 'print(dt.classes_)\nprint(confusion_matrix(y_test, dt_pred))' },
    { label: 'classification_report()',
      note: '정밀도 · 재현율을 한 번에 본다',
      code: 'from sklearn.metrics import classification_report\n'
          + 'print(classification_report(y_test, dt_pred))' },
    { label: 'plot_tree()',
      note: '결정트리를 그림으로 본다',
      tip: 'max_depth 를 2 쯤으로 두면 위쪽만 크게 보입니다',
      code: 'import matplotlib.pyplot as plt\n'
          + 'from sklearn.tree import plot_tree\n'
          + 'plt.figure(figsize=(16, 8))\n'
          + 'plot_tree(dt, feature_names=X.columns, max_depth=2, filled=True)\n'
          + 'plt.show()' },
  ]},

  { group: '회귀 모델 평가', items: [
    { label: '.coef_ · .intercept_',
      note: '회귀계수와 절편을 본다',
      tip: '예측값 = 회귀계수 × 독립 변수 + 절편',
      code: 'print(model.coef_, model.intercept_)' },
    { label: 'mean_absolute_error()',
      note: '평균절대오차 — 평균 얼마나 틀렸나',
      tip: '단위가 타깃과 같습니다. 작을수록 좋습니다',
      code: 'from sklearn.metrics import mean_absolute_error\n'
          + 'print(mean_absolute_error(y_test, predictions))' },
    { label: 'plt.scatter() · plt.plot()',
      note: '실젯값과 예측한 선을 함께 그린다',
      tip: 'scatter 는 점, plot 은 선입니다',
      code: 'import matplotlib.pyplot as plt\n'
          + 'plt.scatter(X_test, y_test, color="blue")\n'
          + 'plt.plot(X_test, predictions, color="red")\n'
          + 'plt.show()' },
  ]},
];

/* 단추 하나가 넣을 글 — 주석 한 줄 + 코드 */
function nbSnippetText(gi, ii){
  const it = NB_SNIPPETS[gi] && NB_SNIPPETS[gi].items[ii];
  if(!it) return '';
  return '# ' + it.note + '\n' + it.code;
}

/* 마우스를 올렸을 때 나오는 글 — 설명 + (있으면) 덧붙임 */
function nbSnippetTip(it){
  return it.tip ? it.note + '\n' + it.tip : it.note;
}
