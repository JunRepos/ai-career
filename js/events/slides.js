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
      render();
    } else {
      const base = (SLIDE_FOLLOW && SLIDE_LIVE?.on) ? (SLIDE_LIVE.page || 0) : SLIDE_MYPAGE;
      SLIDE_MYPAGE = _clampPage(base + d);
      SLIDE_FOLLOW = false;          // 혼자 보기로 전환
      render();
    }
    return;
  }

  // 선생님: 썸네일로 바로 이동
  if(act === 'sl-go' && IS_TC && TC_CLS){
    await setLive(TC_CLS.id, { page: _clampPage(+el.dataset.i) });
    render(); return;
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

  // 선생님: 전체 삭제
  if(act === 'sl-delete' && TC_CLS){
    if(!confirm('올린 슬라이드를 모두 지울까요?')) return;
    await deleteDeck(TC_CLS.id);
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

    try {
      // 이전 자료가 있으면 파일부터 정리 (스토리지에 쓰레기가 쌓이지 않게)
      if(SLIDE_DECK?.images) for(const im of SLIDE_DECK.images){
        if(im.path) await storage.ref(im.path).delete().catch(() => {});
      }
      const stamp = Date.now();
      const images = [];
      for(let i = 0; i < files.length; i++){
        pct.textContent = `${i + 1}/${files.length}`;
        const path = `slides/${TC_CLS.id}/${stamp}_${String(i).padStart(3, '0')}_${files[i].name}`;
        const url = await uploadFile(files[i], path, fill, null);
        images.push({ name: files[i].name, url, path });
      }
      await saveDeck(TC_CLS.id, {
        title: (document.getElementById('sl-title')?.value || '').trim(),
        updatedAt: new Date().toISOString(),
        images,
      });
      await setLive(TC_CLS.id, { on: false, page: 0 });
      toast(`슬라이드 ${images.length}장을 올렸습니다.`, 'ok');
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
  if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const t = e.target;
  if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  const onSlideTab = IS_TC ? (TC_TAB === 'slides') : (ST_TAB === 'slides');
  if(!onSlideTab || !_slideCount()) return;
  e.preventDefault();
  const d = e.key === 'ArrowRight' ? 1 : -1;
  if(IS_TC && TC_CLS){
    await setLive(TC_CLS.id, { page: _clampPage((SLIDE_LIVE?.page || 0) + d) });
  } else {
    const base = (SLIDE_FOLLOW && SLIDE_LIVE?.on) ? (SLIDE_LIVE.page || 0) : SLIDE_MYPAGE;
    SLIDE_MYPAGE = _clampPage(base + d);
    SLIDE_FOLLOW = false;
  }
  render();
});

/* ── 메모 ─────────────────────────────────────────────────────
   자동 저장(1.5초). 선생님이 장을 넘기면 '넘어가기 전에' 즉시 저장해서
   쓰던 내용이 사라지지 않게 합니다. — _slFlushNote()
──────────────────────────────────────────────────────────── */
let _slPendingPage = null;

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
    const lines = [`${SLIDE_DECK?.title || '수업자료'} — ${ST_USER?.name || ''} 메모`, ''];
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
