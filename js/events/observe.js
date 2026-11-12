/* ═══════════════════════════════════════
   events/observe.js — ✍️ 관찰 기록 이벤트
   학생을 누르면 고른 표시만 바꾸고(전체를 다시 그리지 않음), 「발표」·「학습 태도」를 누르면 한 건을 저장합니다.
═══════════════════════════════════════ */

async function obSave(kind){
  const cid = TC_CLS?.id; if(!cid) return;
  const students = Object.keys(OB_PICK).sort();
  const text = OB_TEXT.trim();
  if(!students.length && !text){ toast('학생을 고르거나 내용을 적어 주세요.', 'err'); return; }
  const now = Date.now();
  const old = OB_EDIT ? (OB_RECS[cid] || {})[OB_EDIT] : null;
  const rec = { date: OB_DATE, kind, topic: OB_TOPIC.trim(), stance: OB_STANCE.trim(), students, text,
                createdAt: (old && old.createdAt) || now, updatedAt: now };
  const id = OB_EDIT || _obRef(cid).push().key;
  try {
    await withTimeout(_obRef(cid, id).set(rec), 10000, '관찰 기록 저장');
    OB_RECS[cid] = OB_RECS[cid] || {};
    OB_RECS[cid][id] = rec;
    const who = students.length ? students.map(_obName).join(', ') : '학생 지정 없음';
    toast(`${OB_EDIT ? '고쳤습니다' : '저장했습니다'} · ${kind} · ${who}`);
    _obClearDock();
    render();
    const t = document.querySelector('input[data-ob="text"]'); if(t) t.focus();
  } catch(err){
    toast('저장 실패: ' + (err.message || err), 'err');
  }
}

async function obDelete(id){
  const cid = TC_CLS?.id; if(!cid) return;
  try {
    await withTimeout(_obRef(cid, id).remove(), 10000, '관찰 기록 지우기');
    if(OB_RECS[cid]) delete OB_RECS[cid][id];
    if(OB_EDIT === id) _obClearDock();
    OB_ASKDEL = null;
    toast('기록을 지웠습니다.');
    render();
  } catch(err){
    toast('지우기 실패: ' + (err.message || err), 'err');
  }
}

/* 입력칸 — 값만 받아 두고 다시 그리지 않습니다 (한글 조합이 끊기지 않게) */
document.addEventListener('input', e => {
  const t = e.target;
  if(!t || !t.dataset || !t.dataset.ob) return;
  if(t.dataset.ob === 'topic') OB_TOPIC = t.value;
  else if(t.dataset.ob === 'stance') OB_STANCE = t.value;
  else if(t.dataset.ob === 'text') OB_TEXT = t.value;
});
document.addEventListener('change', e => {
  const t = e.target;
  if(!t || !t.dataset || t.dataset.ob !== 'date') return;
  OB_DATE = t.value || _obToday();
  _obClearDock(); OB_ASKDEL = null; _obSyncTopic(TC_CLS?.id, true); render();
});
document.addEventListener('keydown', e => {
  const t = e.target;
  if(e.key === 'Enter' && !e.isComposing && t && t.dataset && t.dataset.ob === 'text'){ e.preventDefault(); obSave('발표'); }
});

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const act = el.dataset.action;
  if(act.indexOf('ob-') !== 0) return;
  const cid = TC_CLS?.id;
  if(act === 'ob-pick'){
    const num = el.dataset.num;
    if(OB_PICK[num]) delete OB_PICK[num]; else OB_PICK[num] = true;
    el.classList.toggle('on', !!OB_PICK[num]);
    obPaintSel();
    return;
  }
  if(act === 'ob-save'){ obSave(el.dataset.kind); return; }
  if(act === 'ob-cancel'){ _obClearDock(); render(); return; }
  if(act === 'ob-view'){ OB_VIEW = el.dataset.v; OB_STU = null; OB_ASKDEL = null; render(); return; }
  if(act === 'ob-day'){ OB_DATE = el.dataset.d; _obClearDock(); OB_ASKDEL = null; _obSyncTopic(cid, true); render(); return; }
  if(act === 'ob-stu'){ OB_STU = el.dataset.num; render(); return; }
  if(act === 'ob-stu-back'){ OB_STU = null; render(); return; }
  if(act === 'ob-retry'){ OB_ERR = ''; delete OB_RECS[cid]; render(); return; }
  if(act === 'ob-del'){ OB_ASKDEL = el.dataset.id; render(); return; }
  if(act === 'ob-del-no'){ OB_ASKDEL = null; render(); return; }
  if(act === 'ob-del-ok'){ obDelete(el.dataset.id); return; }
  if(act === 'ob-edit'){
    const r = (OB_RECS[cid] || {})[el.dataset.id]; if(!r) return;
    OB_EDIT = el.dataset.id; OB_VIEW = 'day'; OB_DATE = r.date;
    OB_PICK = {}; (r.students || []).forEach(n => { OB_PICK[n] = true; });
    OB_TOPIC = r.topic || ''; OB_STANCE = r.stance || ''; OB_TEXT = r.text || '';
    render();
    const t = document.querySelector('input[data-ob="text"]'); if(t) t.focus();
    return;
  }
});
