/* ═══════════════════════════════════════
   views/slides.js — 🖥️ 수업자료 슬라이드

   PPT 를 이미지로 내보내서 올리면, 선생님이 넘기는 대로
   모든 학생 화면이 같이 넘어갑니다.
     선생님: 업로드 → '같이 보기 시작' → ← → 로 넘김
     학생  : 홈에 '지금 수업 중' 배너 → 누르면 같은 장면
             혼자 앞뒤로 보다가 '선생님 화면으로' 누르면 다시 합류
═══════════════════════════════════════ */

function _slideImgs(){ return (SLIDE_DECK && SLIDE_DECK.images) || []; }
function _slideCount(){ return _slideImgs().length; }
function _clampPage(p){ return Math.max(0, Math.min(_slideCount() - 1, p || 0)); }

/* ── 학생 ── */
function vStSlides(){
  const imgs = _slideImgs();
  if(!imgs.length) return emptyBox('🖥️', '아직 올라온 수업자료가 없어요.');

  const live = SLIDE_LIVE || {};
  const teacherPage = _clampPage(live.page);
  const page = (SLIDE_FOLLOW && live.on) ? teacherPage : _clampPage(SLIDE_MYPAGE);
  const im = imgs[page];

  if(SLIDE_SHOW_ALL) return _vStNotesAll();

  const offBar = (live.on && !SLIDE_FOLLOW)
    ? `<button class="sl-rejoin" data-action="sl-follow">선생님 화면으로 돌아가기 (${teacherPage + 1}장)</button>`
    : '';

  const statusChip = live.on
    ? `<span class="sl-live"><i></i>같이 보는 중</span>`
    : `<span class="sl-chip">혼자 보는 중 — 선생님이 시작하면 자동으로 따라갑니다</span>`;

  // 메모가 있는 장에 점을 찍어 나중에 찾기 쉽게
  const dots = imgs.map((_, i) => {
    const has = (SLIDE_NOTES[i] || '').trim();
    return `<i class="sl-dot${i === page ? ' on' : ''}${has ? ' has' : ''}" title="${i + 1}장${has ? ' · 메모 있음' : ''}"></i>`;
  }).join('');

  const noteCount = Object.values(SLIDE_NOTES).filter(v => (v || '').trim()).length;
  const savedTxt = SLIDE_NOTE_SAVED ? `저장됨 ${fmtDt(SLIDE_NOTE_SAVED)}` : '입력하면 자동 저장돼요';

  return `
    <div class="sl-bar">
      ${statusChip}
      <span class="sl-page">${page + 1} / ${imgs.length}</span>
    </div>
    ${offBar}
    <div class="sl-split">
      <div class="sl-left">
        <div class="sl-stage">
          <img class="sl-img" src="${esc(im.url)}" alt="${page + 1}번째 슬라이드"
               data-action="sl-zoom" data-url="${esc(im.url)}"/>
        </div>
        <div class="sl-dots">${dots}</div>
        <div class="sl-nav">
          <button class="sl-btn" data-action="sl-prev" ${page === 0 ? 'disabled' : ''}>← 이전</button>
          <button class="sl-btn" data-action="sl-zoom" data-url="${esc(im.url)}">크게 보기</button>
          <button class="sl-btn" data-action="sl-next" ${page === imgs.length - 1 ? 'disabled' : ''}>다음 →</button>
        </div>
      </div>

      <div class="sl-right">
        <div class="sl-note-head">
          <div>
            <div class="sl-note-title">${page + 1}장 메모</div>
            <div class="sl-note-sub">${esc(savedTxt)}</div>
          </div>
          <button class="btn-xs" data-action="sl-notes-all">모아보기${noteCount ? ` (${noteCount})` : ''}</button>
        </div>
        <textarea class="sl-note" data-action="sl-note" data-page="${page}"
          placeholder="이 장에서 기억할 점을 적어보세요.&#10;선생님이 다음 장으로 넘겨도 여기 적은 건 그대로 남아요.">${esc(SLIDE_NOTES[page] || '')}</textarea>
        <div class="sl-note-foot">이 메모는 선생님이 볼 수 있어요</div>
      </div>
    </div>`;
}

/* 내 메모 모아보기 — 수업 끝나고 복습·정리용 */
function _vStNotesAll(){
  const imgs = _slideImgs();
  const rows = imgs.map((im, i) => {
    const t = (SLIDE_NOTES[i] || '').trim();
    if(!t) return '';
    return `<div class="sl-nrow">
      <button class="sl-nrow-thumb" data-action="sl-goto" data-i="${i}">
        <img src="${esc(im.url)}" alt=""/><span>${i + 1}</span>
      </button>
      <div class="sl-nrow-text">${esc(t)}</div>
    </div>`;
  }).filter(Boolean).join('');

  return `<button class="rep-back" data-action="sl-notes-all">← 슬라이드로</button>
    <div class="sl-note-head" style="margin-bottom:14px">
      <div class="sl-note-title">내가 적은 메모</div>
      ${rows ? `<button class="btn-xs" data-action="sl-copy-notes">📋 전체 복사</button>` : ''}
    </div>
    ${rows || emptyBox('📝', '아직 적은 메모가 없어요. 슬라이드를 보면서 적어보세요.')}`;
}

/* ── 선생님 ── */
function vTcSlides(){
  if(!TC_CLS) return emptyBox('👆', '관리할 반을 먼저 선택하세요.');
  const imgs = _slideImgs();
  const live = SLIDE_LIVE || {};

  const upload = `<div class="section">
    <div class="sec-title">수업자료 올리기</div>
    <div class="box-info" style="margin-bottom:12px">
      파워포인트에서 <b>파일 → 내보내기 → 그림으로</b> (또는 다른 이름으로 저장 → PNG) 하면
      슬라이드가 장당 이미지로 나옵니다. 그 이미지들을 <b>한꺼번에</b> 선택해서 올려주세요.
      파일 이름 순서대로 정렬됩니다.
    </div>
    <div class="form">
      <div class="field">
        <label>슬라이드 이미지 (여러 장 선택)</label>
        <input id="sl-file" type="file" accept="image/*" multiple/>
      </div>
      <div class="field"><label>제목 (선택)</label>
        <input id="sl-title" type="text" placeholder="예) 1차시 오리엔테이션" value="${esc(SLIDE_DECK?.title || '')}"/></div>
      <div class="prog-wrap" id="sl-prog">
        <div class="prog-label">올리는 중... <span id="sl-pct">0%</span></div>
        <div class="prog-bar"><div class="prog-fill" id="sl-pfill" style="width:0%"></div></div>
      </div>
      <div id="sl-err" class="err"></div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button id="sl-upload" class="btn-p" data-action="sl-upload" ${SLIDE_UPLOADING ? 'disabled' : ''}>
          ${imgs.length ? '새 자료로 교체' : '올리기'}</button>
        ${imgs.length ? `<button class="btn-sm btn-danger" data-action="sl-delete">전체 삭제</button>` : ''}
      </div>
    </div>
  </div>`;

  if(!imgs.length) return upload;

  const page = _clampPage(live.page);
  const thumbs = imgs.map((im, i) => `
    <button class="sl-thumb${i === page ? ' on' : ''}" data-action="sl-go" data-i="${i}">
      <img src="${esc(im.url)}" alt=""/><span>${i + 1}</span>
    </button>`).join('');

  const control = `<div class="section">
    <div class="sl-ctrl-head">
      <div>
        <div class="sec-title" style="margin:0">${esc(SLIDE_DECK.title || '수업자료')} · ${imgs.length}장</div>
        <div class="sl-ctrl-sub">${live.on
          ? '학생 화면이 지금 이 장을 따라오고 있습니다.'
          : '아직 학생에게 안 보입니다. 시작을 누르면 모든 학생 화면이 이 장으로 맞춰집니다.'}</div>
      </div>
      <button class="${live.on ? 'btn-sm btn-danger' : 'btn-p'}" data-action="sl-toggle" data-on="${live.on ? '0' : '1'}">
        ${live.on ? '같이 보기 끝내기' : '같이 보기 시작'}
      </button>
    </div>

    <div class="sl-stage tc">
      <img class="sl-img" src="${esc(imgs[page].url)}" alt=""/>
    </div>
    <div class="sl-nav">
      <button class="sl-btn" data-action="sl-prev" ${page === 0 ? 'disabled' : ''}>← 이전</button>
      <span class="sl-page">${page + 1} / ${imgs.length}</span>
      <button class="sl-btn" data-action="sl-next" ${page === imgs.length - 1 ? 'disabled' : ''}>다음 →</button>
    </div>
    <div class="sl-hint">키보드 <b>←</b> <b>→</b> 로도 넘길 수 있어요</div>
    <div class="sl-thumbs">${thumbs}</div>
    ${_vTcSlideNotes(page)}
  </div>`;

  return control + upload;
}

/* 선생님: 지금 장에 학생들이 적은 메모 — "따라오고 있나" 확인용 */
function _vTcSlideNotes(page){
  const entries = Object.entries(SLIDE_NOTE_ALL || {})
    .map(([snum, byPage]) => ({ snum, text: (byPage || {})[page] || '' }))
    .filter(e => e.text.trim());

  const head = `<div class="sl-tcn-head">
    <span>이 장에 메모한 학생 <b>${entries.length}명</b>${STUDENTS.length ? ` / ${STUDENTS.length}` : ''}</span>
    <button class="btn-xs" data-action="sl-tc-notes">${SLIDE_TC_NOTES ? '접기' : '메모 보기'}</button>
  </div>`;

  if(!SLIDE_TC_NOTES) return head;
  if(!entries.length) return head + `<div class="sl-tcn-empty">아직 이 장에 메모한 학생이 없습니다.</div>`;

  const rows = entries.map(e => {
    const st = STUDENTS.find(s => s.number === e.snum);
    return `<div class="sl-tcn-row">
      <div class="sl-tcn-who">${esc(st?.name || e.snum)}</div>
      <div class="sl-tcn-text">${esc(e.text)}</div>
    </div>`;
  }).join('');
  return head + `<div class="sl-tcn-list">${rows}</div>`;
}
