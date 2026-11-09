/* ═══════════════════════════════════════
   events/assess2.js — 📝 2차 수행평가 · 학생 답안 보기 (2026-11-05)

   선생님 — 「2차 수행평가 1차 때처럼 교사가 애들 답 볼 수 있게 해줘」.
   1차(events/assess1.js)와 같은 단추 짜임입니다 — 명단 ↔ 학생 하나 ↔ 내려받기.

   ⚠ 여기서는 **읽기만 합니다.** 학생 진도(notebookProgress)에 쓰는 곳이 없습니다.
      채점 점수는 1차처럼 따로 쌓지 않습니다 (선생님이 아직 정하지 않으셨습니다).
═══════════════════════════════════════ */

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const act = el.dataset.action;
  if(act.indexOf('a2-') !== 0 && act.indexOf('a2g-') !== 0) return;

  if(act === 'a2-view'){ A2_SNUM = el.dataset.snum; A2_VIEW = 'student'; render(); return; }
  if(act === 'a2-back'){ A2_VIEW = 'list'; A2_SNUM = null; render(); return; }
  if(act === 'a2-step'){
    const list = _a2TcNums();
    const at = list.indexOf(A2_SNUM);
    const to = at + Number(el.dataset.d || 0);
    if(at < 0 || to < 0 || to >= list.length) return;
    A2_SNUM = list[to]; render(); return;
  }
  if(act === 'a2-md'){ _a2ExportMd(); return; }

  // ✅ 코드 채점 검토 (2026-11-09) — 처음 점수(ai)는 두고 고친 값만 s 에
  if(act === 'a2g-set'){
    const k = el.dataset.k, v = el.dataset.v;
    const g = a2gOf(A2_SNUM);
    if(!g || !TC_CLS) return;
    const path = `aiactivity/submissions/${TC_CLS.id}/assess2grade/${A2_SNUM}`;
    const ai = (g.ai || {})[k];
    const nv = v === 'ai' ? null : Number(v);
    const up = { at: new Date().toISOString() };
    up['s/' + k] = (nv === null || nv === ai) ? null : nv;   // 처음 점수와 같으면 고친 표시를 지웁니다
    if(!g.state) up.state = 'wip';
    db.ref(path).update(up).catch(err => toast('저장하지 못했습니다 — ' + (err.message || err), 'err'));
    return;
  }
  if(act === 'a2g-state'){
    const g = a2gOf(A2_SNUM);
    if(!g || !TC_CLS) return;
    const nx = { '': 'wip', wip: 'done', done: '' }[g.state || ''];
    db.ref(`aiactivity/submissions/${TC_CLS.id}/assess2grade/${A2_SNUM}`)
      .update({ state: nx, at: new Date().toISOString() })
      .catch(err => toast('저장하지 못했습니다 — ' + (err.message || err), 'err'));
    return;
  }
  if(act === 'a2-run'){ a2RunStudent(A2_SNUM); return; }
});

/* 메모 · 논술 점수 — 칸을 벗어나면 저장 */
document.addEventListener('change', e => {
  const el = e.target;
  if(!el || (el.id !== 'a2g-note' && el.id !== 'a2g-essay')) return;
  if(!TC_CLS || !A2_SNUM) return;
  const path = `aiactivity/submissions/${TC_CLS.id}/assess2grade/${A2_SNUM}`;
  const up = { at: new Date().toISOString() };
  if(el.id === 'a2g-note') up.note = el.value;
  else {
    const s = String(el.value).trim();
    if(s === '') up.essay = null;
    else {
      const n = Math.round(Number(s));
      if(!(n >= 0 && n <= 4)){ toast('논술 항목 점수는 0~4 입니다', 'err'); return; }
      up.essay = n;
    }
  }
  db.ref(path).update(up)
    .then(() => { toast('저장했습니다', 'ok'); el.blur(); setTimeout(render, 0); })
    .catch(err => toast('저장하지 못했습니다 — ' + (err.message || err), 'err'));
});

/* ▶ 실행 결과 보기 — 학생 코드 셀을 노트북 엔진으로 차례대로 돌립니다.
   출력은 화면에만 붙습니다. 학생 진도(notebookProgress)에는 쓰지 않습니다.
   노트북 화면의 출력 흐름(nbAppendOut)이 NB_CELL_OUTPUTS[셀 id] 에 모아 주므로
   셀마다 그 자리를 잠깐 열었다가 결과를 옮겨 담고 지웁니다. */
async function a2RunStudent(snum){
  if(A2_OUT.run){ toast('이미 실행 중입니다', 'err'); return; }
  const doc = (A2_ALL || {})[snum];
  if(!doc){ toast('저장한 답안이 없습니다', 'err'); return; }
  if(typeof runNBPython !== 'function' || typeof resetNBWorker !== 'function'){
    toast('노트북 엔진을 불러오지 못했습니다', 'err'); return;
  }
  const cells = (doc.cells || []).filter(c => c && (c.type || 'code') === 'code' && String(c.source || '').trim());
  A2_OUT = { snum, outs: {}, run: true, cur: null, msg: '파이썬 준비 중' };
  render();
  const paint = id => {
    const box = document.querySelector(`.a2-out[data-a2out="${id}"]`);
    if(box && A2_SNUM === snum) box.innerHTML = _a2OutHtml(snum, id);
    const m = document.getElementById('a2-runmsg');
    if(m && A2_SNUM === snum) m.innerHTML = _a2RunMsg(snum);
  };
  try {
    await resetNBWorker();
    for(const c of cells){
      if(A2_OUT.snum !== snum) return;   // 다른 학생을 돌리기 시작함
      A2_OUT.cur = c.id; A2_OUT.msg = '실행 중';
      paint(c.id);
      NB_CELL_OUTPUTS[c.id] = { running: true, items: [] };
      const res = await runNBPython(String(c.source), '', c.id);
      const items = ((NB_CELL_OUTPUTS[c.id] || {}).items || []).slice();
      delete NB_CELL_OUTPUTS[c.id];
      if(res && !res.ok && !items.some(it => it.kind === 'error') && res.error){
        items.push({ kind: 'error', a: JSON.stringify({ tb: String(res.error) }) });
      }
      A2_OUT.outs[c.id] = { items, ok: !!(res && res.ok) };
      A2_OUT.cur = null;
      paint(c.id);
    }
    A2_OUT.msg = '';
  } catch(err){
    A2_OUT.msg = '실행이 멈췄습니다 — ' + (err.message || err);
  } finally {
    if(A2_OUT.snum === snum){ A2_OUT.run = false; A2_OUT.cur = null; }
    if(A2_SNUM === snum) render();
  }
}

/* ─── 📤 반 전체 답안을 마크다운 한 벌로 ───
   코드와 적은 글이 섞여 있어 CSV 로는 읽기 어렵습니다 (한 칸에 여러 줄).
   그래서 1차의 CSV 대신 마크다운으로 냅니다 — 그대로 인쇄하거나 옆에 두고 채점합니다. */
function _a2ExportMd(){
  if(!TC_CLS || !A2_ALL) return;
  const nb = NOTEBOOKS.find(n => n.id === A2_NB_ID);
  if(!nb){ toast('노트북을 찾지 못했습니다', 'err'); return; }

  const sts = [...(typeof STUDENTS !== 'undefined' ? STUDENTS : [])]
    .sort((a, b) => String(a.number).localeCompare(String(b.number)));
  // 시각은 **선생님 시계**로 적습니다 — toISOString 은 UTC 라 9시간 어긋납니다
  const now = new Date();
  const p = n => String(n).padStart(2, '0');
  const day = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  const L = [`# 2차 수행평가 답안 — ${TC_CLS.name || TC_CLS.id}`,
             `뽑은 때 ${day} ${p(now.getHours())}:${p(now.getMinutes())}`, ''];

  let n = 0;
  for(const st of sts){
    const doc = A2_ALL[st.number];
    if(!doc) continue;
    n++;
    L.push('', `## ${st.number} ${st.name}`, `마지막 저장 ${doc.updatedAt || ''}`, '');
    const cells = a2Cells(doc);
    let wait = '';   // 아래에 답이 나올 때까지 제목을 쥐고 있습니다 (빈 제목 줄을 안 내게)
    for(const oc of (nb.cells || [])){
      const t = oc.type || oc.cell_type || 'code';
      const m = (t === 'markdown')
        ? (oc.source || '').match(/^#+\s*\*\*\s*((?:준비 단계|문제)\s*\d+\.?)\s*\*\*/m) : null;
      if(m){ wait = `### ${m[1].replace(/\s+/g, ' ').trim()}`; continue; }
      if(!a2IsAns(oc)) continue;
      if(wait){ L.push('', wait); wait = ''; }
      const sc = cells[oc.id];
      if(a2IsFill(oc)){
        const rows = a2FillBody(sc ? sc.source : oc.source);
        for(const r of rows){
          const k = String(r[0] || '').replace(/\*\*/g, '').replace(/\s*\++$/, '').trim();
          const v = r.slice(1).map(x => String(x || '').replace(/<br\s*\/?>/gi, ' ').trim())
                      .filter(Boolean).join(' / ');
          L.push(`- **${k}** : ${v || '(비어 있음)'}`);
        }
        continue;
      }
      const code = (sc?.source || '').trim();
      if(!code){ L.push('- (비어 있음)'); continue; }
      L.push('```python', code, '```');
      const bl = (typeof nbBlocksOf === 'function' && sc) ? nbBlocksOf(sc) : null;
      const bad = [...new Set((bl || []).flatMap(b => a2Wrong(b))
        .map(w => `적은 것 ${w.got || '빈칸'} · 답 ${w.ans}`))];
      if(bad.length) L.push(`> 틀린 칸 — ${bad.join(' · ')}`);
      if(sc?.raw) L.push('> ✏️ 블록을 풀고 직접 적은 셀');
    }
  }
  if(!n){ toast('저장된 답안이 없습니다', 'err'); return; }

  const url = URL.createObjectURL(new Blob([L.join('\n')],
    { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `2차수행평가_답안_${TC_CLS.id}_${day}.md`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`📤 ${n}명의 답안을 내렸습니다`, 'ok');
}
