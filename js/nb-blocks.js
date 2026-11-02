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

   ━━ 함수 이름 칸(fn)은 채워 둡니다 (2026-11-02 선생님) ━━━━━━━━━━━━━━━
   「함수 빈칸을 끄고 대신 안에 써야 되는 것들은 빈칸을 많이 배치하는 걸로 하자」.
   평가계획서의 어느 수행 수준에도 「함수 이름을 안다」가 없고, 1차시 50분에
   블록 셀 열한 개를 쌓아야 합니다. 그래서 `fn` 에는 `ask` 를 두지 않습니다.
   **비우는 것은 열 이름 · 값 · 숫자 인자 · 모델 이름**입니다 — 어느 열을 볼지(①),
   어느 속성을 특징으로 쓸지(②), 어느 모델을 재는지(③) 가 평가요소입니다.
   반마다 어디를 비울지는 `verify/nb-blank-set.py` 한 곳에서 정합니다.

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
  /* ── 2차 수행평가용 네 개 (2026-10-28 · 2026-11-01 둘 더함) ──
     학생이 **문제 상황을 고르고 그 상황의 데이터를 고릅니다.**
     아래 NB_DATA_ASSESS 에 올려 두어, 평가용 노트북 바깥에서는
     「데이터 불러오기」 드롭다운에 **보이지 않습니다.**
     2026-11-01 선생님 — 「틀을 비슷하게 만들어서 여러 분야의 상황으로」.
     넷 다 **같은 뼈대**입니다 — 240행 · 3클래스 · 수치 4 · 쓸모없는 범주 1 ·
     결측 13 · 범주 오류 2 · 지울 수치 오류 2 · 남길 극단값 1.
     어느 것을 골라도 전처리 결과가 240 → 227 → 225 → 223 으로 같습니다. */
  'farmland_ko.csv': {
    cols: ['쓰임', '위성', '격자 번호', '식생지수', '지표면 온도(℃)', '밤 불빛 밝기',
           '높낮이 변화(m)', '잎 면적 지수', '촬영 고도(km)', '구름량(%)', '영상 선명도'],
    num:  ['식생지수', '지표면 온도(℃)', '밤 불빛 밝기', '높낮이 변화(m)',
           '잎 면적 지수', '촬영 고도(km)', '구름량(%)', '영상 선명도'],
  },
  'firewatch_ko.csv': {
    cols: ['판정', '관측소', '기록 번호', '온도(℃)', '습도(%)', '미세먼지(㎍/㎥)',
           '일산화탄소(ppm)', '초미세먼지(㎍/㎥)', '기압(hPa)', '배터리 전압(V)', '센서 가동 시간(h)'],
    num:  ['온도(℃)', '습도(%)', '미세먼지(㎍/㎥)', '일산화탄소(ppm)',
           '초미세먼지(㎍/㎥)', '기압(hPa)', '배터리 전압(V)', '센서 가동 시간(h)'],
  },
};
const NB_DATA_FILES = Object.keys(NB_DATASETS);
const NB_DATA_DEFAULT = 'penguins_ko.csv';

/* 평가용 데이터 — **평가용 노트북 안에서만** 고를 수 있습니다 (2026-10-27 선생님
   「수행평가 선생님 계정이나 test 계정해서만 실행해볼 수 있도록 해줘」).

   평가용 노트북은 nbGate 가 달려 있고(js/nb-open.js), 문이 닫혀 있는 동안은
   **선생님과 test 계정만** 그 노트북을 엽니다. 그래서 문이 닫힌 지금은
   이 네 파일을 선생님과 test 계정만 고를 수 있고, 평가 당일 문을 열면
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
   다른 차시에서는 그대로 보입니다 — 수업에서는 써야 합니다.

   `load` 도 같이 뺍니다 — 수행평가는 파일 이름을 고르기만 하는 `loadp` 를 씁니다.
   둘이 함께 보이면 이름이 같아(둘 다 「데이터 불러오기」) 어느 것인지 모릅니다. */
const NB_BLOCK_ASSESS_HIDE = ['report', 'load'];

/* 거꾸로 — **평가용 노트북에서만** 서랍에 보이는 블록 (2026-11-03).
   `loadp` 를 다른 차시 서랍에 두면 같은 이름의 블록이 둘 보입니다. */
const NB_BLOCK_ASSESS_ONLY = ['loadp'];

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
  const inA = nbInAssess();
  if(inA && NB_BLOCK_ASSESS_HIDE.indexOf(k) >= 0) return false;
  if(!inA && NB_BLOCK_ASSESS_ONLY.indexOf(k) >= 0) return false;
  return true;
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

  /* ── 파이썬 기초 ──
     가이드북 3장에 코드가 있는데 블록이 없었습니다 (2026-11-03 선생님 —
     「가이드북에 있는 내용 중 회귀 제외하고 다 들어있는지 확인」).
     이 장은 가이드북이 **교과서 쪽을 적지 않았습니다.** 그래서 `src` 를 비웁니다 —
     없는 쪽 번호를 지어 넣지 않습니다. */
  prt: {
    guide: 'c_print',
    cat: 'py', name: '화면에 출력하기',
    slots: { f: { kind: 'text', def: '', ans: 'print', ask: 1 },
             v: { kind: 'text', def: '"안녕하세요"', ph: '출력할 값' } },
    tpl: '{f}({v})',
    say: '괄호 안에 넣는 값을 인수라고 합니다. 글자는 따옴표로 감싸고, '
       + '쉼표로 여러 요소를 넣으면 한 칸씩 띄워 이어서 출력합니다.',
  },
  setvar: {
    guide: 'c_var',
    cat: 'py', name: '변수에 값 저장하기',
    slots: { n: { kind: 'text', def: 'name', ph: '변수 이름' },
             v: { kind: 'text', def: '"아델리펭귄"', ph: '저장할 값' } },
    tpl: '{n} = {v}',
    say: '변수는 값을 저장해 두는 이름입니다. = 는 수학의 「같다」가 아니라 '
       + '오른쪽 값을 왼쪽 변수에 저장하라는 뜻의 대입 연산자입니다.',
  },

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
    /* 2026-11-02 선생님 (아침) — 「파일 이름은 그냥 드롭다운으로 선택할 수 있게
       해주고 (어차피 2개 중 하나니까), read_csv 쪽을 비워줘」.
       그래서 **자리를 둘로 나눴습니다.**
         f — 내려받을 파일을 **고르는 칸**(드롭다운). `pick:1` 이라 빈칸이어도
             적는 칸이 아니라 고르는 칸으로 그립니다.
         g — `read_csv` 에 **학생이 적는 칸**.
       예전에는 `{f}` 하나가 두 줄에 모두 쓰여, 한 칸인데 둘로 보였습니다. */
    slots: {
      f: { opt: 'files', def: NB_DATA_DEFAULT, ask: 1, pick: 1 },
      g: { kind: 'text', def: NB_DATA_DEFAULT, ans: NB_DATA_DEFAULT, ask: 1, ph: '파일 이름' },
    },
    tpl: '!wget "' + NB_DATA_URL + '{f}"\ndf = pd.read_csv("{g}")',
    say: '파일을 읽어 데이터 프레임 만들기',
    src: '교과서 79쪽',
  },
  /* 수행평가 전용 — 파일 이름을 **고르기만** 합니다 (2026-11-02 선생님 메모 —
     「채점 안하니까 블록은 이미 있는 상태로 **파일 명만 드롭 다운으로 고르도록**」).

     ⚠ 왜 `load` 를 고치지 않고 블록을 따로 두나 (2026-11-03 선생님 —
       「블록 변경하면 유지되게 만들어줘야지」) — 11/02 에 `load` 자체에서 적는 칸을
       빼 버려, 파일 이름을 **손으로 적는 연습**이 다른 차시 노트북에서도 함께
       없어졌습니다. 블록 하나를 고치면 그것을 쓰는 **모든 차시**가 따라 바뀝니다.
       그래서 한 차시에서만 다르게 쓸 것은 **블록을 새로 만듭니다.**

     자리는 **하나(f)** 입니다. `{f}` 가 두 줄에 쓰여 칸이 둘로 보이지만, 같은
     자리라 한쪽을 고르면 두 줄이 함께 바뀝니다 (nbTplFill). 학생이 상황에 맞는
     데이터를 고르는 것이라 `ask:1` 로 **비운 채** 나옵니다. */
  loadp: {
    guide: 'c_load',
    cat: 'prep', name: '데이터 불러오기',
    slots: {
      f: { opt: 'files', def: NB_DATA_DEFAULT, ask: 1, pick: 1 },
    },
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
  /* 2026-10-29 — 옛 노트북(1~4번)을 블록으로 옮기면서 빠져 있던 넷을 더합니다.
     넷 다 교과서 말입니다 — columns 책 112 · describe 책 79 · countplot 책 80. */
  cols: {
    guide: 'c_columns',
    cat: 'look', name: '속성 이름 보기',
    slots: { f: { kind: 'text', def: '', ans: 'columns', ask: 1 } },
    tpl: 'df.{f}',
    say: '열(속성) 이름을 모두 보여 줍니다. shape 처럼 뒤에 괄호를 붙이지 않습니다.',
    src: '교과서 112쪽',
  },
  desc: {
    guide: 'c_describe',
    cat: 'look', name: '통계 요약 보기',
    slots: { f: { kind: 'text', def: '', ans: 'describe', ask: 1 } },
    tpl: 'df.{f}()',
    say: '수치형 속성의 개수 · 평균 · 표준편차 · 최솟값 · 최댓값을 보여 줍니다.',
    src: '교과서 79쪽',
  },
  col: {
    guide: 'c_col',
    cat: 'look', name: '한 열만 고르기',
    slots: { c: { opt: 'cols', def: 0, ask: 1 } },
    tpl: 'df["{c}"]',
    say: '대괄호 안에 속성 이름을 따옴표로 감싸 쓰면 그 열만 골라 봅니다.',
    src: '교과서 79쪽',
  },
  /* 가이드북 c_col 에 두 번째 코드 상자로 있는데 블록이 없었습니다 (2026-11-03) */
  col2: {
    guide: 'c_col',
    cat: 'look', name: '여러 열 고르기',
    slots: { a: { opt: 'cols', def: 0, ask: 1 }, b: { opt: 'cols', def: 1, ask: 1 } },
    tpl: 'df[["{a}", "{b}"]]',
    say: '대괄호를 두 겹으로 쓰면 여러 열을 한꺼번에 골라 봅니다.',
    src: '교과서 79쪽',
  },
  count: {
    guide: 'c_countplot',
    cat: 'look', name: '막대그래프',
    slots: { fn: { kind: 'text', def: 'countplot', ans: 'countplot', ph: '함수 이름' }, c: { opt: 'cols', def: 0, ask: 1 } },
    imp: 'import seaborn as sns',
    tpl: 'sns.{fn}(x=df["{c}"])',
    say: '값마다 개수를 세어 막대그래프로 그립니다.',
    src: '교과서 80쪽',
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
    slots: { fn: { kind: 'text', def: 'scatterplot', ans: 'scatterplot', ph: '함수 이름' }, x: { opt: 'num', def: 0 }, y: { opt: 'num', def: 2 }, h: { opt: 'cols', def: 0 } },
    tpl: 'sns.{fn}(data=df, x="{x}", y="{y}", hue="{h}")',
    say: '산점도 — 두 속성의 관계. hue 에 넣은 속성의 값마다 색이 달라집니다.',
    src: '교과서 82쪽',
  },
  box: {
    guide: 'c_box',   // 상자그림
    cat: 'clean', name: '상자그림',
    slots: { fn: { kind: 'text', def: 'boxplot', ans: 'boxplot', ph: '함수 이름' }, c: { opt: 'num', def: 3 } },
    tpl: 'sns.{fn}(data=df, x="{c}")',
    say: '상자그림 — 값이 퍼진 모양과 범위를 벗어난 값', src: '교과서 81쪽',
  },
  /* ── 2026-11-02 선생님 — 「타겟값을 기준으로 하는 그 x축 y축 해서 하는거
       있잖아. 그거 boxplot 그리게 해주고」 ──
     13~21차시 노트북에서 `sns.boxplot(data=df, x="종", y="체질량(g)")` 로
     가르친 꼴 그대로입니다. `box`(x 하나)와 `boxall`(여덟 장을 한 번에) 사이에
     **속성 하나를 클래스별로** 그리는 칸이 없었습니다.
     쓰는 곳 — 2차 수행평가 노트북 5번(이상치 확인 · 핵심 속성 고르기). */
  boxc: {
    guide: 'c_box',   // 상자그림
    cat: 'clean', name: '클래스별 상자그림',
    slots: { fn: { kind: 'text', def: 'boxplot', ans: 'boxplot', ph: '함수 이름' },
             x: { opt: 'cols', def: 0, ask: 1 }, y: { opt: 'num', def: 0, ask: 1 } },
    tpl: 'sns.{fn}(data=df, x="{x}", y="{y}")',
    say: '클래스별 상자그림 — x 에 타깃값, y 에 속성. 상자 셋이 떨어져 있으면 '
       + '그 속성으로 클래스가 갈리고, 상자 밖에 찍힌 점이 이상치입니다.',
    src: '교과서 76 · 81쪽',
  },
  /* ── 2026-11-01 선생님 — 「산점도로 핵심 속성 구하는 건 노가다 아냐?」 ──
     속성이 8개면 두 개씩 짝지은 산점도가 28장입니다. 클래스별 상자그림은
     속성 하나에 한 장이라 8장이고, 이 블록은 그 8장을 **한 번에** 그립니다.
     세 상자가 떨어져 있으면 쓸모 있는 속성, 겹쳐 있으면 버립니다.
     근거 — 교과서 76쪽 「핵심 속성은 데이터 분포 … 를 분석하여 추출할 수 있다」,
            13~21차시 노트북에서 `sns.boxplot(data=df, x="종", y="체질량(g)")` 로 가르쳤습니다. */
  boxall: {
    guide: 'c_boxall',
    cat: 'clean', name: '속성마다 클래스별 상자그림',
    slots: { t: { opt: 'cols', def: 0, ask: 1 } },
    tpl: 'for c in df.select_dtypes("number").columns:\n'
       + '    sns.boxplot(data=df, x="{t}", y=c)\n'
       + '    plt.title(c)\n'
       + '    plt.show()',
    imp: 'import seaborn as sns\nimport matplotlib.pyplot as plt',
    say: '수치 속성마다 클래스별 상자그림을 그립니다. '
       + '세 상자가 떨어져 있으면 그 속성으로 클래스가 갈립니다.',
    src: '교과서 76 · 81쪽',
  },
  corr: {
    guide: 'c_corr',   // 상관계수
    cat: 'plot', name: '상관계수',
    slots: { fn: { kind: 'text', def: 'corr', ans: 'corr', ph: '함수 이름' } },
    tpl: 'df.{fn}(numeric_only=True)',
    say: '상관계수 — 두 속성의 상관 정도를 수치로 나타낸 값', src: '교과서 77 · 83쪽',
  },
  /* 가이드북 c_heatmap 에 있는데 블록이 없었습니다 (2026-11-03).
     상관계수를 색으로 보는 것은 핵심 속성 추출의 근거라 꼭 필요합니다. */
  heat: {
    guide: 'c_heatmap',
    cat: 'plot', name: '히트맵 — 상관계수를 색으로',
    // `fn` 은 **채워 두는** 자리입니다 (corr · count 와 같은 규칙).
    // 함수 이름을 비우는 자리는 `f` 로 씁니다 — verify/nb-blank-set.py.
    slots: { fn: { kind: 'text', def: 'heatmap', ans: 'heatmap', ph: '함수 이름' } },
    imp: 'import seaborn as sns',
    tpl: 'sns.{fn}(df.corr(numeric_only=True), annot=True, cmap="Greens")',
    say: '색이 진할수록 상관계수가 큽니다. 칸의 숫자가 상관계수이고, '
       + '대각선의 1 은 자기 자신과의 상관계수라 늘 1 입니다.',
    src: '교과서 83쪽',
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
    // 2026-10-29 선생님 — 「train_test_split 부분에 stratify 도 뚫고」.
    //   test_size · stratify · random_state 를 **각각 적게** 합니다.
    //   셋이 무엇을 하는지 모르면 나눈 결과를 설명할 수 없습니다 (평가요소 ③).
    slots: { fn: { kind: 'text', def: 'train_test_split', ans: 'train_test_split', ph: '함수 이름' }, r: { kind: 'text', def: '0.3', ans: '0.3', ask: 1, ph: '0.3' },
             s: { kind: 'text', def: 'y', ans: 'y', ask: 1, ph: 'y' },
             d: { kind: 'num', def: '42', ans: '42', ask: 1, ph: '42' } },
    // 「확인」 은 (233, 3) (100, 3) 이 나온다고 적혀 있습니다 — print 를 넣습니다 (2026-10-21)
    imp: 'from sklearn.model_selection import train_test_split',
    tpl:          'X_train, X_test, y_train, y_test = {fn}(\n' +
         '    X, y, test_size={r}, stratify={s}, random_state={d})\n' +
         'print(X_train.shape, X_test.shape)',
    say: '훈련 데이터와 테스트 데이터로 나누기. '
       + 'test_size 는 테스트 데이터의 비율, stratify 는 클래스를 두 쪽에 '
       + '고르게 나누라는 뜻이고, random_state 는 무작위성을 제어하기 위한 시드(seed)값입니다.',
    src: '교과서 100 · 111쪽',
  },
  dt: {
    guide: 'c_dt',   // 결정트리
    cat: 'ml', name: '결정트리 모델 만들기',
    slots: { fn: { kind: 'text', def: 'DecisionTreeClassifier', ans: 'DecisionTreeClassifier', ph: '함수 이름' }, d: { opt: ['None', '1', '2', '3', '4', '5'], def: 'None' } },
    imp: 'from sklearn.tree import DecisionTreeClassifier',
    tpl:          'dt = {fn}(max_depth={d}, random_state=42)',
    say: '결정트리는 트리 구조 기반의 알고리즘입니다. 트리의 루트 노드에서부터 각 분기마다 ' +
         '특징에 대한 분할 기준을 만들어 데이터를 분할합니다. 각 특징값을 기준으로 분할하므로 ' +
         '데이터 정규화가 필요 없습니다.',
    src: '교과서 107쪽',
  },
  knn: {
    guide: 'c_knn',   // k-최근접 이웃
    cat: 'ml', name: 'kNN 모델 만들기',
    slots: { fn: { kind: 'text', def: 'KNeighborsClassifier', ans: 'KNeighborsClassifier', ph: '함수 이름' }, k: { opt: ['1', '3', '5', '7', '9'], def: '5' } },
    imp: 'from sklearn.neighbors import KNeighborsClassifier',
    tpl:          'knn = {fn}(n_neighbors={k})',
    say: '예측 데이터에서 가장 가까운 k개의 데이터로 예측하는 방법입니다. 분류를 할 경우 ' +
         'k개의 가장 가까운 데이터 중 다수의 레이블이 예측 데이터의 클래스를 결정합니다.',
    src: '교과서 107쪽',
  },
  fit: {
    guide: 'c_dt',   // 학습 — 결정트리 자리에 함께 있습니다
    cat: 'ml', name: '학습시키기',
    // d — 학습에 **어느 데이터**를 쓸지. 테스트 데이터로 학습하면 틀립니다.
    //     수행평가 ② 「정확하게 학습」 이 이 선택입니다 (2026-10-22 선생님).
    slots: { fn: { kind: 'text', def: 'fit', ans: 'fit', ph: '함수 이름' }, m: { opt: ['dt', 'knn'], def: 'dt' },
             d: { opt: ['train', 'test'], def: '', ans: 'train', ask: 1 } },
    tpl: '{m}.{fn}(X_{d}, y_{d})',
    say: '모델을 학습시키기. 학습에는 훈련 데이터를 씁니다.', src: '교과서 100쪽',
  },
  score: {
    guide: 'c_dtscore',   // 분류 정확도
    cat: 'eval', name: '분류 정확도 재기',
    // d — **어느 데이터로 잴지**. 모델의 성능은 테스트 데이터로 봅니다.
    //     수행평가 ③ 「정확하게 평가」 가 이 선택입니다 (2026-10-22 선생님).
    slots: { fn: { kind: 'text', def: 'score', ans: 'score', ph: '함수 이름' }, m: { opt: ['dt', 'knn'], def: 'dt' },
             d: { opt: ['train', 'test'], def: '', ans: 'test', ask: 1 } },
    tpl: 'print({m}.{fn}(X_{d}, y_{d}))',
    say: '분류 정확도는 전체 데이터 중 예측값과 실젯값이 같은 데이터 개수의 비율입니다. ' +
         '모델의 성능은 학습에 쓰지 않은 테스트 데이터로 봅니다.',
    src: '교과서 108 · 112쪽',
  },
  scoret: {
    guide: 'c_dtscore',   // 분류 정확도
    cat: 'eval', name: '정확도 재기 — 테스트 데이터',
    slots: { fn: { kind: 'text', def: 'score', ans: 'score', ph: '함수 이름' }, m: { opt: ['dt', 'knn'], def: 'dt' } },
    tpl: 'print({m}.{fn}(X_test, y_test))',
    say: '테스트 데이터는 학습에 사용하지 않은 데이터입니다. ' +
         '훈련 데이터 점수보다 테스트 데이터 점수가 많이 낮으면 과적합입니다.',
    src: '교과서 95 · 112쪽',
  },
  /* 2026-10-29 — 혼동 행렬을 읽기 전에 **가로·세로 차례**를 봐야 합니다.
     차례를 모르면 어느 칸이 TP 인지 알 수 없어 접을 수가 없습니다.
     10/28 수업과 가이드북(c_classes)에 있는데 블록만 없었습니다. */
  classes: {
    guide: 'c_classes',
    cat: 'eval', name: '클래스 차례 확인',
    slots: { fn: { kind: 'text', def: 'classes_', ans: 'classes_', ph: '함수 이름' }, m: { opt: ['dt', 'knn'], def: 'dt' } },
    tpl: 'print({m}.{fn})',
    say: '혼동 행렬의 가로와 세로가 어느 클래스 차례인지 알려 줍니다. '
       + '나오는 차례대로 행과 열이 놓입니다.',
    src: '교과서 108쪽',
  },
  cm: {
    guide: 'c_cm',   // 혼동 행렬
    cat: 'eval', name: '혼동 행렬',
    slots: { fn: { kind: 'text', def: 'confusion_matrix', ans: 'confusion_matrix', ph: '함수 이름' }, m: { opt: ['dt', 'knn'], def: 'dt' } },
    imp: 'from sklearn.metrics import confusion_matrix',
    tpl:          'print({fn}(y_test, {m}.predict(X_test)))',
    say: '혼동 행렬은 실제 클래스와 예측 클래스를 비교하여 모델이 각 클래스를 얼마나 ' +
         '정확하게 예측했는지 표시한 행렬입니다.',
    src: '교과서 108 · 115쪽',
  },
  report: {
    guide: 'c_report',   // 정밀도 · 재현율 표
    cat: 'eval', name: '정밀도 · 재현율 표',
    slots: { fn: { kind: 'text', def: 'classification_report', ans: 'classification_report', ph: '함수 이름' }, m: { opt: ['dt', 'knn'], def: 'dt' } },
    imp: 'from sklearn.metrics import classification_report',
    tpl:          'print({fn}(y_test, {m}.predict(X_test)))',
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
    // 2026-11-02 — c_dtscore 를 가리키고 있었습니다. 거기에는 정확도만 있고
    //   새 데이터 예측은 c_new 에 있습니다. 「?」 를 눌러도 안 나왔습니다.
    guide: 'c_new',
    cat: 'ml', name: '새로운 데이터로 예측하기',
    slots: { fn: { kind: 'text', def: 'predict', ans: 'predict', ph: '함수 이름' }, m: { opt: ['dt', 'knn'], def: 'dt' },
             v: { kind: 'text', def: '', ans: '2, 5', ask: 1, ph: '값, 값' } },
    tpl: 'print({m}.{fn}([[{v}]]))',
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

/* ── 서랍 묶음 (2026-11-03 선생님 — 「블록들이 범주화가 안되어있는 상태니까
   그것 좀 범주화 시켜봐」) ──

   묶음과 차례를 **가이드북 장 그대로** 둡니다. 서랍에서 찾은 자리와 가이드북에서
   읽는 자리가 같아야 학생이 헤매지 않습니다. 내가 지어낸 묶음이 아닙니다.

     3 파이썬 기초                      → 파이썬 기초
     4 데이터 불러오기 · 살펴보기          → 준비 · 불러오기 / 살펴보기
     5 데이터 전처리                     → 데이터 전처리   (상자그림이 여기 있습니다)
     6 핵심 속성 추출                    → 핵심 속성 추출  (산점도 · 상관계수 · 히트맵)
     7 기계학습 유형과 모델 만드는 절차     → 훈련 · 테스트 나누기
     8 회귀 — 선형 회귀                  → (가르치지 않습니다. 블록 없음)
     9 분류 — 결정트리 · kNN · 성능 평가   → 모델 만들고 학습 / 성능 평가 / 예측

   전에는 그래프가 한 묶음에 몰려 있어, **상자그림(이상치 찾기)** 과
   **산점도·상관계수(속성 고르기)** 가 같은 칸에 있었습니다. 둘은 하는 일이
   다릅니다 — 가이드북도 5장과 6장으로 나눠 놓았습니다.

   ⚠ `scoret` 는 일부러 넣지 않았습니다 — 옛 노트북에만 쓰인 블록입니다
     (서랍 밖 블록은 블록 편집기의 「서랍에 없는 것」 에 나옵니다).
   ⚠ `loadp` 는 수행평가에서만, `load` 는 그 밖에서만 보입니다 (nbBlockInDrawer). */
const NB_BLOCK_GROUPS = [
  ['파이썬 기초',        ['prt', 'setvar']],
  ['준비 · 불러오기',    ['imp', 'load', 'loadp']],
  ['살펴보기',           ['shape', 'head', 'info', 'cols', 'desc', 'col', 'col2',
                           'vc', 'count']],
  ['데이터 전처리',      ['isnull', 'dropna', 'uniq', 'findrow', 'droprow',
                           'box', 'boxc', 'boxall']],
  ['핵심 속성 추출',     ['scat', 'corr', 'heat']],
  ['훈련 · 테스트 나누기', ['xy', 'xyn', 'split']],
  ['모델 만들고 학습',   ['dt', 'knn', 'fit']],
  ['성능 평가',          ['score', 'classes', 'cm', 'report']],
  ['예측 · 트리 그림',   ['pred', 'tree']],
];

/* ── 블록 하나 만들기 — 드롭다운은 기본값으로 ── */
function nbMakeBlock(k, file){
  const d = NB_BLOCK_DEFS[k];
  if(!d) return null;
  // 선생님이 **반 전체로 정해 둔 빈칸**을 따릅니다 (2026-10-29).
  //   빈칸이면 비워 두고, 아니면 기본값을 채웁니다.
  const ask = (typeof nbBlkAskDefault === 'function')
    ? nbBlkAskDefault(k)
    : Object.keys(d.slots || {}).filter(x => d.slots[x].ask);
  const a = {};
  for(const s in (d.slots || {})){
    a[s] = ask.indexOf(s) >= 0 ? '' : nbSlotFill(d.slots[s], file);
  }
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
/* 빈칸에 흐리게 띄울 안내 — **답을 알려 주지 않고** 무엇을 적을 자리인지만 (2026-10-29).
   보기 목록을 없애고 직접 적게 했으므로, 어떤 종류의 값인지는 알려 줘야 합니다. */
function nbSlotHint(slot, file){
  if(slot.ph) return slot.ph;
  if(slot.kind) return '함수 이름';
  if(slot.opt === 'files') return '파일 이름';
  if(slot.opt === 'cols') return '열 이름';
  if(slot.opt === 'num') return '숫자 열 이름';
  if(Array.isArray(slot.opt)){
    const o = slot.opt;
    if(o.every(v => /^[0-9.]+$/.test(String(v)))) return '숫자';
    if(o.length <= 4) return o.join(' / ');       // dt / knn · train / test
  }
  return '값';
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
  // ① 이 자리에만 정해 둔 것 → ② 반 전체 설정 → ③ 정의 (2026-10-29)
  if(b && Array.isArray(b.q)) return b.q.indexOf(key) >= 0;
  if(b && b.k && typeof nbBlkAskDefault === 'function'){
    return nbBlkAskDefault(b.k).indexOf(key) >= 0;
  }
  return !!slot.ask;
}

/* 지금 이 블록의 빈칸 목록 — `q` 가 없으면 정의의 `ask` 에서 만들어 냅니다.
   선생님이 토글을 처음 누르는 순간 이 값이 `q` 로 굳습니다. */
function nbBlkAskList(d, b){
  if(b && Array.isArray(b.q)) return b.q.slice();
  if(b && b.k && typeof nbBlkAskDefault === 'function') return nbBlkAskDefault(b.k);
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

/* ═══ 정답 확인 (2026-10-29 선생님) ═══════════════════════════════
   빈칸을 **직접 적게** 바꾸면서, 스스로 맞춰 볼 자리가 필요해졌습니다.

   ⚠ 데이터에 따라 답이 달라지는 칸(열 이름 · 파일 이름)은 **채점하지 않습니다.**
     그런 칸의 답은 그 차시에 쓰는 데이터마다 다르고, 맞는지는 **실행해 보면**
     바로 압니다. 여기서 채점하면 틀린 ✖ 를 내놓게 됩니다.
   ⚠ 평가용 노트북에서는 **아예 쓰지 않습니다** — 화면에 단추를 내지 않습니다. */
const NB_ANS_BYDATA = ['cols', 'num', 'files'];

function nbSlotCheckable(slot){
  if(slot.ans != null && slot.ans !== '') return true;
  if(slot.kind) return false;                       // ans 없는 적는 칸 — 알 수 없음
  return !NB_ANS_BYDATA.includes(slot.opt);         // 보기가 고정된 칸만
}

/** 블록 하나를 채점합니다 → [{slot, got, want, ok}] · 채점 못 하는 칸은 뺍니다 */
function nbBlkCheck(d, b, file){
  const out = [];
  for(const key of nbBlkAskList(d, b)){
    const slot = (d.slots || {})[key];
    if(!slot || !nbSlotCheckable(slot)) continue;
    const want = String(nbSlotFill(slot, file) ?? '').trim();
    const got = String((b.a || {})[key] ?? '').trim();
    out.push({ slot: key, got, want, ok: got !== '' && got === want });
  }
  // 선생님이 코드에 직접 뚫은 자리 — 원래 있던 글자가 곧 정답입니다 (2026-10-29)
  nbHoles(b).forEach(h => {
    const want = nbHoleWant(d, h).trim();
    if(!want) return;
    const got = nbHoleVal(b, h).trim();
    out.push({ hole: nbHoleKey(h), got, want, ok: got !== '' && got === want });
  });
  return out;
}

/** 셀 하나 → {done, total, wrong:[{bi,slot}], bydata} */
function nbCellCheck(cell, file){
  let done = 0, total = 0, bydata = 0;
  const wrong = [];
  (cell.blocks || []).forEach((b, bi) => {
    const d = NB_BLOCK_DEFS[b.k];
    if(!d) return;
    for(const key of nbBlkAskList(d, b)){
      const slot = (d.slots || {})[key];
      if(slot && !nbSlotCheckable(slot)) bydata++;
    }
    nbBlkCheck(d, b, file).forEach(r => {
      total++;
      if(r.ok) done++; else wrong.push({ bi, slot: r.slot, hole: r.hole });
    });
  });
  return { done, total, wrong, bydata };
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

/* ── 빈칸을 **반 전체에** 정하기 (2026-10-29 선생님) ──
   「빈칸을 어디에 뚫는지도 설정할 수 있도록」.

   지금까지 빈칸은 두 곳에서 왔습니다.
     · 정의의 `ask` — 레포에 박혀 있어 선생님이 못 고칩니다
     · 셀의 `q`    — 그 **한 자리**에만 걸립니다
   가운데에 **반 전체 설정**을 둡니다. 새로 끌어다 놓는 블록부터 그대로 따릅니다.
   `NB_BLK_TEXT[k].q` 에 담습니다 — 이름·설명과 **같은 자리**라 한 번만 읽으면 됩니다. */
function nbBlkAskDefault(k){
  const t = NB_BLK_TEXT[k];
  if(t && Array.isArray(t.q)) return t.q.slice();
  const d = NB_BLOCK_DEFS[k] || {};
  return Object.keys(d.slots || {}).filter(s => d.slots[s].ask);
}
/* 선생님이 반 전체 설정을 건드렸나 — 「↺ 처음대로」 를 보일지 정합니다 */
function nbBlkAskEdited(k){
  return Array.isArray((NB_BLK_TEXT[k] || {}).q);
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
    const body = nbTplFill(d, b);
    // ⚠ import 줄은 **채운 뒤에** 앞에 붙입니다. 먼저 붙이면 글자 자리가 밀려
    //   선생님이 코드에 뚫어 둔 빈칸이 엉뚱한 곳을 가리킵니다 (2026-10-29).
    return (noImp || !d.imp) ? body : (body ? d.imp + NL + body : d.imp);
  }).filter(Boolean).join('\n');
}

/* ═══ 코드 아무 자리나 빈칸으로 (2026-10-29 선생님) ═══════════════
   「내가 코드에서 빈칸을 어디에다 뚫을지 설정할 수 있도록 해달라고」.

   지금까지 빈칸은 블록이 **미리 가진 칸**(파일 이름 · 열 이름 · 숫자)에만
   뚫렸습니다. `df.dropna()` 의 `dropna` 처럼 칸이 아닌 글자는 못 뚫었습니다.
   그래서 선생님이 코드를 끌어서 고르면 그 자리를 빈칸으로 둡니다.

   어디를 뚫었는지는 **블록 정의의 `tpl` 안 글자 자리**(시작·끝)로 적습니다.
   `tpl` 은 레포에 박혀 있어 변하지 않으므로, 블록을 다시 그려도 자리가 그대로입니다.
     · `b.h`  = [[시작, 끝], …]  — 뚫어 둔 자리
     · `b.hv` = {"시작-끝": "학생이 적은 값"}
   둘 다 블록 안에 있어서 저장·내려받기·학생 진도에 그대로 따라갑니다. */
function nbHoles(b){
  return (b && Array.isArray(b.h) ? b.h : [])
    .filter(h => Array.isArray(h) && h.length === 2 && h[1] > h[0])
    .slice().sort((x, y) => x[0] - y[0]);
}
function nbHoleKey(h){ return h[0] + '-' + h[1]; }
function nbHoleVal(b, h){ return String(((b && b.hv) || {})[nbHoleKey(h)] ?? ''); }
/** 이 자리에 원래 있던 글자 — 정답입니다 */
function nbHoleWant(d, h){ return String((d && d.tpl) || '').slice(h[0], h[1]); }

/** 블록 하나를 파이썬으로. 칸과 **뚫어 둔 자리**를 함께 채웁니다. */
function nbTplFill(d, b){
  const tpl = (d && d.tpl) || '';
  if(!tpl) return '';
  const hs = nbHoles(b);
  // 글자 구간 [a, e) — 그 안에 든 빈칸은 학생이 적은 값으로 바꿉니다
  const lit = (a, e) => {
    let out = '', cur = a;
    hs.forEach(h => {
      if(h[0] < cur || h[1] > e) return;
      const v = nbHoleVal(b, h);
      out += tpl.slice(cur, h[0]) + (v === '' ? '___' : v);
      cur = h[1];
    });
    return out + tpl.slice(cur, e);
  };
  let out = '', i = 0, m;
  const re = /\{(\w+)\}/g;
  while((m = re.exec(tpl))){
    out += lit(i, m.index);
    const v = b && b.a ? b.a[m[1]] : null;
    out += (v === undefined || v === null || v === '') ? '___' : v;   // 아직 안 고른 자리
    i = m.index + m[0].length;
  }
  return out + lit(i, tpl.length);
}

/* 데이터를 바꾸면 **선생님이 채워 둔** 열 이름을 새 데이터의 것으로 바꿉니다.

   ⚠ **학생이 적는 칸(빈칸)은 건드리지 않습니다** (2026-11-02 고침).
     예전에는 「비어 있을 때만」 건너뛰었습니다. 그래서 학생이 `날개 길이` 처럼
     **덜 적거나 틀리게 적으면** 그 값이 열 이름 목록에 없다고 보고 기본 열
     이름(`체질량(g)` · `종` …)으로 **말없이 바꿔 버렸습니다.** 선생님이
     「입력을 했는데 다른 속성으로 입력된다」 고 한 것이 이것입니다.
     틀리게 적은 것은 실행해서 오류로 알아야 합니다 (2026-10-29 선생님 —
     「틀리면 오류 코드 알아서 확인하라 그래」). 앱이 고쳐 쓰지 않습니다. */
/* 옛 노트북에 저장된 블록을 지금 틀에 맞춥니다 (2026-11-02).
   `load` 는 예전에 칸이 `f` 하나였고 그것이 wget 과 read_csv 두 줄에 모두 쓰였습니다.
   지금은 `g`(read_csv) 가 따로 있으므로, **없으면 f 에서 가져옵니다.**
   이렇게 하지 않으면 이미 만들어 둔 차시 노트북의 read_csv 가 전부 빈칸이 됩니다. */
function nbMigrateBlocks(blocks){
  (blocks || []).forEach(b => {
    if(b && b.k === 'load' && b.a && b.a.g == null) b.a.g = b.a.f ?? '';
  });
  return blocks;
}

function nbRefitBlocks(blocks, file){
  (blocks || []).forEach(b => {
    const d = NB_BLOCK_DEFS[b.k];
    for(const s in (d && d.slots || {})){
      const slot = d.slots[s];
      if(slot.kind) continue;
      if(slot.opt !== 'cols' && slot.opt !== 'num') continue;
      if(nbSlotAsk(d, b, s)) continue;        // 학생이 적는 칸 — 그대로 둡니다
      const opts = nbSlotOptions(slot, file);
      if(!opts.includes(b.a[s])) b.a[s] = nbSlotDefault(slot, file);
    }
  });
  return blocks;
}
