/* ═══════════════════════════════════════
   events/aiactivity.js — AI 활동지 이벤트
═══════════════════════════════════════ */

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const act = el.dataset.action;

  // 선생님: 활동지를 학생에게 보내기 / 숨기기
  if(act === 'aia-toggle-open'){
    if(!TC_CLS) return;
    await setActivityOpen(TC_CLS.id, el.dataset.aid, el.dataset.on === '1');
    render(); return;
  }

  /* ── 선생님: 만들기·수정 ── */
  if(act === 'aia-new'){
    AIA_EDIT = 'new';
    AIA_DRAFT = { title: '', subtitle: '', intro: '', questions: [] };
    render(); return;
  }
  if(act === 'aia-edit'){
    const a = aiaById(el.dataset.aid);
    if(!a) return;
    AIA_EDIT = a.id;
    AIA_DRAFT = {
      title: a.title || '', subtitle: a.subtitle || '', intro: a.intro || '',
      questions: (a.questions || []).map(q => ({ ...q })),
    };
    render(); return;
  }
  if(act === 'aia-edit-cancel'){
    AIA_EDIT = null; AIA_DRAFT = null; render(); return;
  }
  if(act === 'qb-add'){
    AIA_DRAFT.questions.push({ id: 'q' + genId(), text: '', rows: 3 });
    render(); return;
  }
  if(act === 'qb-del'){
    AIA_DRAFT.questions.splice(+el.dataset.i, 1);
    render(); return;
  }
  if(act === 'qb-move'){
    const i = +el.dataset.i, j = el.dataset.dir === 'up' ? i - 1 : i + 1;
    const q = AIA_DRAFT.questions;
    if(j < 0 || j >= q.length) return;
    [q[i], q[j]] = [q[j], q[i]];
    render(); return;
  }
  if(act === 'qb-img-del'){
    const q = AIA_DRAFT.questions[+el.dataset.i];
    if(q){ delete q.imageUrl; delete q.imagePath; }
    render(); return;
  }
  if(act === 'aia-edit-save'){
    if(!TC_CLS || !AIA_DRAFT || AIA_SAVING) return;
    const err = document.getElementById('qb-err');
    const d = AIA_DRAFT;
    if(!d.title.trim()){ if(err) err.textContent = '제목을 입력하세요.'; return; }
    const qs = d.questions.filter(q => (q.text || '').trim());
    if(!qs.length){ if(err) err.textContent = '문항을 한 개 이상 추가하세요.'; return; }

    AIA_SAVING = 'edit'; render();
    try {
      const actId = AIA_EDIT === 'new' ? 'act' + genId() : AIA_EDIT;
      const payload = {
        title: d.title.trim(),
        subtitle: (d.subtitle || '').trim() || '활동지',
        intro: (d.intro || '').trim(),
        createdAt: new Date().toISOString(),
        questions: Object.fromEntries(qs.map((q, i) => {
          const o = { text: q.text.trim(), rows: q.rows || 3, order: i };
          if(q.imageUrl){ o.imageUrl = q.imageUrl; o.imagePath = q.imagePath || ''; }
          return [q.id, o];
        })),
      };
      await saveCustomActivity(TC_CLS.id, actId, payload);
      await loadCustomActivities(TC_CLS.id);
      AIA_EDIT = null; AIA_DRAFT = null;
    } catch(e2){
      if(err) err.textContent = '저장 실패: ' + (e2.message || e2);
    }
    AIA_SAVING = false; render(); return;
  }
  if(act === 'aia-del'){
    if(!TC_CLS) return;
    if(!confirm(`"${el.dataset.title}" 활동지를 삭제할까요?\n학생들이 작성한 답안도 함께 지워집니다.`)) return;
    await deleteCustomActivity(TC_CLS.id, el.dataset.aid);
    await loadCustomActivities(TC_CLS.id);
    render(); return;
  }

  // 학생: 활동 선택
  if(act === 'aia-pick'){
    const aid = el.dataset.aid;
    const def = aiaById(aid);
    if(!def || !SEL_CLS || !ST_USER) return;
    AIA_SEL = def;
    AIA_ANSWERS = {};
    AIA_VIEW = 'do';
    ST_TAB = 'aia';        // 홈 바로가기로 들어와도 활동지 탭으로 맞춰줌
    AIA_SAVING = false;
    // 본인 답안 로드
    const sub = await loadAiaSubmission(SEL_CLS.id, def.id, ST_USER.number);
    AIA_SUB = sub;
    if(sub && sub.answers) AIA_ANSWERS = { ...sub.answers };
    render();
    return;
  }

  // 학생: 뒤로 (활동 목록)
  if(act === 'aia-back'){
    AIA_VIEW = 'list';
    AIA_SEL = null;
    AIA_ANSWERS = {};
    AIA_SUB = null;
    if(AIA_SAVE_TIMER){ clearTimeout(AIA_SAVE_TIMER); AIA_SAVE_TIMER = null; }
    render();
    return;
  }

  // 학생: 명시적 임시 저장 (제출 시각 변경 안 함)
  if(act === 'aia-save'){
    await _aiaSaveNow();
    return;
  }

  // 학생: 제출 (submittedAt 갱신)
  if(act === 'aia-submit'){
    if(!SEL_CLS || !ST_USER || !AIA_SEL) return;
    if(AIA_SAVING) return;
    // 작성된 답안이 있는지 확인 (다 빈 칸이면 제출 막기)
    const hasAny = (AIA_SEL.questions || []).filter(q => q.type !== 'note')
      .some(q => (aiaAnswerText(q, AIA_ANSWERS[q.id], AIA_ANSWERS) || '').trim());
    if(!hasAny){
      toast('아직 작성된 내용이 없어요. 한 칸이라도 채운 뒤 제출해주세요.', 'err');
      return;
    }
    const already = !!AIA_SUB?.submittedAt;
    if(!confirm(already ? '이미 제출했어요. 다시 제출할까요? (현재 작성된 내용으로 갱신됩니다)' : '지금 작성한 내용으로 제출할까요? (제출 후에도 수정 가능합니다)')) return;
    AIA_SAVING = 'submit';
    if(AIA_SAVE_TIMER){ clearTimeout(AIA_SAVE_TIMER); AIA_SAVE_TIMER = null; }
    render();
    try {
      const saved = await saveAiaSubmission(SEL_CLS.id, AIA_SEL.id, ST_USER.number, AIA_ANSWERS, { submit: true });
      AIA_SUB = saved;
      toast('📤 제출했어요!', 'ok');
    } catch(err){
      console.error(err);
      toast('제출 실패: ' + (err.message || err), 'err');
    } finally {
      AIA_SAVING = false;
      render();
    }
    return;
  }

  // 선생님: active 토글
  if(act === 'aia-set-active'){
    const on = el.dataset.on === '1';
    if(!TC_CLS) return;
    try {
      await setAiaActive(TC_CLS.id, on);
      toast(`AI 활동지를 ${on ? '📖 열었어요' : '🔒 닫았어요'}.`, 'ok');
      render();
    } catch(err){
      console.error(err);
      toast('토글 실패: ' + (err.message || err), 'err');
    }
    return;
  }

  // 선생님: 활동 선택
  if(act === 'aia-tc-pick'){
    const aid = el.dataset.aid;
    const def = aiaById(aid);
    if(!def || !TC_CLS) return;
    AIA_SEL = def;
    AIA_TC_SEL_SNUM = null;
    AIA_ALL_SUBS = await loadAllAiaSubmissions(TC_CLS.id, def.id);
    render();
    return;
  }

  // 선생님: 활동 선택 화면으로
  if(act === 'aia-tc-back'){
    AIA_SEL = null;
    AIA_TC_SEL_SNUM = null;
    AIA_ALL_SUBS = {};
    AIA_VIEW = 'list';
    render();
    return;
  }

  // 선생님: 학생 답안 보기
  if(act === 'aia-tc-view'){
    AIA_TC_SEL_SNUM = el.dataset.snum;
    AIA_VIEW = 'tcStudent';
    render();
    return;
  }

  // 선생님: 학생 목록으로 돌아가기
  if(act === 'aia-tc-back-list'){
    AIA_TC_SEL_SNUM = null;
    AIA_VIEW = 'list';
    render();
    return;
  }

  // 선생님: CSV 내보내기
  if(act === 'aia-export-csv'){
    _aiaExportCSV();
    return;
  }
});

// 학생: 입력 (debounce 자동 저장)
/* ── 활동지 만들기 — 입력은 다시 그리지 않고 초안에만 반영(커서 유지) ── */
document.addEventListener('input', e => {
  const el = e.target.closest('[data-action="qb-meta"], [data-action="qb-text"]');
  if(!el || !AIA_DRAFT) return;
  if(el.dataset.action === 'qb-meta'){
    AIA_DRAFT[el.dataset.k] = el.value;
  } else {
    const q = AIA_DRAFT.questions[+el.dataset.i];
    if(q) q.text = el.value;
  }
});

document.addEventListener('change', async e => {
  // 학생: 보기 고르기
  const chk = e.target.closest('[data-action="aia-check"]');
  if(chk){
    const fid = chk.dataset.fid;
    const cur = Array.isArray(AIA_ANSWERS[fid]) ? AIA_ANSWERS[fid] : [];
    AIA_ANSWERS[fid] = chk.checked
      ? [...cur, chk.value]
      : cur.filter(v => v !== chk.value);
    _aiaQueueSave();
    render();   // 고른 과목이 아래 표에 바로 들어가도록 다시 그림
    return;
  }
  // 답변 칸 줄 수
  const sel = e.target.closest('[data-action="qb-rows"]');
  if(sel && AIA_DRAFT){
    const q = AIA_DRAFT.questions[+sel.dataset.i];
    if(q) q.rows = +sel.value;
    return;
  }
  // 문항 이미지 업로드
  const img = e.target.closest('[data-action="qb-img"]');
  if(img && AIA_DRAFT && TC_CLS){
    const file = img.files?.[0];
    if(!file) return;
    const i = +img.dataset.i;
    const q = AIA_DRAFT.questions[i];
    if(!q) return;
    if(file.size > MAX_FILE_SIZE){ toast('이미지가 너무 큽니다 (50MB 이하).', 'err'); return; }
    q._uploading = true; render();
    try {
      const { url, path } = await uploadActivityImage(TC_CLS.id, file);
      q.imageUrl = url; q.imagePath = path;
    } catch(err2){
      toast('이미지 업로드 실패: ' + (err2.message || err2), 'err');
    }
    delete q._uploading;
    render();
  }
});

// 학생: 표 칸 입력
document.addEventListener('input', e => {
  const cell = e.target.closest('[data-action="aia-cell"]');
  if(!cell) return;
  const fid = cell.dataset.fid, r = cell.dataset.r, c = cell.dataset.c;
  if(!AIA_ANSWERS[fid] || typeof AIA_ANSWERS[fid] !== 'object' || Array.isArray(AIA_ANSWERS[fid])) AIA_ANSWERS[fid] = {};
  if(!AIA_ANSWERS[fid][r]) AIA_ANSWERS[fid][r] = {};
  AIA_ANSWERS[fid][r][c] = cell.value;
  _aiaQueueSave();
});

document.addEventListener('input', e => {
  const el = e.target.closest('[data-action="aia-input"]');
  if(!el) return;
  const fid = el.dataset.fid;
  if(!fid) return;
  AIA_ANSWERS[fid] = el.value;
  _aiaQueueSave();
});

// 자동 저장 예약 (1.5초 후) — 입력 중에는 저장하지 않음
function _aiaQueueSave(){
  if(AIA_SAVE_TIMER) clearTimeout(AIA_SAVE_TIMER);
  AIA_SAVE_TIMER = setTimeout(() => { _aiaSaveNow(true); }, 1500);
}

// 임시 저장 로직 (submittedAt 보존)
async function _aiaSaveNow(silent){
  if(!SEL_CLS || !ST_USER || !AIA_SEL) return;
  if(AIA_SAVING) return;
  AIA_SAVING = 'save';
  if(!silent) render();
  try {
    const saved = await saveAiaSubmission(SEL_CLS.id, AIA_SEL.id, ST_USER.number, AIA_ANSWERS);
    AIA_SUB = saved;  // { answers, updatedAt, submittedAt? }
    if(!silent) toast('💾 저장됐어요', 'ok');
  } catch(err){
    console.error(err);
    if(!silent) toast('저장 실패: ' + (err.message || err), 'err');
  } finally {
    AIA_SAVING = false;
    // 입력 중 포커스를 잃지 않도록 silent 저장은 렌더 생략
    if(!silent) render();
  }
}

// CSV 내보내기
function _aiaExportCSV(){
  if(!TC_CLS || !AIA_SEL) return;
  const act = AIA_SEL;
  const fieldIds = aiaFieldIds(act);
  // 헤더 라벨 = 문항 글
  const labels = {};
  (act.questions || []).forEach(q => { labels[q.id] = q.text; });
  const header = ['학번', '이름', ...fieldIds.map(fid => labels[fid] || fid), '제출시각', '마지막수정'];
  const rows = [header];
  for(const st of STUDENTS){
    const sub = AIA_ALL_SUBS[st.number];
    const ans = sub?.answers || {};
    const row = [st.number, st.name];
    for(const q of (act.questions || []).filter(x => x.type !== 'note')) row.push(aiaAnswerText(q, ans[q.id], ans));
    row.push(sub?.submittedAt ? fmtDt(sub.submittedAt) : '');
    row.push(sub?.updatedAt ? fmtDt(sub.updatedAt) : '');
    rows.push(row);
  }
  const csv = '﻿' + rows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AI활동지_${act.id}_${TC_CLS.id}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('CSV 내보내기 완료', 'ok');
}
