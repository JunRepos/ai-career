/* ═══════════════════════════════════════
   ml-lab.js — 🧪 모델 실험실 (2026-10-07)

   왜 만들었나 (선생님 지시)
     「코드를 일일이 치게 하면 코드에 매몰된다. 본질은 기계학습이 무엇인지,
      지도·비지도·강화의 차이, 평가 지표의 의미와 해석, 그리고 그 해석으로
      모델을 어떻게 개선할지다.」

   그래서 **실험 한 번의 값을 10초로** 낮춥니다.
   학생은 코드를 치지 않지만 **채점되는 판단은 전부 직접** 합니다 —
   속성을 고르고(핵심 속성 추출), 알고리즘을 고르고(유형·알고리즘 선정),
   결과를 읽고(성능 평가), 왜 그런지 적습니다(해석).

   결과는 미리 다 구해 두었습니다 — js/ml-lab-data.js (675가지).
   만든 곳은 verify/ml-lab-data.py 이고, 노트북·덱·가이드북과 **같은 값**입니다
   (test_size=0.3 · stratify=y · random_state=42).

   새 데이터 예측만 화면에서 계산합니다 — 결정트리는 미리 받아 둔 트리를 타고,
   kNN 은 훈련 데이터와의 거리를 재서 가까운 k개의 다수결로 정합니다.
═══════════════════════════════════════ */

/* 화면이 기억하는 것 */
let LAB_SET   = 'penguin';
let LAB_PREP  = 'base';
let LAB_FEAT  = [true, true, true, false];   // 네 속성을 쓰는지
let LAB_ALGO  = 'dt';
let LAB_DEPTH = 0;                           // 0 = 깊이 제한 없음
let LAB_K     = 5;
let LAB_NORM  = false;
let LAB_RUN   = null;                        // 「학습시키기」를 눌러 나온 결과
let LAB_SHOT  = null;                        // 그때의 설정 (바뀌면 다시 학습하라고 알림)
let LAB_CELL  = null;                        // 혼동 행렬에서 누른 칸 [행, 열]
let LAB_CODE  = false;
let LAB_NEW   = null;                        // 새 데이터 예측 결과
let LAB_LOG   = [];                          // 실험 기록

const LAB_KO = {
  Adelie: '아델리펭귄', Chinstrap: '턱끈펭귄', Gentoo: '젠투펭귄',
};
const LAB_SETS = {
  penguin: {label: '남극 펭귄', target: '종', unit: '마리', file: 'penguins_ko.csv',
            ask: '펭귄의 신체 치수로 <b>종</b>을 예측할 수 있을까?'},
  fruit:   {label: '과일 상자', target: '종류', unit: '개', file: 'fruit_ko.csv',
            ask: '크기와 당도를 재면 <b>어떤 과일</b>인지 예측할 수 있을까?'},
};

function _labData(){ return (typeof ML_LAB !== 'undefined') ? ML_LAB[LAB_SET] : null; }
function _labPrep(){ const d = _labData(); return d && d.preps[LAB_PREP]; }
function _labKo(c){ return LAB_KO[c] || c; }

/* 지금 설정의 열쇠 — 미리 구해 둔 표에서 꺼낼 때 씁니다 */
function _labKey(){
  const mask = LAB_FEAT.reduce((a, on, i) => a + (on ? (1 << i) : 0), 0);
  return LAB_ALGO === 'dt'
    ? `${mask}|dt|${LAB_DEPTH}|0`
    : `${mask}|knn|${LAB_K}|${LAB_NORM ? 1 : 0}`;
}
function _labShot(){ return LAB_SET + '/' + LAB_PREP + '/' + _labKey(); }
function _labCols(){ return [0, 1, 2, 3].filter(i => LAB_FEAT[i]); }
function _labStale(){ return LAB_RUN && LAB_SHOT !== _labShot(); }

/* ── 새 데이터 예측 — 화면에서 바로 계산 ──────────────────────────
   왜 그렇게 나왔는지까지 돌려 줍니다. 결정트리는 **타고 내려간 질문들**을,
   kNN 은 **가까운 k개가 무엇이었는지**를 보여 줍니다 —
   「결정트리는 판단한 이유를 볼 수 있다」가 이 단원의 요점이라서입니다. */
function _labTreeGo(node, x, feats){
  const path = [];
  while(node && node.c === undefined){
    const yes = x[node.f] <= node.t;
    if(feats) path.push({q: `${feats[node.f]} ≤ ${node.t}`, v: x[node.f], yes});
    node = yes ? node.l : node.r;
  }
  return {c: node ? node.c : 0, path};
}
function _labKnnGo(x){
  const p = _labPrep(), cols = _labCols(), mm = p.minmax;
  const norm = (v, i) => {
    const [lo, hi] = mm[i];
    return hi > lo ? (v - lo) / (hi - lo) : 0;
  };
  const pt = cols.map((c, j) => LAB_NORM ? norm(x[j], c) : x[j]);
  const d = p.train.map((row, idx) => {
    let s = 0;
    cols.forEach((c, j) => {
      const v = LAB_NORM ? norm(row[c], c) : row[c];
      s += (v - pt[j]) * (v - pt[j]);
    });
    return [s, row[4], idx];
  });
  // 거리가 같으면 훈련 데이터에 실린 차례대로 — 늘 같은 답이 나오게
  d.sort((a, b) => a[0] - b[0] || a[2] - b[2]);
  const votes = {};
  for(let i = 0; i < LAB_K && i < d.length; i++) votes[d[i][1]] = (votes[d[i][1]] || 0) + 1;
  let best = 0, bn = -1;
  Object.keys(votes).map(Number).sort((a, b) => a - b).forEach(c => {
    if(votes[c] > bn){ bn = votes[c]; best = c; }
  });
  const tie = Object.values(votes).filter(v => v === bn).length > 1;
  return {c: best, votes, tie};
}
function _labPredict(x){
  const run = LAB_RUN;
  if(!run) return null;
  const d = _labData();
  return LAB_ALGO === 'dt'
    ? _labTreeGo(run.tree, x, _labCols().map(i => d.feats[i]))
    : _labKnnGo(x);
}

/* ── 이 설정이 파이썬으로는 어떤 코드인가 ─────────────────────── */
function _labCode(){
  const d = _labData(), p = _labPrep(), s = LAB_SETS[LAB_SET];
  const cols = _labCols().map(i => `"${d.feats[i]}"`).join(', ');
  let t = `import pandas as pd\n\n`;
  t += `!wget "https://junrepos.github.io/ai-career/data/${s.file}"\n`;
  t += `df = pd.read_csv("${s.file}")\n`;
  t += `df = df.dropna()\n`;
  if(LAB_SET === 'penguin') t += `df = df.drop(336, axis=0)\n`;
  else {
    t += `df = df[df["산지"] != "."]\n`;
    if(LAB_PREP === 'fixed'){
      t += `df = df[df["무게(g)"] < 1000]\n`;
      t += `df = df[df["지름(mm)"] > 20]\n`;
    }
  }
  t += `\n# 특징과 타깃\n`;
  t += `X = df[[${cols}]]\ny = df["${d.target}"]\n`;
  if(LAB_ALGO === 'knn' && LAB_NORM){
    t += `\n# 값을 0 과 1 사이로 맞춘다 (정규화)\n`;
    t += `from sklearn.preprocessing import MinMaxScaler\nX = MinMaxScaler().fit_transform(X)\n`;
  }
  t += `\n# 훈련 ${p.nTrain} · 테스트 ${p.nTest} 으로 나눈다\n`;
  t += `from sklearn.model_selection import train_test_split\n`;
  t += `X_train, X_test, y_train, y_test = train_test_split(\n`;
  t += `    X, y, test_size=0.3, stratify=y, random_state=42)\n`;
  t += `\n# 모델을 만들고 훈련 데이터로 학습시킨다\n`;
  if(LAB_ALGO === 'dt'){
    t += `from sklearn.tree import DecisionTreeClassifier\n`;
    t += `model = DecisionTreeClassifier(${LAB_DEPTH ? 'max_depth=' + LAB_DEPTH + ', ' : ''}random_state=42)\n`;
  } else {
    t += `from sklearn.neighbors import KNeighborsClassifier\n`;
    t += `model = KNeighborsClassifier(n_neighbors=${LAB_K})\n`;
  }
  t += `model.fit(X_train, y_train)\n`;
  t += `\n# 점수와 혼동 행렬\n`;
  t += `print(model.score(X_train, y_train))\n`;
  t += `print(model.score(X_test, y_test))\n`;
  t += `from sklearn.metrics import confusion_matrix\n`;
  t += `print(confusion_matrix(y_test, model.predict(X_test)))\n`;
  return t;
}

/* ═══════════ 화면 ═══════════ */
function _vStMlLab(){
  if(typeof ML_LAB === 'undefined') return emptyBox('🧪', '실험실 자료를 읽지 못했습니다.');
  const d = _labData(), p = _labPrep(), s = LAB_SETS[LAB_SET];

  /* 단계1 — 문제 */
  const setBtns = Object.keys(LAB_SETS).map(k =>
    `<button class="lab-chip${LAB_SET === k ? ' on' : ''}" data-action="lab-set" data-k="${k}"
      >${esc(LAB_SETS[k].label)}</button>`).join('');

  /* 단계2 — 전처리 · 특징 */
  const prepBtns = Object.keys(d.preps).length < 2 ? '' :
    `<div class="lab-row"><span class="lab-lb">전처리</span><div class="lab-opts">` +
    Object.keys(d.preps).map(k =>
      `<button class="lab-chip${LAB_PREP === k ? ' on' : ''}" data-action="lab-prep" data-k="${k}"
        >${esc(d.preps[k].label)}</button>`).join('') +
    `</div></div>`;

  const featBtns = d.feats.map((f, i) =>
    `<button class="lab-chip${LAB_FEAT[i] ? ' on' : ''}" data-action="lab-feat" data-i="${i}"
      >${LAB_FEAT[i] ? '✓ ' : ''}${esc(f)}</button>`).join('');
  const nFeat = _labCols().length;

  /* 단계3 — 알고리즘 */
  const algoBtns = [['dt', '🌳 결정트리'], ['knn', '👥 kNN']].map(([k, lb]) =>
    `<button class="lab-chip${LAB_ALGO === k ? ' on' : ''}" data-action="lab-algo" data-k="${k}"
      >${lb}</button>`).join('');
  const paramRow = LAB_ALGO === 'dt'
    ? `<div class="lab-row"><span class="lab-lb">깊이</span><div class="lab-opts">` +
      [1, 2, 3, 4, 0].map(v =>
        `<button class="lab-chip sm${LAB_DEPTH === v ? ' on' : ''}" data-action="lab-depth" data-v="${v}"
          >${v || '제한 없음'}</button>`).join('') +
      `</div></div>`
    : `<div class="lab-row"><span class="lab-lb">이웃 수 k</span><div class="lab-opts">` +
      [1, 3, 5, 7, 9].map(v =>
        `<button class="lab-chip sm${LAB_K === v ? ' on' : ''}" data-action="lab-k" data-v="${v}"
          >${v}</button>`).join('') +
      `</div></div>
      <div class="lab-row"><span class="lab-lb">정규화</span><div class="lab-opts">
        <button class="lab-chip sm${!LAB_NORM ? ' on' : ''}" data-action="lab-norm" data-v="0">안 함</button>
        <button class="lab-chip sm${LAB_NORM ? ' on' : ''}" data-action="lab-norm" data-v="1">0 ~ 1 로 맞춤</button>
      </div></div>`;

  const canRun = nFeat > 0;
  const runBtn = `<button class="lab-run" data-action="lab-run" ${canRun ? '' : 'disabled'}
    >${LAB_RUN && !_labStale() ? '다시 학습시키기' : '학습시키기'}</button>`;

  return `<div class="section lab-intro">
      <div class="lab-ask">${s.ask}</div>
      <div class="lab-sub">정답(${esc(d.target)})이 데이터에 있고 알아내려는 것이 <b>범주</b>이므로
        — <b>지도학습 · 분류</b> 문제입니다.</div>
    </div>

    <div class="section lab-panel">
      <div class="lab-step"><i>단계1</i> 문제와 데이터 고르기</div>
      <div class="lab-row"><span class="lab-lb">데이터</span><div class="lab-opts">${setBtns}</div></div>

      <div class="lab-step"><i>단계2</i> 전처리하고 쓸 속성 고르기</div>
      ${prepBtns}
      <div class="lab-row"><span class="lab-lb">특징</span><div class="lab-opts">${featBtns}</div></div>
      <div class="lab-note">${nFeat ? `${p.n}${s.unit} · 속성 ${nFeat}개 · 타깃은 <b>${esc(d.target)}</b>`
        : '속성을 하나 이상 골라야 합니다.'}</div>

      <div class="lab-step"><i>단계3</i> 알고리즘 고르고 학습시키기</div>
      <div class="lab-row"><span class="lab-lb">알고리즘</span><div class="lab-opts">${algoBtns}</div></div>
      ${paramRow}
      <div class="lab-row lab-runrow">${runBtn}
        <span class="lab-note">훈련 ${p.nTrain} · 테스트 ${p.nTest} 으로 나눠서 학습합니다</span></div>
    </div>

    ${_vLabResult()}
    ${_vLabLog()}`;
}

/* ── 단계4 — 결과 ────────────────────────────────────────────── */
function _vLabResult(){
  if(!LAB_RUN) return '';
  const run = LAB_RUN, p = _labPrep(), d = _labData(), s = LAB_SETS[LAB_SET];
  const cls = p.classes;
  const stale = _labStale();
  const gap = run.tr - run.te;
  const right = run.cm.reduce((a, r, i) => a + r[i], 0);
  const total = run.cm.reduce((a, r) => a + r.reduce((x, y) => x + y, 0), 0);

  const verdict = gap >= 0.08
    ? `<span class="lab-flag warn">훈련보다 테스트가 ${(gap * 100).toFixed(0)}%p 낮습니다 — <b>과적합</b>을 의심하세요</span>`
    : `<span class="lab-flag ok">훈련과 테스트가 비슷합니다 — 과적합이 크지 않습니다</span>`;

  /* 혼동 행렬 — 칸을 누르면 무슨 뜻인지 */
  const head = `<tr><th class="lab-cm-corner">실제 ＼ 예측</th>${
    cls.map(c => `<th>${esc(_labKo(c))}</th>`).join('')}<th class="lab-cm-sum">합</th></tr>`;
  const body = run.cm.map((row, i) => `<tr><th>${esc(_labKo(cls[i]))}</th>${
    row.map((v, j) => `<td class="lab-cm${i === j ? ' diag' : (v ? ' miss' : '')}${
      LAB_CELL && LAB_CELL[0] === i && LAB_CELL[1] === j ? ' sel' : ''}"
      data-action="lab-cell" data-i="${i}" data-j="${j}">${v}</td>`).join('')
    }<td class="lab-cm-sum">${row.reduce((a, b) => a + b, 0)}</td></tr>`).join('');

  let cellTxt = '칸을 누르면 무슨 뜻인지 알려 줍니다.';
  if(LAB_CELL){
    const [i, j] = LAB_CELL, v = run.cm[i][j];
    cellTxt = i === j
      ? `실제 <b>${esc(_labKo(cls[i]))}</b>을(를) <b>${esc(_labKo(cls[j]))}</b>으로 바르게 예측한 <b>${v}${s.unit}</b>`
      : `실제 <b>${esc(_labKo(cls[i]))}</b>인데 <b>${esc(_labKo(cls[j]))}</b>으로 잘못 예측한 <b>${v}${s.unit}</b>`;
  }

  const metr = `<table class="lab-metr"><tr><th></th>${
    cls.map(c => `<th>${esc(_labKo(c))}</th>`).join('')}</tr>
    <tr><th>정밀도</th>${run.pre.map(v => `<td>${v.toFixed(2)}</td>`).join('')}</tr>
    <tr><th>재현율</th>${run.rec.map(v => `<td>${v.toFixed(2)}</td>`).join('')}</tr></table>`;

  const treeInfo = LAB_ALGO === 'dt'
    ? `<div class="lab-note">트리 깊이 <b>${run.depth}</b> · 맨 아래 칸 <b>${run.leaves}개</b></div>` : '';

  /* 새 데이터 예측 */
  const cols = _labCols();
  const inputs = cols.map((c, j) => {
    const [lo, hi] = p.minmax[c];
    const mid = LAB_NEW ? LAB_NEW.x[j] : Math.round(((lo + hi) / 2) * 10) / 10;
    return `<label class="lab-new-f"><span>${esc(d.feats[c])}</span>
      <input type="number" step="any" id="lab-new-${j}" value="${mid}"/>
      <i>${lo} ~ ${hi}</i></label>`;
  }).join('');
  let newOut = '';
  if(LAB_NEW){
    const r = LAB_NEW.r;
    let why = '';
    if(LAB_ALGO === 'dt'){
      why = `<ol class="lab-why">${r.path.map(q =>
        `<li>${esc(q.q)} → <b>${q.yes ? '예' : '아니오'}</b> <i>(넣은 값 ${q.v})</i></li>`).join('')}</ol>`;
      if(!r.path.length) why = '<div class="lab-note">트리가 질문 없이 바로 답합니다 (깊이 0).</div>';
    } else {
      const vs = Object.keys(r.votes).map(Number).sort((a, b) => r.votes[b] - r.votes[a])
        .map(c => `${esc(_labKo(p.classes[c]))} ${r.votes[c]}`).join(' · ');
      why = `<div class="lab-note">가장 가까운 ${LAB_K}개 — ${vs}` +
            (r.tie ? ' <b>(같은 수라 아슬아슬합니다)</b>' : '') + '</div>';
    }
    newOut = `<div class="lab-new-out">예측 결과 — <b>${esc(_labKo(p.classes[LAB_NEW.c]))}</b></div>` + why;
  }

  return `<div class="section lab-res${stale ? ' stale' : ''}">
    ${stale ? '<div class="lab-stale">설정을 바꿨습니다 — <b>다시 학습시키기</b>를 눌러야 아래 숫자가 바뀝니다.</div>' : ''}
    <div class="lab-step"><i>단계4</i> 성능 평가하기</div>

    <div class="lab-scores">
      <div class="lab-score"><span>훈련 데이터</span><b>${run.tr.toFixed(2)}</b></div>
      <div class="lab-score big"><span>테스트 데이터</span><b>${run.te.toFixed(2)}</b>
        <i>${total}${LAB_SETS[LAB_SET].unit} 중 ${right}${LAB_SETS[LAB_SET].unit}</i></div>
    </div>
    ${verdict}
    ${treeInfo}

    <div class="lab-h">혼동 행렬 — 무엇을 무엇으로 예측했나</div>
    <table class="lab-cmt">${head}${body}</table>
    <div class="lab-cm-say">${cellTxt}</div>

    <div class="lab-h">정밀도와 재현율</div>
    ${metr}
    <div class="lab-note"><b>정밀도</b> 그 ${esc(d.target)}(으)로 <u>예측한 것</u> 중 맞은 비율 (표에서 세로로)
      · <b>재현율</b> 그 ${esc(d.target)} <u>전체</u> 중 찾아낸 비율 (가로로)</div>

    <div class="lab-h">새 데이터 예측하기</div>
    <div class="lab-new">${inputs}
      <button class="btn-p" data-action="lab-predict">예측</button></div>
    ${newOut}

    <div class="lab-h">
      <button class="lab-codebtn" data-action="lab-code">${LAB_CODE ? '▾' : '▸'} 이 설정을 파이썬으로 쓰면</button>
    </div>
    ${LAB_CODE ? `<pre class="lab-code">${esc(_labCode())}</pre>` : ''}

    <div class="lab-keep">
      <button class="btn" data-action="lab-keep">📋 실험 기록에 남기기</button>
      <span class="lab-note">바꾼 것과 그 결과를 적어 두면 글을 쓸 때 그대로 씁니다.</span>
    </div>
  </div>`;
}

/* ── 실험 기록 ───────────────────────────────────────────────── */
function _vLabLog(){
  if(!LAB_LOG.length) return '';
  const rows = LAB_LOG.map((r, i) => `<tr>
    <td>${i + 1}</td>
    <td>${esc(r.setLabel)}</td>
    <td>${esc(r.feats)}</td>
    <td>${esc(r.algo)}</td>
    <td class="lab-log-te"><b>${r.te.toFixed(2)}</b></td>
    <td><input class="lab-log-why" data-action="lab-why" data-i="${i}"
         placeholder="왜 이렇게 되었을까?" value="${esc(r.why || '')}"/></td>
    <td><button class="btn-xs" data-action="lab-del" data-i="${i}">✕</button></td>
  </tr>`).join('');
  return `<div class="section lab-logsec">
    <div class="lab-h">실험 기록 <span class="lab-note">${LAB_LOG.length}개</span></div>
    <table class="lab-log">
      <tr><th>#</th><th>데이터</th><th>속성</th><th>알고리즘</th><th>테스트</th><th>왜 그럴까</th><th></th></tr>
      ${rows}
    </table>
    <div class="lab-keep">
      <button class="btn" data-action="lab-copy">📄 표로 복사하기</button>
      <button class="btn-xs" data-action="lab-clear">전부 지우기</button>
    </div>
  </div>`;
}

/* ═══════════ 누름 처리 ═══════════ */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const a = el.dataset.action;
  if(!a.startsWith('lab-')) return;

  if(a === 'lab-set'){
    LAB_SET = el.dataset.k;
    LAB_PREP = Object.keys(_labData().preps)[0];
    LAB_FEAT = [true, true, true, false];
    LAB_RUN = null; LAB_NEW = null; LAB_CELL = null;
  } else if(a === 'lab-prep'){ LAB_PREP = el.dataset.k;
  } else if(a === 'lab-feat'){
    const i = +el.dataset.i;
    const next = LAB_FEAT.slice();
    next[i] = !next[i];
    if(next.some(Boolean)) LAB_FEAT = next;      // 하나는 남겨 둡니다
    LAB_NEW = null;
  } else if(a === 'lab-algo'){ LAB_ALGO = el.dataset.k;
  } else if(a === 'lab-depth'){ LAB_DEPTH = +el.dataset.v;
  } else if(a === 'lab-k'){ LAB_K = +el.dataset.v;
  } else if(a === 'lab-norm'){ LAB_NORM = el.dataset.v === '1';
  } else if(a === 'lab-cell'){ LAB_CELL = [+el.dataset.i, +el.dataset.j];
  } else if(a === 'lab-code'){ LAB_CODE = !LAB_CODE;
  } else if(a === 'lab-run'){
    const run = _labPrep().runs[_labKey()];
    if(!run){ toast('그 조합은 표에 없습니다.', 'err'); return; }
    LAB_RUN = run; LAB_SHOT = _labShot(); LAB_CELL = null; LAB_NEW = null;
  } else if(a === 'lab-predict'){
    const cols = _labCols();
    const x = cols.map((c, j) => parseFloat(document.getElementById('lab-new-' + j)?.value));
    if(x.some(v => !isFinite(v))){ toast('값을 모두 적어 주세요.', 'err'); return; }
    const r = _labPredict(x);
    if(!r) return;
    LAB_NEW = {x, c: r.c, r};
  } else if(a === 'lab-keep'){
    if(!LAB_RUN) return;
    const d = _labData();
    LAB_LOG.push({
      setLabel: LAB_SETS[LAB_SET].label + (Object.keys(d.preps).length > 1 ? ' · ' + _labPrep().label : ''),
      feats: _labCols().map(i => d.feats[i].replace(/\(.*\)/, '')).join(' · '),
      algo: LAB_ALGO === 'dt'
        ? '결정트리 깊이 ' + (LAB_DEPTH || '제한 없음')
        : 'kNN k=' + LAB_K + (LAB_NORM ? ' · 정규화' : ''),
      tr: LAB_RUN.tr, te: LAB_RUN.te, why: '',
    });
    _labSave();
    toast('실험 기록에 남겼습니다.');
  } else if(a === 'lab-del'){ LAB_LOG.splice(+el.dataset.i, 1); _labSave();
  } else if(a === 'lab-clear'){ LAB_LOG = []; _labSave();
  } else if(a === 'lab-copy'){
    const txt = ['| # | 데이터 | 속성 | 알고리즘 | 테스트 정확도 | 왜 그럴까 |',
                 '|---|---|---|---|---|---|'].concat(
      LAB_LOG.map((r, i) => `| ${i + 1} | ${r.setLabel} | ${r.feats} | ${r.algo} | ${r.te.toFixed(2)} | ${r.why || ''} |`)
    ).join('\n');
    navigator.clipboard?.writeText(txt).then(() => toast('복사했습니다. 글 쓰는 칸에 붙여 넣으세요.'),
                                             () => toast('복사하지 못했습니다.', 'err'));
    return;
  } else { return; }
  // render() 는 화면을 통째로 다시 그려서 보던 자리를 잃습니다 —
  // 혼동 행렬처럼 아래쪽을 누를 때 위로 튀지 않게 자리를 지켜 줍니다.
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
});

/* 「왜 그럴까」 칸은 글자마다 다시 그리지 않습니다 */
document.addEventListener('input', e => {
  const el = e.target.closest('[data-action="lab-why"]');
  if(!el) return;
  const r = LAB_LOG[+el.dataset.i];
  if(r){ r.why = el.value; _labSave(); }
});

/* 실험 기록은 이 기기에 남겨 둡니다 — 수업 중 새로고침해도 사라지지 않게 */
function _labSave(){
  try{ localStorage.setItem('labLog', JSON.stringify(LAB_LOG)); }catch(e){}
}
function labLoad(){
  try{
    const s = localStorage.getItem('labLog');
    if(s) LAB_LOG = JSON.parse(s) || [];
  }catch(e){ LAB_LOG = []; }
}
labLoad();
