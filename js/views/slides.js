/* ═══════════════════════════════════════
   views/slides.js — 🖥️ 수업자료 슬라이드

   PPT 를 이미지로 내보내서 올리면, 선생님이 넘기는 대로
   모든 학생 화면이 같이 넘어갑니다.
     선생님: 업로드 → '같이 보기 시작' → ← → 로 넘김
     학생  : 홈에 '지금 수업 중' 배너 → 누르면 같은 장면
             혼자 앞뒤로 보다가 '선생님 화면으로' 누르면 다시 합류
═══════════════════════════════════════ */

/* 지금 화면에 그릴 자료.
   학생이 단원에서 연 자료(SLIDE_VIEW_DECK)가 있으면 그것을, 없으면 이번 시간 자료를. */
function curDeck(){
  if(SLIDE_VIEW_DECK) return deckById(SLIDE_VIEW_DECK);
  return SLIDE_DECK;
}
// 단원에서 연 자료를 보는 중인지 (혼자 보기 — 선생님을 따라가지 않음)
function _isUnitView(){ return !!SLIDE_VIEW_DECK; }

function _slideImgs(){ const d = curDeck(); return (d && d.images) || []; }
// 실습 슬라이드인지 (이미지 대신 게임이 뜨는 장)
function _isGame(im){ return !!(im && im.type === 'game'); }
function _slideCount(){ return _slideImgs().length; }
function _clampPage(p){ return Math.max(0, Math.min(_slideCount() - 1, p || 0)); }

/* ── 학생 ── */
function vStSlides(){
  const imgs = _slideImgs();
  if(!imgs.length){
    // 단원에서 연 자료인데 선생님이 그 자료를 지운 경우
    if(_isUnitView()) return emptyBox('🖥️', '이 수업자료는 선생님이 지웠어요.');
    return emptyBox('🖥️', '이번 시간에 볼 수업자료가 아직 없어요.');
  }

  /* 단원에서 연 자료는 '혼자 보기' 입니다 — 선생님이 지금 다른 자료를 넘기고 있어도
     따라가지 않습니다. (복습용으로 여는 것이므로) */
  const unitView = _isUnitView();
  const live = unitView ? {} : (SLIDE_LIVE || {});
  const teacherPage = _clampPage(live.page);
  const page = (!unitView && SLIDE_FOLLOW && live.on) ? teacherPage : _clampPage(SLIDE_MYPAGE);
  const im = imgs[page];

  if(SLIDE_SHOW_ALL) return _vStNotesAll();

  // 실습 슬라이드 — 선생님이 이 장으로 넘기면 각자 화면에서 게임이 시작 가능
  if(_isGame(im)){
    const back = (live.on && !SLIDE_FOLLOW)
      ? `<button class="sl-rejoin" data-action="sl-follow">선생님 화면으로 돌아가기 (${teacherPage + 1}장)</button>` : '';
    return `<div class="sl-bar">
        ${live.on ? '<span class="sl-live"><i></i>같이 보는 중</span>' : '<span class="sl-chip">실습</span>'}
        <span class="sl-page">${page + 1} / ${imgs.length}</span>
      </div>${back}${vPlantWater()}`;
  }

  const offBar = (live.on && !SLIDE_FOLLOW)
    ? `<button class="sl-rejoin" data-action="sl-follow">선생님 화면으로 돌아가기 (${teacherPage + 1}장)</button>`
    : '';

  const statusChip = unitView
    ? `<span class="sl-chip">다시 보기 — 수업 때 쓴 메모가 그대로 있어요</span>`
    : live.on
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
      ${curDeck()?.title ? `<span class="sl-deck-title">${esc(curDeck().title)}</span>` : ''}
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

/* ── 선생님 ──
   두 화면입니다.
     목록(SLIDE_TC_SEL = null) : 올려둔 수업자료가 카드로. 여기서 '이번 시간에 열기'
     자료 하나(SLIDE_TC_SEL)   : 넘기기·발표 모드·실습 넣기 등 기존 조작판
*/
function vTcSlides(){
  if(!TC_CLS) return emptyBox('👆', '관리할 반을 먼저 선택하세요.');
  return SLIDE_TC_SEL ? _vTcDeckDetail() : _vTcDeckList();
}

/* 새 수업자료 올리기 상자 — 목록 아래에 늘 붙어 있습니다 */
function _vTcDeckUpload(){
  return `<div class="section">
    <div class="sec-title">새 수업자료 올리기</div>
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
      <div class="field"><label>제목</label>
        <input id="sl-title" type="text" placeholder="예) 1차시 지능과 인공지능"/></div>
      ${multiClassPicker('sl', TC_CLS?.id, {
        sameSubject: true, allChecked: true, label: '올릴 반 (체크한 반에 모두 올라갑니다)' })}
      <div class="prog-wrap" id="sl-prog">
        <div class="prog-label">올리는 중... <span id="sl-pct">0%</span></div>
        <div class="prog-bar"><div class="prog-fill" id="sl-pfill" style="width:0%"></div></div>
      </div>
      <div id="sl-err" class="err"></div>
      <button id="sl-upload" class="btn-p" data-action="sl-upload" ${SLIDE_UPLOADING ? 'disabled' : ''}>
        올리기</button>
    </div>
  </div>`;
}

/* 수업자료 목록 — 차시별로 쌓아두고, 이번 시간에 볼 것 하나를 고릅니다 */
function _vTcDeckList(){
  const live = SLIDE_LIVE || {};
  // deckId 가 없던 시절 자료는 syncCurrentDeck() 이 '그 하나'를 열어둔 것으로 칩니다.
  // 목록 표시도 학생이 실제로 보는 것과 같아야 하므로 SLIDE_DECK 기준으로 맞춥니다.
  const openId = live.deckId || SLIDE_DECK?.id || null;

  const cards = SLIDE_DECKS.map(d => {
    const n = (d.images || []).length;
    const cover = (d.images || []).find(im => !_isGame(im));
    const isOpen = d.id === openId;
    const games = (d.images || []).filter(_isGame).length;
    return `<div class="deck-card${isOpen ? ' on' : ''}">
      <button class="deck-cover" data-action="sl-open" data-id="${esc(d.id)}">
        ${cover ? `<img src="${esc(cover.url)}" alt=""/>` : '<span class="deck-cover-none">🖥️</span>'}
        ${isOpen ? `<span class="deck-badge">${live.on ? '같이 보는 중' : '이번 시간'}</span>` : ''}
      </button>
      <div class="deck-body">
        <div class="deck-title">${esc(d.title || '제목 없는 수업자료')}</div>
        <div class="deck-meta">${n}장${games ? ` · 실습 ${games}개` : ''}${d.updatedAt ? ` · ${fmtDt(d.updatedAt)}` : ''}</div>
        <div class="deck-btns">
          <button class="btn-xs" data-action="sl-open" data-id="${esc(d.id)}">열어보기</button>
          ${isOpen
            ? `<button class="btn-xs btn-danger" data-action="sl-unpick">이번 시간에서 내리기</button>`
            : `<button class="btn-xs btn-pick" data-action="sl-pick" data-id="${esc(d.id)}">이번 시간에 열기</button>`}
          <button class="btn-xs btn-danger" data-action="sl-delete" data-id="${esc(d.id)}">삭제</button>
        </div>
      </div>
    </div>`;
  }).join('');

  const head = `<div class="section">
    <div class="sec-title">수업자료</div>
    <div class="box-info" style="margin-bottom:12px">
      차시마다 자료를 올려두고, <b>이번 시간에 볼 것 하나</b>를 고르세요.
      고른 자료는 학생 홈 화면에 바로 뜹니다.
      ${openId ? '' : '<br>지금은 아무것도 열지 않아서 학생 화면에는 수업자료가 보이지 않습니다.'}
    </div>
    ${SLIDE_DECKS.length ? `<div class="deck-grid">${cards}</div>`
      : emptyBox('🖥️', '아직 올린 수업자료가 없어요. 아래에서 올려보세요.')}
  </div>`;

  return head + _vTcDeckUpload();
}

/* 자료 하나 — 넘기기·발표 모드 조작판 (기존 화면) */
function _vTcDeckDetail(){
  const deck = deckById(SLIDE_TC_SEL);
  if(!deck) { SLIDE_TC_SEL = null; return _vTcDeckList(); }

  const live = SLIDE_LIVE || {};
  // 목록과 같은 기준 — deckId 가 없던 시절 자료도 '열린 것'으로 봅니다
  const isOpen = (live.deckId || SLIDE_DECK?.id || null) === deck.id;
  const imgs = deck.images || [];
  const back = `<button class="rep-back" data-action="sl-back">← 수업자료 목록</button>`;

  if(!imgs.length) return back + emptyBox('🖥️', '이 자료에는 슬라이드가 없습니다.');

  // 넘기기는 '이번 시간에 연 자료' 에만 의미가 있습니다 (학생 화면이 따라오는 대상)
  if(!isOpen){
    const thumbs = imgs.map((im, i) => `
      <div class="sl-thumb${_isGame(im) ? ' game' : ''}">
        ${_isGame(im) ? '<span class="sl-thumb-game">실습</span>' : `<img src="${esc(im.url)}" alt=""/>`}
        <span>${i + 1}</span>
      </div>`).join('');
    return back + `<div class="section">
      <div class="sl-ctrl-head">
        <div>
          <div class="sec-title" style="margin:0">${esc(deck.title || '수업자료')} · ${imgs.length}장</div>
          <div class="sl-ctrl-sub">이번 시간 자료가 아닙니다. 열어야 넘기기·발표 모드를 쓸 수 있어요.</div>
        </div>
        <div class="sl-ctrl-btns">
          <button class="btn-p" data-action="sl-pick" data-id="${esc(deck.id)}">이번 시간에 열기</button>
        </div>
      </div>
      <div class="sl-stage tc"><img class="sl-img" src="${esc((imgs.find(im=>!_isGame(im))||imgs[0]).url)}" alt=""/></div>
      <div class="sl-thumbs">${thumbs}</div>
    </div>`;
  }

  const page = _clampPage(live.page);
  const thumbs = imgs.map((im, i) => `
    <button class="sl-thumb${i === page ? ' on' : ''}${_isGame(im) ? ' game' : ''}" data-action="sl-go" data-i="${i}">
      ${_isGame(im) ? '<span class="sl-thumb-game">실습</span>' : `<img src="${esc(im.url)}" alt=""/>`}
      <span>${i + 1}</span>
    </button>`).join('');

  const control = `<div class="section">
    <div class="sl-ctrl-head">
      <div>
        <div class="sec-title" style="margin:0">${esc(deck.title || '수업자료')} · ${imgs.length}장</div>
        <div class="sl-ctrl-sub">${live.on
          ? '학생 화면이 지금 이 장을 따라오고 있습니다.'
          : '학생 홈에 이 자료가 떠 있습니다. 같이 보기를 켜면 모든 학생 화면이 이 장으로 맞춰집니다.'}</div>
      </div>
      <div class="sl-ctrl-btns">
        ${_isGame(imgs[page])
          ? `<button class="btn-xs btn-danger" data-action="sl-game-del">실습 장 빼기</button>`
          : `<button class="btn-xs" data-action="sl-game-add">＋ 이 다음에 실습 넣기</button>`}
        <button class="btn-sm" data-action="sl-present">🔳 발표 모드</button>
        <button class="${live.on ? 'btn-sm btn-danger' : 'btn-p'}" data-action="sl-toggle" data-on="${live.on ? '0' : '1'}">
          ${live.on ? '같이 보기 끝내기' : '같이 보기 시작'}
        </button>
      </div>
    </div>

    ${_isGame(imgs[page])
      ? `<div class="sl-stage tc game">${pwBoardForTeacher()}</div>`
      : `<div class="sl-stage tc"><img class="sl-img" src="${esc(imgs[page].url)}" alt=""/></div>`}
    <div class="sl-nav">
      <button class="sl-btn" data-action="sl-prev" ${page === 0 ? 'disabled' : ''}>← 이전</button>
      <span class="sl-page">${page + 1} / ${imgs.length}</span>
      <button class="sl-btn" data-action="sl-next" ${page === imgs.length - 1 ? 'disabled' : ''}>다음 →</button>
    </div>
    <div class="sl-hint">키보드 <b>←</b> <b>→</b> 로도 넘길 수 있어요</div>
    <div class="sl-thumbs">${thumbs}</div>
    ${_vTcSlideNotes(page)}
  </div>`;

  return back + control;
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

/* ═══════════════════════════════════════
   🔳 발표 모드 — 교실 화면에 띄우는 전체화면 (PPT 슬라이드쇼처럼)

   #root 를 다시 그려도 사라지지 않게 #modal-root 에 따로 올리고,
   페이지가 바뀔 때 _presentSync() 로 그림만 갈아끼웁니다.
     ← → PageUp/PageDown Space : 넘기기 (프리젠터 리모컨 포함)
     화면 왼쪽/오른쪽 클릭       : 이전/다음
     B                        : 검은 화면 (칠판 볼 때)
     ESC                      : 끝내기
═══════════════════════════════════════ */
let PRESENT_ON = false;
let _presentHideTimer = null;

function openPresent(){
  if(!_slideCount()) return;
  PRESENT_ON = true;
  const host = document.getElementById('modal-root');
  host.innerHTML = `
    <div class="pv" id="pv">
      <img class="pv-img" id="pv-img" src="" alt=""/>
      <div class="pv-game" id="pv-game"></div>
      <div class="pv-black" id="pv-black"></div>
      <div class="pv-bar" id="pv-bar">
        <button class="pv-btn" data-action="pv-prev">←</button>
        <span class="pv-page" id="pv-page"></span>
        <button class="pv-btn" data-action="pv-next">→</button>
        <span class="pv-sep"></span>
        <span class="pv-hint">← → 넘기기 · B 검은화면 · ESC 끝내기</span>
        <button class="pv-btn pv-exit" data-action="pv-exit">끝내기</button>
      </div>
      <div class="pv-zone left"  data-action="pv-prev"></div>
      <div class="pv-zone right" data-action="pv-next"></div>
    </div>`;

  const pv = document.getElementById('pv');
  pv.requestFullscreen?.().catch(() => {});   // 실패해도 화면 전체를 덮는 오버레이라 사용 가능
  _presentSync();
  _pvPokeBar();

  pv.addEventListener('mousemove', _pvPokeBar);
  document.addEventListener('fullscreenchange', _pvOnFsChange);
}

function closePresent(){
  PRESENT_ON = false;
  clearInterval(_pvRankTimer); _pvRankTimer = null;
  document.removeEventListener('fullscreenchange', _pvOnFsChange);
  if(document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  document.getElementById('modal-root').innerHTML = '';
  render();
}

// 전체화면을 ESC·F11 로 빠져나가면 발표 모드도 함께 끝냄
function _pvOnFsChange(){
  if(!document.fullscreenElement && PRESENT_ON) closePresent();
}

// 페이지가 바뀌었을 때 그림만 교체 (오버레이는 그대로)
function _presentSync(){
  if(!PRESENT_ON) return;
  const imgs = _slideImgs();
  const page = _clampPage(SLIDE_LIVE?.page);
  const img  = document.getElementById('pv-img');
  const game = document.getElementById('pv-game');
  const label = document.getElementById('pv-page');
  const isGame = _isGame(imgs[page]);

  if(img)  img.style.display  = isGame ? 'none' : '';
  if(game){
    game.style.display = isGame ? 'flex' : 'none';
    // 실습 장에서는 순위판을 띄우고 3초마다 갱신 — 앞에서 순위가 오르내리는 게 보이게
    if(isGame){ game.innerHTML = pwBoardForTeacher(); _pvRankPoll(true); }
    else _pvRankPoll(false);
  }
  if(!isGame && img && imgs[page]) img.src = imgs[page].url;
  if(label) label.textContent = `${page + 1} / ${imgs.length}`;
}

// 발표 중 실습 장에서만 도는 순위 갱신 타이머
let _pvRankTimer = null;
function _pvRankPoll(on){
  clearInterval(_pvRankTimer); _pvRankTimer = null;
  if(!on || !TC_CLS) return;
  const tick = async () => {
    const all = await loadGameScores(TC_CLS.id);
    PW_RANK = Object.entries(all).map(([n, v]) => ({ num: n, name: v.name, best: v.best || 0 }))
      .sort((a, b) => b.best - a.best);
    const g = document.getElementById('pv-game');
    if(g && PRESENT_ON) g.innerHTML = pwBoardForTeacher();
  };
  tick();
  _pvRankTimer = setInterval(tick, 3000);
}

// 조작 바는 2.5초 뒤 사라졌다가 마우스를 움직이면 다시 나옴
function _pvPokeBar(){
  const bar = document.getElementById('pv-bar');
  if(!bar) return;
  bar.classList.remove('hide');
  clearTimeout(_presentHideTimer);
  _presentHideTimer = setTimeout(() => bar.classList.add('hide'), 2500);
}

function _pvToggleBlack(){
  document.getElementById('pv-black')?.classList.toggle('on');
}
