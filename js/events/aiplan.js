/* ═══════════════════════════════════════
   events/aiplan.js — 📅 진도 계획 이벤트
   칸을 고치고 나오면(change) 그 칸 하나만 저장합니다.
═══════════════════════════════════════ */

async function apSave(input){
  const cid = input.dataset.apCid, key = input.dataset.apKey;
  const text = input.value.trim();
  const val = { text, at: new Date().toISOString() };
  input.classList.remove('saved', 'fail');
  input.classList.add('saving');
  try {
    await withTimeout(_apRef(cid, key).set(val), 10000, '진도 저장');
    AP_EDITS[cid] = AP_EDITS[cid] || {};
    AP_EDITS[cid][key] = val;
    input.classList.remove('saving'); input.classList.add('saved');
    setTimeout(() => input.classList.remove('saved'), 1200);
  } catch(err){
    input.classList.remove('saving'); input.classList.add('fail');
    toast('저장 실패: ' + (err.message || err), 'err');
  }
}

document.addEventListener('change', e => {
  const t = e.target;
  if(t && t.matches && t.matches('input[data-ap-key]')) apSave(t);
});
document.addEventListener('keydown', e => {
  const t = e.target;
  if(e.key === 'Enter' && t && t.matches && t.matches('input[data-ap-key]')) t.blur();
});

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const act = el.dataset.action;
  if(act.indexOf('ap-') !== 0) return;
  if(act === 'ap-cls'){ AP_CLS = el.dataset.cid; render(); return; }
  if(act === 'ap-past'){ AP_PAST = !AP_PAST; render(); return; }
  if(act === 'ap-retry'){ AP_ERR = ''; delete AP_EDITS[AP_CLS]; render(); return; }
});
