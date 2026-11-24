/* ═══════════════════════════════════════
   events/assess3.js — 📝 3차 수행평가 이벤트
   학생: 입력(쓰는 대로 자동 저장 · 저장한 시각 기록 · 제출 없음) · 붙여넣기 막기 · 사례 카드
   선생님: 단계 여닫기 · 결석자 따로 열기 · 답안 보기
═══════════════════════════════════════ */

/* ─── 학생 저장 — 바뀐 칸만 보냅니다 ─── */
async function a3SaveNow(silent, force){
  if(!SEL_CLS || !ST_USER || !A3_READY) return false;
  if(A3_SAVING){ A3_PENDING = true; return false; }
  if(A3_SAVE_TIMER){ clearTimeout(A3_SAVE_TIMER); A3_SAVE_TIMER = null; }
  if(!A3_TOUCHED.size){ A3_DIRTY = false; a3PaintStatus(); return true; }
  // 단계가 닫힌 뒤에 남아 있던 입력은 보내지 않습니다 (닫는 순간의 것만 force 로 보냄)
  if(!force && !_a3CanWrite(SEL_CLS.id)){ A3_TOUCHED.clear(); A3_DIRTY = false; a3PaintStatus(); return false; }
  const fids = [...A3_TOUCHED];
  A3_TOUCHED.clear();
  const now = new Date().toISOString();
  const upd = { updatedAt: now, name: ST_USER.name || '' };
  // 저장한 시각 기록 — 분마다 한 줄, 값은 서버 시각 (학생 컴퓨터의 시계를 믿지 않음)
  const _d = new Date(), _p = n => String(n).padStart(2, '0');
  const _sv = (window.firebase && firebase.database && firebase.database.ServerValue) ? firebase.database.ServerValue.TIMESTAMP : Date.now();
  upd[`log/${_d.getFullYear()}${_p(_d.getMonth() + 1)}${_p(_d.getDate())}-${_p(_d.getHours())}${_p(_d.getMinutes())}`] = _sv;
  fids.forEach(f => { upd['answers/' + f] = A3_ANS[f] == null ? '' : String(A3_ANS[f]); });
  A3_SAVING = 'save'; a3PaintStatus();
  try {
    await withTimeout(_a3Ref(SEL_CLS.id, ST_USER.number).update(upd), 10000, '저장');
    A3_DOC = A3_DOC || {};
    A3_DOC.answers = { ...(A3_DOC.answers || {}) };
    fids.forEach(f => { A3_DOC.answers[f] = upd['answers/' + f]; });
    A3_DOC.updatedAt = now;
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
    A3_SAVING = null;
    a3PaintStatus();
    if(A3_PENDING){ A3_PENDING = false; if(A3_TOUCHED.size) a3QueueSave(); }
  }
}
function a3QueueSave(){
  if(A3_SAVE_TIMER) clearTimeout(A3_SAVE_TIMER);
  A3_SAVE_TIMER = setTimeout(() => { A3_SAVE_TIMER = null; a3SaveNow(true); }, 1000);
}

/* ─── 입장 비밀번호 ─── */
async function a3GateSubmit(){
  if(A3_GATE_BUSY || !SEL_CLS) return;
  const pw = (document.getElementById('a3-gate-pw')?.value || '').trim();
  if(!pw){ A3_GATE_ERR = '비밀번호를 입력하세요.'; render(); return; }
  A3_GATE_BUSY = true; A3_GATE_ERR = ''; render();
  let ok = false;
  try { ok = await nbPwCheck(SEL_CLS.id, A3_PW_ID, pw); }
  catch(err){ A3_GATE_ERR = '확인하지 못했습니다 — ' + (err.message || err); }
  if(!ok) await new Promise(r => setTimeout(r, 800));   // 마구 넣어 보기 늦추기
  A3_GATE_BUSY = false;
  if(ok) toast('🔓 입장했습니다', 'ok');
  else if(!A3_GATE_ERR) A3_GATE_ERR = '비밀번호가 맞지 않습니다.';
  render();
  if(ok) a3Grow(); else setTimeout(() => document.getElementById('a3-gate-pw')?.focus(), 0);
}
document.addEventListener('keydown', e => {
  if(e.key === 'Enter' && e.target && e.target.id === 'a3-gate-pw'){ e.preventDefault(); a3GateSubmit(); }
});

/* ─── 입력 ─── */
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('[data-a3fid]');
  if(!el || el.readOnly || el.disabled || !A3_READY) return;
  const fid = el.dataset.a3fid;
  A3_ANS[fid] = el.value;
  A3_TOUCHED.add(fid);
  A3_DIRTY = true;
  if(el.tagName === 'TEXTAREA'){ el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; }
  a3QueueSave();
  a3PaintStatus();
});
// 칸을 벗어나면 바로 저장
document.addEventListener('focusout', e => {
  if(e.target.closest && e.target.closest('[data-a3fid]') && A3_TOUCHED.size) a3SaveNow(true);
});
// 답안 칸에는 붙여넣기 · 끌어다 놓기를 받지 않습니다 (생성형 인공지능 답변 붙여넣기 방지)
// 출처 URL 칸만은 붙여넣기를 받습니다 (2026-11-24)
function _a3NoPaste(t){ const el = t && t.closest && t.closest('[data-a3fid]'); return !!(el && !(_a3F(el.dataset.a3fid) || {}).paste); }
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
// Esc 로 사례 카드 팝업 닫기
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape' || !document.getElementById('a3-cards-ov')) return;
  if(A3_CARD_OPEN != null){ A3_CARD_OPEN = null; a3CardsRepaint(); } else a3CardsClose();
});
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

  /* 사례 카드 팝업 */
  if(act === 'a3-cards'){ a3CardsOpen(); return; }
  if(act === 'a3-cards-detail'){ a3CardsOpen(Number(el.dataset.i)); return; }
  if(act === 'a3-cards-f'){ A3_CARD_F = el.dataset.f; a3CardsRepaint(); return; }
  if(act === 'a3-cards-open'){
    if(e.target.closest('a')) return;                       // 기사 링크를 누른 것은 그대로 새 창
    A3_CARD_OPEN = Number(el.dataset.i); a3CardsRepaint();
    const m = document.querySelector('#a3-cards-ov .a1-cm'); if(m) m.scrollTop = 0;
    return;
  }
  if(act === 'a3-cards-back'){ A3_CARD_OPEN = null; a3CardsRepaint(); return; }
  if(act === 'a3-cards-close'){
    if(el.id === 'a3-cards-ov' && e.target !== el) return;   // 팝업 안쪽(카드 · 기사 링크)을 누른 것은 닫지 않음
    a3CardsClose(); return;
  }
  if(act === 'a3-cards-pick'){
    const c = A3_CARDS.cards[Number(el.dataset.i)];
    if(!c || !SEL_CLS || !A3_READY || !_a3CanWrite(SEL_CLS.id)) return;
    const text = `${c.title} (${c.src})`;
    if(String(A3_ANS.case || '').trim() && A3_ANS.case !== text
       && !confirm(`「활용 사례」 칸에 이미 쓴 내용이 있습니다.\n「${c.title}」(으)로 바꿀까요?`)) return;
    A3_ANS.case = text; A3_ANS.src = '선생님이 제시한 사례';
    A3_TOUCHED.add('case'); A3_TOUCHED.add('src'); A3_DIRTY = true;
    a3CardsClose();
    a3RenderKeep();
    a3SaveNow(true);
    toast(`「${c.title}」 — 1번의 활용 사례 칸에 넣었습니다`, 'ok');
    return;
  }

  if(act === 'a3-gate'){ await a3GateSubmit(); return; }

  /* 선생님 */
  if(act === 'a3-set-pw'){
    const cid = TC_CLS?.id; if(!cid) return;
    const has = nbHasPw(cid, A3_PW_ID);
    const pw = prompt(has
      ? `${TC_CLS.label} — 새 비밀번호를 넣으세요. (비우고 확인하면 비밀번호를 없앱니다)`
      : `${TC_CLS.label} — 학생이 들어올 때 넣을 비밀번호를 정하세요.`);
    if(pw === null) return;
    const v = pw.trim();
    if(v && v.length < 4){ alert('4자 이상으로 해 주세요.'); return; }
    if(!v && !confirm('비밀번호를 없앱니다. 「작성」으로 열려 있으면 학생이 바로 들어옵니다.\n괜찮습니까?')) return;
    try { await nbSetPw(cid, A3_PW_ID, v); }
    catch(err){ alert('정하지 못했습니다 — ' + (err.message || err)); return; }
    alert(v ? '비밀번호를 정했습니다. 수업 때 학생에게 알려 주세요.' : '비밀번호를 없앴습니다.');
    render();
    return;
  }
  if(act === 'a3-stage'){
    if(!TC_CLS) return;
    const stage = el.dataset.stage;
    if(!A3_STAGE_LABEL[stage] || stage === a3Stage(TC_CLS.id)) return;
    const msg = stage === 'open'
      ? `${TC_CLS.label} 3차 수행평가를 「작성」으로 열까요?\n학생 메뉴에 나타나고 답안을 쓸 수 있게 됩니다.`
      : `${TC_CLS.label} 3차 수행평가를 닫을까요?\n학생은 답안을 더 고칠 수 없게 됩니다. 쓴 글은 남아 있습니다.`;
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
    if(!on && !confirm(`${snum} 학생만 답안을 쓸 수 있게 따로 열까요?\n끝나면 다시 눌러 닫아 주세요.`)) return;
    try {
      await withTimeout(_a3ExtraRef(cid, snum).set(on ? null : true), 10000, '따로 열기 저장');
      toast(on ? `${snum} — 닫았습니다` : `${snum} — 따로 열었습니다`, 'ok');
    } catch(err){ toast('바꾸지 못했습니다: ' + (err.message || err), 'err'); }
    return;
  }
  if(act === 'a3-tc-view'){ A3_TC_SNUM = el.dataset.snum; A3_TC_VIEW = 'student'; render(); a3Grow(); return; }
  if(act === 'a3-tc-back'){ A3_TC_VIEW = 'list'; A3_TC_SNUM = null; render(); return; }
});
