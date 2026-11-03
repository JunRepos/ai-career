/* ═══════════════════════════════════════
   views/notebook.js — 노트북(Colab 스타일)

   레이아웃:
   - 상단 툴바: 제목 + 모두 실행/재시작
   - 셀 목록: 번호/실행카운트/툴바/에디터/출력
   - 셀 사이: + 코드 / + 텍스트 추가 버튼
═══════════════════════════════════════ */

/* ═══ 🧩 블록 고치기 페이지 (2026-10-28) ═══════════════════════
   블록의 **이름과 설명**은 노트북 하나에 딸린 것이 아니라 그 블록을 쓴 **모든
   노트북**에 걸립니다. 그래서 노트북 안에서 고치면 어디까지 바뀌는지 안 보입니다.
   여기서는 블록을 한자리에 늘어놓고 고칩니다.

   ⚠ **같은 과목의 모든 반에 함께 저장합니다** — 반마다 설명이 다르면
     두 반 수업이 어긋납니다 (CLAUDE.md 23). 화면에도 그렇게 적어 둡니다. */
/* 🧩 블록 하나의 **최종 모양**과 **빈칸 설정** (2026-10-29 선생님 —
   「빈칸을 어디에 뚫는지도 설정할 수 있도록」 · 「최종 블록 형태가 어떻게 되는지도
   한눈에 확인할 수 있게」).

   · 윗줄 — 학생이 보는 그대로. 빈칸은 ✎ 로, 채워 둔 자리는 값으로 보여 줍니다.
   · 아랫줄 — 칸마다 누르는 단추. 누르면 **반 전체**의 빈칸이 바뀝니다. */
function vNbBlkPreview(k){
  const d = NB_BLOCK_DEFS[k];
  if(!d) return '';
  const ask = nbBlkAskDefault(k);
  const file = (typeof NB_DATA_DEFAULT !== 'undefined') ? NB_DATA_DEFAULT : null;

  // ① 최종 모양 — 파이썬 한 줄씩, 빈칸 자리를 눈에 띄게
  const seen = new Set();
  const code = (d.tpl || '').split('\n').map(line =>
    `<div class="nbbe-pl">${line.split(/(\{\w+\})/).map(part => {
      const m = part.match(/^\{(\w+)\}$/);
      if(!m) return esc(part);
      const key = m[1];
      const first = !seen.has(key);
      seen.add(key);
      if(ask.indexOf(key) >= 0){
        return `<span class="nbbe-blank" title="${esc(key)} — 학생이 채웁니다">✎ ${esc(key)}</span>`;
      }
      const v = nbSlotFill(d.slots[key], file);
      return `<span class="nbbe-filled" title="${esc(key)} — 채워 둡니다">${
        esc(v === '' || v == null ? '…' : String(v))}</span>`;
    }).join('')}</div>`).join('');

  // ② 칸마다 켜고 끄기
  const keys = Object.keys(d.slots || {});
  const chips = !keys.length
    ? '<span class="nbbe-noslot">고칠 칸이 없는 블록입니다</span>'
    : keys.map(key => {
        const on = ask.indexOf(key) >= 0;
        const slot = d.slots[key];
        const hint = slot.kind ? '적는 칸' : (typeof nbSlotHint === 'function'
          ? nbSlotHint(slot, file) : '고르는 칸');
        return `<button class="nbbe-slot${on ? ' on' : ''}" data-action="nb-blkask-toggle"
          data-k="${k}" data-slot="${key}" aria-pressed="${on}"
          title="${on ? '지금 빈칸입니다 — 누르면 채워 둡니다'
                      : '지금 채워 둡니다 — 누르면 빈칸이 됩니다'}"
          >${on ? '✎ 빈칸' : '● 채워 둡'}<i>${esc(key)} · ${esc(hint)}</i></button>`;
      }).join('');

  return `<div class="nbbe-prev">
    <div class="nbbe-prev-h">학생이 보는 모양
      <span class="nbbe-prev-n">빈칸 ${ask.length} / ${keys.length}</span>
      ${nbBlkAskEdited(k) ? `<button class="btn-xs" data-action="nb-blkask-reset" data-k="${k}"
        >↺ 빈칸 처음대로</button>` : ''}
    </div>
    <pre class="nbbe-code">${code}</pre>
    <div class="nbbe-slots">${chips}</div>
  </div>`;
}

function vNbBlockEditor(){
  const mates = (typeof CLASSES !== 'undefined' && TC_CLS)
    ? CLASSES.filter(c => c.type === (CLASSES.find(x => x.id === TC_CLS.id) || {}).type)
    : [];
  const edited = Object.keys(NB_BLK_TEXT || {}).length;

  // 서랍 묶음에 없는 블록도 빠뜨리지 않습니다 — 옛 노트북에 남아 있을 수 있습니다
  //   (지금은 `scoret` 하나. 서랍에는 안 보이지만 쓰인 노트북이 있습니다)
  const inGroups = new Set([].concat(...(typeof NB_BLOCK_GROUPS === 'undefined' ? []
    : NB_BLOCK_GROUPS.map(([, ks]) => ks))));
  const rest = Object.keys(NB_BLOCK_DEFS).filter(k => !inGroups.has(k));
  const all = (typeof NB_BLOCK_GROUPS === 'undefined' ? [] : NB_BLOCK_GROUPS.slice())
    .concat(rest.length ? [['서랍에 없는 것', rest]] : []);

  const groups = all.map(([g, keys]) => `
      <div class="sec-title" style="margin-top:14px">${esc(g)}</div>
      ${keys.map(k => {
        const d = NB_BLOCK_DEFS[k];
        if(!d) return '';
        const t = NB_BLK_TEXT[k] || {};
        const on = !!(t.name || t.say);        // 글을 고쳤나 (빈칸 설정은 따로 셉니다)
        return `<div class="nbbe-row${on ? ' nbbe-on' : ''}" data-k="${k}"
            style="--nbk-cat:var(${NB_BLK_CAT[d.cat]})">
          <div class="nbbe-head">
            <input class="nbbe-name" id="nbbe-name-${k}" type="text" maxlength="40"
              value="${esc(t.name || d.name)}" placeholder="${esc(d.name)}"
              aria-label="블록 이름">
            <span class="nbbe-k">${k}</span>
            ${on ? '<span class="chip chip-purple">고친 것</span>' : ''}
          </div>
          ${vNbBlkPreview(k)}
          <textarea class="nbbe-say" id="nbbe-say-${k}" rows="3"
            placeholder="${esc(d.say || '')}" aria-label="블록 설명">${esc(t.say || d.say || '')}</textarea>
          <div class="nbbe-foot">
            ${d.src ? `<span class="nbbe-src">처음 글의 출처 — ${esc(d.src)}</span>` : '<span></span>'}
            <span>
              ${on ? `<button class="btn-xs" data-action="nb-blkedit-reset" data-k="${k}"
                >↺ 처음 글로</button>` : ''}
              <button class="btn-xs btn-p" data-action="nb-blkedit-save" data-k="${k}">저장</button>
            </span>
          </div>
        </div>`;
      }).join('')}`).join('');

  return `<div class="section">
    <div class="nbbe-top">
      <button class="btn-xs" data-action="nb-blockedit-close">← 노트북 목록</button>
      <div class="sec-title" style="margin:0">🧩 블록·빈칸 고치기</div>
      <span class="nbbe-sp"></span>
      <button class="btn-xs btn-p" data-action="nb-blkask-apply"
        title="지금 정한 빈칸을 이미 올라간 노트북에도 그대로 넣습니다"
        >📓 올라간 노트북에 반영</button>
    </div>
    <div class="box-info">
      칸마다 <b>✓ 빈칸</b> 칩을 눌러 <b>학생이 채울 자리</b>를 정합니다.
      정한 빈칸은 <b>새로 끌어다 놓는 블록</b>부터 걸립니다 —
      이미 노트북에 놓여 있는 블록까지 바꾸려면 위의
      <b>📓 올라간 노트북에 반영</b> 을 누릅니다.
      <br>블록의 <b>이름</b>과 <b>아래 설명</b>도 여기서 고칩니다.
      고친 글은 <b>그 블록을 쓴 모든 노트북</b>에 그대로 보입니다 — 학생 화면도 같습니다.
      <br>저장하면 <b>${mates.length ? esc(mates.map(c => c.short || c.id).join(' · ')) : '이 반'}</b>
      에 함께 적용됩니다. 반마다 다르면 두 반 수업이 어긋납니다.
      <br>⚠ 교과서 문장을 고치면 <b>교과서 쪽 표시를 떼어 냅니다</b> — 교과서에 없는 글인데
      쪽이 달려 있으면 학생이 거기서 찾습니다.
      ${edited ? `<br>지금 고쳐 둔 블록 <b>${edited}개</b>` : ''}
    </div>
    ${groups}
  </div>`;
}

// ── 선생님: 노트북 관리 ──
function vTcNotebook(){
  // 🧩 블록만 따로 고치는 페이지 (2026-10-28 선생님)
  if(NB_BLKEDIT && !SEL_NOTEBOOK) return vNbBlockEditor();

  const form = `<div class="section">
    <div class="sec-title">📓 노트북 업로드</div>
    <div class="box-info">Google Colab 또는 Jupyter .ipynb 파일을 업로드하면 학생들이 웹에서 단계적으로 실습할 수 있습니다.</div>
    <div class="form">
      <div class="field"><label>제목 (비워두면 파일명 사용)</label><input id="nb-title" type="text" placeholder="예: 2차시 - 사칙연산 계산기 만들기"/></div>
      <div class="field"><label>ipynb 파일 (여러 개 가능)</label><input id="nb-file" type="file" accept=".ipynb" multiple/></div>
      ${multiClassPicker('nb', TC_CLS?.id)}
      <div id="nb-err" class="err"></div>
      <div id="nb-prog" style="display:none;font-size:12px;color:var(--text2)"></div>
      <button id="nb-upload" class="btn-p btn-sm">업로드</button>
    </div>
  </div>`;

  // 선생님도 미리보기 가능
  if(SEL_NOTEBOOK) return vNotebookDetail(true);

  const list = !NOTEBOOKS.length ? emptyBox('📓','등록된 노트북이 없습니다.') : NOTEBOOKS.map(nb => {
    // 🔒 평가용 — 선생님이 열어야 학생에게 보입니다 (js/nb-open.js)
    const gated = nbIsGated(TC_CLS?.id, nb.id);
    const open = gated && nbIsOpen(TC_CLS?.id, nb.id);
    // 📦 보관 — 블록판으로 바뀐 **옛판**. 학생 목록에서는 사라집니다 (2026-10-29).
    const arch = typeof nbIsArchived === 'function' && nbIsArchived(TC_CLS?.id, nb.id);
    const lockChip = arch
      ? '<span class="chip chip-arch" style="margin-left:6px">📦 보관 — 학생에게 안 보임</span>'
      : (!gated ? '' :
      `<span class="chip ${open ? 'chip-red' : ''}" style="margin-left:6px">${open ? '🔓 열림' : '🔒 닫힘'}</span>`);
    const lockBtn = !gated ? '' :
      `<button class="btn-xs ${open ? 'btn-danger' : 'btn-p'}" data-action="nb-toggle-open"
         data-nid="${nb.id}" title="${open ? '학생에게서 숨깁니다' : '학생에게 보여 줍니다'}"
        >${open ? '닫기' : '열기'}</button>`;
    // 🔑 입장 비밀번호 — 문이 열려 있어도 이걸 맞혀야 들어갑니다
    const hasPw = gated && typeof nbHasPw === 'function' && nbHasPw(TC_CLS?.id, nb.id);
    const pwBtn = !gated ? '' :
      `<button class="btn-xs" data-action="nb-set-pw" data-nid="${nb.id}"
         title="${hasPw ? '비밀번호를 바꾸거나 없앱니다' : '입장 비밀번호를 정합니다'}"
        >🔑 ${hasPw ? '비밀번호 있음' : '비밀번호 없음'}</button>`;
    // 보관하기 / 되돌리기 — 평가용에는 달지 않습니다 (문과 섞이면 안 됩니다)
    const archBtn = gated ? '' :
      `<button class="btn-xs${arch ? ' btn-p' : ''}" data-action="nb-archive" data-nid="${nb.id}"
         title="${arch ? '다시 학생에게 보여 줍니다'
                       : '학생 목록에서 숨깁니다. 지우지 않으므로 학생 작업은 남습니다'}"
        >${arch ? '↺ 되돌리기' : '📦 보관'}</button>`;
    return `
    <div class="list-row${arch ? ' nb-arch' : ''}">
      <div class="row-icon" data-action="open-notebook" data-nid="${nb.id}" style="cursor:pointer">${
        arch ? '📦' : (gated ? '📝' : '📓')}</div>
      <div class="row-info" data-action="open-notebook" data-nid="${nb.id}" style="cursor:pointer">
        <div class="row-title">${esc(nb.title)}${lockChip}</div>
        <div class="row-meta">${nb.cells?.length || 0}개 셀 · ${fmtDt(nb.createdAt)}${
          arch ? ' · <b>학생 목록에 없음</b> — 저장된 학생 작업은 그대로 있습니다'
               : gated ? (open ? ' · <b>지금 학생에게 보입니다</b>' : ' · 학생에게 안 보입니다') : ''}</div>
      </div>
      <div class="row-right">
        ${pwBtn}
        ${lockBtn}
        ${archBtn}
        <button class="btn-xs" data-action="notebook-move-up" data-nid="${nb.id}" title="위로">▲</button>
        <button class="btn-xs" data-action="notebook-move-down" data-nid="${nb.id}" title="아래로">▼</button>
        <button class="btn-xs" data-action="rename-notebook" data-nid="${nb.id}" data-ntitle="${esc(nb.title)}" title="노트북 이름 바꾸기">이름 변경</button>
        <button class="btn-xs btn-danger" data-action="del-notebook" data-nid="${nb.id}" data-ntitle="${esc(nb.title)}">삭제</button>
      </div>
    </div>`;
  }).join('');

  // 🧩 블록은 노트북 하나가 아니라 **반 전체**에 걸립니다. 그래서 여기서 따로 들어갑니다.
  const blkBtn = `<div class="nbbe-top" style="margin-top:4px">
    <div class="sec-title" style="margin:0">등록된 노트북</div>
    <button class="btn-xs" data-action="nb-blockedit-open"
      title="빈칸을 어디에 뚫을지, 블록의 이름과 설명을 한자리에서 정합니다 — 모든 노트북에 적용됩니다"
      >🧩 블록·빈칸 고치기</button>
  </div>`;
  return form + blkBtn + list;
}

// ── 학생: 노트북 목록/상세 ──
function vStNotebook(){
  // 🔑 비밀번호를 묻는 중이면 그 화면만 보여 줍니다 (js/nb-open.js)
  if(NB_PW_ASK){
    const nb = NOTEBOOKS.find(x => x.id === NB_PW_ASK);
    return `<div class="section"><div class="nbpw">
      <div class="nbpw-ic">🔒</div>
      <div class="nbpw-t">${esc(nb ? nb.title : '수행평가')}</div>
      <div class="nbpw-s">선생님이 알려 준 입장 비밀번호를 입력하세요.</div>
      <input type="password" id="nb-pw-in" class="nbpw-in" autocomplete="off"
             maxlength="32" placeholder="비밀번호" ${NB_PW_BUSY ? 'disabled' : ''}/>
      ${NB_PW_ERR ? `<div class="nbpw-err">${esc(NB_PW_ERR)}</div>` : ''}
      <div class="nbpw-row">
        <button class="btn-p" data-action="nb-pw-go" ${NB_PW_BUSY ? 'disabled' : ''}
          >${NB_PW_BUSY ? '확인 중…' : '입장하기'}</button>
        <button class="btn-xs" data-action="nb-pw-cancel">← 목록</button>
      </div>
    </div></div>`;
  }
  if(SEL_NOTEBOOK) return vNotebookDetail(false);
  // 🔒 평가용 노트북은 선생님이 열어야 보입니다 (js/nb-open.js)
  const shown = NOTEBOOKS.filter(nb => nbVisibleToStudent(SEL_CLS?.id, nb));
  if(!shown.length) return emptyBox('📓','선생님이 올린 노트북이 없습니다.');
  return shown.map(nb => `
    <div class="list-row click" data-action="open-notebook" data-nid="${nb.id}">
      <div class="row-icon">📓</div>
      <div class="row-info">
        <div class="row-title">${esc(nb.title)}</div>
        <div class="row-meta">${nb.cells?.length || 0}개 셀</div>
      </div>
      <div class="row-right"><span class="chip chip-purple">시작 →</span></div>
    </div>`).join('');
}

// ── 노트북 상세 (Colab 스타일) ──
/* ── 선생님이 노트북을 **짜는 중**인가 ──
   실제 조건은 js/nb-open.js 의 nbCanAuthor() 한 곳에 있습니다. 여기서는 그 함수가
   없을 수도 있다는 것만 챙깁니다 — tools/notebook-preview.html 처럼
   nb-open.js 를 안 싣는 화면에서도 깨지지 않게 (2026-10-28). */
function nbAuthoring(){
  return typeof nbCanAuthor === 'function' && nbCanAuthor();
}
/* 빈칸·설명을 정하는 손잡이만 — 🧪 시뮬레이션에서도 보입니다 (js/nb-open.js) */
function nbAskUi(){
  return typeof nbCanSetAsk === 'function' && nbCanSetAsk();
}

function vNotebookDetail(isTeacher){
  const nb = SEL_NOTEBOOK;
  if(!nb) return emptyBox('❌','노트북을 찾을 수 없습니다.');

  const isStudent = !isTeacher && !!ST_USER;
  // 저장 표시:
  //  · 학생 모드 — 본인 진도 자동 저장
  //  · 선생님이 본인이 만든 원본을 편집 중 — 원본 노트북 자동 저장 (학생 진도 보기 모드 제외)
  const showSaveInd = isStudent || (isTeacher && !NB_VIEWING_STUDENT);

  // 🧪 평가용 노트북 — 선생님은 시뮬레이션으로 시작합니다 (js/nb-open.js)
  //   ⚠ 이 줄은 아래 indText 보다 **먼저** 와야 합니다. const 는 선언 전에 쓰면
  //     ReferenceError 가 나서 노트북 화면이 통째로 안 뜹니다 (2026-10-27 고침).
  const gated = isTeacher && TC_CLS && typeof nbIsGated === 'function'
                && nbIsGated(TC_CLS.id, nb.id);

  const indText = (gated && NB_SIM) ? '🧪 시뮬레이션 — 저장 안 함' : '✓ 저장됨';
  const saveInd = showSaveInd ? `<div id="cb-save-ind" class="cb-save-ind" style="font-size:11px;color:var(--cb-text-3);margin-right:6px">${indText}</div>` : '';
  const progressBtn = isTeacher ? `<button class="cb-tb-btn" data-action="nb-show-progress" title="학생별 진도 보기">👥 학생 진도</button>` : '';
  const simBtn = !gated ? '' : `<button class="cb-tb-btn${NB_SIM ? '' : ' cb-tb-on'}"
      data-action="nb-toggle-sim"
      title="${NB_SIM ? '지금은 원본이 바뀌지 않습니다' : '지금 한 것이 학생 노트북에 저장됩니다'}"
    >${NB_SIM ? '🧪 시뮬레이션' : '✏️ 원본 수정 중'}</button>`;

  /* 📤 다른 반에도 반영 — 2026-10-28.
     선생님의 편집은 `notebooks/{지금 보는 반}` **한 곳**에만 저장됩니다.
     ai-2B 에서 다 고쳐 놓으면 ai-2D 는 옛 판 그대로 남는데 아무 표시도 없었습니다
     (HANDOFF 「여러 반을 다루는 기능」 · CLAUDE.md 23). */
  const syncBtn = nbAuthoring()
    ? `<button class="cb-tb-btn" data-action="nb-sync-classes"
         title="이 노트북의 셀을 같은 과목의 다른 반에도 그대로 넣습니다">📤 다른 반에도 반영</button>`
    : '';

  // 학생 진도 보는 중일 때 상단 배너
  const viewingBanner = NB_VIEWING_STUDENT ? (() => {
    const st = STUDENTS.find(s => s.number === NB_VIEWING_STUDENT);
    const name = st ? `${st.number} ${st.name}` : NB_VIEWING_STUDENT;
    return `<div class="cb-viewing-banner">
      <span>📖 <b>${esc(name)}</b> 학생의 진도를 보고 있습니다 (읽기 전용)</span>
      <button class="cb-tb-btn" data-action="nb-exit-viewing">← 원본으로</button>
    </div>`;
  })() : '';

  // 상단 타이틀 바
  const toolbar = `<div class="cb-toolbar">
    <button class="cb-back-btn" data-action="nb-close">← 목록</button>
    <button class="cb-tb-btn cb-sidebar-toggle" data-action="nb-toggle-sidebar" title="사이드바 토글 (Ctrl+/)" aria-label="사이드바">☰</button>
    <div class="cb-title">📓 ${esc(nb.title)}</div>
    ${vNbRuntimeChip()}
    ${saveInd}
    <div class="cb-toolbar-actions">
      <button class="cb-tb-btn" data-action="nb-upload-open" title="내 컴퓨터의 파일을 노트북(/content)에 올리기 — 파일을 노트북 위로 끌어다 놓아도 됩니다">📤 파일 올리기</button>
      ${(typeof nbSituReady === 'function' && nbSituReady())
        ? `<button class="cb-tb-btn${NB_SITU_OPEN ? ' cb-tb-on' : ''}" data-action="nb-toggle-situ"
             aria-pressed="${NB_SITU_OPEN}" title="문제 상황을 노트북 옆에 펴 놓기">📄 문제 상황</button>`
        : ''}
      <button class="cb-tb-btn${NB_GUIDE_OPEN ? ' cb-tb-on' : ''}" data-action="nb-toggle-guide"
        aria-pressed="${NB_GUIDE_OPEN}" title="가이드북을 펴 놓고 보기">📖 가이드북</button>
      ${syncBtn}
      ${simBtn}
      ${progressBtn}
    </div>
  </div>
  ${viewingBanner}`;

  // 메뉴바 (Colab 스타일)
  const menubar = vNbMenubar(isTeacher, isStudent);

  // 학생 진도 패널
  if(isTeacher && NB_SHOW_PROGRESS){
    return `<div class="cb-wrap">${toolbar}${vNbProgressPanel()}</div>`;
  }

  // 📂 접힌 묶음 — 셀은 그대로 그리고 겉을 감쌉니다 (CSS 로 감춥니다)
  const fold = nbFoldMap();
  const cellsHtml = (NB_CELLS || []).map((cell, idx) => {
    const h = vNbCell(cell, idx, fold);
    return fold.hide[cell.id] ? `<div class="cb-sec-hid">${h}</div>` : h;
  }).join('');

  // 맨 아래 셀 추가 버튼
  const addEndRow = `<div class="cb-add-row cb-add-row-end">
    <button class="cb-add-btn" data-action="nb-add-cell" data-type="block" data-pos="${NB_CELLS.length}">+ 🧩 블록</button>
    <button class="cb-add-btn" data-action="nb-add-cell" data-type="code" data-pos="${NB_CELLS.length}">+ 코드</button>
    <button class="cb-add-btn" data-action="nb-add-cell" data-type="markdown" data-pos="${NB_CELLS.length}">+ 텍스트</button>
    ${nbAuthoring() ? `<button class="cb-add-btn" data-action="nb-insert-quiz"
      data-pos="${NB_CELLS.length}">+ 🧠 퀴즈</button>` : ''}
  </div>`;

  // 좌측 사이드바 (목차)
  const sidebar = NB_SIDEBAR_OPEN ? vNbSidebar() : '';

  return `
    <div class="cb-wrap">
      ${toolbar}
      ${menubar}
      <div class="cb-body${NB_SIDEBAR_OPEN ? ' cb-has-sidebar' : ''}">
        ${sidebar}
        <div class="cb-main">
          <div class="cb-cells" id="cb-cells">${cellsHtml || ''}</div>
          ${addEndRow}
        </div>
      </div>
      ${vNbSituPanel()}
      ${vNbGuidePanel()}
    </div>`;
}

/* ── 사이드바 「🧩 함수」 탭 ──
   지금까지 배운 함수를 세로로 늘어놓습니다. 누르면 고른 코드 셀의
   커서 자리에 주석과 함께 들어갑니다 (nbInsertSnippet).
   사이드바는 sticky 라 셀 옆에 붙어 있어 오르내릴 일이 없습니다. */
/* ── 🧩 블록 셀 ──
   블록의 얼굴은 파이썬 그대로이고, 바꿀 자리만 드롭다운입니다.
   아래 칸에 그 블록들이 만든 파이썬을 그대로 보여 줍니다 (읽기 전용).
   블록 정의는 js/nb-blocks.js 에 있습니다. */
/* 비칠 땀지 — 서람 묶음과 **하나씩 맞추어** 둡니다 (2026-11-03).
   한 묶음 에 서로 다른 땀지가 섞여 있으면 묶어 둔 표가 안 나납니다. */
const NB_BLK_CAT = {py:'--nbk-py', prep:'--nbk-prep', look:'--nbk-look',
                    clean:'--nbk-clean', plot:'--nbk-plot', ml:'--nbk-ml',
                    eval:'--nbk-eval'};

function vNbBlockCell(cell, hoverTb){
  const selected = NB_SELECTED === cell.id ? ' cb-selected' : '';
  const result = NB_CELL_OUTPUTS[cell.id];
  const busy = !!(result?.running || result?.queued);
  const execLabel = busy ? '[*]' : (result?.execCount ? `[${result.execCount}]` : '[ ]');
  const file = nbCellDataFile(cell, NB_CELLS);

  // 정답 확인을 누른 셀이면, 틀린 자리를 블록에 넘겨 빨갛게 표시합니다
  const bad = NB_CHECKED[cell.id]
    ? new Set((nbCellCheck(cell, file).wrong || []).map(w => w.bi + '|' + (w.hole ? 'h' + w.hole : w.slot)))
    : null;
  const stack = cell.blocks.length
    ? cell.blocks.map((b, bi) => vNbBlock(cell.id, b, bi, file, bad)).join('')
    : `<div class="nbk-empty">왼쪽 <b>🧩 블록</b> 서랍에서 끌어다 놓으세요.<br>눌러서 넣어도 됩니다.</div>`;

  /* 「모름」 — 막힌 셀을 넘기고 뒤를 살립니다 (2026-10-29 선생님).
     평가용 노트북에서만, 그리고 생성기가 달아 둔 셀에서만 뜹니다.
     누른 기록(idkUsed)은 지워지지 않고 남아 채점 때 그 자리만 깎습니다. */
  const idk = (typeof nbIdkOf === 'function') ? nbIdkOf(cell) : null;
  const idkDone = (typeof nbIdkUsed === 'function') && nbIdkUsed(cell);
  const idkBtn = (idk && typeof nbInAssess === 'function' && nbInAssess())
    ? (idkDone
        ? `<span class="nbk-idk-done" title="이 셀은 「모름」 으로 넘겼습니다">모름으로 넘김</span>`
        : `<button class="nbk-mini nbk-idk" data-action="nb-blk-idk" data-cellid="${cell.id}"
            title="이 셀을 넘기고 다음으로 갑니다. 이 자리는 점수가 깎이고, 기록이 남습니다">모름</button>`)
    : '';

  /* 정답 확인 (2026-10-29 선생님) — **평가 노트북에서는 내지 않습니다.**
     채점할 수 있는 칸이 하나도 없으면 단추도 내지 않습니다. */
  const inAssess = typeof nbInAssess === 'function' && nbInAssess();
  const chk = (!inAssess && typeof nbCellCheck === 'function' && cell.blocks?.length)
    ? nbCellCheck(cell, file) : null;
  const chkBtn = (chk && chk.total)
    ? `<button class="nbk-mini nbk-chk" data-action="nb-blk-check" data-cellid="${cell.id}"
        title="적은 값이 맞는지 봅니다. 답을 알려 주지는 않습니다">✅ 정답 확인</button>` : '';
  const shown = NB_CHECKED[cell.id];
  const chkLine = (shown && chk) ? `<div class="nbk-chkline ${chk.wrong.length ? 'bad' : 'good'}">${
      chk.wrong.length
        ? `${chk.wrong.length}곳 다시 — ${chk.done}/${chk.total} 맞음`
        : `${chk.total}곳 다 맞았습니다`
    }${chk.bydata ? ` <i>· 열 · 파일 이름 ${chk.bydata}곳은 <b>실행해서</b> 확인하세요</i>` : ''}</div>`
    : '';

  const code = cell.source || '# 블록이 없습니다';
  const codePane = NB_BLK_CODE ? `<div class="nbk-code-head">이 블록들이 만드는 파이썬</div>
      <pre class="nbk-code">${esc(code)}</pre>` : '';

  return `<div class="cb-cell cb-cell-code cb-cell-blk${selected}" data-cellid="${cell.id}">
    ${hoverTb}
    <div class="cb-code-wrap">
      <div class="cb-exec-prompt${busy ? ' cb-running' : ''}">
        <button class="cb-run-btn" data-action="nb-run-cell" data-cellid="${cell.id}" title="셀 실행 (Ctrl+Enter)" aria-label="셀 실행">▶</button>
        <span class="cb-exec-count">${execLabel}</span>
      </div>
      <div class="cb-code-main">
        <div class="nbk-bar">
          <span class="nbk-tag">🧩 블록 셀</span>
          <span class="nbk-sp"></span>
          <button class="nbk-mini" data-action="nb-blk-say" aria-pressed="${NB_BLK_SAY}">설명</button>
          <button class="nbk-mini" data-action="nb-blk-code" aria-pressed="${NB_BLK_CODE}">&lt;/&gt; 코드 칸</button>
          ${nbAskUi() ? `<button class="nbk-mini" data-action="nb-blk-askui"
            aria-pressed="${NB_BLK_ASKUI}"
            title="칸마다 ✎ 가 붙습니다. 코드 글자를 **끌어서 고르면** 그 자리가 빈칸이 됩니다">✎ 빈칸 정하기</button>` : ''}
          ${chkBtn}
          ${idkBtn}
        </div>
        <div class="nbk-stack${NB_BLK_ASKUI && nbAskUi() ? ' nbk-askon' : ''}" data-blkstack="${cell.id}">${stack}</div>
        ${chkLine}
        ${codePane}
      </div>
    </div>
    ${result ? vNbOutput(result, cell.id) : ''}
  </div>`;
}

/* ── 코드의 **글자 구간** 하나를 그립니다 (2026-10-29 선생님) ──
   그 안에 선생님이 뚫어 둔 자리가 있으면 거기만 적는 칸으로 바꿉니다.
   `data-lit` 에 그 글자가 `tpl` 의 몇 번째에서 시작하는지 적어 둡니다 —
   선생님이 끌어서 고른 자리를 되돌릴 때 이것을 읽습니다. */
function nbLitHtml(cellId, b, bi, d, at, text, bad){
  if(!text) return '';
  const span = (s, t) => `<span class="nbk-code-in" data-lit="${s}">${esc(t)}</span>`;
  const hs = (typeof nbHoles === 'function' ? nbHoles(b) : [])
    .filter(h => h[0] >= at && h[1] <= at + text.length);
  if(!hs.length) return span(at, text);
  const teacher = NB_BLK_ASKUI && nbAskUi();
  let out = '', cur = at;
  hs.forEach(h => {
    if(h[0] < cur) return;                       // 겹친 자리는 앞의 것만 씁니다
    if(h[0] > cur) out += span(cur, text.slice(cur - at, h[0] - at));
    const v = nbHoleVal(b, h);
    const raw = nbHoleWant(d, h);
    const miss = bad && bad.has(bi + '|h' + nbHoleKey(h)) ? ' nbk-in-bad' : '';
    const hot = v === '' ? ' nbk-in-ask' : '';
    out += `<input class="nbk-in nbk-hin${hot}${miss}" type="text" value="${esc(v)}"
      size="${Math.max(3, Math.min(24, raw.length + 1))}"
      placeholder="${esc(String(raw.length) + '자')}" aria-label="빈칸"
      data-action="nb-hole-in" data-cellid="${cellId}" data-bi="${bi}"
      data-h="${nbHoleKey(h)}">`;
    if(teacher) out += `<button class="nbk-hdel" data-action="nb-hole-del"
      data-cellid="${cellId}" data-bi="${bi}" data-h="${nbHoleKey(h)}"
      title="이 빈칸을 없앱니다 — 원래 글자로 돌아갑니다">✕</button>`;
    cur = h[1];
  });
  if(cur < at + text.length) out += span(cur, text.slice(cur - at));
  return out;
}

function vNbBlock(cellId, b, bi, file, bad){
  const d = NB_BLOCK_DEFS[b.k];
  if(!d) return '';
  // 파이썬 **한 줄씩** 그립니다. 드롭다운은 그 줄 안에 끼워 넣어
  // 「열 이름은 따옴표 안에 쓴다」 가 눈에 그대로 보이게 합니다.
  /* 같은 칸이 코드에 두 번 나오는 블록이 있습니다 (`fit` · `score` 의 X_{d}, y_{d}).
     ⚠ 2026-11-02 — 예전에는 **입력 칸을 둘 다** 그렸습니다. 그래서 학생이 한쪽에
       적으면 다른 쪽은 아직 `___` 이라 「입력이 안 된다」 로 보였고, 어느 쪽에
       적어야 하는지도 알 수 없었습니다. 이제 **첫 자리만 입력 칸**이고 뒤의
       자리는 적은 값을 그대로 비추는 글자입니다. */
  const seenSlot = new Set();
  /* 글자 자리(off)를 줄을 넘어가며 계속 셉니다 — 선생님이 끌어서 고른 자리를
     `tpl` 안의 **시작·끝**으로 되돌리려면 절대 자리가 있어야 합니다 (2026-10-29). */
  let off = 0;
  const lines = d.tpl.split('\n').map(line => {
    const parts = line.split(/(\{\w+\})/).map(part => {
      const at0 = off;
      off += part.length;
      const m = part.match(/^\{(\w+)\}$/);
      if(!m) return nbLitHtml(cellId, b, bi, d, at0, part, bad);
      const key = m[1];
      const slot = d.slots[key];
      const at = `data-action="nb-blk-slot" data-cellid="${cellId}" data-bi="${bi}"
        data-slot="${key}" aria-label="${esc(nbBlkName(b.k))}"`;
      // 이 자리가 **학생이 채울 빈칸**인지 — 블록마다 다릅니다 (nbSlotAsk)
      const ask = nbSlotAsk(d, b, key);
      let html;
      /* 2026-10-29 선생님 — 「모든 빈칸은 드롭다운 없이 직접 입력하도록
         (틀리면 오류 코드 알아서 확인하라 그래)」.
         **빈칸이면 보기 목록이 있어도 적는 칸으로 그립니다.** 고르기만 하면
         철자도 안 외우고 오류도 안 만나 봅니다. 채워 둔 자리는 그대로 드롭다운이라
         선생님이 미리 정해 둔 값은 건드리지 않습니다. */
      /* 단 `pick:1` 인 자리는 **빈칸이어도 고르는 칸**입니다 (2026-11-02 선생님 —
         「어차피 2개 중 하나니까」). `load` · `loadp` 의 파일 고르기 둘뿐입니다. */
      const asText = slot.kind || (ask && !slot.pick);
      // 미리 셀 수 없는 값(행 번호 · 찾을 값)은 적는 칸으로 둡니다 — 교과서 81쪽처럼
      if(asText){
        const v = b.a[key];
        // 아직 안 적은 자리는 빨갛게 — 무엇을 해야 하는지 바로 보이게
        const miss = bad && bad.has(bi + '|' + key) ? ' nbk-in-bad' : '';
        const hot = (ask && (v === '' || v == null) ? ' nbk-in-ask' : '') + miss;
        /* 칸 너비 (2026-11-02 선생님 — 「함수가 길어서 입력 칸 안에서 짤리거나」).
           ⚠ **정답 길이로 넓히지 않습니다** — 넓히면 몇 글자인지가 보입니다.
             적은 글자에 맞춰 늘어나게 둡니다 (events/notebook.js 가 적는 동안에도
             늘립니다). 바닥은 열 이름이 들어갈 만큼입니다.
             CSS 의 고정 폭(width:7em)이 size 를 눌러 버리던 것도 함께 고쳤습니다. */
        /* ⚠ 빈칸에 흐린 안내 글자를 넣지 않습니다 (2026-11-03 선생님 —
             「지금 빈칸들 보면 회색글씨로 가이드가 다 들어가 있는데 가이드 다 빼」).
             안내가 있으면 교과서를 보지 않고 그것만 읽고 적습니다.
             무엇을 적을 자리인지는 블록 이름과 발표자 노트, 가이드북에 있습니다.
             `slot.ph` 와 `nbSlotHint` 는 **선생님 쪽 칸 목록**에서만 씁니다. */
        const ph = '';
        const opts = slot.kind ? null : nbSlotOptions(slot, file);
        const floor = opts && opts.length && !ask
          ? Math.min(28, Math.max(11, ...opts.map(o => String(o).length + 1)))
          : Math.max(slot.kind === 'num' ? 5 : 8, ph.length + 1);
        const wide = Math.min(30, Math.max(floor, String(v ?? '').length + 2));
        html = `<input class="nbk-in${hot}" type="${slot.kind === 'num' ? 'number' : 'text'}"
          value="${esc(v ?? '')}" size="${wide}" data-grow="${floor}"
          placeholder="${esc(ph)}" ${at}>`;
      } else {
        const opts = nbSlotOptions(slot, file);
        const cur = b.a[key];
        // 빈칸은 **학생이 고르기 전까지** 비어 있습니다 — 끌어 놓자마자 답이 되면 안 됩니다
        const blank = ask
          ? `<option value=""${(cur === '' || cur == null) ? ' selected' : ''}>고르세요</option>`
          : '';
        const unset = ask && (cur === '' || cur == null) ? ' nbk-sel-ask' : '';
        html = `<select class="nbk-sel${unset}" ${at}>${blank}${
          opts.map(v => `<option${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join('')
        }</select>`;
      }
      const first = !seenSlot.has(key);
      seenSlot.add(key);
      // 두 번째로 나온 자리 — 입력 칸이 아니라 **적은 값을 비추는 글자**입니다.
      //   ⚠ 비었을 때 `___` 를 찍으면 **「여기도 채워야 하나」 로 읽힙니다**
      //     (2026-11-02 선생님 — 「코드 셀 왜 이래? 버그 걸렸어?」).
      //     `load` 블록은 틀에 `{f}` 가 두 번 들어가, 윗줄은 분홍 입력 상자인데
      //     아랫줄만 `___` 라 한 칸이 둘로 보였습니다.
      //     그래서 비었을 때는 「같은 값」 을 흐리게 보여 주고,
      //     윗줄에 적으면 여기도 같이 찬다고 일러 줍니다.
      if(!first){
        const mv = b.a[key];
        const mempty = (mv === '' || mv == null);
        // 무엇을 적는 자리인지는 알려 주지 않습니다 — 위 칸과 **같은 값**이
        // 들어온다는 것만 (2026-11-03 선생님, 위 `ph` 주석과 같은 까닭).
        const mph = '같은 값';
        return `<span class="nbk-mirror${mempty ? ' nbk-mirror-ask' : ''}"
          data-mirror="${key}" data-ph="${esc(mph)}"
          title="위 칸에 적으면 여기에도 똑같이 들어갑니다"
          >${esc(mempty ? mph : String(mv))}</span>`;
      }
      // 선생님만 — 이 자리를 빈칸으로 둘지 채워 둘지 (2026-10-28)
      // 「✎ 빈칸 정하기」 를 켰을 때만 — 늘 붙여 두면 파이썬이 지저분합니다
      if(!NB_BLK_ASKUI || !nbAskUi()) return html;
      return `<span class="nbk-slotwrap">${html}<button class="nbk-askb${ask ? ' on' : ''}"
        data-action="nb-blk-ask" data-cellid="${cellId}" data-bi="${bi}" data-slot="${key}"
        aria-pressed="${ask}" title="${ask ? '학생이 채우는 빈칸 — 눌러서 채워 둡니다'
                                          : '채워 둔 자리 — 눌러서 빈칸으로 둡니다'}"
        >${ask ? '✎' : '●'}</button></span>`;
    }).join('');
    off += 1;   // 줄을 나누며 빠진 줄바꿈 한 글자 — 이걸 안 세면 자리가 밀립니다
    return `<div class="nbk-line">${parts}</div>`;
  }).join('');
  // 설명 — 선생님이 고친 글이 있으면 그것을 씁니다 (nbBlkSay).
  //   고친 글에는 교과서 쪽을 달지 않습니다. 학생 화면에는 고쳤다는 표시가
  //   하나도 나오지 않습니다 (CLAUDE.md 16).
  const t = nbBlkSay(b.k);
  const sayBtns = nbAskUi()
    ? `<button class="nbk-sayb" data-action="nb-blk-text" data-k="${b.k}"
         title="이 블록의 설명을 고칩니다">✏️</button>${t.edited
      ? `<button class="nbk-sayb" data-action="nb-blk-text-reset" data-k="${b.k}"
           title="처음 글로 되돌립니다">↺</button>` : ''}`
    : '';
  const say = NB_BLK_SAY && (t.say || sayBtns)
    ? `<div class="nbk-say">${esc(t.say)}${
        t.src ? ` <i class="nbk-src">${esc(t.src)}</i>` : ''}${sayBtns}</div>`
    : '';
  return `<div class="nbk-blk" draggable="true" data-cellid="${cellId}" data-bi="${bi}"
      style="--nbk-cat:var(${NB_BLK_CAT[d.cat]})">
    <span class="nbk-grip" aria-hidden="true">⠿</span>
    <div class="nbk-body">${lines}${say}</div>
    <button class="nbk-x" data-action="nb-blk-del" data-cellid="${cellId}" data-bi="${bi}"
      title="블록 지우기" aria-label="블록 지우기">✕</button>
  </div>`;
}

/* 서랍의 블록에 보여 줄 파이썬 — {자리}는 기본값으로 채웁니다 */
function nbPalCode(k){
  const d = NB_BLOCK_DEFS[k];
  return d.tpl.replace(/\{(\w+)\}/g, (m, key) => {
    const slot = d.slots && d.slots[key];
    if(!slot) return m;
    const v = nbSlotDefault(slot, NB_DATA_DEFAULT);
    return (v === undefined || v === null || v === '') ? '…' : String(v);
  });
}

/* ── 사이드바 「🧩 블록」 탭 — 블록 서랍 ── */
/* ── 「📖 가이드북」 팝업 (2026-10-23 선생님) ──
   블록에서 함수 이름을 학생이 직접 적게 바꾼 뒤로, 실습 중에 가이드북을
   찾아볼 수 있어야 합니다. guide/index.html 을 iframe 으로 띄우고,
   블록의 「?」 를 누르면 그 함수 자리로 내려갑니다.
   옆 칸으로 뒀더니 셀이 좁아져 못 쓴다고 하셔서 **화면 가운데 팝업**으로 바꿨습니다.
   바깥을 누르거나 Esc 로 닫습니다.
   iframe 을 다시 그리면 보던 자리를 잃으므로, 자리 이동은 **다시 그리지 않고**
   postMessage 로 알립니다 (events/notebook.js 의 nb-guide-go). */
/* ═══ 📄 문제 상황을 노트북 옆에 (2026-11-01 선생님) ═══════════════
   「문제 상황을 노트북과 같이 볼 수 있게. 화면에서 반반」.
   가이드북은 **덮는 창**이라 노트북이 가려집니다. 이것은 왼쪽에 자리를
   차지하고 노트북을 오른쪽으로 밀어, 둘을 같이 봅니다.

   · 평가용 노트북에서만 보입니다 (nbSituReady).
   · 상황을 고르면 그 글만 큼직하게 보여 줍니다. 다시 고를 수 있습니다.
   · 글은 반 DB 에서 옵니다 — 종이 카드와 글자 그대로 같습니다 (CLAUDE.md 18). */
function vNbSituPanel(){
  if(!NB_SITU_OPEN || typeof nbSituReady !== 'function' || !nbSituReady()) return '';
  const list = NB_SITU.situ || [];
  // 상황이 하나뿐이면 **고를 것이 없습니다** — 바로 펴 놓습니다 (2026-11-02)
  const cur = (list.length === 1) ? list[0] : list.find(x => x.mark === NB_SITU_PICK);
  // 글 안의 **굵게** 를 살립니다. 먼저 escape 한 뒤 바꾸므로 태그가 새지 않습니다.
  const md = t => esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const tabs = (list.length < 2) ? '' : list.map(x =>
    `<button class="cb-situ-tab${x.mark === NB_SITU_PICK ? ' on' : ''}"
      data-action="nb-situ-pick" data-mark="${esc(x.mark)}">${esc(x.mark)}</button>`).join('');
  const body = cur
    ? `<div class="cb-situ-h">${list.length > 1 ? esc(cur.mark) + '. ' : ''}${esc(cur.name)}
         <span class="cb-situ-f">${esc(cur.file)}</span></div>`
      + (cur.img ? `<img class="cb-situ-img" src="${esc(cur.img)}" alt="">` : '')
      + (cur.body || []).map(t => `<p>${md(t)}</p>`).join('')
      /* 데이터 다섯 줄 — 종이 카드와 **같은 것**을 보여 줍니다 (2026-11-03 선생님
         「난 저게 그대로 올라갔으면 좋겠어」). 타깃 열은 카드처럼 맨 오른쪽. */
      + ((cur.head && cur.rows) ? `<div class="cb-situ-d5">
          <table><tr>${cur.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
          ${cur.rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}
          </table></div>` : '')
      + (NB_SITU.common ? `<div class="cb-situ-note">${md(NB_SITU.common)}</div>` : '')
    : `<div class="cb-situ-pickme">종이 카드에서 고른 상황을 위에서 누르시오.</div>`
      + list.map(x => `<button class="cb-situ-one" data-action="nb-situ-pick"
          data-mark="${esc(x.mark)}"><b>${esc(x.mark)}</b> ${esc(x.one)}</button>`).join('');
  /* 2026-11-03 선생님 — 「전체화면 할 때 분할로 나오잖아 그거 없애주고 그냥
     문제상황 버튼 누르면 팝업창으로 보게 해줘. 팝업창은 x 누르지 않는 이상
     안 사라지도록」.
     그래서 **덮는 창**입니다 — 뒤 바탕을 눌러도, Esc 를 눌러도 닫히지 않고
     오른쪽 위 ✕ 로만 닫힙니다. 바탕에는 `data-action` 을 두지 않습니다. */
  return `<div class="cb-situ-back" id="cb-situ-back">
    <aside class="cb-situ" id="cb-situ" role="dialog" aria-modal="true"
           aria-label="문제 상황">
      <div class="cb-situ-bar">
        <span class="cb-situ-t">📄 문제 상황</span>
        <span class="cb-situ-tabs">${tabs}</span>
        <button class="cb-situ-x" data-action="nb-toggle-situ" title="닫기">✕</button>
      </div>
      <div class="cb-situ-body">${body}</div>
    </aside>
  </div>`;
}

/* 전체화면을 권하는 띠 — 평가용 노트북을 열었을 때 한 번.
   반반으로 보려면 화면이 넓어야 합니다. 누르는 것은 학생이 정합니다
   (전체화면은 **누른 순간에만** 들어갈 수 있습니다 — 브라우저 규칙). */
function vNbFullBanner(){
  // 2026-11-03 — 문제 상황이 **팝업창**으로 바뀌어 나란히 둘 수가 없습니다.
  //   전체화면을 권할 일이 없어졌으므로 띄를 그리지 않습니다.
  return '';
  /* eslint-disable no-unreachable */
  if(!NB_FULL_ASK || typeof nbSituReady !== 'function' || !nbSituReady()) return '';
  return `<div class="cb-full-ask">
    <span>📄 문제 상황을 <b>노트북 옆에 펴 놓고</b> 풀 수 있습니다.
      화면을 넓게 쓰면 둘이 나란히 보입니다.</span>
    <button class="cb-tb-btn cb-tb-on" data-action="nb-go-full">⛶ 전체화면으로 펴기</button>
    <button class="cb-tb-btn" data-action="nb-full-dismiss">그냥 보기</button>
  </div>`;
}


function vNbGuidePanel(){
  if(!NB_GUIDE_OPEN) return '';
  const src = 'guide/index.html?panel=1' + (NB_GUIDE_ANCHOR ? '#' + NB_GUIDE_ANCHOR : '');
  return `<div class="cb-guide-back" data-action="nb-guide-back">
    <div class="cb-guide" id="cb-guide" role="dialog" aria-label="파이썬 가이드북">
      <div class="cb-guide-bar">
        <span class="cb-guide-t">📖 파이썬 가이드북</span>
        <a class="cb-guide-new" href="guide/index.html" target="_blank" rel="noopener"
           title="새 창에서 크게 보기">↗ 새 창</a>
        <button class="cb-guide-x" data-action="nb-toggle-guide" title="닫기 (Esc)">✕</button>
      </div>
      <iframe class="cb-guide-f" id="cb-guide-f" src="${src}" title="파이썬 가이드북"></iframe>
    </div>
  </div>`;
}

function vNbBlockPanel(){
  if(typeof NB_BLOCK_GROUPS === 'undefined') return '';
  return `<div class="cb-snip nbk-drawer">
    <div class="cb-snip-hint">블록을 <b>끌어다 놓거나</b> 눌러서 <b>고른 블록 셀</b>에 넣습니다</div>
    ${NB_BLOCK_GROUPS.map(([g, keys0]) => {
      // 평가용 노트북에서는 **가리는 블록**이 있습니다 (nbBlockInDrawer · 2026-10-28)
      const keys = (typeof nbBlockInDrawer === 'function')
        ? keys0.filter(nbBlockInDrawer) : keys0;
      if(!keys.length) return '';
      return `
      <div class="cb-snip-group">
        <div class="cb-snip-label">${esc(g)}</div>
        ${/* 블록마다 붙던 ? 단추를 뺐습니다 (2026-11-02 선생님 — 「물음표 블록 다 빼」).
             가이드북은 윗줄의 「📖 가이드북」 단추로 그대로 엽니다. */''}
        ${keys.map(k => `<div class="nbk-pal-row"><button class="nbk-pal" draggable="true" data-action="nb-blk-add"
          data-k="${k}" style="--nbk-cat:var(${NB_BLK_CAT[NB_BLOCK_DEFS[k].cat]})"
          ><span class="nbk-pal-name">${esc(nbBlkName(k))}</span
          ><span class="nbk-pal-code">${esc(nbPalCode(k))}</span></button></div>`).join('')}
      </div>`;
    }).join('')}
  </div>`;
}

/* ── 사이드바 「🧩 함수」 탭 ──
   지금까지 배운 함수를 세로로 늘어놓습니다. 누르면 고른 코드 셀의
   커서 자리에 주석과 함께 들어갑니다 (nbInsertSnippet).
   사이드바는 sticky 라 셀 옆에 붙어 있어 오르내릴 일이 없습니다. */
function vNbSnipPanel(){
  if(typeof NB_SNIPPETS === 'undefined') return '';
  return `<div class="cb-snip">
    <div class="cb-snip-hint">누르면 <b>고른 코드 셀</b>에 주석과 함께 들어갑니다</div>
    ${NB_SNIPPETS.map((g, gi) => `
      <div class="cb-snip-group">
        <div class="cb-snip-label">${esc(g.group)}</div>
        ${g.items.map((it, ii) => `<button class="cb-snip-item" data-action="nb-snip"
          data-g="${gi}" data-i="${ii}" title="${esc(nbSnippetTip(it))}"
          ><span class="cb-snip-code">${esc(it.label)}</span
          ><span class="cb-snip-desc">${esc(it.note)}</span></button>`).join('')}
      </div>`).join('')}
  </div>`;
}

// ── 메뉴바 (Colab 스타일: 파일/편집/보기/삽입/런타임/도움말) ──
function vNbMenubar(isTeacher, isStudent){
  const menus = [
    {id: 'file', label: '파일', items: [
      {label: '📤  파일 올리기', action: 'nb-upload-open'},
      {label: '⬇️  ipynb 로 다운로드', action: 'nb-download-ipynb', shortcut: 'Ctrl+S'},
      {label: '🖨️  인쇄', action: 'nb-print', shortcut: 'Ctrl+P'},
    ]},
    {id: 'edit', label: '편집', items: [
      {label: '🧹  모든 출력 지우기', action: 'nb-clear-outputs'},
      ...(isStudent ? [{label: '↺   원본 복원', action: 'nb-reset-original'}] : []),
    ]},
    {id: 'view', label: '보기', items: [
      {label: '☰   사이드바 ' + (NB_SIDEBAR_OPEN ? '숨기기' : '표시'), action: 'nb-toggle-sidebar', shortcut: 'Ctrl+/'},
      {label: '🌗  테마 전환', action: 'nb-toggle-theme'},
    ]},
    {id: 'insert', label: '삽입', items: [
      {label: '🧩  블록 셀', action: 'nb-insert-block'},
      {label: '➕  코드 셀', action: 'nb-insert-code'},
      {label: '📝  텍스트 셀', action: 'nb-insert-text'},
      ...(isStudent ? [] : [{label: '🧠  복습 퀴즈 문제', action: 'nb-insert-quiz'}]),
    ]},
    {id: 'runtime', label: '런타임', items: [
      {label: '▶▶  모두 실행', action: 'nb-run-all'},
      {label: '⏹   실행 중지', action: 'nb-stop'},
      {label: '🔄  재시작', action: 'nb-reset-all'},
      {label: '🚀  재시작 후 모두 실행', action: 'nb-reset-and-run-all'},
    ]},
    {id: 'help', label: '도움말', items: [
      {label: '⌨️   단축키 보기', action: 'nb-show-shortcuts'},
      {label: '📖  이 노트북에서 되는 것', action: 'nb-show-help'},
    ]},
  ];

  return `<div class="cb-menubar" id="cb-menubar">
    ${menus.map(m => `
      <div class="cb-menu${NB_OPEN_MENU === m.id ? ' cb-menu-open' : ''}" data-menu="${m.id}">
        <button class="cb-menu-btn" data-action="nb-toggle-menu" data-menuid="${m.id}">${m.label}</button>
        <div class="cb-menu-dropdown">
          ${m.items.map(it => `
            <button class="cb-menu-item" data-action="${it.action}">
              <span>${it.label}</span>
              ${it.shortcut ? `<span class="cb-menu-shortcut">${it.shortcut}</span>` : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ── 좌측 사이드바 (마크다운 헤더 자동 목차) ──
function vNbSidebar(){
  /* 「ƒ 함수」 탭을 뺐습니다 (2026-11-03 선생님 — 「왼쪽에 있는 이 함수 블록
     없애줘」). 🧩 블록 서랍이 같은 함수를 **코드까지 보여 주며** 담고 있어
     둘이 겹쳤습니다. vNbSnipPanel 과 NB_SNIPPETS 는 지우지 않고 남겨 둡니다 —
     다시 쓰실 수 있고, 지우면 되돌리기가 번거롭습니다. */
  const T = [['blk', '🧩 블록'], ['toc', '📋 목차'], ['files', '📁 파일']];
  const tabs = `<div class="cb-side-tabs">
    ${T.map(([k, label]) => `<button class="${NB_SIDE_TAB === k ? 'on' : ''}"
      data-action="nb-side-tab" data-tab="${k}">${label}</button>`).join('')}
  </div>`;
  // 🧩 블록 서랍은 파이썬을 같이 보여 줘서 240px 로는 줄바꿈이 너무 잦습니다
  //   (2026-10-27 선생님). 이 탭일 때만 넓힙니다.
  if(NB_SIDE_TAB === 'files') return `<aside class="cb-sidebar">${tabs}${vNbFilesPanel()}</aside>`;
  if(NB_SIDE_TAB === 'toc') return _vNbSidebarToc().replace('<aside class="cb-sidebar">', '<aside class="cb-sidebar">' + tabs);
  return `<aside class="cb-sidebar cb-sidebar-wide">${tabs}${vNbBlockPanel()}</aside>`;
}

function _vNbSidebarToc(){
  const toc = buildNbTOC();
  let tocHtml;
  if(!toc.length){
    tocHtml = `<div class="cb-toc-empty">텍스트 셀에 <code># 제목</code>을<br>적으면 여기에 목차가 생겨요.</div>`;
  } else {
    // 📂 접힌 묶음은 목차에서도 접힌 표가 납니다 (2026-11-03)
    const shut = {};
    for(const it of toc) shut[it.cellId] = !!NB_FOLDED[it.cellId];
    tocHtml = `<div class="cb-toc-fold">
        <button class="cb-toc-foldb" data-action="nb-fold-all">모두 접기</button>
        <button class="cb-toc-foldb" data-action="nb-unfold-all">모두 펼치기</button>
      </div>` + toc.map(it => `
      <a class="cb-toc-item cb-toc-lv${it.level}${shut[it.cellId] ? ' cb-toc-shut' : ''}"
         data-action="nb-toc-jump" data-cellid="${it.cellId}">
        ${esc(it.text)}
      </a>
    `).join('');
  }

  // 코드/텍스트 셀 통계
  const codeCount = NB_CELLS.filter(c => c.type === 'code').length;
  const mdCount = NB_CELLS.filter(c => c.type === 'markdown').length;
  const ranCount = Object.values(NB_CELL_OUTPUTS).filter(o => o?.execCount).length;

  return `<aside class="cb-sidebar">
    <div class="cb-sidebar-section">
      <div class="cb-toc">${tocHtml}</div>
    </div>
    <div class="cb-sidebar-section">
      <div class="cb-sidebar-title">📊 통계</div>
      <div class="cb-stats">
        <div class="cb-stat-row"><span>코드 셀</span><b>${codeCount}</b></div>
        <div class="cb-stat-row"><span>텍스트 셀</span><b>${mdCount}</b></div>
        <div class="cb-stat-row"><span>실행됨</span><b>${ranCount}/${codeCount}</b></div>
      </div>
    </div>
  </aside>`;
}

// 마크다운 헤더 추출 → 목차 항목
function buildNbTOC(){
  const items = [];
  for(const cell of (NB_CELLS || [])){
    if(cell.type !== 'markdown') continue;
    const lines = (cell.source || '').split('\n');
    let inFence = false;
    for(const line of lines){
      // 코드 블록 안의 # 무시
      if(/^\s*```/.test(line)){ inFence = !inFence; continue; }
      if(inFence) continue;
      const m = line.match(/^(#{1,4})\s+(.+?)\s*$/);
      if(m){
        items.push({level: m[1].length, text: m[2].replace(/[#*_`]/g, '').trim(), cellId: cell.id});
      }
    }
  }
  return items;
}

/* ═══ 📂 묶음 접기 — Colab 의 「섹션 접기」 와 같게 (2026-11-03 선생님) ═════
   「문제 별로 ### 이렇게 하는데 그 코랩 보면은 범주 별로 묶을 수 있잖아?」

   제목 줄(`#`~`####`)이 든 텍스트 셀이 **묶음의 머리**입니다. 머리를 접으면
   그 아래부터 **같은 급 이상 제목이 나오기 전까지** 숨깁니다. `##` 을 접으면
   그 안의 `###` 도 함께 숨고, 다시 펴면 `###` 는 자기 상태를 그대로 둡니다.

   숨기는 방법 — 셀을 **그리고 나서 CSS 로 감춥니다**(안 그리지 않습니다).
   「모두 실행」 이 접힌 셀을 돌릴 때 출력이 들어갈 자리가 있어야 합니다. */
function nbHeadLevel(cell){
  if(!cell || cell.type !== 'markdown') return 0;
  let inFence = false;
  for(const line of String(cell.source || '').split('\n')){
    if(/^\s*```/.test(line)){ inFence = !inFence; continue; }
    if(inFence) continue;
    const m = line.match(/^(#{1,4})\s+\S/);
    if(m) return m[1].length;
  }
  return 0;
}

/* { head: [셀마다 제목 급수 0~4], hide: {셀id: true}, kids: {제목셀id: 숨긴 수} } */
function nbFoldMap(){
  const cells = NB_CELLS || [];
  const head = cells.map(nbHeadLevel);
  const hide = {}, kids = {};
  for(let i = 0; i < cells.length; i++){
    if(!head[i]) continue;
    let n = 0;
    for(let j = i + 1; j < cells.length; j++){
      if(head[j] && head[j] <= head[i]) break;
      n++;
      if(NB_FOLDED[cells[i].id]) hide[cells[j].id] = true;
    }
    kids[cells[i].id] = n;
  }
  return {head, hide, kids};
}

/* 그 셀을 숨기고 있는 제목을 모두 펴 줍니다 — 목차로 건너뛸 때 (2026-11-03) */
function nbUnfoldFor(cellId){
  const cells = NB_CELLS || [];
  const head = cells.map(nbHeadLevel);
  const at = cells.findIndex(c => c.id === cellId);
  if(at < 0) return;
  for(let i = 0; i < at; i++){
    if(!head[i] || !NB_FOLDED[cells[i].id]) continue;
    let end = cells.length;
    for(let j = i + 1; j < cells.length; j++){
      if(head[j] && head[j] <= head[i]){ end = j; break; }
    }
    if(at < end) delete NB_FOLDED[cells[i].id];
  }
}

/* ═══ ✍️ 기입칸 — 마크다운을 보여 주지 않습니다 (2026-11-02 선생님) ═══════
   「적는칸 이것도 할말이 많은데 … 무슨 마크 다운 그대로 애들이 적도록 하고
    있어… **애들이 마크다운 문법을 어떻게 알아** / 그냥 적을 수 있도록 해야지」

   지금까지 ✍️ 표는 더블클릭하면 `| | |` 가 **날것으로** 떴습니다. 학생은
   파이프 사이에 끼워 적어야 했고, 한 칸을 지우면 표가 깨졌습니다.

   그래서 ✍️ 가 든 텍스트 셀의 **표만** 직접 그립니다 —
     · 머리줄과 **첫 칸**은 이름표라 글자 그대로
     · **둘째 칸부터가 적는 자리** → `<input>`
   ⚠ 적은 값은 **cell.source 의 그 칸에 그대로** 써 넣습니다 (js/events/notebook.js
     의 `cb-fill` 처리). 따로 둘 수가 없습니다 — 저장되는 것은 source 뿐입니다
     (js/firebase.js saveNotebookProgress 는 id·type·source·blocks 만 남깁니다).
   선생님은 ✏️ 단추로 **원문을 그대로** 고칠 수 있습니다. */
function nbFillUse(cell){
  const s = String(cell.source || '');
  return s.indexOf('✍️') >= 0 && /^\s*\|/m.test(s);
}
function nbInline(s){
  if(typeof marked !== 'undefined' && marked.parseInline) return marked.parseInline(s);
  return esc(s);
}
/* 이름표 앞머리 — 「시도 1 — 모델」 의 「시도 1」.
   앞머리가 같은 줄을 묶어 **머리줄 한 줄로 올리고**, 이름표에서는 앞머리를
   덜어 냅니다 (2026-11-03 선생님 — 「이것 좀 이쁘게 안되낭?」).
     시도 1 — 모델 · 시도 1 — 세 속성 · 시도 1 — 정확도
       → 「시도 1」 한 줄 아래 「모델 · 세 속성 · 정확도」
   여덟 줄이 같은 간격으로 늘어서 시도 1 · 2 · 3 이 한 덩어리로 보이던 것을
   고칩니다. **마크다운은 그대로입니다** — 선생님이 따로 적을 것이 없습니다.
   앞머리가 없는 줄(「셋 중 고른 것과 그 까닭」)은 머리줄 없이 그냥 놓습니다. */
function nbFillGroup(label){
  const m = String(label).replace(/[*_`]/g, '').match(/^\s*(.{1,14}?)\s+—\s+(.+)$/);
  return m ? {g: m[1].trim(), rest: m[2].trim()} : {g: '', rest: String(label).trim()};
}
/* ✍️ 적는 칸을 **표 모양 그대로** 그립니다 (2026-11-03 선생님 — 혼동 행렬
   그림을 보여 주시며 「이것도 이런 그림처럼 만들어줘봐」).
   머리줄 첫 칸에 `행이름 \ 열이름` 이라 적으면 켜집니다 —
     | 실젯값 \ 예측값 | Negative | Positive |
   · 위에 열 이름이 한 칸으로 걸치고, 왼쪽에 행 이름이 세로로 섭니다
   · 대각선(맞힌 칸)은 초록, 나머지(틀린 칸)는 노랑 — 교과서 115쪽 그림대로
   · 두 칸 × 두 칸이면 TP · TN · FP · FN 이름을 칸 안에 적어 줍니다.
     축 이름과 칸 이름을 보고 **어느 쪽이 실젯값이고 어느 쪽이 참인지**
     가려서 붙이므로, 축을 뒤집어 적어도 이름이 따라갑니다. */
function nbFillAxes(h0){
  const m = String(h0).split('\\');
  if(m.length !== 2) return null;
  return {row: m[0].trim(), col: m[1].trim()};
}
function nbFillMx(axes, rowLabels, colLabels){
  if(!axes || rowLabels.length !== 2 || colLabels.length !== 2) return null;
  const POS = /(positive|true|yes|참|맞다)/i;
  const ACT = /(실젯값|실제|정답|actual)/;
  const rowIsActual = ACT.test(axes.row);
  if(!rowIsActual && !ACT.test(axes.col)) return null;
  const rp = rowLabels.map(t => POS.test(t)), cp = colLabels.map(t => POS.test(t));
  if(rp[0] === rp[1] || cp[0] === cp[1]) return null;   // 참·거짓이 안 갈립니다
  const name = (r, c) => {
    const actual = rowIsActual ? rp[r] : cp[c];
    const pred   = rowIsActual ? cp[c] : rp[r];
    return (actual === pred) ? (pred ? 'TP' : 'TN') : (pred ? 'FP' : 'FN');
  };
  return name;
}

function nbFillMatrix(lines, from, cellId, axes, isSep, split){
  const body = [];               // {k, label, cells:[…]}
  let head = true, cols = [];
  lines.forEach((ln, k) => {
    const cs = split(ln).map(c => c.trim());
    if(isSep(cs)){ head = false; return; }
    if(head){ cols = cs.slice(1); return; }
    body.push({k, label: cs[0], cells: cs.slice(1)});
  });
  const name = nbFillMx(axes, body.map(r => r.label), cols);
  const n = cols.length;
  let out = `<table class="cb-fill-t cb-fill-m">
    <tr><th class="cb-fm-cnr" rowspan="2">${nbInline(axes.row)}</th>
        <th class="cb-fm-ax" colspan="${n}">${nbInline(axes.col)}</th></tr>
    <tr>${cols.map(c => `<th class="cb-fm-ch">${nbInline(c)}</th>`).join('')}</tr>`;
  body.forEach((r, ri) => {
    out += `<tr><th class="cb-fm-rh">${nbInline(r.label)}</th>` + cols.map((_, ci) => {
      const v = (r.cells[ci] || '').trim().replace(/<br\s*\/?>/gi, '\n');
      const hit = name ? (name(ri, ci)[0] === 'T') : (ri === ci);
      const tag = name ? `<i class="cb-fm-tag">${name(ri, ci)}</i>` : '';
      return `<td class="cb-fm-c ${hit ? 'ok' : 'no'}">${tag}<textarea class="cb-fill"
        data-cellid="${cellId}" rows="1" data-fill="${from + r.k},${ci + 1}"
        spellcheck="false" placeholder="　">${esc(v)}</textarea></td>`;
    }).join('') + '</tr>';
  });
  return out + '</table>';
}

function nbFillTable(lines, from, cellId){
  const isSep = cs => cs.every(c => /^\s*:?-{2,}:?\s*$/.test(c));
  const split = ln => ln.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
  const wide = Math.max(2, ...lines.map(ln => split(ln).length));
  // 표 모양으로 그릴지 — 머리줄 첫 칸의 `행 \ 열`
  const hd = split(lines[0] || '').map(c => c.trim());
  const axes = nbFillAxes(hd[0] || '');
  if(axes) return nbFillMatrix(lines, from, cellId, axes, isSep, split);
  /* 앞머리가 **두 줄 이상** 이어질 때만 묶습니다 (2026-11-03).
     「TP — …」 「FN — …」 처럼 줄마다 앞머리가 다르면 한 줄짜리 머리줄이
     넷 생겨 오히려 어지럽습니다. 묶음이 아니라 설명이기 때문입니다. */
  const many = {};
  let seen = false;
  lines.forEach(ln => {
    const cs = split(ln);
    if(isSep(cs)){ seen = true; return; }
    if(!seen) return;
    const g = nbFillGroup((cs[0] || '').trim()).g;
    if(g) many[g] = (many[g] || 0) + 1;
  });
  let out = '<table class="cb-fill-t">', head = true, no = 0, prev = '';
  lines.forEach((ln, k) => {
    const cs = split(ln);
    if(isSep(cs)){ head = false; return; }
    let lb = (cs[0] || '').trim();
    /* 칸 높이 — 이름표 끝의 `+` 개수가 **처음 줄 수**입니다 (2026-11-03 선생님 —
       「칸 작아보여서 애들이 별로 작성 안할 거 같은데 … 이유 서술하라던가
        그런 칸들만 키울수 있는 방법」).
         | 고른 까닭 +++ | |   → 세 줄짜리 칸으로 열립니다
       `+` 는 **지워서 보여 줍니다.** 학생이 고치는 것은 답 칸뿐이라 이름표에
       두는 것이 안전합니다 — 답 칸에 두면 학생이 지우는 순간 사라집니다. */
    let tall = 1;
    if(!head){
      const mt = lb.match(/\s*(\++)$/);
      if(mt){ tall = Math.min(12, mt[1].length); lb = lb.slice(0, mt.index).trim(); }
    }
    if(!head){
      no++;
      const r = nbFillGroup(lb);
      const g = (r.g && many[r.g] >= 2) ? r.g : '';     // 혼자면 묶지 않습니다
      if(g){
        if(g !== prev){
          out += `<tr class="cb-fill-h"><td colspan="${wide}">${nbInline(g)}</td></tr>`;
        }
        lb = r.rest;
      }
      prev = g;
    }
    out += '<tr>' + cs.map((c, ci) => {
      const v = ci === 0 ? lb : c.trim();
      // 머리줄에 `--` 만 적은 칸은 **비워 둡니다** — 적을 머리말이 없다는 뜻으로
      //   쓰시는데 그 글자가 그대로 보였습니다 (2026-11-03)
      if(head) return `<th>${/^-+$/.test(v) ? '' : nbInline(v)}</th>`;
      if(ci === 0) return `<td class="lb"><i class="cb-fill-n">${no}</i>${nbInline(v)}</td>`;
      /* 적는 칸은 **여러 줄**입니다 (2026-11-03 선생님 — 「적으면 그만큼
         아래로 늘어나게」). 한 줄짜리 칸이라 긴 까닭을 적으면 글자가 옆으로
         밀려 나가 앞이 안 보였습니다.
         ⚠ 표 한 칸은 **한 줄**이라, 줄바꿈은 source 에 `<br>` 로 넣습니다
           (events/notebook.js 의 cb-fill). 여기서는 되돌려 보여 줍니다.
           높이는 nbFillGrow 가 글자에 맞춰 늘립니다. */
      const tv = v.replace(/<br\s*\/?>/gi, '\n');
      return `<td><textarea class="cb-fill" data-cellid="${cellId}" rows="${
        Math.max(tall, tv.split('\n').length)}"
        data-fill="${from + k},${ci}" spellcheck="false"
        placeholder="　">${esc(tv)}</textarea></td>`;
    }).join('') + '</tr>';
  });
  return out + '</table>';
}
function nbFillBody(cell){
  const lines = String(cell.source || '').split('\n');
  let out = '', buf = [], tab = [], tabFrom = -1;
  const flushText = () => {
    if(!buf.length) return;
    const t = buf.join('\n');
    out += typeof marked !== 'undefined' ? marked.parse(t) : esc(t);
    buf = [];
  };
  const flushTab = () => {
    if(!tab.length) return;
    out += nbFillTable(tab, tabFrom, cell.id);
    tab = []; tabFrom = -1;
  };
  lines.forEach((ln, i) => {
    if(ln.trim().charAt(0) === '|'){
      flushText();
      if(!tab.length) tabFrom = i;
      tab.push(ln);
    } else {
      flushTab();
      buf.push(ln);
    }
  });
  flushText(); flushTab();
  return out;
}

// ── 셀 한 개 렌더 ──
function vNbCell(cell, idx, fold){
  const selected = NB_SELECTED === cell.id ? ' cb-selected' : '';
  const isMd = cell.type === 'markdown';
  const isEditingMd = isMd && NB_EDITING_MD === cell.id;

  // 셀 사이 + 버튼 — 퀴즈는 선생님만 (삽입 메뉴 안에만 있어서 못 찾았습니다. 2026-10-28)
  const addRow = `<div class="cb-add-row">
    <button class="cb-add-btn" data-action="nb-add-cell" data-type="block" data-pos="${idx}">+ 🧩 블록</button>
    <button class="cb-add-btn" data-action="nb-add-cell" data-type="code" data-pos="${idx}">+ 코드</button>
    <button class="cb-add-btn" data-action="nb-add-cell" data-type="markdown" data-pos="${idx}">+ 텍스트</button>
    ${nbAuthoring() ? `<button class="cb-add-btn" data-action="nb-insert-quiz"
      data-pos="${idx}">+ 🧠 퀴즈</button>` : ''}
  </div>`;

  // 셀 호버 툴바 (오른쪽 위) — 코드 셀의 ▶ 는 셀 왼쪽 [ ] 자리에 늘 보이게 따로 둔다
  const hoverTb = `<div class="cb-cell-actions">
    ${isMd ? `<button class="cb-act-btn" data-action="nb-md-edit-btn" data-cellid="${cell.id}" title="편집">✏️</button>` : ''}
    ${!isMd && String(cell.source || '').includes('확인(답,')
      ? `<button class="cb-act-btn" data-action="nb-quiz-edit" data-cellid="${cell.id}" title="퀴즈 문제 고치기">🧠</button>` : ''}
    <button class="cb-act-btn" data-action="nb-move-up" data-cellid="${cell.id}" title="셀 위로 이동">↑</button>
    <button class="cb-act-btn" data-action="nb-move-down" data-cellid="${cell.id}" title="셀 아래로 이동">↓</button>
    <button class="cb-act-btn" data-action="nb-copy" data-cellid="${cell.id}" title="셀 복제">⧉</button>
    <button class="cb-act-btn cb-act-del" data-action="nb-delete" data-cellid="${cell.id}" title="셀 삭제">🗑</button>
  </div>`;

  let body = '';
  if(isMd){
    if(isEditingMd){
      // 서식 단추 — 마크다운을 외우지 않아도 되게 (2026-10-28).
      //   누르면 커서 자리에 넣습니다. 그림은 올려서 주소를 받아 넣습니다.
      //   **선생님만** 봅니다 — 평가 때 학생 화면에 단추가 늘어나지 않게.
      const fmt = !nbAuthoring() ? '' : [
        ['제목',  'h2',    '## 제목'],
        ['굵게',  'bold',  '**굵게**'],
        ['목록',  'ul',    '- 목록'],
        ['표',    'table', '표 넣기'],
        ['✍️ 기입칸', 'fill', '학생이 적는 칸'],
      ].map(([lab, kind, tip]) => `<button class="cb-md-fmt" data-action="nb-md-fmt"
          data-cellid="${cell.id}" data-kind="${kind}" title="${esc(tip)}">${lab}</button>`).join('');
      const imgBtn = nbAuthoring()
        ? `<button class="cb-md-fmt" data-action="nb-md-img" data-cellid="${cell.id}"
             title="그림을 올려 이 자리에 넣습니다 — 붙여넣기(Ctrl+V)와 끌어다 놓기도 됩니다">🖼 그림</button>`
        : '';
      body = `<div class="cb-md-editor">
        ${fmt || imgBtn ? `<div class="cb-md-tools">${fmt}${imgBtn}</div>` : ''}
        <textarea class="cb-md-area" data-cellid="${cell.id}" spellcheck="false">${esc(cell.source || '')}</textarea>
        <div style="font-size:11px;color:var(--text3);padding:4px 8px">💡 Shift+Enter 로 렌더링 완료 · Esc로 취소</div>
      </div>`;
    } else {
      // ✍️ 표가 든 셀은 **칸마다 입력 상자**로 그립니다 (nbFillBody)
      const html = nbFillUse(cell)
        ? nbFillBody(cell)
        : (typeof marked !== 'undefined' ? marked.parse(cell.source || '') : esc(cell.source || ''));
      body = `<div class="cb-md-render" data-cellid="${cell.id}" title="더블클릭하여 편집">${html || '<div style="color:var(--cb-text-3);font-style:italic">(빈 텍스트 셀 — 더블클릭해서 편집)</div>'}</div>`;
    }
    /* 📂 제목 셀이면 왼쪽에 ▾ — 누르면 그 아래 묶음을 접습니다 (2026-11-03).
       접힌 동안에는 **몇 개를 접었는지** 옆에 적습니다. 숫자가 없으면
       접힌 것인지 원래 비어 있는 것인지 알 수 없습니다. */
    const lv = fold ? (fold.head[idx] || 0) : 0;
    const shut = lv && NB_FOLDED[cell.id];
    const kids = lv ? (fold.kids[cell.id] || 0) : 0;
    const foldBtn = (lv && kids && !isEditingMd) ? `
      <button class="cb-sec-fold" data-action="nb-fold" data-cellid="${cell.id}"
        title="${shut ? '묶음 펼치기' : '묶음 접기'}">${shut ? '▸' : '▾'}</button>
      ${shut ? `<span class="cb-sec-count" data-action="nb-fold"
        data-cellid="${cell.id}">셀 ${kids}개 접힘</span>` : ''}` : '';
    return addRow + `<div class="cb-cell cb-cell-md${selected}${lv ? ' cb-cell-head' : ''}${
        shut ? ' cb-sec-shut' : ''}" data-cellid="${cell.id}">
      ${hoverTb}
      ${foldBtn}
      ${body}
    </div>`;
  }

  // 🧩 블록 셀 — cell.blocks 가 있으면 글상자 대신 블록을 쌓아 보여 줍니다.
  //   실행 · 저장 · 내려받기는 cell.source(블록이 만든 파이썬)를 그대로 씁니다.
  if(cell.blocks) return addRow + vNbBlockCell(cell, hoverTb);

  // 코드 셀
  const result = NB_CELL_OUTPUTS[cell.id];
  const busy = !!(result?.running || result?.queued);
  const execLabel = busy ? '[*]' : (result?.execCount ? `[${result.execCount}]` : '[ ]');
  const outputHtml = result ? vNbOutput(result, cell.id) : '';

  return addRow + `<div class="cb-cell cb-cell-code${selected}" data-cellid="${cell.id}">
    ${hoverTb}
    <div class="cb-code-wrap">
      <div class="cb-exec-prompt${busy ? ' cb-running' : ''}">
        <button class="cb-run-btn" data-action="nb-run-cell" data-cellid="${cell.id}" title="셀 실행 (Ctrl+Enter)" aria-label="셀 실행">▶</button>
        <span class="cb-exec-count">${execLabel}</span>
      </div>
      <div class="cb-code-main">
        <textarea class="cb-code-area" id="cb-code-${cell.id}" data-cellid="${cell.id}" spellcheck="false">${esc(cell.source || '')}</textarea>
      </div>
    </div>
    ${outputHtml}
  </div>`;
}

// ── 학생 진도 패널 ──
function vNbProgressPanel(){
  const nb = SEL_NOTEBOOK;
  const origCount = nb.cells?.length || 0;

  // 학생별 상태 계산
  const rows = STUDENTS.map(st => {
    const prog = NB_PROGRESS_MAP[st.number];
    const edited = !!prog;
    const cellCount = prog?.cells?.length || 0;
    const updatedAt = prog?.updatedAt;
    // 원본과 비교해서 변경된 셀 개수
    let changedCells = 0;
    if(edited && Array.isArray(prog.cells)){
      const origById = {};
      (nb.cells || []).forEach(c => { if(c.id) origById[c.id] = c.source || ''; });
      prog.cells.forEach(c => {
        if(!origById.hasOwnProperty(c.id)) changedCells++;
        else if(origById[c.id] !== (c.source || '')) changedCells++;
      });
    }
    return {st, edited, cellCount, updatedAt, changedCells};
  }).sort((a, b) => a.st.number.localeCompare(b.st.number));

  const editedCount = rows.filter(r => r.edited).length;

  const tbl = !rows.length ? emptyBox('👥', '등록된 학생이 없습니다.') : `
    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>학번</th><th>이름</th><th>상태</th><th>셀 수</th>
            <th>변경 셀</th><th>마지막 저장</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td style="font-weight:600">${esc(r.st.number)}</td>
            <td>${esc(r.st.name)}</td>
            <td>${r.edited ? `<span class="chip chip-green">✓ 편집함</span>` : `<span class="chip chip-gray">원본</span>`}</td>
            <td>${r.edited ? r.cellCount : origCount}</td>
            <td>${r.edited ? (r.changedCells ? `<span style="color:var(--accent);font-weight:600">${r.changedCells}</span>` : '-') : '-'}</td>
            <td style="font-size:11px">${r.updatedAt ? fmtDt(r.updatedAt) : '-'}</td>
            <td>${r.edited ? `<button class="btn-xs btn-p" data-action="nb-view-student" data-snum="${esc(r.st.number)}">보기</button>` : '<span class="cell-no">-</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  return `<div class="cb-progress-wrap">
    <div class="cb-progress-header">
      <div>
        <div style="font-size:14px;font-weight:700">👥 학생 진도</div>
        <div style="font-size:12px;color:var(--cb-text-2);margin-top:2px">
          ${editedCount}명 편집 / ${STUDENTS.length}명 전체
          ${STUDENTS.length ? `(${Math.round(editedCount / STUDENTS.length * 100)}%)` : ''}
        </div>
      </div>
      <button class="btn-sm" data-action="nb-hide-progress">✕ 닫기</button>
    </div>
    ${tbl}
  </div>`;
}

function vNbOutput(result, cellId){
  const items = nbItemsOf(result);
  const running = !!result.running, queued = !!result.queued && !running;
  const collapsed = !!(cellId && NB_COLLAPSED_OUTPUTS[cellId]);
  const promptLabel = (running || queued) ? 'Out [*]:' : (result.execCount ? `Out [${result.execCount}]:` : 'Out:');
  const timeLabel = running ? '실행 중' : queued ? '차례를 기다리는 중' : formatElapsed(result.elapsedMs);
  const hasErr = items.some(it => it.kind === 'error');
  return `<div class="cb-output${hasErr ? ' cb-has-error' : ''}${running ? ' cb-out-running' : ''}${!items.length ? ' cb-out-noitems' : ''}${collapsed ? ' cb-out-collapsed' : ''}" data-cellid="${cellId || ''}">
    <div class="cb-out-header">
      <span class="cb-out-prompt">${promptLabel}</span>
      ${timeLabel ? `<span class="cb-out-time" title="실행 시간">⏱ ${timeLabel}</span>` : ''}
      <span class="cb-out-spacer"></span>
      ${cellId && items.length ? `<button class="cb-out-toggle" data-action="nb-toggle-output" data-cellid="${cellId}" title="${collapsed ? '출력 펼치기' : '출력 접기'}">${collapsed ? '▸' : '▾'}</button>` : ''}
    </div>
    <div class="cb-out-body"><div class="cb-out-items">${vNbItems(items)}</div></div>
  </div>`;
}

// 실행 시간을 사람 읽기 좋은 문자열로
function formatElapsed(ms){
  if(typeof ms !== 'number' || ms < 0) return '';
  if(ms < 1000) return `${Math.round(ms)}ms`;
  if(ms < 60000) return `${(ms/1000).toFixed(1)}초`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}분 ${s}초`;
}
