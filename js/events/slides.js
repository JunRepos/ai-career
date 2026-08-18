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
  if(el.id === 'sl-upload' && TC_CLS){
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
