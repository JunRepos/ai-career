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
          >${on ? '✎' : '●'} ${esc(key)}<i>${esc(hint)}</i></button>`;
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
      <div class="sec-title" style="margin:0">🧩 블록 고치기</div>
    </div>
    <div class="box-info">
      블록의 <b>이름</b>과 <b>아래 설명</b>을 고칩니다.
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
      title="블록의 이름과 설명을 한자리에서 고칩니다 — 모든 노트북에 적용됩니다"
      >🧩 블록 고치기</button>
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

  const cellsHtml = (NB_CELLS || []).map((cell, idx) => vNbCell(cell, idx)).join('');

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
const NB_BLK_CAT = {prep:'--nbk-prep', look:'--nbk-look', clean:'--nbk-clean',
                    plot:'--nbk-plot', ml:'--nbk-ml'};

function vNbBlockCell(cell, hoverTb){
  const selected = NB_SELECTED === cell.id ? ' cb-selected' : '';
  const result = NB_CELL_OUTPUTS[cell.id];
  const busy = !!(result?.running || result?.queued);
  const execLabel = busy ? '[*]' : (result?.execCount ? `[${result.execCount}]` : '[ ]');
  const file = nbCellDataFile(cell, NB_CELLS);

  // 정답 확인을 누른 셀이면, 틀린 자리를 블록에 넘겨 빨갛게 표시합니다
  const bad = NB_CHECKED[cell.id]
    ? new Set((nbCellCheck(cell, file).wrong || []).map(w => w.bi + '|' + w.slot))
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
          ${nbAuthoring() ? `<button class="nbk-mini" data-action="nb-blk-askui"
            aria-pressed="${NB_BLK_ASKUI}"
            title="칸마다 ✎ 를 붙입니다 — 눌러서 학생이 채울 빈칸을 정합니다">✎ 빈칸 정하기</button>` : ''}
          ${chkBtn}
          ${idkBtn}
        </div>
        <div class="nbk-stack" data-blkstack="${cell.id}">${stack}</div>
        ${chkLine}
        ${codePane}
      </div>
    </div>
    ${result ? vNbOutput(result, cell.id) : ''}
  </div>`;
}

function vNbBlock(cellId, b, bi, file, bad){
  const d = NB_BLOCK_DEFS[b.k];
  if(!d) return '';
  // 파이썬 **한 줄씩** 그립니다. 드롭다운은 그 줄 안에 끼워 넣어
  // 「열 이름은 따옴표 안에 쓴다」 가 눈에 그대로 보이게 합니다.
  // 같은 칸이 코드에 두 번 나오는 블록이 있습니다 (`score` 의 X_{d}, y_{d}).
  //   드롭다운은 둘 다 그려야 하지만, **빈칸 토글은 첫 자리에만** 붙입니다.
  const seenSlot = new Set();
  const lines = d.tpl.split('\n').map(line => {
    const parts = line.split(/(\{\w+\})/).map(part => {
      const m = part.match(/^\{(\w+)\}$/);
      if(!m) return part ? `<span class="nbk-code-in">${esc(part)}</span>` : '';
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
      const asText = slot.kind || ask;
      // 미리 셀 수 없는 값(행 번호 · 찾을 값)은 적는 칸으로 둡니다 — 교과서 81쪽처럼
      if(asText){
        const v = b.a[key];
        // 아직 안 적은 자리는 빨갛게 — 무엇을 해야 하는지 바로 보이게
        const miss = bad && bad.has(bi + '|' + key) ? ' nbk-in-bad' : '';
        const hot = (ask && (v === '' || v == null) ? ' nbk-in-ask' : '') + miss;
        // 보기 목록이 있던 칸은 **가장 긴 보기만큼** 넓혀 둡니다 — 열 이름이 깁니다
        const opts = slot.kind ? null : nbSlotOptions(slot, file);
        const wide = opts && opts.length
          ? Math.min(28, Math.max(11, ...opts.map(o => String(o).length + 1)))
          : (slot.kind === 'num' ? 5 : 11);
        html = `<input class="nbk-in${hot}" type="${slot.kind === 'num' ? 'number' : 'text'}"
          value="${esc(v ?? '')}" size="${wide}"
          placeholder="${ask ? esc(slot.ph || nbSlotHint(slot, file)) : ''}" ${at}>`;
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
      // 선생님만 — 이 자리를 빈칸으로 둘지 채워 둘지 (2026-10-28)
      const first = !seenSlot.has(key);
      seenSlot.add(key);
      // 「✎ 빈칸 정하기」 를 켰을 때만 — 늘 붙여 두면 파이썬이 지저분합니다
      if(!first || !NB_BLK_ASKUI || !nbAuthoring()) return html;
      return `<span class="nbk-slotwrap">${html}<button class="nbk-askb${ask ? ' on' : ''}"
        data-action="nb-blk-ask" data-cellid="${cellId}" data-bi="${bi}" data-slot="${key}"
        aria-pressed="${ask}" title="${ask ? '학생이 채우는 빈칸 — 눌러서 채워 둡니다'
                                          : '채워 둔 자리 — 눌러서 빈칸으로 둡니다'}"
        >${ask ? '✎' : '●'}</button></span>`;
    }).join('');
    return `<div class="nbk-line">${parts}</div>`;
  }).join('');
  // 설명 — 선생님이 고친 글이 있으면 그것을 씁니다 (nbBlkSay).
  //   고친 글에는 교과서 쪽을 달지 않습니다. 학생 화면에는 고쳤다는 표시가
  //   하나도 나오지 않습니다 (CLAUDE.md 16).
  const t = nbBlkSay(b.k);
  const sayBtns = nbAuthoring()
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
        ${keys.map(k => `<div class="nbk-pal-row"><button class="nbk-pal" draggable="true" data-action="nb-blk-add"
          data-k="${k}" style="--nbk-cat:var(${NB_BLK_CAT[NB_BLOCK_DEFS[k].cat]})"
          ><span class="nbk-pal-name">${esc(nbBlkName(k))}</span
          ><span class="nbk-pal-code">${esc(nbPalCode(k))}</span></button>${
          NB_BLOCK_DEFS[k].guide ? `<button class="nbk-pal-q" data-action="nb-guide-go"
            data-anchor="${NB_BLOCK_DEFS[k].guide}" title="가이드북에서 보기">?</button>` : ''}</div>`).join('')}
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
  const T = [['blk', '🧩 블록'], ['snip', 'ƒ 함수'], ['toc', '📋 목차'], ['files', '📁 파일']];
  const tabs = `<div class="cb-side-tabs">
    ${T.map(([k, label]) => `<button class="${NB_SIDE_TAB === k ? 'on' : ''}"
      data-action="nb-side-tab" data-tab="${k}">${label}</button>`).join('')}
  </div>`;
  // 🧩 블록 서랍은 파이썬을 같이 보여 줘서 240px 로는 줄바꿈이 너무 잦습니다
  //   (2026-10-27 선생님). 이 탭일 때만 넓힙니다.
  if(NB_SIDE_TAB === 'blk') return `<aside class="cb-sidebar cb-sidebar-wide">${tabs}${vNbBlockPanel()}</aside>`;
  if(NB_SIDE_TAB === 'files') return `<aside class="cb-sidebar">${tabs}${vNbFilesPanel()}</aside>`;
  if(NB_SIDE_TAB === 'toc') return _vNbSidebarToc().replace('<aside class="cb-sidebar">', '<aside class="cb-sidebar">' + tabs);
  return `<aside class="cb-sidebar">${tabs}${vNbSnipPanel()}</aside>`;
}

function _vNbSidebarToc(){
  const toc = buildNbTOC();
  let tocHtml;
  if(!toc.length){
    tocHtml = `<div class="cb-toc-empty">텍스트 셀에 <code># 제목</code>을<br>적으면 여기에 목차가 생겨요.</div>`;
  } else {
    tocHtml = toc.map(it => `
      <a class="cb-toc-item cb-toc-lv${it.level}" data-action="nb-toc-jump" data-cellid="${it.cellId}">
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

// ── 셀 한 개 렌더 ──
function vNbCell(cell, idx){
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
      const html = typeof marked !== 'undefined' ? marked.parse(cell.source || '') : esc(cell.source || '');
      body = `<div class="cb-md-render" data-cellid="${cell.id}" title="더블클릭하여 편집">${html || '<div style="color:var(--cb-text-3);font-style:italic">(빈 텍스트 셀 — 더블클릭해서 편집)</div>'}</div>`;
    }
    return addRow + `<div class="cb-cell cb-cell-md${selected}" data-cellid="${cell.id}">
      ${hoverTb}
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
