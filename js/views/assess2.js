/* ═══════════════════════════════════════
   views/assess2.js — 📝 2차 수행평가 (인공지능 기초)
   기계학습 알고리즘을 적용하여 데이터 기반 문제 해결하기 · 영역 만점 25점

   (2026-10-27 선생님 — 「평가 탭에 2차 수행평가라고 탭을 생성한 다음에 거기다가
   넣어줘. 선생님은 수행평가에 내용을 확인 및 수정할 수 있어야」)

   노트북 목록에 섞여 있으면 찾기 어렵고, 평가용인지도 한눈에 안 보입니다.
   여기 한 자리에 모읍니다 — 문 여닫기 · 입장 비밀번호 · 내용 확인과 수정.

   문과 비밀번호는 js/nb-open.js 가 맡습니다.
     aiactivity/submissions/{반}/nbGate/{id} = 'closed' | 'open'
     aiactivity/submissions/{반}/nbPw/{id}   = {salt, iter, hash}

   2026-11-05 선생님 — 「2차 수행평가 1차 때처럼 교사가 애들 답 볼 수 있게 해줘」.
   1차(views/assess1.js)와 같은 모양으로 **명단 → 학생 하나** 두 겹입니다.
     · 답이 남는 자리는 notebookProgress/{반}/assess2fruit/{학번}
     · 남는 것은 셀의 **파이썬 코드** · 🧩 블록에 채운 칸 · ✍️ 표에 적은 글자뿐입니다
       (firebase.js 의 saveNotebookProgress). 실행 결과는 저장되지 않습니다.
     · **읽기만 합니다.** 학생 진도에 쓰지 않습니다.
═══════════════════════════════════════ */

const A2_NB_ID = 'assess2fruit';   // verify/assess2-nb.py 가 올리는 id

function vTcAssess2(){
  if(TC_CLS?.type !== 'ai') return emptyBox('📝', '인공지능 기초 반에서만 씁니다.');

  // 노트북을 열어 놓은 상태면 그대로 노트북 화면을 보여 줍니다
  if(SEL_NOTEBOOK) return vNotebookDetail(true);

  const cid = TC_CLS.id;
  const nb = NOTEBOOKS.find(n => n.id === A2_NB_ID);
  const gated = nbIsGated(cid, A2_NB_ID);
  const open = nbIsOpen(cid, A2_NB_ID);
  const hasPw = nbHasPw(cid, A2_NB_ID);

  if(!nb){
    return `<div class="section">
      <div class="sec-title">📝 2차 수행평가</div>
      ${emptyBox('📭', '아직 올라오지 않았습니다. <code>python verify/assess2-nb.py --upload --replace</code> 로 올립니다.')}
    </div>`;
  }

  // 답안을 구독합니다 (반을 바꾸면 다시 붙습니다)
  if(A2_FOR !== cid){ A2_FOR = cid; setTimeout(() => a2TcStart(cid), 0); }
  if(A2_VIEW === 'student' && A2_SNUM) return _a2TcStudent(nb);

  const stateLine = !gated
    ? '<b style="color:#C8102E">평가용으로 잠겨 있지 않습니다</b> — 학생에게 그냥 보입니다'
    : (open
        ? '🔓 <b>열림</b> — 지금 학생 목록에 보입니다'
        : '🔒 <b>닫힘</b> — 학생 목록에 보이지 않습니다');

  return `<div class="section">
    <div class="sec-title">📝 2차 수행평가 — 기계학습 알고리즘을 적용하여 데이터 기반 문제 해결하기</div>

    <div class="box-info" style="margin-bottom:10px">
      노트북 <b>15점</b>(전처리 근거 · 알고리즘 선정 · 성능 평가) +
      종이 논술 <b>10점</b>(문제 정의 · 결과 해석) · 기본점수 10점<br>
      <span style="color:var(--text2)">${esc(TC_CLS.name || cid)} · ${nb.cells?.length || 0}개 셀</span>
    </div>

    <div class="a2-card">
      <div class="a2-row">
        <div class="a2-k">지금 상태</div>
        <div class="a2-v">${stateLine}</div>
      </div>
      <div class="a2-row">
        <div class="a2-k">입장 비밀번호</div>
        <div class="a2-v">${hasPw
          ? '설정되어 있습니다 — 문이 열려 있어도 <b>맞혀야</b> 들어갑니다'
          : '<b>없습니다</b> — 문이 열리면 학생이 바로 들어옵니다'}</div>
      </div>
      <div class="a2-btns">
        <button class="btn-p" data-action="open-notebook" data-nid="${A2_NB_ID}"
          title="학생이 보는 그대로 열립니다. 시뮬레이션이라 원본이 바뀌지 않습니다."
          >📖 내용 확인 · 수정</button>
        <button class="btn-s" data-action="nb-set-pw" data-nid="${A2_NB_ID}"
          >🔑 비밀번호 ${hasPw ? '바꾸기' : '정하기'}</button>
        ${gated ? `<button class="${open ? 'btn-danger' : 'btn-p'}"
          data-action="nb-toggle-open" data-nid="${A2_NB_ID}"
          >${open ? '🔒 닫기' : '🔓 학생에게 열기'}</button>` : ''}
      </div>
    </div>

    <div class="box-info" style="margin-top:12px">
      <b>📖 내용 확인 · 수정</b> 을 누르면 <b>🧪 시뮬레이션</b> 으로 열립니다 —
      블록을 끌어다 놓고 실행해 봐도 <b>원본이 바뀌지 않습니다.</b><br>
      내용을 정말 고치시려면 노트북 윗줄에서 <b>🧪 시뮬레이션 → ✏️ 원본 수정</b> 으로 바꾸세요.
      그 뒤에 한 것은 <b>학생이 받는 노트북에 그대로 저장됩니다.</b>
    </div>

    <div class="box-info" style="margin-top:8px">
      ⚠ 비밀번호는 <b>원래 글자를 저장하지 않습니다</b> (PBKDF2 해시만).
      다만 DB 규칙이 열려 있어 <b>작정하면 뚫립니다</b> — 확실한 잠금은 <b>문을 닫아 두는 것</b>입니다.
    </div>

    ${_a2TcList(nb)}
  </div>`;
}


/* ═══════════════════════════════════════════════════════════════
   📋 학생 답안 — 명단
   ═══════════════════════════════════════════════════════════════ */
let A2_FOR   = null;    // 구독 중인 cid
let A2_WATCH = null;    // { ref, fn }
let A2_ALL   = null;    // { [학번]: {cells, updatedAt} } — null 이면 불러오는 중
let A2_ERR   = '';
let A2_VIEW  = 'list';  // 'list' | 'student'
let A2_SNUM  = null;

function a2TcStart(cid){
  a2TcStop();
  A2_FOR = cid; A2_ALL = null; A2_ERR = '';
  const ref = db.ref(`notebookProgress/${cid}/${A2_NB_ID}`);
  const fn = s => {
    A2_ALL = s.val() || {};
    if(VIEW === 'teacher' && TC_TAB === 'assess2' && TC_CLS?.id === cid) a2Rerender();
  };
  ref.on('value', fn, err => {
    A2_ERR = err.message || String(err); A2_ALL = {};
    if(VIEW === 'teacher' && TC_TAB === 'assess2') render();
  });
  // 채점 (2026-11-09) — 학생 진도와 따로 쌓입니다
  A2_GRADE = null;
  const gref = db.ref(`aiactivity/submissions/${cid}/assess2grade`);
  const gfn = s => {
    A2_GRADE = s.val() || {};
    if(VIEW === 'teacher' && TC_TAB === 'assess2' && TC_CLS?.id === cid) a2Rerender();
  };
  gref.on('value', gfn, () => { A2_GRADE = {}; });
  A2_WATCH = { ref, fn, gref, gfn };
}
function a2TcStop(){
  if(A2_WATCH){
    A2_WATCH.ref.off('value', A2_WATCH.fn);
    if(A2_WATCH.gref) A2_WATCH.gref.off('value', A2_WATCH.gfn);
    A2_WATCH = null;
  }
  A2_FOR = null;
}
/* 메모나 논술 칸에 적는 중이면 다시 그리지 않습니다 — 적던 글이 날아갑니다 */
function a2Rerender(){
  const a = document.activeElement;
  if(a && (a.id === 'a2g-note' || a.id === 'a2g-essay')) return;
  render();
}

/* 이 셀이 ✍️ 적는 표인가 */
function a2IsFill(c){
  if((c?.type || c?.cell_type) !== 'markdown') return false;
  const s = c.source || '';
  return s.indexOf('✍️') >= 0 && s.indexOf('|') >= 0;
}
/* 이 셀이 답이 남는 셀인가 — 🧩 블록 셀이거나 ✍️ 표 */
function a2IsAns(c){
  return (typeof nbBlocksOf === 'function' && nbBlocksOf(c) !== null) || a2IsFill(c);
}

/* 셀을 「준비 단계」 · 「문제 N」 묶음으로 나눕니다 — 쪽 번호를 박지 않고
   원본의 제목 줄에서 읽습니다 (셀을 넣거나 빼도 따라옵니다). */
function a2Groups(nb){
  const out = [];
  let cur = null;
  for(const c of (nb?.cells || [])){
    const t = c.type || c.cell_type || 'code';
    const m = (t === 'markdown')
      ? (c.source || '').match(/^#+\s*\*\*\s*(준비 단계\s*\d+|문제\s*\d+)/m) : null;
    if(m){ cur = { label: m[1].replace(/\s+/g, ' ').trim(), ids: [] }; out.push(cur); continue; }
    if(cur && a2IsAns(c)) cur.ids.push(c.id);
  }
  return out.filter(g => g.ids.length);
}

/* 학생이 저장한 셀 — id 로 찾습니다 */
function a2Cells(doc){
  const m = {};
  for(const c of (doc?.cells || [])) if(c && c.id) m[c.id] = c;
  return m;
}
/* 그 셀에 학생이 무엇이라도 남겼나 */
function a2Touched(sc, oc){
  if(!sc) return false;
  const bl = (typeof nbBlocksOf === 'function') ? nbBlocksOf(sc) : null;
  if(bl !== null) return bl.length > 0;
  if(sc.raw) return !!(sc.source || '').trim();
  if(a2IsFill(oc || sc)) return (sc.source || '') !== ((oc || {}).source || '');
  return (sc.source || '') !== ((oc || {}).source || '');
}

function _a2Time(iso){
  if(!iso) return '';
  const d = new Date(iso);
  if(isNaN(d)) return String(iso).slice(0, 16).replace('T', ' ');
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function _a2TcList(nb){
  const groups = a2Groups(nb);
  const byId = {};
  for(const c of (nb.cells || [])) if(c.id) byId[c.id] = c;

  if(A2_ALL === null){
    return `<div class="sec-title" style="margin-top:22px">📋 학생 답안</div>
      <div class="ml-sub-explain">⏳ 답안을 불러오는 중…</div>`;
  }
  const all = A2_ALL || {};
  const sts = [...(typeof STUDENTS !== 'undefined' ? STUDENTS : [])]
    .sort((a, b) => String(a.number).localeCompare(String(b.number)));
  let began = 0;
  const rows = sts.map(st => {
    const doc = all[st.number];
    const cells = a2Cells(doc);
    let any = 0;
    const tds = groups.map(g => {
      const n = g.ids.filter(id => a2Touched(cells[id], byId[id])).length;
      any += n;
      const cls = n === 0 ? 'a2-g0' : (n < g.ids.length ? 'a2-gp' : 'a2-gf');
      return `<td class="n ${cls}">${n === 0 ? '–' : n + '/' + g.ids.length}</td>`;
    }).join('');
    if(any) began++;
    return `<tr>
      <td>${esc(st.number)}</td><td>${esc(st.name)}</td>${tds}
      <td class="n">${doc ? _a2Time(doc.updatedAt) : ''}</td>
      ${(() => { const g = a2gOf(st.number); const nbs = a2gNb(g); const tot = a2gTotal(g);
        return `<td class="n"><b>${nbs === null ? '' : nbs}</b></td><td class="n">${tot === null ? '' : tot}</td>
          <td class="n">${g && g.eai ? '<b>' + a2gEssay(g) + '</b>' + (a2gFlagCount(g, 'essay') ? ` <span class="a1-dim">⚑${a2gFlagCount(g, 'essay')}</span>` : '') : ''}</td>
          <td class="n">${g && (g.ai || g.eai) ? a2gStateDot(g) + (a2gFlagCount(g) ? ` <span class="a1-dim">⚑${a2gFlagCount(g)}</span>` : '') : ''}</td>`; })()}
      <td>${doc || a2gOf(st.number)?.eai
        ? `<button class="btn-xs" data-action="a2-view" data-snum="${esc(st.number)}">답안 보기 →</button>`
        : '<span class="a1-dim">미응시</span>'}</td>
    </tr>`;
  }).join('');

  // 명단에 없는 학번으로 저장된 것 (test 계정 등)
  const extra = Object.keys(all).filter(k => !sts.some(s => s.number === k));

  return `<div class="a2-head">
      <div class="sec-title" style="margin:0">📋 학생 답안</div>
      ${_a2ModeBtns()}
      <button class="btn-sm" data-action="a2-md">📤 답안 묶어 내려받기</button>
    </div>
    ${A2_ERR ? `<div class="a1-notice err">답안을 불러오지 못했습니다 — ${esc(A2_ERR)}</div>` : ''}
    <div class="a1-stats">
      <div class="stat-card"><div class="stat-num">${sts.length}</div><div class="stat-label">전체</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--ok,#16a34a)">${began}</div><div class="stat-label">손댄 학생</div></div>
      <div class="stat-card"><div class="stat-num">${sts.length - began}</div><div class="stat-label">빈 학생</div></div>
    </div>
    <div class="ml-sub-explain">칸의 숫자는 그 문제에서 <b>답이 남는 셀 가운데 몇 개를 채웠는가</b>입니다
      (🧩 블록을 쌓은 셀 · ✍️ 표에 적은 셀). 학생이 저장할 때마다 바로 바뀝니다.
      <b>실행 결과는 저장되지 않습니다</b> — 남는 것은 코드와 적은 글자뿐입니다
      (답안 보기에서 <b>▶ 실행 결과 보기</b> 로 그 자리에서 돌려 봅니다).
      <b>노트북 /19</b> 는 코드 채점(기본 8 + 항목 11), <b>총점</b>은 논술 점수를 넣으면 나옵니다.
      검토 — ○ 미검토 · ◐ 검토 중 · ✔ 확정 · ⚑ 판단이 필요한 항목 수.</div>
    ${sts.length === 0 ? emptyBox('👥', '먼저 학생을 등록하세요.')
      : `<div style="overflow-x:auto"><table class="tbl a1-tc-table">
          <thead><tr><th>학번</th><th>이름</th>${groups.map(g =>
            `<th>${esc(g.label.replace('문제 ', '문'). replace('준비 단계', '준비'))}</th>`).join('')}
            <th>마지막 저장</th><th>노트북 /19</th><th>총점 /25</th><th>논술 /4</th><th>검토</th><th></th></tr></thead>
          <tbody>${rows}</tbody></table></div>`}
    ${extra.length ? `<div class="ml-sub-explain">명단에 없는 학번으로 저장된 것 —
      ${extra.map(k => `<button class="btn-xs" data-action="a2-view" data-snum="${esc(k)}">${esc(k)}</button>`).join(' ')}</div>` : ''}`;
}


/* ═══════════════════════════════════════════════════════════════
   📄 학생 하나 — 답안 그대로
   ═══════════════════════════════════════════════════════════════ */
function _a2TcNums(){
  const sts = [...(typeof STUDENTS !== 'undefined' ? STUDENTS : [])]
    .sort((a, b) => String(a.number).localeCompare(String(b.number)));
  return sts.filter(s => (A2_ALL || {})[s.number] || (A2_MODE === 'essay' && a2gOf(s.number)?.eai)).map(s => s.number);
}

/* ✍️ 표 → 줄 묶음. `+++`(칸 높이 표시)와 **굵게**를 떼고, <br> 은 줄바꿈으로. */
function a2Txt(s){
  return esc(String(s == null ? '' : s)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s*\++$/, '')
    .trim());
}
/* 한 셀에 표가 **둘 이상** 있습니다 (문제 6 — 시도 표 + 고른 까닭 표).
   그래서 「첫 줄이 머리글」로 두면 둘째 표의 머리글이 답으로 섞입니다.
   `|---|` 줄 **바로 위**가 머리글입니다 — 그걸로 가립니다. */
function a2FillRows(src){
  const out = [];
  for(const ln of String(src || '').split('\n')){
    const s = ln.trim();
    if(s.charAt(0) !== '|') continue;
    const cs = s.replace(/^\|/, '').replace(/\|$/, '').split('|').map(x => x.trim());
    if(cs.length && cs.every(x => /^:?-{2,}:?$/.test(x))){
      if(out.length) out[out.length - 1].head = true;
      continue;
    }
    out.push({ cells: cs, head: false });
  }
  return out;
}
function a2FillBody(src){ return a2FillRows(src).filter(r => !r.head).map(r => r.cells); }

/* 블록에서 **답이 정해진 칸**만 맞춰 봅니다.
   열 이름 · 타깃처럼 상황마다 다른 칸은 `ans` 가 없어 건드리지 않습니다 —
   맞는지는 선생님이 보십니다. */
function a2Wrong(b){
  const d = (typeof NB_BLOCK_DEFS !== 'undefined') ? NB_BLOCK_DEFS[b.k] : null;
  if(!d) return [];
  const out = [];
  for(const s of Object.keys(d.slots || {})){
    const ans = d.slots[s].ans;
    if(ans == null) continue;
    const v = (b.a || {})[s];
    const got = v == null ? '' : String(v).trim();
    if(got === String(ans).trim()) continue;
    out.push({ got: got, ans: String(ans) });
  }
  return out;
}

function _a2CellBox(oc, sc){
  const bl = (typeof nbBlocksOf === 'function') ? nbBlocksOf(sc) : null;
  // ✍️ 적는 표
  if(a2IsFill(oc)){
    const body = a2FillBody(sc ? sc.source : oc.source);
    if(!body.length) return '';
    return `<div class="a2-ans-c">
      <div class="a2-ans-h">✍️ 적은 것</div>
      <table class="tbl a2-fill">${body.map(r => `<tr>
        <th>${a2Txt(r[0])}</th>
        ${r.slice(1).map(x => `<td class="${a2Txt(x) ? '' : 'empty'}">${a2Txt(x) || '(비어 있음)'}</td>`).join('')}
      </tr>`).join('')}</table>
    </div>`;
  }
  // 학생이 ✏️ 로 풀어 직접 고친 셀
  if(sc && sc.raw){
    return `<div class="a2-ans-c">
      <div class="a2-ans-h">✏️ 블록을 풀고 직접 적은 코드</div>
      <pre class="a2-code">${esc((sc.source || '').trim() || '(비어 있음)')}</pre></div>`;
  }
  // 🧩 블록 셀
  if(bl !== null){
    if(!bl.length) return `<div class="a2-ans-c"><div class="a2-ans-h">🧩 블록</div>
      <div class="a1-ans empty">블록을 놓지 않았습니다</div></div>`;
    // 같은 칸이 둘(fit 의 X 와 y)이면 똑같은 띠가 두 번 나옵니다 — 한 번만 보입니다
    const bad = [...new Set(bl.flatMap(b => a2Wrong(b))
      .map(w => `적은 것 ${w.got || '빈칸'} · 답 ${w.ans}`))];
    return `<div class="a2-ans-c">
      <div class="a2-ans-h">🧩 블록 ${bl.length}개 — 실행될 코드</div>
      <pre class="a2-code">${esc((sc.source || '').trim() || '(비어 있음)')}</pre>
      ${bad.length ? `<div class="a2-bad">${bad.map(t =>
        `<span class="a1-chip a2-chip-x">${esc(t)}</span>`).join(' ')}</div>` : ''}
    </div>`;
  }
  return '';
}

/* ═══════════════════════════════════════════════════════════════
   ✅ 코드 채점 검토 (2026-11-09)

   선생님 — 「그 사이트에서 너가 채점 한 근거를 보고 내가 다시 검토할 수 있도록 해줘.
   그리고 애들 지금 실행 결과가 안나와 내가 애들 코드 볼 때 그것도 나오도록 해줘」.

   · 채점 자리 aiactivity/submissions/{반}/assess2grade/{학번}
       = { ai:{항목:0|1}, ev:{항목:근거}, fl:{항목:검토할 것}, ans:{모범 답안}, sit,
           s:{항목:고친 점수}, essay:논술 항목 점수, note, state:''|wip|done, at }
     ai · ev · fl · ans · sit 는 레포 밖의 채점 스크립트가 넣습니다 (학생 코드를 실제로 돌린 결과).
     선생님이 고친 것은 s · essay · note · state 에만 씁니다 — 처음 점수는 덮어쓰지 않습니다.
     (1차와 같은 자리 · 같은 방식 — aiactivity/submissions 아래만 열려 있습니다)
   · 학생 화면은 이 자리를 읽지 않습니다. DB 규칙이 열려 있는 것은 1차와 같은 조건입니다.
   · 항목 11개(노트북 19점 = 기본 8 + 항목 11) — tools/samples/assess2-rubric.md 의 묶음 1~3.
     논술(묶음 4, 6점 = 기본 2 + 항목 4)은 종이라 선생님이 숫자만 넣습니다.
   · ▶ 실행 결과 — 선생님 브라우저의 노트북 엔진(Pyodide)으로 학생 코드 셀을 차례대로
     돌려 셀 밑에 출력을 붙입니다 (events/assess2.js 의 a2RunStudent). 학생 진도에는 쓰지 않습니다.
═══════════════════════════════════════════════════════════════ */
const A2G_ITEMS = [
  { k: 'b1_na',    q: 1, b: 1, n: '결측치 처리' },
  { k: 'b1_graph', q: 2, b: 1, n: '근거 그래프' },
  { k: 'b1_pick',  q: 3, b: 1, n: '핵심 속성 선정' },
  { k: 'b1_why',   q: 3, b: 1, n: '근거 제시' },
  { k: 'b2_xy',    q: 4, b: 2, n: '특성 분할' },
  { k: 'b2_split', q: 4, b: 2, n: '학습 · 테스트 분할' },
  { k: 'b2_fit',   q: 5, b: 2, n: '모델 정의와 학습' },
  { k: 'b3_score', q: 6, b: 3, n: '테스트 데이터로 정확도' },
  { k: 'b3_try',   q: 6, b: 3, n: '세 번 시도와 고른 까닭' },
  { k: 'b3_cm',    q: 7, b: 3, n: '혼동 행렬 코드' },
  { k: 'b3_fold',  q: 7, b: 3, n: '네 수로 접기' },
];
/* 논술 — 종이 논술지의 채점 기준 네 항목 (assess2.worksheet — 논술 1 2점 · 논술 2 2점 + 기본 2).
   처음 점수는 eai · 근거 eev · 확인할 것 efl · 옮겨 적은 글 etr · 스캔 eimg (레포 밖 스크립트가 넣음). */
const A2E_ITEMS = [
  { k: 'e1a', n: '논술 1 · 표에 옮기고 정의와 식' },
  { k: 'e1b', n: '논술 1 · 정밀도와 재현율의 값' },
  { k: 'e2a', n: '논술 2 · 정확도만으로 안 되는 까닭' },
  { k: 'e2b', n: '논술 2 · 더 중요한 지표 · FP · FN · 상황' },
];
let A2_MODE = 'code';      // 'code' 코드 채점 | 'essay' 논술 채점
const A2G_BASE = 8;        // 묶음 1·2·3 기본점수 3 + 2 + 3
let A2_GRADE = null;       // { [학번]: 채점 } — null 이면 불러오는 중
let A2_OUT = { snum: null, outs: {}, run: false, cur: null, msg: '' };   // ▶ 실행 결과

function a2gOf(snum){ return (A2_GRADE || {})[snum] || null; }
function a2gVal(g, k){
  if(!g) return null;
  const s = g.s || {};
  if(s[k] === 0 || s[k] === 1) return s[k];
  const a = (g.ai || {})[k] ?? (g.eai || {})[k];
  return (a === 0 || a === 1) ? a : null;
}
function a2gNb(g){
  if(!g || !g.ai) return null;
  return A2G_BASE + A2G_ITEMS.reduce((t, it) => t + (a2gVal(g, it.k) || 0), 0);
}
function a2gEssay(g){
  if(g && g.eai) return A2E_ITEMS.reduce((t, it) => t + (a2gVal(g, it.k) || 0), 0);
  const v = g && g.essay;
  return (v === 0 || (v !== '' && v != null)) ? Number(v) : null;
}
function a2gTotal(g){
  const nb = a2gNb(g) ?? (g && g.eai ? A2G_BASE : null);
  if(nb === null) return null;
  const e = a2gEssay(g);
  return e === null ? null : nb + 2 + e;
}
function a2gStateDot(g){
  const st = g?.state || '';
  if(st === 'done') return '<span class="a2g-dot done" title="확정">✔</span>';
  if(st === 'wip') return '<span class="a2g-dot wip" title="검토 중">◐</span>';
  return '<span class="a2g-dot" title="미검토">○</span>';
}
function a2gFlagCount(g, which){
  const fl = (g && (which === 'essay' ? g.efl : g.fl)) || {};
  return Object.keys(fl).filter(k => String(fl[k] || '').trim()).length;
}

/* 문제 하나 밑에 붙는 채점 칸 */
function _a2gCard(snum, q){
  const g = a2gOf(snum);
  const items = A2G_ITEMS.filter(it => it.q === q);
  if(!items.length) return '';
  if(!g || !g.ai) return `<div class="a2g-card a2g-none">채점 자료가 아직 없습니다.</div>`;
  return `<div class="a2g-card">${items.map(it => _a2gItem(g, it, g.ai, g.ev, g.fl, `묶음 ${it.b} · ${it.n}`)).join('')}</div>`;
}
function _a2gItem(g, it, aiM, evM, flM, label){
    const ai = (aiM || {})[it.k];
    const cur = a2gVal(g, it.k);
    const sv = (g.s || {})[it.k];
    const changed = (sv === 0 || sv === 1) && sv !== ai;
    const fl = String((flM || {})[it.k] || '').trim();
    const ev = String((evM || {})[it.k] || '').trim();
    return `<div class="a2g-item${fl ? ' flag' : ''}${changed ? ' changed' : ''}">
      <div class="a2g-top">
        <span class="a2g-name">${esc(label)}</span>
        <span class="a2g-btns">
          <button class="a2g-b${cur === 0 ? ' on' : ''}" data-action="a2g-set" data-k="${it.k}" data-v="0">0</button>
          <button class="a2g-b${cur === 1 ? ' on' : ''}" data-action="a2g-set" data-k="${it.k}" data-v="1">1</button>
        </span>
        ${changed ? `<span class="a2g-was">처음 <s>${ai}점</s> → <b>${cur}점으로 고침</b>
          <button class="btn-xs" data-action="a2g-set" data-k="${it.k}" data-v="ai">↺ 처음 점수로</button></span>` : ''}
      </div>
      ${ev ? `<div class="a2g-ev"><span class="a2g-lab">근거</span>${esc(ev)}</div>` : ''}
      ${fl ? `<div class="a2g-fl"><span class="a2g-lab">⚑ 확인 필요</span>${esc(fl)}</div>` : ''}
    </div>`;
}

/* 맨 위 — 점수 합계 · 논술 · 검토 상태 */
function _a2gSummary(snum){
  const g = a2gOf(snum);
  if(!g || (!g.ai && !g.eai)) return `<div class="a2g-sum a2g-none">이 학생의 채점 자료가 아직 없습니다.</div>`;
  const nb = a2gNb(g) ?? A2G_BASE, e = a2gEssay(g), tot = e === null ? null : nb + 2 + e;
  const st = g.state || '';
  const stLabel = st === 'done' ? '✔ 확정 완료' : (st === 'wip' ? '◐ 검토 중' : '○ 미검토');
  return `<div class="a2g-sum">
    <div class="a2g-sum-n"><span>노트북</span><b>${nb}</b><small>/ 19${g.ai ? '' : ' (노트북 없음)'}</small></div>
    <div class="a2g-sum-n"><span>논술 항목</span>
      ${g.eai ? `<b>${e}</b><small>/ 4 + 기본 2</small>`
        : `<input class="a2g-essay" id="a2g-essay" type="number" min="0" max="4" step="1" value="${e === null ? '' : e}"
        placeholder="0~4"/><small>+ 기본 2</small>`}</div>
    <div class="a2g-sum-n"><span>총점</span><b>${tot === null ? '–' : tot}</b><small>/ 25</small></div>
    <div class="a2g-sum-n"><span>상황</span><b class="a2g-sit">${esc(g.sit || '–')}</b></div>
    <button class="a2g-state ${st}" data-action="a2g-state" title="누를 때마다 미검토 → 검토 중 → 확정">${stLabel}</button>
    <span class="a1-dim">⚑ 코드 ${a2gFlagCount(g)}개${g.eai ? ' · 논술 ' + a2gFlagCount(g, 'essay') + '개' : ''}</span>
  </div>`;
}

function _a2gFold(x, title){
  if(!x) return '';
  const f = v => (v === null || v === undefined) ? '계산 안 됨' : Number(v).toFixed(2);
  return `<table class="tbl a2g-cm"><tr><th colspan="3">${esc(title)}</th></tr>
    <tr><th>실젯값 \\ 예측값</th><th>NO(0)</th><th>Yes(1)</th></tr>
    <tr><th>NO(0)</th><td>TN ${x.TN}</td><td>FP ${x.FP}</td></tr>
    <tr><th>Yes(1)</th><td>FN ${x.FN}</td><td>TP ${x.TP}</td></tr>
    <tr><td colspan="3">정밀도 ${f(x.P)} · 재현율 ${f(x.R)}</td></tr></table>`;
}

/* 맨 아래 — 모범 답안 · 메모 */
function _a2gBottom(snum){
  const g = a2gOf(snum);
  if(!g) return '';
  const a = g.ans;
  let ans = '';
  if(a && a.m){
    const labels = a.labels || [];
    const cm = `<table class="tbl a2g-cm"><tr><th>실젯값 \\ 예측값</th>${labels.map(l => `<th>${esc(l)}</th>`).join('')}</tr>
      ${a.m.map((r, i) => `<tr><th>${esc(labels[i])}</th>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</table>`;
    const showKey = !a.mine || (a.mine.cls !== a.key?.cls);
    ans = `<div class="a2-q-head">📄 논술 모범 답안 — 이 학생의 코드로 계산</div>
      <div class="a2-ans-c">
        <div class="a2-ans-h">${esc(a.model || '')} · 분류 정확도 ${a.acc != null ? Number(a.acc).toFixed(2) : '–'} · 테스트 ${a.n || '–'}행 — ${esc(a.src || '')}</div>
        <div class="a2g-cms">${cm}
          ${a.mine ? _a2gFold(a.mine, '학생 기준 클래스 — ' + a.mine.cls) : `<div class="a1-dim">학생 기준 클래스: ${esc(a.kc || '안 적음')}</div>`}
          ${showKey ? _a2gFold(a.key, '상황 클래스 — ' + (a.key?.cls || '')) : ''}
          ${a.tab ? _a2gFold(a.tab, '학생이 ✍️ 에 적은 네 수 그대로') : ''}
        </div>
        <div class="a2g-essay-h">논술 1</div><div class="a2g-model">${esc(a.e1 || '')}</div>
        ${a.e2m ? `<div class="a2g-essay-h">논술 2 — 학생 기준 클래스 ${esc(a.mine?.cls || '')}</div><div class="a2g-model">${esc(a.e2m)}</div>` : ''}
        <div class="a2g-essay-h">논술 2 — 상황 클래스 ${esc(a.key?.cls || '')}</div><div class="a2g-model">${esc(a.e2k || '')}</div>
        ${a.note ? `<div class="a1-dim" style="margin-top:6px">※ ${esc(a.note)}</div>` : ''}
      </div>`;
  } else if(g.ai){
    ans = `<div class="a2-q-head">📄 논술 모범 답안</div>
      <div class="a2-ans-c a1-dim">혼동 행렬을 만들 모델이 코드에 없어 모범 답안을 만들지 않았습니다.</div>`;
  }
  return ans + `<div class="a2-q-head">📝 선생님 메모</div>
    <textarea class="a2g-note" id="a2g-note" placeholder="이 학생 채점에 대한 메모 — 칸을 벗어나면 저장됩니다">${esc(g.note || '')}</textarea>`;
}

/* 📝 논술 — 스캔 · 옮겨 적은 글 · 채점 네 항목 */
function _a2eSection(snum){
  const g = a2gOf(snum);
  if(!g || !g.eai) return `<div class="a2-q-head">📝 논술</div>
    <div class="a2-ans-c a1-dim">이 학생의 논술 답안 자료가 없습니다 (스캔에 없거나 아직 넣지 않음).</div>`;
  const tr = g.etr || {};
  const c = tr.cells || {};
  const arr = v => Array.isArray(v) ? v : Object.values(v || {});
  const row = (k, v) => (v && String(v).trim()) ? `<tr><th>${k}</th><td>${esc(v)}</td></tr>` : '';
  const unsure = arr(tr.unsure).filter(Boolean);
  return `<div class="a2-q-head">📝 논술 답안 — 스캔과 옮겨 적은 글</div>
    <div class="a2e-wrap">
      <div class="a2e-img">${g.eimg
        ? `<a href="${esc(g.eimg)}" target="_blank" rel="noopener"><img src="${esc(g.eimg)}" alt="논술 답안 스캔"></a>
           <div class="a1-dim">누르면 새 창에서 크게 열립니다</div>`
        : '<div class="a1-dim">스캔이 없습니다</div>'}</div>
      <div class="a2e-tr">
        <table class="tbl a2-fill">
          ${row('적은 모델', tr.model)}${row('분류 정확도', tr.acc)}${row('기준 클래스', tr.base_class)}
        </table>
        <table class="tbl a2g-cm" style="margin:8px 0"><tr><th>실젯값 \ 예측값</th><th>NO(0)</th><th>Yes(1)</th></tr>
          <tr><th>NO(0)</th><td>${esc(c.no_neg || '')}</td><td>${esc(c.no_pos || '')}</td></tr>
          <tr><th>Yes(1)</th><td>${esc(c.yes_neg || '')}</td><td>${esc(c.yes_pos || '')}</td></tr></table>
        <table class="tbl a2-fill">
          ${row('정밀도 정의', tr.prec_def)}${row('정밀도 식', tr.prec_formula)}${row('정밀도 값', tr.prec_value)}
          ${row('재현율 정의', tr.rec_def)}${row('재현율 식', tr.rec_formula)}${row('재현율 값', tr.rec_value)}
          ${row('논술 2', tr.e2)}${row('논술 3', tr.e3)}
        </table>
        ${unsure.length ? `<div class="a2g-fl" style="margin-top:6px"><span class="a2g-lab">읽기 어려웠던 곳</span>${esc(unsure.join(' · '))}</div>` : ''}
        ${tr.notes ? `<div class="a1-dim" style="margin-top:4px">${esc(tr.notes)}</div>` : ''}
      </div>
    </div>
    <div class="a2g-card">${A2E_ITEMS.map(it => _a2gItem(g, it, g.eai, g.eev, g.efl, it.n)).join('')}</div>`;
}
function _a2ModeBtns(){
  return `<span class="a2-mode">
    <button class="btn-sm${A2_MODE === 'code' ? ' on' : ''}" data-action="a2-mode" data-m="code">💻 코드 채점</button>
    <button class="btn-sm${A2_MODE === 'essay' ? ' on' : ''}" data-action="a2-mode" data-m="essay">📝 논술 채점</button></span>`;
}

/* ▶ 실행 결과 — 셀 하나의 출력 */
function _a2OutHtml(snum, id){
  const runBtn = `<button class="btn-xs a2-runcell" data-action="a2-run" data-cid="${esc(id)}"
    title="이 학생 노트북을 처음부터 차례대로 돌려 이 셀의 출력을 보여 줍니다">▶ 실행 결과 보기</button>`;
  if(A2_OUT.snum !== snum) return A2_OUT.run ? '' : runBtn;
  const o = A2_OUT.outs[id];
  if(A2_OUT.cur === id) return `<div class="a2-out-h">⏳ 실행 중…</div>`;
  if(!o) return A2_OUT.run ? `<div class="a2-out-h a1-dim">차례를 기다리는 중</div>` : runBtn;
  const items = o.items || [];
  return `<div class="a2-out-h">▶ 실행 결과${o.ok ? '' : ' — <b style="color:#C8102E">오류</b>'}</div>
    <div class="cb-out-items">${items.length ? vNbItems(items) : '<span class="a1-dim">(출력 없음)</span>'}</div>`;
}
function _a2OutSlot(snum, id){
  return `<div class="a2-out" data-a2out="${esc(id)}">${_a2OutHtml(snum, id)}</div>`;
}
function _a2RunMsg(snum){
  if(A2_OUT.snum !== snum) return '';
  const n = Object.keys(A2_OUT.outs).length;
  if(A2_OUT.run) return `⏳ ${esc(A2_OUT.msg || '실행 중')} (${n}개 끝남)`;
  return A2_OUT.msg ? esc(A2_OUT.msg) : (n ? `✔ 셀 ${n}개를 실행했습니다` : '');
}
function _a2RunBar(snum){
  const busy = A2_OUT.run;
  return `<div class="a2-runbar">
    <button class="btn-p btn-sm" data-action="a2-run" ${busy ? 'disabled' : ''}>▶ 실행 결과 보기</button>
    <span class="a2-runmsg" id="a2-runmsg">${_a2RunMsg(snum)}</span>
    <span class="a1-dim">학생 코드 셀을 노트북 차례대로 돌립니다 (처음엔 파이썬 준비에 10~20초). 학생 진도는 바꾸지 않습니다.</span>
  </div>`;
}

function _a2TcStudent(nb){
  const snum = A2_SNUM;
  const list = _a2TcNums();
  const at = list.indexOf(snum);
  const st = (typeof STUDENTS !== 'undefined' ? STUDENTS : []).find(s => s.number === snum);
  const doc = (A2_ALL || {})[snum];
  const g = a2gOf(snum);

  const nav = `<div style="display:flex;gap:4px;margin-left:auto;align-items:center">
    <span class="a1-dim">${at < 0 ? '' : (at + 1) + ' / ' + list.length}</span>
    <button class="btn-sm" data-action="a2-step" data-d="-1" ${at <= 0 ? 'disabled' : ''}>← 앞 학생</button>
    <button class="btn-sm" data-action="a2-step" data-d="1" ${at < 0 || at >= list.length - 1 ? 'disabled' : ''}>다음 학생 →</button>
  </div>`;
  const head = `<div class="aia-tcs-header">
    <button class="btn-sm" data-action="a2-back">← 목록</button>
    <div class="aia-tcs-info"><span class="aia-tcs-snum">${esc(snum)}</span>
      <span class="aia-tcs-name">${esc(st?.name || '')}</span>
      ${a2gStateDot(g)}
      <span class="a1-dim">마지막 저장 ${esc(_a2Time(doc?.updatedAt)) || '–'}</span></div>
    ${_a2ModeBtns()}
    ${nav}
  </div>`;
  if(A2_MODE === 'essay'){
    return head + _a2gSummary(snum) + _a2eSection(snum) + _a2gBottom(snum);
  }
  if(!doc) return head + emptyBox('📭', '저장한 노트북 답안이 없습니다.');

  // 학생이 저장한 차례대로 — 학생이 더한 셀도 그 자리에 보입니다
  const byId = {};
  for(const c of (nb.cells || [])) if(c.id) byId[c.id] = c;
  const order = (doc.cells && doc.cells.length) ? doc.cells : (nb.cells || []);
  const scById = a2Cells(doc);

  let out = '';
  let wait = '';   // 아래에 답이 하나라도 나올 때까지 제목을 쥐고 있습니다
  let curQ = 0;
  const flush = () => { if(curQ){ out += _a2gCard(snum, curQ); curQ = 0; } };
  for(const c0 of order){
    if(!c0) continue;
    const oc = byId[c0.id] || null;
    const sc = scById[c0.id] || null;
    const base = oc || c0;
    const t = base.type || base.cell_type || 'code';
    const m = (t === 'markdown')
      ? (base.source || '').match(/^#+\s*\*\*\s*((?:준비 단계|문제)\s*(\d+)\.?)\s*\*\*\s*(.*)$/m) : null;
    if(m){
      flush();
      wait = `${m[1].replace(/\s+/g, ' ').trim()} ${a2Txt(m[3]).split('\n')[0]}`;
      // 채점 항목이 있는 문제는 제목을 바로 냅니다 — 답이 비어 있어도 채점 칸은 보여야 합니다
      if(/^문제/.test(m[1]) && A2G_ITEMS.some(it => it.q === Number(m[2]))){
        curQ = Number(m[2]);
        out += `<div class="a2-q-head">${esc(wait)}</div>`; wait = '';
      }
      continue;
    }
    let box = '';
    if(oc){
      if(!a2IsAns(oc)) continue;
      box = _a2CellBox(oc, sc);
    } else {
      // 원본에 없는 셀 — 학생이 더한 것
      const src = String(c0.source || '').trim();
      if(!src) continue;
      box = t === 'markdown'
        ? `<div class="a2-ans-c"><div class="a2-ans-h">＋ 학생이 더한 글 셀</div><div class="a2g-model">${esc(src)}</div></div>`
        : `<div class="a2-ans-c"><div class="a2-ans-h">＋ 학생이 더한 코드 셀</div><pre class="a2-code">${esc(src)}</pre></div>`;
    }
    if(!box) continue;
    if(wait){ out += `<div class="a2-q-head">${esc(wait)}</div>`; wait = ''; }
    out += box;
    if(t === 'code' && String((sc || c0).source || '').trim()) out += _a2OutSlot(snum, c0.id);
  }
  flush();
  return head
    + _a2gSummary(snum)
    + _a2RunBar(snum)
    + `<div class="ml-sub-explain">아래는 <b>학생이 저장한 그대로</b>이고, 문제마다 밑에 <b>채점 칸</b>이 붙습니다.
       <b>0 · 1</b> 을 누르면 바로 저장되고 합계가 바뀝니다 — 처음 매긴 점수는 지워지지 않습니다.
       <b>노란 칸</b>은 판단이 필요한 항목입니다. 근거는 <b>지금 남은 코드를 실제로 돌려</b> 기록한 것이라,
       학생이 수업 중에 본 값과 다를 수 있습니다.</div>`
    + (out || emptyBox('📭', '손댄 셀이 없습니다.'))
    + _a2gBottom(snum);
}
