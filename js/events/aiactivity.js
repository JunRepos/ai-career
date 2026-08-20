/* ═══════════════════════════════════════
   events/aiactivity.js — AI 학습지 이벤트
═══════════════════════════════════════ */

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const act = el.dataset.action;

  // 선생님: 학습지를 학생에게 보내기 / 숨기기
  if(act === 'aia-toggle-open'){
    if(!TC_CLS) return;
    await setActivityOpen(TC_CLS.id, el.dataset.aid, el.dataset.on === '1');
    render(); return;
  }

  /* 기본 학습지 빼기/되돌리기 — 코드에 있는 것이라 지울 수는 없고
     '이 반에서 안 쓴다' 고만 표시합니다. 학생 답안은 그대로 둡니다. */
  if(act === 'aia-hide'){
    if(!TC_CLS) return;
    if(!confirm(`"${el.dataset.title}" 을(를) 이 반 목록에서 뺄까요?\n\n`
      + `· 학생 화면에서도 내려갑니다\n`
      + `· 학생들이 쓴 답안은 지워지지 않습니다\n`
      + `· 아래 '목록에서 뺀 학습지' 에서 언제든 되돌릴 수 있습니다`)) return;
    await setActivityHidden(TC_CLS.id, el.dataset.aid, true);
    toast('목록에서 뺐습니다.', 'ok');
    render(); return;
  }
  if(act === 'aia-unhide'){
    if(!TC_CLS) return;
    await setActivityHidden(TC_CLS.id, el.dataset.aid, false);
    toast('목록으로 되돌렸습니다.', 'ok');
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
  /* 기본 학습지 복제 — 코드에 박아둔 것은 못 고치니 복사본을 만들어 고칩니다.
     저장은 아직 안 하고 편집 화면만 엽니다(저장을 눌러야 실제로 생깁니다). */
  if(act === 'aia-clone'){
    const a = aiaById(el.dataset.aid);
    if(!a) return;
    AIA_EDIT = 'new';
    /* 문항 id 를 새로 뽑습니다 — 원본 학습지의 학생 답안과 섞이지 않게.
       이때 표의 '자동 채우기'(fillFrom)가 옛 id 를 가리킨 채 남으면
       복사본에서 자동 채우기가 조용히 안 먹습니다. 같이 갈아끼웁니다. */
    const idMap = {};
    const cloned = (a.questions || []).map(q => {
      const nid = 'q' + genId();
      idMap[q.id] = nid;
      return { ...q, id: nid };
    });
    cloned.forEach(q => {
      if(q.fillFrom) q.fillFrom = q.fillFrom.map(f => idMap[f]).filter(Boolean);
    });

    AIA_DRAFT = {
      title: (a.title || '') + ' (복사본)',
      subtitle: a.subtitle || '',
      intro: a.intro || '',
      questions: cloned,
    };
    render();
    toast('복사본을 만들었습니다. 고친 뒤 저장을 누르세요.', 'ok');
    return;
  }
  if(act === 'qb-add'){
    AIA_DRAFT.questions.push({ id: 'q' + genId(), type: 'text', text: '', rows: 3 });
    render(); return;
  }
  // 문항 유형 바꾸기 — 유형이 바뀌면 안 쓰는 설정은 정리합니다
  if(act === 'qb-type'){
    const q = AIA_DRAFT?.questions[+el.dataset.i];
    if(!q) return;
    const t = el.dataset.t;
    q.type = t;
    if(t === 'check' && !q.options) q.options = [];
    if(t === 'table'){
      if(!q.cols || !Array.isArray(q.cols)) q.cols = [];
      if(q.extra === undefined) q.extra = 3;
    } else if(t === 'check'){
      if(typeof q.cols !== 'number') q.cols = 2;   // check 의 cols 는 '몇 칸으로 배치'
    }
    if(t === 'text' && !q.rows) q.rows = 3;
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
    // 유형별로 꼭 있어야 하는 것 — 없으면 학생 화면이 빈 칸으로 보입니다
    const badCheck = qs.find(q => q.type === 'check' && !(q.options || []).length);
    if(badCheck){ if(err) err.textContent = `"${badCheck.text.slice(0,14)}" — 체크박스 문항에 보기를 한 줄에 하나씩 적어주세요.`; return; }
    const badTable = qs.find(q => q.type === 'table' && !(q.cols || []).length);
    if(badTable){ if(err) err.textContent = `"${badTable.text.slice(0,14)}" — 표 문항에 열 이름을 쉼표로 적어주세요.`; return; }

    AIA_SAVING = 'edit'; render();
    try {
      const actId = AIA_EDIT === 'new' ? 'act' + genId() : AIA_EDIT;
      const payload = {
        title: d.title.trim(),
        subtitle: (d.subtitle || '').trim() || '학습지',
        intro: (d.intro || '').trim(),
        createdAt: new Date().toISOString(),
        questions: Object.fromEntries(qs.map((q, i) => {
          const t = q.type || 'text';
          const o = { text: q.text.trim(), order: i };
          if(t !== 'text') o.type = t;
          if((q.desc || '').trim()) o.desc = q.desc.trim();
          if(t === 'text')  o.rows = q.rows || 3;
          if(t === 'note' && (q.url || '').trim()) o.url = q.url.trim();
          if(t === 'check'){ o.options = q.options || []; o.cols = q.cols || 2; }
          if(t === 'table'){
            o.cols = q.cols || [];
            if((q.fixed || []).length) o.fixed = q.fixed;
            o.extra = (q.extra === undefined) ? 3 : q.extra;
            if((q.fillFrom || []).length) o.fillFrom = q.fillFrom;
          }
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
    if(!confirm(`"${el.dataset.title}" 학습지를 삭제할까요?\n\n`
      + `⚠ 학생들이 쓴 답안까지 함께 지워집니다. 되돌릴 수 없습니다.\n`
      + `단원 구성에 걸어두셨다면 그 자리는 '지운 학습지' 로 바뀝니다.`)) return;
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
    ST_TAB = 'aia';        // 홈 바로가기로 들어와도 학습지 탭으로 맞춰줌
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
      toast(`AI 학습지를 ${on ? '📖 열었어요' : '🔒 닫았어요'}.`, 'ok');
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
/* ── 학습지 만들기 — 입력은 다시 그리지 않고 초안에만 반영(커서 유지) ── */
document.addEventListener('input', e => {
  const el = e.target.closest('[data-action="qb-meta"], [data-action="qb-text"], [data-action="qb-field"]');
  if(!el || !AIA_DRAFT) return;
  if(el.dataset.action === 'qb-meta'){
    AIA_DRAFT[el.dataset.k] = el.value;
    return;
  }
  const q = AIA_DRAFT.questions[+el.dataset.i];
  if(!q) return;
  if(el.dataset.action === 'qb-text'){ q.text = el.value; return; }

  // 유형별 입력칸 — 화면을 다시 그리지 않아 커서가 튀지 않습니다
  const k = el.dataset.k;
  if(k === '_options'){
    q.options = el.value.split('\n').map(s => s.trim()).filter(Boolean);
  } else if(k === '_cols'){
    q.cols = el.value.split(',').map(s => s.trim()).filter(Boolean);
  } else if(k === '_fixed'){
    q.fixed = el.value.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    q[k] = el.value;     // desc, url
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
  // 체크박스 배치 칸 수
  const colSel = e.target.closest('[data-action="qb-cols"]');
  if(colSel && AIA_DRAFT){
    const q = AIA_DRAFT.questions[+colSel.dataset.i];
    if(q) q.cols = +colSel.value;
    return;
  }
  // 표 빈 줄 수
  const exSel = e.target.closest('[data-action="qb-extra"]');
  if(exSel && AIA_DRAFT){
    const q = AIA_DRAFT.questions[+exSel.dataset.i];
    if(q) q.extra = +exSel.value;
    return;
  }
  // 표 자동 채우기 — 앞선 체크박스 문항에서 고른 보기를 첫 칸에
  const ffSel = e.target.closest('[data-action="qb-fillfrom"]');
  if(ffSel && AIA_DRAFT){
    const q = AIA_DRAFT.questions[+ffSel.dataset.i];
    if(q) q.fillFrom = ffSel.value ? [ffSel.value] : [];
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
  a.download = `AI학습지_${act.id}_${TC_CLS.id}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('CSV 내보내기 완료', 'ok');
}
