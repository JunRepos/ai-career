/* ═══════════════════════════════════════
   events/guide.js — 대학 가이드북 화면의 클릭·체크 처리
═══════════════════════════════════════ */

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const act = el.dataset.action;

  if(act === 'gd-tab'){ GD_TAB = el.dataset.k; render(); return; }
  if(act === 'gd-univ'){ GD_ID = el.dataset.id; GD_TAB = 'what'; GD_CHECK = {}; GD_COL = ''; render(); return; }
  if(act === 'gd-scr'){ GD_SCR = el.dataset.k; render(); return; }
  if(act === 'gd-col'){ GD_COL = el.dataset.k; render(); return; }
  if(act === 'gd-case'){ GD_CASE = +el.dataset.i; render(); return; }
  if(act === 'gd-open'){ const k = el.dataset.k; GD_OPEN[k] = !GD_OPEN[k]; render(); return; }
});

// 체크리스트 — 화면에서만 세어 봅니다 (저장은 학습지에)
document.addEventListener('change', e => {
  const c = e.target.closest('[data-action="gd-check"]');
  if(!c) return;
  GD_CHECK[c.dataset.i] = c.checked;
  render();
});
