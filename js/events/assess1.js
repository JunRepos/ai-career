/* ═══════════════════════════════════════
   events/assess1.js — 📝 1차 수행평가 이벤트
   학생: 입력(칸 단위 자동 저장) · 저장 · 제출(서버에서 다시 읽어 확인)
   선생님: 작성 범위 · 답안 보기 · CSV
═══════════════════════════════════════ */

/* ─── 학생 저장 — 바뀐 칸만 보냅니다 ─── */
async function a1SaveNow(silent){
  if(!SEL_CLS || !ST_USER || !A1_READY) return false;
  if(A1_SAVING){ A1_PENDING = true; return false; }
  if(A1_SAVE_TIMER){ clearTimeout(A1_SAVE_TIMER); A1_SAVE_TIMER = null; }
  if(!A1_TOUCHED.size){ A1_DIRTY = false; a1PaintStatus(); return true; }
  const fids = [...A1_TOUCHED];
  A1_TOUCHED.clear();
  const now = new Date().toISOString();
  const upd = { updatedAt: now, name: ST_USER.name || '' };
  fids.forEach(f => { upd['answers/' + f] = A1_ANS[f] == null ? '' : String(A1_ANS[f]); });
  A1_SAVING = 'save'; a1PaintStatus();
  try {
    await withTimeout(_a1Ref(SEL_CLS.id, ST_USER.number).update(upd), 10000, '저장');
    A1_DOC = A1_DOC || {};
    A1_DOC.answers = { ...(A1_DOC.answers || {}) };
    fids.forEach(f => { A1_DOC.answers[f] = upd['answers/' + f]; });
    A1_DOC.updatedAt = now;
    A1_SAVE_ERR = '';
    if(!A1_TOUCHED.size) A1_DIRTY = false;
    if(!silent) toast('💾 저장했습니다', 'ok');
    return true;
  } catch(err){
    fids.forEach(f => A1_TOUCHED.add(f));
    A1_DIRTY = true;
    A1_SAVE_ERR = err.message || String(err);
    if(!silent) toast('저장 실패: ' + A1_SAVE_ERR, 'err');
    return false;
  } finally {
    A1_SAVING = null;
    a1PaintStatus();
    if(A1_PENDING){ A1_PENDING = false; if(A1_TOUCHED.size) a1QueueSave(); }
  }
}
function a1QueueSave(){
  if(A1_SAVE_TIMER) clearTimeout(A1_SAVE_TIMER);
  A1_SAVE_TIMER = setTimeout(() => { A1_SAVE_TIMER = null; a1SaveNow(true); }, 1500);
}

/* ─── 학생 제출 ─── */
async function a1Submit(){
  if(!SEL_CLS || !ST_USER || !A1_READY || A1_SAVING) return;
  const cid = SEL_CLS.id, snum = ST_USER.number;
  const open = _a1EditableNos(cid);
  const empty = [];
  A1.items.filter(it => open.includes(it.no)).forEach(it => it.fields.forEach(f => {
    if(!String(A1_ANS[f.id] || '').trim()) empty.push(`${it.no}번${f.label ? '(' + f.label + ')' : ''}`);
  }));
  const msg = (empty.length ? `비어 있는 칸이 있습니다: ${empty.join(', ')}\n\n` : '')
    + '지금까지 쓴 내용으로 제출할까요?\n제출한 뒤에도 작성 시간 안에는 고쳐서 다시 제출할 수 있습니다.';
  if(!confirm(msg)) return;

  // 1) 저장 안 된 칸부터 보냅니다 — 실패하면 제출하지 않습니다
  if(A1_TOUCHED.size){
    const ok = await a1SaveNow(true);
    if(!ok){ alert('저장이 되지 않아 제출하지 못했습니다.\n인터넷 연결을 확인하고 다시 [제출하기]를 누르세요.'); return; }
  }
  A1_SAVING = 'submit'; a1PaintStatus();
  const now = new Date().toISOString();
  const snap = {};
  _a1Fields().forEach(f => { snap[f.id] = A1_ANS[f.id] == null ? '' : String(A1_ANS[f.id]); });
  const ref = _a1Ref(cid, snum);
  try {
    await withTimeout(ref.update({ submitted: { answers: snap, at: now }, updatedAt: now, name: ST_USER.name || '' }), 10000, '제출');
    // 2) 서버에서 다시 읽어 같은지 확인한 다음에만 '제출 확인'
    const back = (await withTimeout(ref.get(), 10000, '제출 확인')).val();
    const ok = back && back.submitted && back.submitted.at === now
      && _a1Fields().every(f => String((back.submitted.answers || {})[f.id] || '') === snap[f.id]);
    if(!ok) throw new Error('서버에서 제출 내용을 확인하지 못했습니다');
    A1_DOC = back;
    A1_SAVE_ERR = '';
    toast('✅ 제출 확인 — 선생님 화면에 표시됩니다', 'ok');
  } catch(err){
    A1_SAVE_ERR = err.message || String(err);
    alert(`제출되지 않았습니다 (${A1_SAVE_ERR}).\n인터넷 연결을 확인하고 다시 [제출하기]를 누르세요.`);
  } finally {
    A1_SAVING = null;
    a1RenderKeep();
  }
}

/* ─── 입력 ─── */
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('[data-a1fid]');
  if(!el || el.readOnly || el.disabled || !A1_READY) return;
  const fid = el.dataset.a1fid;
  A1_ANS[fid] = el.value;
  A1_TOUCHED.add(fid);
  A1_DIRTY = true;
  const c = document.querySelector(`[data-a1count="${fid}"]`);
  if(c) c.textContent = el.value.length + '자';
  a1QueueSave();
  a1PaintStatus();
});
// 칸을 벗어나면 바로 저장
document.addEventListener('focusout', e => {
  if(e.target.closest && e.target.closest('[data-a1fid]') && A1_TOUCHED.size) a1SaveNow(true);
});
// 답안 칸에는 붙여넣기·끌어다 놓기를 받지 않습니다 (생성형 인공지능 답변 붙여넣기 방지)
document.addEventListener('paste', e => {
  if(e.target.closest && e.target.closest('[data-a1fid]')){
    e.preventDefault();
    toast('답안 칸에는 붙여넣기를 할 수 없습니다. 직접 입력하세요.', 'err');
  }
}, true);
document.addEventListener('beforeinput', e => {
  if(e.target.closest && e.target.closest('[data-a1fid]') && /^insertFrom(Paste|Drop|PasteAsQuotation)/.test(e.inputType || '')){
    e.preventDefault();
  }
}, true);
// 저장 안 된 입력이 있으면 창을 닫기 전에 묻습니다
window.addEventListener('beforeunload', e => {
  if(A1_DIRTY || A1_SAVING){ e.preventDefault(); e.returnValue = ''; }
});

/* ─── 클릭 ─── */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const act = el.dataset.action;
  if(act.indexOf('a1-') !== 0) return;

  if(act === 'a1-retry'){ A1_FOR = null; A1_LOAD_ERR = ''; render(); return; }
  if(act === 'a1-save'){ await a1SaveNow(false); return; }
  if(act === 'a1-submit'){ await a1Submit(); return; }
  if(act === 'a1-choice'){
    if(el.disabled || !A1_READY) return;
    const fid = el.dataset.fid;
    A1_ANS[fid] = el.dataset.val;
    A1_TOUCHED.add(fid); A1_DIRTY = true;
    a1RenderKeep();
    a1SaveNow(true);
    return;
  }

  /* 선생님 */
  if(act === 'a1-stage'){
    if(!TC_CLS) return;
    const stage = el.dataset.stage;
    if(!A1_STAGES[stage] || stage === a1Stage(TC_CLS.id)) return;
    if(!confirm(`${TC_CLS.label} 학생 작성 범위를 「${A1_STAGE_LABEL[stage]}」(으)로 바꿀까요?`)) return;
    try {
      await withTimeout(_a1OpenRef(TC_CLS.id).set(stage), 10000, '작성 범위 저장');
      A1_OPEN[TC_CLS.id] = stage;
      toast(`작성 범위: ${A1_STAGE_LABEL[stage]}`, 'ok');
    } catch(err){ toast('바꾸지 못했습니다: ' + (err.message || err), 'err'); }
    render();
    return;
  }
  if(act === 'a1-tc-view'){ A1_TC_SNUM = el.dataset.snum; A1_TC_VIEW = 'student'; render(); return; }
  if(act === 'a1-tc-back'){ A1_TC_VIEW = 'list'; A1_TC_SNUM = null; render(); return; }
  if(act === 'a1-tc-csv'){ _a1ExportCSV(); return; }
});

/* ─── CSV (제출본) ─── */
function _a1ExportCSV(){
  if(!TC_CLS || !A1_ALL) return;
  const cols = A1.items.flatMap(it => it.fields.map(f => [f.id, `${it.no}번${f.label ? ' ' + f.label : ''}`]));
  const rows = [['학번', '이름', '상태', '제출 시각', ...cols.map(c => c[1])]];
  const sts = [...STUDENTS].sort((a, b) => String(a.number).localeCompare(String(b.number)));
  for(const st of sts){
    const doc = A1_ALL[st.number];
    const ans = doc?.submitted?.answers || {};
    rows.push([st.number, st.name, _a1State(doc).label, doc?.submitted ? _a1Time(doc.submitted.at) : '',
               ...cols.map(c => ans[c[0]] || '')]);
  }
  const csv = '﻿' + rows.map(r => r.map(c => {
    const s = String(c == null ? '' : c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `1차수행평가_${TC_CLS.id}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
