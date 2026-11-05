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
    if(VIEW === 'teacher' && TC_TAB === 'assess2' && TC_CLS?.id === cid) render();
  };
  ref.on('value', fn, err => {
    A2_ERR = err.message || String(err); A2_ALL = {};
    if(VIEW === 'teacher' && TC_TAB === 'assess2') render();
  });
  A2_WATCH = { ref, fn };
}
function a2TcStop(){
  if(A2_WATCH){ A2_WATCH.ref.off('value', A2_WATCH.fn); A2_WATCH = null; }
  A2_FOR = null;
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
      <td>${doc
        ? `<button class="btn-xs" data-action="a2-view" data-snum="${esc(st.number)}">답안 보기 →</button>`
        : '<span class="a1-dim">미응시</span>'}</td>
    </tr>`;
  }).join('');

  // 명단에 없는 학번으로 저장된 것 (test 계정 등)
  const extra = Object.keys(all).filter(k => !sts.some(s => s.number === k));

  return `<div class="a2-head">
      <div class="sec-title" style="margin:0">📋 학생 답안</div>
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
      <b>실행 결과는 저장되지 않습니다</b> — 남는 것은 코드와 적은 글자뿐입니다.</div>
    ${sts.length === 0 ? emptyBox('👥', '먼저 학생을 등록하세요.')
      : `<div style="overflow-x:auto"><table class="tbl a1-tc-table">
          <thead><tr><th>학번</th><th>이름</th>${groups.map(g =>
            `<th>${esc(g.label.replace('문제 ', '문'). replace('준비 단계', '준비'))}</th>`).join('')}
            <th>마지막 저장</th><th></th></tr></thead>
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
  return sts.filter(s => (A2_ALL || {})[s.number]).map(s => s.number);
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

function _a2TcStudent(nb){
  const snum = A2_SNUM;
  const list = _a2TcNums();
  const at = list.indexOf(snum);
  const st = (typeof STUDENTS !== 'undefined' ? STUDENTS : []).find(s => s.number === snum);
  const doc = (A2_ALL || {})[snum];
  const cells = a2Cells(doc);

  const nav = `<div style="display:flex;gap:4px;margin-left:auto;align-items:center">
    <span class="a1-dim">${at < 0 ? '' : (at + 1) + ' / ' + list.length}</span>
    <button class="btn-sm" data-action="a2-step" data-d="-1" ${at <= 0 ? 'disabled' : ''}>← 앞 학생</button>
    <button class="btn-sm" data-action="a2-step" data-d="1" ${at < 0 || at >= list.length - 1 ? 'disabled' : ''}>다음 학생 →</button>
  </div>`;
  const head = `<div class="aia-tcs-header">
    <button class="btn-sm" data-action="a2-back">← 목록</button>
    <div class="aia-tcs-info"><span class="aia-tcs-snum">${esc(snum)}</span>
      <span class="aia-tcs-name">${esc(st?.name || '')}</span>
      <span class="a1-dim">마지막 저장 ${esc(_a2Time(doc?.updatedAt)) || '–'}</span></div>
    ${nav}
  </div>`;
  if(!doc) return head + emptyBox('📭', '저장한 답안이 없습니다.');

  let out = '';
  let wait = '';   // 아래에 답이 하나라도 나올 때까지 제목을 쥐고 있습니다
  for(const oc of (nb.cells || [])){
    const t = oc.type || oc.cell_type || 'code';
    const m = (t === 'markdown')
      ? (oc.source || '').match(/^#+\s*\*\*\s*((?:준비 단계|문제)\s*\d+\.?)\s*\*\*\s*(.*)$/m) : null;
    if(m){
      wait = `${m[1].replace(/\s+/g, ' ').trim()} ${a2Txt(m[2]).split('\n')[0]}`;
      continue;
    }
    if(!a2IsAns(oc)) continue;
    const box = _a2CellBox(oc, cells[oc.id]);
    if(!box) continue;
    if(wait){ out += `<div class="a2-q-head">${esc(wait)}</div>`; wait = ''; }
    out += box;
  }
  return head
    + `<div class="ml-sub-explain">아래는 <b>학생이 저장한 그대로</b>입니다. 이 화면은 읽기만 하며
       학생 답안을 바꾸지 않습니다. <b>틀린 칸</b>은 함수 이름 · train/test 처럼
       <b>답이 하나로 정해진 칸</b>만 표시합니다 — 열 이름과 타깃은 상황마다 달라
       표시하지 않으니 직접 보십시오.</div>`
    + (out || emptyBox('📭', '손댄 셀이 없습니다.'));
}
