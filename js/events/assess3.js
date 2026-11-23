/* ═══════════════════════════════════════
   events/assess3.js — 📝 3차 수행평가 이벤트
   학생: 준비 칸 입력(칸 단위 자동 저장) · 붙여넣기 막기
   선생님: 단계 여닫기 · 결석자 따로 열기 · 준비 내용 보기
═══════════════════════════════════════ */

/* ─── 학생 저장 — 바뀐 칸만 보냅니다 ─── */
async function a3SaveNow(silent, force){
  if(!SEL_CLS || !ST_USER || !A3_READY) return false;
  if(A3_SAVING){ A3_PENDING = true; return false; }
  if(A3_SAVE_TIMER){ clearTimeout(A3_SAVE_TIMER); A3_SAVE_TIMER = null; }
  if(!A3_TOUCHED.size){ A3_DIRTY = false; a3PaintStatus(); return true; }
  // 단계가 닫힌 뒤에 남아 있던 입력은 보내지 않습니다 (준비 시간 끝 = 종이를 걷은 것)
  if(!force && !_a3CanPrep(SEL_CLS.id)){ A3_TOUCHED.clear(); A3_DIRTY = false; a3PaintStatus(); return false; }
  const fids = [...A3_TOUCHED];
  A3_TOUCHED.clear();
  const now = new Date().toISOString();
  const upd = { prepAt: now, name: ST_USER.name || '' };
  fids.forEach(f => { upd['prep/' + f] = String(A3_ANS[f] == null ? '' : A3_ANS[f]).slice(0, A3.prepMax); });
  A3_SAVING = true; a3PaintStatus();
  try {
    await withTimeout(_a3Ref(SEL_CLS.id, ST_USER.number).update(upd), 10000, '저장');
    A3_DOC = A3_DOC || {};
    A3_DOC.prep = { ...(A3_DOC.prep || {}) };
    fids.forEach(f => { A3_DOC.prep[f] = upd['prep/' + f]; });
    A3_DOC.prepAt = now;
    A3_SAVE_ERR = '';
    if(!A3_TOUCHED.size) A3_DIRTY = false;
    if(!silent) toast('💾 저장했습니다', 'ok');
    return true;
  } catch(err){
    fids.forEach(f => A3_TOUCHED.add(f));
    A3_DIRTY = true;
    A3_SAVE_ERR = err.message || String(err);
    if(!silent) toast('저장 실패: ' + A3_SAVE_ERR, 'err');
    return false;
  } finally {
    A3_SAVING = false;
    a3PaintStatus();
    if(A3_PENDING){ A3_PENDING = false; if(A3_TOUCHED.size) a3QueueSave(); }
  }
}
function a3QueueSave(){
  if(A3_SAVE_TIMER) clearTimeout(A3_SAVE_TIMER);
  A3_SAVE_TIMER = setTimeout(() => { A3_SAVE_TIMER = null; a3SaveNow(true); }, 1500);
}

/* ─── 입력 ─── */
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('[data-a3fid]');
  if(!el || el.readOnly || el.disabled || !A3_READY) return;
  const fid = el.dataset.a3fid;
  if(el.value.length > A3.prepMax) el.value = el.value.slice(0, A3.prepMax);
  A3_ANS[fid] = el.value;
  A3_TOUCHED.add(fid);
  A3_DIRTY = true;
  const c = document.querySelector(`[data-a3count="${fid}"]`);
  if(c) c.textContent = `${el.value.length}/${A3.prepMax}자`;
  a3QueueSave();
  a3PaintStatus();
});
// 칸을 벗어나면 바로 저장
document.addEventListener('focusout', e => {
  if(e.target.closest && e.target.closest('[data-a3fid]') && A3_TOUCHED.size) a3SaveNow(true);
});
// 준비 칸에는 붙여넣기 · 끌어다 놓기를 받지 않습니다 (생성형 인공지능 답변 붙여넣기 방지)
function _a3NoPaste(t){ return !!(t && t.closest && t.closest('[data-a3fid]')); }
document.addEventListener('paste', e => {
  if(_a3NoPaste(e.target)){
    e.preventDefault();
    toast('붙여넣기를 할 수 없습니다. 직접 입력하세요.', 'err');
  }
}, true);
document.addEventListener('drop', e => { if(_a3NoPaste(e.target)) e.preventDefault(); }, true);
document.addEventListener('beforeinput', e => {
  if(_a3NoPaste(e.target) && /^insertFrom(Paste|Drop|PasteAsQuotation)/.test(e.inputType || '')) e.preventDefault();
}, true);
// 저장 안 된 입력이 있으면 창을 닫기 전에 묻습니다
window.addEventListener('beforeunload', e => {
  if(A3_DIRTY || A3_SAVING){ e.preventDefault(); e.returnValue = ''; }
});

/* ─── 클릭 ─── */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const act = el.dataset.action;
  if(act.indexOf('a3-') !== 0) return;

  if(act === 'a3-retry'){ A3_FOR = null; A3_LOAD_ERR = ''; render(); return; }
  if(act === 'a3-save'){ await a3SaveNow(false); return; }
  if(act === 'a3-choice'){
    if(el.disabled || !A3_READY) return;
    const fid = el.dataset.fid;
    A3_ANS[fid] = A3_ANS[fid] === el.dataset.val ? '' : el.dataset.val;   // 다시 누르면 고른 것을 풉니다
    A3_TOUCHED.add(fid); A3_DIRTY = true;
    a3RenderKeep();
    a3SaveNow(true);
    return;
  }

  /* 선생님 */
  if(act === 'a3-stage'){
    if(!TC_CLS) return;
    const stage = el.dataset.stage;
    if(!A3_STAGE_LABEL[stage] || stage === a3Stage(TC_CLS.id)) return;
    const msg = stage === 'prep'
      ? `${TC_CLS.label} 3차 수행평가를 「준비」로 열까요?\n학생 메뉴에 나타나고 준비 칸을 쓸 수 있게 됩니다.`
      : `${TC_CLS.label} 3차 수행평가를 닫을까요?\n학생은 준비 칸을 더 고칠 수 없게 됩니다.`;
    if(!confirm(msg)) return;
    try {
      await withTimeout(_a3OpenRef(TC_CLS.id).set(stage), 10000, '단계 저장');
      A3_OPEN[TC_CLS.id] = stage;
      toast(`3차 수행평가: ${A3_STAGE_LABEL[stage]}`, 'ok');
    } catch(err){ toast('바꾸지 못했습니다: ' + (err.message || err), 'err'); }
    render();
    return;
  }
  if(act === 'a3-extra'){
    if(!TC_CLS) return;
    const snum = el.dataset.snum, cid = TC_CLS.id;
    const on = !!(A3_EXTRA[cid] || {})[snum];
    if(!on && !confirm(`${snum} 학생만 준비 칸을 쓸 수 있게 따로 열까요?\n끝나면 다시 눌러 닫아 주세요.`)) return;
    try {
      await withTimeout(_a3ExtraRef(cid, snum).set(on ? null : true), 10000, '따로 열기 저장');
      toast(on ? `${snum} — 닫았습니다` : `${snum} — 따로 열었습니다`, 'ok');
    } catch(err){ toast('바꾸지 못했습니다: ' + (err.message || err), 'err'); }
    return;
  }
  if(act === 'a3-tc-view'){ A3_TC_SNUM = el.dataset.snum; A3_TC_VIEW = 'student'; render(); return; }
  if(act === 'a3-tc-back'){ A3_TC_VIEW = 'list'; A3_TC_SNUM = null; render(); return; }
});
