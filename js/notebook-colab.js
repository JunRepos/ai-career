/* ═══════════════════════════════════════
   notebook-colab.js — 노트북을 Colab 처럼 (메인 스레드 쪽)

   events/notebook.js 가 워커와 셀을 다루고, 여기에는 그 위에 얹은 것들만 둡니다.
   · 출력 흐름 — 워커가 보내는 {type:'out'} 을 셀마다 items[] 로 모아 바로 그림
                (print · 표 · 그림 · 오류가 나온 차례 그대로)
   · 표(DataFrame) — pandas 가 만든 HTML 을 걸러서 넣음. 사용자가 만든 HTML 은 격리된 iframe
   · 런타임 표시 · ⏹ 중지(워커를 새로 띄움) · 셀 실행 줄 세우기(Colab 처럼 차례로)
   · 📁 파일 창 — /content 목록 · 올리기 · 내려받기 · 지우기 · 경로 복사
   · ipynb 내려받기에 출력 포함
═══════════════════════════════════════ */

let NB_RUNTIME   = '';      // 워커가 알려 주는 상태 글 ('' 이면 준비됨)
let NB_RT_READY  = false;   // 한 번이라도 준비가 끝났는지
let NB_RUNNING   = null;    // 실행 중인 셀 id
let NB_SIDE_TAB  = 'toc';   // 사이드바 탭 'toc' | 'files'
let NB_FILES     = null;    // [{p, d, s}] — null 이면 아직 안 읽음
let _nbQueue     = Promise.resolve();
let _nbGen       = 0;       // 중지할 때마다 올림 — 줄 서 있던 셀은 건너뜀
const _nbPaintPending = new Set();

/* ── 워커에 한 번 묻고 답 받기 ── */
function nbCall(msg, transfer){
  return new Promise(resolve => {
    const id = ++_nbMsgId;
    _nbCallbacks[id] = resolve;
    getNBWorker().postMessage({...msg, id}, transfer || []);
  });
}

/* ── 런타임 상태 ── */
function nbSetRuntime(text){
  NB_RUNTIME = text || '';
  if(!NB_RUNTIME) NB_RT_READY = true;
  const el = document.getElementById('cb-rt');
  if(el){ el.outerHTML = vNbRuntimeChip(); }
}
function vNbRuntimeChip(){
  let cls = 'ok', label = '🟢 연결됨';
  if(NB_RUNTIME){ cls = 'busy'; label = '⏳ ' + NB_RUNTIME; }
  else if(NB_RUNNING){ cls = 'busy'; label = '▶ 실행 중'; }
  else if(!NB_RT_READY){ cls = 'busy'; label = '⏳ 파이썬 준비 중'; }
  const stop = NB_RUNNING ? `<button class="cb-stop-btn" data-action="nb-stop" title="실행 멈추기 — 런타임을 새로 시작합니다">⏹ 중지</button>` : '';
  return `<span id="cb-rt" class="cb-rt cb-rt-${cls}"><span class="cb-rt-text">${esc(label)}</span>${stop}</span>`;
}
function nbPreload(){
  nbCall({action: 'preload'}).then(r => { if(r && r.ok === false && r.error) nbSetRuntime('⚠ 준비 실패 — ' + r.error.split('\n')[0]); });
}

/* ── 셀 실행 (줄 세우기) ── */
function nbQueueRun(cellId){
  const gen = _nbGen;
  const prev = NB_CELL_OUTPUTS[cellId];
  if(!NB_RUNNING || NB_RUNNING !== cellId){
    NB_CELL_OUTPUTS[cellId] = {...(prev || {}), queued: true, running: false};
    updateCellOutputDom(cellId);
  }
  const p = _nbQueue.then(() => (gen === _nbGen ? _nbRunNow(cellId) : null));
  _nbQueue = p.catch(() => {});
  return p;
}

async function _nbRunNow(cellId){
  const cell = NB_CELLS.find(c => c.id === cellId);
  if(!cell || cell.type !== 'code') return;
  const code = cellSource(cellId);
  cell.source = code;
  NB_CELL_OUTPUTS[cellId] = {running: true, items: []};
  NB_RUNNING = cellId;
  nbSetRuntime(NB_RUNTIME);
  updateCellOutputDom(cellId);
  const t0 = performance.now();
  const res = await runNBPython(code, '', cellId);
  const out = NB_CELL_OUTPUTS[cellId] || {items: []};
  NB_EXEC_COUNT++;
  const items = out.items || [];
  if(res && res.stopped){
    items.push({kind: 'error', a: JSON.stringify({ename: 'KeyboardInterrupt', evalue: '', tb: '실행을 멈췄습니다.',
      hint: '런타임을 새로 시작했습니다. 변수와 /content 의 파일이 지워졌으니 위 셀부터 다시 실행하세요.'})});
  }
  NB_CELL_OUTPUTS[cellId] = {items, running: false, ok: !!(res && res.ok), execCount: NB_EXEC_COUNT, elapsedMs: performance.now() - t0};
  if(NB_RUNNING === cellId) NB_RUNNING = null;
  nbSetRuntime(NB_RUNTIME);
  updateCellOutputDom(cellId);
  if(NB_SIDE_TAB === 'files' && NB_SIDEBAR_OPEN) nbFilesRefresh();
}

/* ── 워커 출력 → 셀 ── */
function nbAppendOut(d){
  const o = NB_CELL_OUTPUTS[d.cellId];
  if(!o) return;
  const items = o.items || (o.items = []);
  if(d.kind === 'clear'){
    items.length = 0;
  } else if(d.kind === 'stream'){
    const last = items[items.length - 1];
    if(last && last.kind === 'stream' && last.a === d.a) last.b += d.b;
    else items.push({kind: 'stream', a: d.a, b: d.b});
    const cur = items[items.length - 1];
    if(cur.b.length > 400000) cur.b = '… (출력이 너무 길어 앞부분을 줄였습니다) …\n' + cur.b.slice(-300000);
  } else {
    items.push({kind: d.kind, a: d.a, b: d.b});
  }
  if(_nbPaintPending.has(d.cellId)) return;
  _nbPaintPending.add(d.cellId);
  requestAnimationFrame(() => { _nbPaintPending.delete(d.cellId); nbPaintItems(d.cellId); });
}
function nbPaintItems(cellId){
  const box = document.querySelector(`.cb-output[data-cellid="${cellId}"] .cb-out-items`);
  const o = NB_CELL_OUTPUTS[cellId];
  if(!box || !o){ updateCellOutputDom(cellId); return; }
  box.innerHTML = vNbItems(o.items || []);
  // 처음엔 출력이 없어 몸통을 숨겨 두었으니, 무언가 나오면 보이게
  box.closest('.cb-output')?.classList.toggle('cb-out-noitems', !(o.items || []).length && !box.parentElement.querySelector('.cb-input-prompt'));
}

/* pandas 가 만든 표 — 스크립트·이벤트 속성·스타일은 걸러 냅니다 */
function nbSanitize(html){
  const doc = new DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
  doc.querySelectorAll('script,iframe,object,embed,link,meta,style,form,input,button,textarea,select').forEach(n => n.remove());
  doc.querySelectorAll('*').forEach(n => {
    [...n.attributes].forEach(a => {
      if(/^on/i.test(a.name) || /^\s*(javascript|data):/i.test(a.value) || a.name === 'style') n.removeAttribute(a.name);
    });
  });
  return doc.body.firstChild ? doc.body.firstChild.innerHTML : '';
}

function vNbItems(items){
  return (items || []).map(it => {
    if(it.kind === 'stream') return `<pre class="cb-out-text${it.a === 'stderr' ? ' cb-out-stderr' : ''}">${esc(it.b)}</pre>`;
    if(it.kind === 'text') return `<pre class="cb-out-text">${esc(it.a)}</pre>`;
    if(it.kind === 'image') return `<img class="cb-out-img" src="data:${esc(it.b || 'image/png')};base64,${esc(it.a)}" alt="그림 출력"/>`;
    if(it.kind === 'html') return `<div class="cb-out-df">${nbSanitize(it.a)}</div>`;
    if(it.kind === 'md') return `<div class="cb-out-md">${nbSanitize(typeof marked !== 'undefined' ? marked.parse(it.a || '') : esc(it.a))}</div>`;
    if(it.kind === 'uhtml') return `<iframe class="cb-out-frame" sandbox="" srcdoc="${esc(it.a)}"></iframe>`;
    if(it.kind === 'error'){
      let j;
      try { j = JSON.parse(it.a); } catch(e){ j = {tb: String(it.a || '')}; }
      return `<div class="cb-out-errbox">
        ${j.hint ? `<div class="cb-out-hint">💡 ${esc(j.hint)}</div>` : ''}
        <pre class="cb-out-err">${esc(j.tb || ((j.ename || 'Error') + ': ' + (j.evalue || '')))}</pre></div>`;
    }
    return '';
  }).join('');
}

/* 예전 모양의 출력({output, images, error})도 그대로 보이게 */
function nbItemsOf(result){
  if(!result) return [];
  if(result.items) return result.items;
  const items = [];
  if(result.output) items.push({kind: 'stream', a: 'stdout', b: result.output});
  (result.images || []).forEach(b64 => items.push({kind: 'image', a: b64, b: 'image/png'}));
  if(result.error) items.push({kind: 'error', a: JSON.stringify({tb: result.error})});
  return items;
}

/* ── ⏹ 중지 — 워커를 없애고 새로 띄웁니다 (브라우저 파이썬은 중간에 끊을 방법이 이것뿐) ── */
function nbStopRuntime(silent){
  _nbGen++;
  if(_nbAwaitingInput){ _nbAwaitingInput = null; }
  document.querySelectorAll('.cb-input-prompt').forEach(el => el.remove());
  if(_nbWorker){ try { _nbWorker.terminate(); } catch(e){} }
  _nbWorker = null;
  _nbStdinSAB = null; _nbStdinCtrl = null; _nbStdinData = null;
  const pending = Object.values(_nbCallbacks);
  _nbCallbacks = {};
  pending.forEach(cb => { try { cb({ok: false, stopped: true}); } catch(e){} });
  _nbQueue = Promise.resolve();
  Object.keys(NB_CELL_OUTPUTS).forEach(id => {
    if(NB_CELL_OUTPUTS[id] && NB_CELL_OUTPUTS[id].queued){ delete NB_CELL_OUTPUTS[id]; updateCellOutputDom(id); }
  });
  NB_FILES = null;
  NB_RT_READY = false;
  nbSetRuntime('');
  NB_RT_READY = false;
  nbSetRuntime('파이썬을 다시 불러오는 중…');
  nbPreload();
  if(!silent) toast('실행을 멈추고 런타임을 새로 시작했습니다.', 'info');
}

/* ── 📁 파일 창 ── */
function nbFilesRefresh(){
  return nbCall({action: 'fs-list'}).then(r => {
    NB_FILES = (r && r.ok) ? (r.files || []) : [];
    const box = document.getElementById('cb-files');
    if(box) box.innerHTML = vNbFilesBody();
  });
}
function nbFmtSize(n){
  if(n < 1024) return n + ' B';
  if(n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}
function vNbFilesBody(){
  if(NB_FILES === null) return `<div class="cb-toc-empty">⏳ 불러오는 중…</div>`;
  const rows = NB_FILES.map(f => {
    const depth = f.p.split('/').length - 1;
    const name = f.p.split('/').pop();
    return `<div class="cb-file${f.d ? ' cb-file-dir' : ''}" style="padding-left:${6 + depth * 14}px" title="/content/${esc(f.p)}">
      <span class="cb-file-name">${f.d ? '📁' : '📄'} ${esc(name)}</span>
      ${f.d ? '' : `<span class="cb-file-size">${nbFmtSize(f.s)}</span>`}
      <span class="cb-file-acts">
        <button data-action="nb-file-copy" data-path="${esc(f.p)}" title="경로 복사">⧉</button>
        ${f.d ? '' : `<button data-action="nb-file-dl" data-path="${esc(f.p)}" title="내려받기">↓</button>`}
        <button data-action="nb-file-del" data-path="${esc(f.p)}" title="지우기">🗑</button>
      </span>
    </div>`;
  }).join('');
  return `<div class="cb-file cb-file-root"><span class="cb-file-name">📁 /content</span></div>
    ${rows || `<div class="cb-toc-empty">비어 있습니다. <code>!git clone …</code> 을 실행하거나 파일을 올리세요.</div>`}`;
}
function vNbFilesPanel(){
  if(NB_FILES === null) setTimeout(nbFilesRefresh, 0);
  return `<div class="cb-sidebar-section">
    <div class="cb-files-bar">
      <label class="cb-files-btn" title="내 컴퓨터의 파일을 /content 에 올리기">⬆ 올리기<input type="file" id="cb-file-up" multiple hidden/></label>
      <button class="cb-files-btn" data-action="nb-files-refresh" title="새로 고침">⟳</button>
    </div>
    <div id="cb-files" class="cb-files">${vNbFilesBody()}</div>
    <div class="cb-files-note">런타임을 새로 시작하면 이 파일들은 지워집니다 (Colab 과 같음).</div>
  </div>`;
}
async function nbUploadFiles(files){
  for(const f of files){
    const buf = await f.arrayBuffer();
    const r = await nbCall({action: 'fs-write', path: f.name, bytes: buf}, [buf]);
    if(!r || !r.ok){ toast(`"${f.name}" 을(를) 올리지 못했습니다: ${(r && r.error) || ''}`, 'err'); return; }
  }
  toast(`${files.length}개 파일을 /content 에 올렸습니다.`, 'ok');
  nbFilesRefresh();
}
function nbSaveBlob(name, bytes){
  const url = URL.createObjectURL(new Blob([bytes]));
  const a = document.createElement('a');
  a.href = url; a.download = name || 'download';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

document.addEventListener('change', async e => {
  if(e.target && e.target.id === 'cb-file-up'){
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if(files.length) await nbUploadFiles(files);
  }
});

document.addEventListener('click', async e => {
  const el = e.target.closest?.('[data-action]');
  if(!el) return;
  const act = el.dataset.action;
  if(act === 'nb-stop'){
    if(!confirm('실행을 멈출까요?\n브라우저 속 파이썬은 중간에 끊을 수 없어 런타임을 새로 시작합니다.\n지금까지 만든 변수와 /content 의 파일이 지워집니다.')) return;
    nbStopRuntime();
    return;
  }
  if(act === 'nb-side-tab'){
    NB_SIDE_TAB = el.dataset.tab === 'files' ? 'files' : 'toc';
    if(NB_SIDE_TAB === 'files') NB_FILES = NB_FILES || null;
    const side = document.querySelector('.cb-sidebar');
    if(side){ side.outerHTML = vNbSidebar(); }
    return;
  }
  if(act === 'nb-files-refresh'){ NB_FILES = null; const b = document.getElementById('cb-files'); if(b) b.innerHTML = vNbFilesBody(); nbFilesRefresh(); return; }
  if(act === 'nb-file-copy'){
    const p = '/content/' + el.dataset.path;
    try { await navigator.clipboard.writeText(p); toast('경로를 복사했습니다: ' + p, 'ok'); }
    catch(err){ prompt('경로 (Ctrl+C 로 복사)', p); }
    return;
  }
  if(act === 'nb-file-dl'){
    const r = await nbCall({action: 'fs-read', path: el.dataset.path});
    if(r && r.ok) nbSaveBlob(el.dataset.path.split('/').pop(), r.bytes);
    else toast('내려받지 못했습니다: ' + ((r && r.error) || ''), 'err');
    return;
  }
  if(act === 'nb-file-del'){
    if(!confirm(`/content/${el.dataset.path} 을(를) 지울까요?`)) return;
    const r = await nbCall({action: 'fs-delete', path: el.dataset.path});
    if(!r || !r.ok) toast('지우지 못했습니다: ' + ((r && r.error) || ''), 'err');
    nbFilesRefresh();
    return;
  }
});

/* ── ipynb 내려받기 (출력 포함) ── */
function nbIpynbOutputs(result){
  const outs = [];
  nbItemsOf(result).forEach(it => {
    const lines = s => String(s || '').split('\n').map((l, i, a) => i < a.length - 1 ? l + '\n' : l);
    if(it.kind === 'stream') outs.push({output_type: 'stream', name: it.a === 'stderr' ? 'stderr' : 'stdout', text: lines(it.b)});
    else if(it.kind === 'text') outs.push({output_type: 'execute_result', execution_count: result.execCount || null, data: {'text/plain': lines(it.a)}, metadata: {}});
    else if(it.kind === 'image') outs.push({output_type: 'display_data', data: {[it.b || 'image/png']: it.a}, metadata: {}});
    else if(it.kind === 'html' || it.kind === 'uhtml') outs.push({output_type: 'display_data', data: {'text/html': lines(it.a)}, metadata: {}});
    else if(it.kind === 'md') outs.push({output_type: 'display_data', data: {'text/markdown': lines(it.a)}, metadata: {}});
    else if(it.kind === 'error'){
      let j; try { j = JSON.parse(it.a); } catch(e){ j = {tb: String(it.a || '')}; }
      outs.push({output_type: 'error', ename: j.ename || 'Error', evalue: j.evalue || '', traceback: String(j.tb || '').split('\n')});
    }
  });
  return outs;
}


/* ── 📖 도움말 — 이 노트북에서 되는 것 ── */
function nbShowHelp(){
  const rows = [
    ['라이브러리', 'pandas · numpy · matplotlib · seaborn · scikit-learn · scipy · statsmodels (Colab 과 같은 판)'],
    ['데이터 받기', '<code>!git clone https://github.com/…</code> (공개 저장소) · <code>!wget 주소</code> · <code>!unzip 파일.zip</code>'],
    ['명령', '<code>!ls</code> <code>!pwd</code> <code>%cd 폴더</code> <code>!cat</code> <code>!head</code> <code>!pip install 이름</code> <code>%%writefile 파일.py</code> <code>!python 파일.py</code>'],
    ['한글 그래프', '글꼴 설정 없이 한글이 나옵니다 (나눔고딕).'],
    ['파일', '왼쪽 <b>📁 파일</b> 창에서 올리기·내려받기. 작업 폴더는 <code>/content</code> 입니다.'],
    ['멈추기', '<b>⏹ 중지</b> 는 런타임을 새로 시작합니다 — 변수와 /content 파일이 지워집니다.'],
    ['안 되는 것', 'tensorflow · keras · torch, Google 드라이브 연결, GPU, <code>apt-get</code>. 이런 셀은 Colab 에서 실행하세요.'],
    ['처음 실행', '파이썬을 브라우저로 받느라 20초쯤 걸립니다. 그다음부터는 빠릅니다.'],
  ];
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-ov" onclick="closeModal()">
      <div class="section nb-help" style="max-width:640px;width:92vw;max-height:84vh;overflow:auto;cursor:default" onclick="event.stopPropagation()">
        <div class="sec-title">📖 이 노트북에서 되는 것</div>
        <table>${rows.map(r => `<tr><td style="width:92px;font-weight:700;white-space:nowrap">${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>
        <div style="text-align:right;margin-top:8px"><button class="btn-sm" onclick="closeModal()">닫기</button></div>
      </div>
    </div>`;
}
document.addEventListener('click', e => {
  const el = e.target.closest?.('[data-action="nb-show-help"]');
  if(!el) return;
  if(typeof closeNbMenu === 'function') closeNbMenu();
  nbShowHelp();
});
