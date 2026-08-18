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

  // 선생님과 다른 장을 보고 있으면 되돌아갈 버튼
  const offBar = (live.on && !SLIDE_FOLLOW)
    ? `<button class="sl-rejoin" data-action="sl-follow">선생님 화면으로 돌아가기 (${teacherPage + 1}장)</button>`
    : '';

  const statusChip = live.on
    ? `<span class="sl-live"><i></i>같이 보는 중</span>`
    : `<span class="sl-chip">혼자 보는 중 — 선생님이 시작하면 자동으로 따라갑니다</span>`;

  return `
    <div class="sl-bar">
      ${statusChip}
      <span class="sl-page">${page + 1} / ${imgs.length}</span>
    </div>
    ${offBar}
    <div class="sl-stage">
      <img class="sl-img" src="${esc(im.url)}" alt="${page + 1}번째 슬라이드"
           data-action="preview-img" data-url="${esc(im.url)}" data-name="${page + 1}장"/>
    </div>
    <div class="sl-nav">
      <button class="sl-btn" data-action="sl-prev" ${page === 0 ? 'disabled' : ''}>← 이전</button>
      <button class="sl-btn" data-action="sl-zoom" data-url="${esc(im.url)}">크게 보기</button>
      <button class="sl-btn" data-action="sl-next" ${page === imgs.length - 1 ? 'disabled' : ''}>다음 →</button>
    </div>`;
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
        <button id="sl-upload" class="btn-p" ${SLIDE_UPLOADING ? 'disabled' : ''}>
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
  </div>`;

  return control + upload;
}
