/* ═══════════════════════════════════════
   events/slides.js — 🖥️ 수업자료 슬라이드 이벤트
═══════════════════════════════════════ */

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const act = el.dataset.action;

  // ── 넘기기 (선생님이면 모두에게, 학생이면 나만) ──
  if(act === 'sl-prev' || act === 'sl-next'){
    const d = act === 'sl-next' ? 1 : -1;
    if(IS_TC && TC_CLS){
      const p = _clampPage((SLIDE_LIVE?.page || 0) + d);
      await setLive(TC_CLS.id, { page: p });
      _presentSync();
      presenterSync();
      render();
    } else {
      const base = (SLIDE_FOLLOW && SLIDE_LIVE?.on) ? (SLIDE_LIVE.page || 0) : SLIDE_MYPAGE;
      SLIDE_MYPAGE = _clampPage(base + d);
      SLIDE_FOLLOW = false;          // 혼자 보기로 전환
      render();
    }
    return;
  }

  // 실습(게임) 시작 / 되돌아가기
  if(act === 'pw-start'){ pwStart(); return; }
  if(act === 'pw-hit'){ pwHit(+el.dataset.i); return; }
  if(act === 'p8-start'){ p8Start(); return; }
  if(act === 'p8-move'){ p8Move(+el.dataset.n); return; }
  if(act === 'mz-start'){ mzStart(); render(); return; }
  if(act === 'mz-spot'){ mzSpot(el.dataset.id); return; }
  if(act === 'mz-next'){ mzNext(); return; }

  // 선생님: 지금 장 다음에 실습 슬라이드 끼워 넣기 / 빼기
  if(act === 'sl-game-add' && TC_CLS && SLIDE_DECK){
    const imgs = _slideImgs().slice();
    const at = _clampPage(SLIDE_LIVE?.page) + 1;
    const gid = el.dataset.gameid || 'plant-water';
    imgs.splice(at, 0, { type: 'game', gameId: gid, name: '실습 — ' + gameDef(gid).label });
    await saveDeck(TC_CLS.id, { ...SLIDE_DECK, images: imgs, updatedAt: new Date().toISOString() });
    await setLive(TC_CLS.id, { page: at });
    _presentSync(); render(); return;
  }
  if(act === 'sl-game-del' && TC_CLS && SLIDE_DECK){
    const imgs = _slideImgs().slice();
    const at = _clampPage(SLIDE_LIVE?.page);
    if(!_isGame(imgs[at])) return;
    imgs.splice(at, 1);
    await saveDeck(TC_CLS.id, { ...SLIDE_DECK, images: imgs, updatedAt: new Date().toISOString() });
    await setLive(TC_CLS.id, { page: Math.max(0, at - 1) });
    _presentSync(); render(); return;
  }

  // 발표 모드 (교실 화면에 크게)
  if(act === 'sl-present'){ openPresent(); return; }
  if(act === 'pv-exit'){ closePresent(); return; }
  if(act === 'pv-nexttoggle'){ _pvToggleNext(); return; }
  if(act === 'sl-presenter'){ openPresenter(); return; }
  if(act === 'pv-prev' || act === 'pv-next'){
    if(!TC_CLS) return;
    const d = act === 'pv-next' ? 1 : -1;
    await setLive(TC_CLS.id, { page: _clampPage((SLIDE_LIVE?.page || 0) + d) });
    _presentSync(); presenterSync(); _pvPokeBar();
    return;
  }

  // 선생님: 썸네일로 바로 이동
  if(act === 'sl-go' && IS_TC && TC_CLS){
    await setLive(TC_CLS.id, { page: _clampPage(+el.dataset.i) });
    _presentSync(); presenterSync(); render(); return;
  }

  // 학생: 선생님 화면으로 복귀
  if(act === 'sl-follow'){
    SLIDE_FOLLOW = true; render(); return;
  }

  // 학생: 크게 보기
  if(act === 'sl-zoom'){ showImgModal(el.dataset.url, '슬라이드'); return; }

  // 선생님: 같이 보기 켜기/끄기
  if(act === 'sl-toggle' && TC_CLS){
    await setLive(TC_CLS.id, { on: el.dataset.on === '1' });
    render(); return;
  }

  // 학생: 홈 '이번 시간' 카드 → 수업자료로
  if(act === 'st-go-slides'){ setST('slides'); return; }

  // ── 선생님: 수업자료 목록 ↔ 자료 하나 ──
  if(act === 'sl-open' && IS_TC){
    SLIDE_TC_SEL = el.dataset.id;
    SLIDE_TC_NOTES = false;
    render();
    if(TC_CLS) loadTcSlideMemo(TC_CLS.id, el.dataset.id).then(render);
    return;
  }
  if(act === 'sl-back' && IS_TC){ SLIDE_TC_SEL = null; render(); return; }

  // 선생님: 이번 시간에 볼 자료 고르기 / 내리기
  if(act === 'sl-pick' && TC_CLS){
    await pickDeck(TC_CLS.id, el.dataset.id);
    SLIDE_TC_SEL = el.dataset.id;
    SLIDE_TC_NOTES = false;
    await loadAllNotes(TC_CLS.id);
    toast(`'${SLIDE_DECK?.title || '수업자료'}' 를 이번 시간 자료로 열었습니다.`, 'ok');
    render(); return;
  }
  if(act === 'sl-unpick' && TC_CLS){
    await setLive(TC_CLS.id, { on: false, page: 0, deckId: null });
    toast('학생 화면에서 수업자료를 내렸습니다.', 'ok');
    render(); return;
  }

  // 선생님: 자료 하나 삭제
  if(act === 'sl-delete' && TC_CLS){
    const id = el.dataset.id;
    const d = deckById(id);
    if(!confirm(`'${d?.title || '수업자료'}' 를 지울까요?\n슬라이드 그림과 학생 메모도 함께 지워집니다.`)) return;
    await deleteDeck(TC_CLS.id, id);
    if(SLIDE_TC_SEL === id) SLIDE_TC_SEL = null;
    toast('수업자료를 지웠습니다.', 'ok');
    render(); return;
  }

  // 선생님: 업로드
  if(act === 'sl-upload' && TC_CLS){
    const input = document.getElementById('sl-file');
    const err = document.getElementById('sl-err');
    const files = Array.from(input?.files || [])
      .filter(f => f.type.startsWith('image/'))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if(!files.length){ err.textContent = '슬라이드 이미지를 선택하세요.'; return; }

    SLIDE_UPLOADING = true;
    el.disabled = true; err.textContent = '';
    document.getElementById('sl-prog').style.display = 'block';
    const fill = document.getElementById('sl-pfill');
    const pct = document.getElementById('sl-pct');

    // 체크한 반 전부에 올립니다 (기본은 같은 과목 전체)
    const targets = getSelectedClasses('sl');
    const cids = targets.length ? targets : [TC_CLS.id];

    try {
      /* 예전 자료(deckId 없이 하나만 있던 것)를 열어둔 상태라면, 새 자료를 올리기 전에
         '지금 열린 자료'를 명시해 둡니다. 안 그러면 자료가 둘이 되는 순간
         무엇이 열린 것인지 알 수 없어져 학생 화면에서 조용히 사라집니다.

         ⚠ 올리는 반 전부에 해야 합니다. 지금 보고 있는 반만 고정하면, 다른 반은
           자료가 둘이 되는 순간 학생 화면에서 수업자료가 사라집니다.
           (2026-08-20 실제로 2D 가 이 상태였습니다) */
      for(const cid of cids){
        const liveSnap = await db.ref(`slides/${cid}/live`).get();
        const lv = liveSnap.exists() ? liveSnap.val() : null;
        if(!lv || lv.deckId) continue;                    // 이미 명시돼 있으면 둘 것

        const dSnap = await db.ref(`slides/${cid}/decks`).get();
        const ids = dSnap.exists() ? Object.keys(dSnap.val() || {}) : [];
        const hasLegacy = (await db.ref(`slides/${cid}/deck`).get()).exists();
        // 자료가 딱 하나였을 때만 '그 하나를 열어둔 것'으로 확정할 수 있습니다
        let only = null;
        if(ids.length === 1 && !hasLegacy) only = ids[0];
        else if(!ids.length && hasLegacy) only = LEGACY_DECK_ID;
        if(only) await db.ref(`slides/${cid}/live`).update({
          deckId: only, updatedAt: new Date().toISOString() });
      }
      if(!SLIDE_LIVE?.deckId && SLIDE_DECK?.id) SLIDE_LIVE = { ...SLIDE_LIVE, deckId: SLIDE_DECK.id };

      /* 자료를 새로 하나 더 만듭니다 — 이전 차시 자료는 그대로 남습니다.
         여러 반에 올려도 자료 id 는 하나로 통일합니다. 그래야 단원 구성에서
         이 자료를 걸어둘 때 두 반 모두 같은 항목으로 연결됩니다. */
      const deckId = genId();
      const title = (document.getElementById('sl-title')?.value || '').trim();
      const stamp = Date.now();
      const done = [];
      const failed = [];

      for(let c = 0; c < cids.length; c++){
        const cid = cids[c];
        const label = classById(cid)?.short || cid;
        const images = [];
        try {
          for(let i = 0; i < files.length; i++){
            // 반이 여러 개면 어느 반을 올리는 중인지 같이 보여줍니다
            pct.textContent = cids.length > 1
              ? `${label} ${i + 1}/${files.length} (${c + 1}/${cids.length}반)`
              : `${i + 1}/${files.length}`;
            const path = `slides/${cid}/${stamp}_${String(i).padStart(3, '0')}_${files[i].name}`;
            const url = await uploadFile(files[i], path, fill, null);
            images.push({ name: files[i].name, url, path });
          }
          await saveDeck(cid, {
            id: deckId,
            title: title || `수업자료 (${images.length}장)`,
            updatedAt: new Date().toISOString(),
            images,
          });
          done.push(label);
        } catch(e3){
          /* 한 반이 실패해도 나머지 반은 계속 올립니다.
             실패한 반의 조각 파일은 지웁니다 — 반쪽짜리 자료가 남으면
             나중에 뭐가 뭔지 모르고 저장 용량만 먹습니다. */
          console.warn(`[수업자료] ${label}반 업로드 실패:`, e3.message || e3);
          failed.push(`${label}(${e3.message || e3})`);
          pct.textContent = `${label}반 정리 중...`;
          for(const im of images){
            try { await storage.ref(im.path).delete(); } catch(e4){}
          }
        }
      }

      if(done.length){
        toast(`'${title || '수업자료'}' ${files.length}장을 ${done.join('·')}반에 올렸습니다.`
          + (failed.length ? ` (실패: ${failed.join(', ')})` : '')
          + ` 목록에서 '이번 시간에 열기'를 누르세요.`, done.length && !failed.length ? 'ok' : 'err');
      }
      if(failed.length){
        err.textContent = `올리지 못한 반이 있습니다 — ${failed.join(', ')}. `
          + `네트워크가 불안정할 수 있으니 그 반만 다시 올려주세요.`;
      }
    } catch(e2){
      err.textContent = '업로드 실패: ' + (e2.message || e2);
    }
    SLIDE_UPLOADING = false;
    render();
    return;
  }
});

/* 선생님: 키보드 ← → 로 넘기기 (입력 중일 때는 무시) */
document.addEventListener('keydown', async e => {
  const t = e.target;
  if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

  // 발표 모드에서 B — 검은 화면 (칠판 쓸 때 시선을 뺏지 않게)
  if(PRESENT_ON && (e.key === 'b' || e.key === 'B')){ e.preventDefault(); _pvToggleBlack(); return; }
  // N — 다음 장 미리보기 (발표자 보기)
  if(PRESENT_ON && (e.key === 'n' || e.key === 'N')){ e.preventDefault(); _pvToggleNext(); return; }

  // 프리젠터 리모컨은 보통 PageUp/PageDown 을 보냅니다
  const NEXT = ['ArrowRight', 'PageDown', ' ', 'Spacebar'];
  const PREV = ['ArrowLeft', 'PageUp'];
  if(!NEXT.includes(e.key) && !PREV.includes(e.key)) return;

  const onSlideTab = IS_TC ? (TC_TAB === 'slides') : (ST_TAB === 'slides');
  if((!onSlideTab && !PRESENT_ON) || !_slideCount()) return;
  e.preventDefault();
  const d = NEXT.includes(e.key) ? 1 : -1;
  if(IS_TC && TC_CLS){
    await setLive(TC_CLS.id, { page: _clampPage((SLIDE_LIVE?.page || 0) + d) });
    _presentSync(); presenterSync();
  } else {
    const base = (SLIDE_FOLLOW && SLIDE_LIVE?.on) ? (SLIDE_LIVE.page || 0) : SLIDE_MYPAGE;
    SLIDE_MYPAGE = _clampPage(base + d);
    SLIDE_FOLLOW = false;
  }
  if(!PRESENT_ON) render();      // 발표 중엔 뒤 화면을 다시 그릴 필요 없음
});

/* ── 메모 ─────────────────────────────────────────────────────
   자동 저장(1.5초). 선생님이 장을 넘기면 '넘어가기 전에' 즉시 저장해서
   쓰던 내용이 사라지지 않게 합니다. — _slFlushNote()
──────────────────────────────────────────────────────────── */
let _slPendingPage = null;

// 실습 장을 벗어나거나 들어올 때 정리
function _slSyncGame(prevPage, page){
  const imgs = _slideImgs();
  const was = _isGame(imgs[prevPage]), now = _isGame(imgs[page]);
  if(was && !now) gameLeaveAll();
  if(now && !was && !IS_TC) gameLoadRank(imgs[page].gameId);
}

function _slQueueNote(page){
  _slPendingPage = page;
  if(SLIDE_NOTE_TIMER) clearTimeout(SLIDE_NOTE_TIMER);
  SLIDE_NOTE_TIMER = setTimeout(() => _slFlushNote(), 1500);
}

async function _slFlushNote(){
  if(SLIDE_NOTE_TIMER){ clearTimeout(SLIDE_NOTE_TIMER); SLIDE_NOTE_TIMER = null; }
  if(_slPendingPage === null || !ST_USER || !SEL_CLS) return;
  const page = _slPendingPage;
  _slPendingPage = null;
  try { await saveNote(SEL_CLS.id, ST_USER.number, page, SLIDE_NOTES[page] || ''); }
  catch(e){ console.warn('[슬라이드] 메모 저장 실패:', e.message || e); }
}

// 입력 — 화면을 다시 그리지 않아 커서가 튀지 않습니다
document.addEventListener('input', e => {
  const el = e.target.closest('[data-action="sl-note"]');
  if(!el) return;
  SLIDE_NOTES[+el.dataset.page] = el.value;
  _slQueueNote(+el.dataset.page);
});

/* 선생님 대본 메모 — 본문에서 쓰든 발표자 창에서 쓰든 같은 곳에 저장됩니다.
   발표자 창이 열려 있으면 거기 글자도 같이 맞춰 줍니다. */
let _slMemoTimer = null, _slMemoPage = null;
document.addEventListener('input', e => {
  const el = e.target.closest('[data-action="sl-memo"]');
  if(!el || !TC_CLS) return;
  _slMemoPage = +el.dataset.page;
  SLIDE_TC_MEMO[_slMemoPage] = el.value;
  const w = PRESENTER_WIN;
  if(w && !w.closed){
    const m = w.document.getElementById('memo');
    if(m && w.document.activeElement !== m) m.value = el.value;
  }
  clearTimeout(_slMemoTimer);
  _slMemoTimer = setTimeout(async () => {
    const page = _slMemoPage; _slMemoPage = null;
    try { await saveTcSlideMemo(TC_CLS.id, curDeck()?.id, page, SLIDE_TC_MEMO[page] || ''); }
    catch(err){ console.warn('[슬라이드] 대본 저장 실패:', err.message || err); }
  }, 1200);
});

// 화면을 벗어나거나 창을 닫아도 저장 (수업 끝나고 바로 끄는 경우)
window.addEventListener('beforeunload', () => { _slFlushNote(); });
document.addEventListener('visibilitychange', () => { if(document.hidden) _slFlushNote(); });

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const act = el.dataset.action;

  if(act === 'sl-notes-all'){ await _slFlushNote(); SLIDE_SHOW_ALL = !SLIDE_SHOW_ALL; render(); return; }

  // 모아보기에서 그 장으로 이동 (혼자 보기로 전환)
  if(act === 'sl-goto'){
    SLIDE_MYPAGE = _clampPage(+el.dataset.i);
    SLIDE_FOLLOW = false; SLIDE_SHOW_ALL = false; render(); return;
  }

  // 메모 전체를 글로 복사 (복습·정리용)
  if(act === 'sl-copy-notes'){
    const imgs = _slideImgs();
    const lines = [`${curDeck()?.title || '수업자료'} — ${ST_USER?.name || ''} 메모`, ''];
    imgs.forEach((_, i) => {
      const t = (SLIDE_NOTES[i] || '').trim();
      if(t) lines.push(`${i + 1}장) ${t}`);
    });
    const text = lines.join('\n');
    try { await navigator.clipboard.writeText(text); el.textContent = '✓ 복사됨';
      setTimeout(() => { el.textContent = '📋 전체 복사'; }, 1600); }
    catch(e2){ prompt('복사해서 쓰세요', text); }
    return;
  }

  // 선생님: 이 장 메모 펼치기
  if(act === 'sl-tc-notes'){
    if(TC_CLS && !SLIDE_TC_NOTES) await loadAllNotes(TC_CLS.id);
    SLIDE_TC_NOTES = !SLIDE_TC_NOTES; render(); return;
  }
});
