/* ═══════════════════════════════════════
   events/scan.js — 📄 활동지 스캔 이벤트 (보기 전용 — 저장하는 것이 없습니다)
═══════════════════════════════════════ */

document.addEventListener('click', e => {
  if(typeof TC_TAB === 'undefined' || TC_TAB !== 'scan') return;
  const zoomBox = document.getElementById('sc-zoom');
  if(zoomBox && e.target.closest('#sc-zoom')){ zoomBox.remove(); return; }
  const v = e.target.closest('[data-sc-view]');
  if(v){ ESCAN_VIEW = v.dataset.scView; render(); return; }
  const s = e.target.closest('[data-sc-stu]');
  if(s){ ESCAN_CUR[TC_CLS.id] = s.dataset.scStu; render(); return; }
  if(e.target.closest('[data-sc-retry]')){ ESCAN_ERR = ''; render(); return; }
  const z = e.target.closest('[data-sc-zoom]');
  if(z){
    const box = document.createElement('div'); box.id = 'sc-zoom';
    const im = document.createElement('img'); im.src = z.dataset.scZoom; im.alt = '스캔본 크게 보기';
    box.appendChild(im); document.body.appendChild(box);
  }
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){ const z = document.getElementById('sc-zoom'); if(z) z.remove(); }
});
document.addEventListener('input', e => {
  if(e.target.id !== 'sc-q') return;
  ESCAN_Q = e.target.value.trim(); render();
  const q = document.getElementById('sc-q');
  if(q){ q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
});
