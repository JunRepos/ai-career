/* ═══════════════════════════════════════
   events/observe.js — ✍️ 관찰 기록 이벤트
   칸에 들어가면 오늘 날짜를 줄 앞에 붙이고, 나올 때 바뀐 칸만 저장합니다. 화면을 다시 그리지 않습니다.
═══════════════════════════════════════ */

function obGrow(t){ t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
/* 날짜만 붙고 아무것도 안 적힌 마지막 줄은 지웁니다 */
function obTrim(text){
  const lines = text.replace(/\s+$/, '').split('\n');
  while(lines.length && /^\s*\d{1,2}\/\d{1,2}\s*$/.test(lines[lines.length - 1])) lines.pop();
  return lines.join('\n').replace(/\s+$/, '');
}

async function obSave(t){
  const cid = t.dataset.obCid, key = t.dataset.obKey;
  const text = obTrim(t.value);
  if(t.value !== text){ t.value = text; obGrow(t); }
  const old = ((OB_NOTES[cid] || {})[key] || {}).text || '';
  if(text === old) return;
  const val = { text, at: new Date().toISOString() };
  t.classList.remove('saved', 'fail'); t.classList.add('saving');
  try {
    await withTimeout(_obRef(cid, key).set(val), 10000, '관찰 기록 저장');
    OB_NOTES[cid] = OB_NOTES[cid] || {};
    OB_NOTES[cid][key] = val;
    t.classList.remove('saving'); t.classList.add('saved');
    setTimeout(() => t.classList.remove('saved'), 1200);
  } catch(err){
    t.classList.remove('saving'); t.classList.add('fail');
    toast('저장 실패: ' + (err.message || err), 'err');
  }
}

document.addEventListener('focusin', e => {
  const t = e.target;
  if(!t || !t.matches || !t.matches('textarea[data-ob-key]')) return;
  const stamp = _obStamp();
  const lines = t.value.split('\n');
  const last = lines[lines.length - 1];
  if(last.indexOf(stamp) !== 0){                    // 오늘 줄이 아직 없으면 새 줄에 날짜를 붙입니다
    t.value = (t.value.replace(/\s+$/, '') ? t.value.replace(/\s+$/, '') + '\n' : '') + stamp;
  }
  obGrow(t);
  setTimeout(() => { t.selectionStart = t.selectionEnd = t.value.length; }, 0);
});
document.addEventListener('focusout', e => {
  const t = e.target;
  if(t && t.matches && t.matches('textarea[data-ob-key]')) obSave(t);
});
document.addEventListener('input', e => {
  const t = e.target;
  if(t && t.matches && t.matches('textarea[data-ob-key]')) obGrow(t);
});
/* Enter = 저장하고 칸에서 나옴. 줄을 바꾸려면 Shift+Enter */
document.addEventListener('keydown', e => {
  const t = e.target;
  if(e.key !== 'Enter' || e.shiftKey || e.isComposing || !t || !t.matches || !t.matches('textarea[data-ob-key]')) return;
  e.preventDefault();
  t.blur();
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action="ob-retry"]');
  if(!el) return;
  OB_ERR = ''; delete OB_NOTES[TC_CLS?.id]; render();
});
