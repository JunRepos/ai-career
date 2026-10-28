/* ═══════════════════════════════════════
   notebook-colab.js — 노트북을 Colab 처럼 (메인 스레드 쪽)

   events/notebook.js 가 워커와 셀을 다루고, 여기에는 그 위에 얹은 것들만 둡니다.
   · 출력 흐름 — 워커가 보내는 {type:'out'} 을 셀마다 items[] 로 모아 바로 그림
                (print · 표 · 그림 · 오류가 나온 차례 그대로)
   · 표(DataFrame) — pandas 가 만든 HTML 을 걸러서 넣음. 사용자가 만든 HTML 은 격리된 iframe
   · 런타임 표시 · ⏹ 중지(워커를 새로 띄움) · 셀 실행 줄 세우기(Colab 처럼 차례로)
   · 📁 파일 창 — /content 목록 · 올리기 · 내려받기 · 지우기 · 경로 복사
   · 📤 파일 올리기 — 도구 막대 · 파일 메뉴의 팝업, 노트북 위로 끌어다 놓기 (코드 칸에 떨어뜨려도 여기서 받음)
   · ipynb 내려받기에 출력 포함
═══════════════════════════════════════ */

let NB_RUNTIME   = '';      // 워커가 알려 주는 상태 글 ('' 이면 준비됨)
let NB_RT_READY  = false;   // 한 번이라도 준비가 끝났는지
let NB_RUNNING   = null;    // 실행 중인 셀 id
let NB_SIDE_TAB  = 'blk';   // 사이드바 탭 'blk'(블록) | 'snip'(함수) | 'toc' | 'files'
let NB_BLK_SAY   = true;    // 🧩 블록 셀 — 블록 아래 설명을 보일지
let NB_BLK_CODE  = true;    // 🧩 블록 셀 — 블록이 만든 파이썬 칸을 보일지
/* 🧩 블록 셀 — **빈칸을 정하는 손잡이**를 보일지 (선생님만 · 2026-10-28).
   꺼 두는 것이 기본입니다. 켜 두면 작은 단추가 칸마다 붙어 파이썬이 지저분해집니다. */
let NB_BLK_ASKUI = false;
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
    ${rows || `<div class="cb-toc-empty">비어 있습니다. <code>!wget 주소</code> 를 실행하거나 파일을 올리세요.</div>`}`;
}
function vNbFilesPanel(){
  if(NB_FILES === null) setTimeout(nbFilesRefresh, 0);
  return `<div class="cb-sidebar-section">
    <div class="cb-files-bar">
      <label class="cb-files-btn" title="내 컴퓨터의 파일을 /content 에 올리기">⬆ 올리기<input type="file" data-nb-upload multiple hidden/></label>
      <button class="cb-files-btn" data-action="nb-files-refresh" title="새로 고침">⟳</button>
    </div>
    <div class="cb-files-drop">📥 파일을 이 창이나 노트북 위로 끌어다 놓아도 올라갑니다</div>
    <div id="cb-files" class="cb-files">${vNbFilesBody()}</div>
    <div class="cb-files-note">런타임을 새로 시작하면 이 파일들은 지워집니다 (Colab 과 같음).</div>
  </div>`;
}

/* ── 📤 파일 올리기 — 고르기 · 끌어다 놓기 모두 여기로 ── */
const NB_UPLOAD_MAX = 50 * 1024 * 1024;   // 파일 하나 50MB 까지 — 파일이 브라우저 메모리에 올라감
async function nbUploadFiles(files, skippedDirs){
  files = Array.from(files || []);
  files.filter(f => f.size > NB_UPLOAD_MAX).forEach(f =>
    nbUploadErr(`"${f.name}" 은(는) 너무 큽니다 (${nbFmtSize(f.size)}). 파일 하나에 50MB 까지 올릴 수 있습니다.`));
  if(skippedDirs) nbUploadErr('폴더는 올릴 수 없습니다. zip 파일로 묶어 올린 뒤 !unzip 파일이름.zip 을 실행하세요.');
  files = files.filter(f => f.size <= NB_UPLOAD_MAX);
  const done = [];
  for(const f of files){
    nbUploadStatus(NB_RT_READY ? `⏳ ${f.name} 올리는 중…` : `⏳ 파이썬을 준비하는 중입니다. 준비가 끝나면 ${f.name} 이(가) 바로 올라갑니다.`);
    let buf;
    try { buf = await f.arrayBuffer(); }
    catch(err){ nbUploadErr(`"${f.name}" 을(를) 읽지 못했습니다. 폴더라면 zip 파일로 묶어 올리세요.`); continue; }
    const r = await nbCall({action: 'fs-write', path: f.name, bytes: buf}, [buf]);
    if(!r || !r.ok){ nbUploadErr(`"${f.name}" 을(를) 올리지 못했습니다: ${(r && r.error) || ''}`); continue; }
    done.push(f);
    nbUploadAddDone(f);
  }
  nbUploadStatus('');
  if(done.length){
    const first = done[0].name;
    const hint = (done.length === 1 && /\.csv$/i.test(first)) ? ` 코드에서는 pd.read_csv("${first}") 로 읽습니다.` : '';
    toast((done.length === 1 ? `"${first}" 을(를) 올렸습니다.` : `${done.length}개 파일을 /content 에 올렸습니다.`) + hint, 'ok');
  }
  nbFilesRefresh();
  return done;
}

/* 팝업 — 끌어다 놓는 칸 + 눌러서 고르기 */
function nbShowUpload(){
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-ov" onclick="closeModal()">
      <div class="section nb-up" onclick="event.stopPropagation()">
        <div class="sec-title">📤 파일 올리기</div>
        <label class="nb-up-zone" id="nb-up-zone">
          <input type="file" data-nb-upload multiple hidden/>
          <span class="nb-up-big">📥 파일을 여기로 끌어다 놓으세요</span>
          <span class="nb-up-or">또는 <b>여기를 눌러 내 컴퓨터에서 고르기</b> (여러 개 가능)</span>
        </label>
        <div class="nb-up-status" id="nb-up-status"></div>
        <ul class="nb-up-list" id="nb-up-list"></ul>
        <div class="nb-up-note">
          올린 파일은 <code>/content</code> 폴더에 저장됩니다. 코드에서는 파일 이름만 쓰면 됩니다. 예) <code>pd.read_csv("파일이름.csv")</code><br>
          노트북을 닫았다가 다시 열거나 새로고침하면 올린 파일이 지워집니다. 그때는 다시 올리세요.
        </div>
        <div style="text-align:right;margin-top:10px"><button class="btn-sm" onclick="closeModal()">닫기</button></div>
      </div>
    </div>`;
}
function nbUploadStatus(text){
  const el = document.getElementById('nb-up-status');
  if(el) el.textContent = text || '';
}
/* 알림(토스트)은 팝업보다 아래에 떠서 가려지므로, 팝업이 열려 있으면 목록에도 적습니다 */
function nbUploadErr(msg){
  toast(msg, 'err');
  const ul = document.getElementById('nb-up-list');
  if(!ul) return;
  const li = document.createElement('li');
  li.className = 'nb-up-err';
  li.textContent = '✗ ' + msg;
  ul.appendChild(li);
}
function nbUploadAddDone(f){
  const ul = document.getElementById('nb-up-list');
  if(!ul) return;
  const li = document.createElement('li');
  li.innerHTML = `✓ <b>${esc(f.name)}</b> <span>${nbFmtSize(f.size)}</span> <code>/content/${esc(f.name)}</code>`;
  ul.appendChild(li);
}

/* 파일을 노트북 위 어디에 끌어다 놓아도 /content 에 올립니다.
   문서 전체에서 먼저(capture) 받아서, 코드 칸 위에 떨어뜨려도 편집기(CodeMirror)가 파일 내용을
   코드 칸에 글자로 붙여 넣지 않고, 브라우저가 파일을 새 창으로 열어 노트북을 벗어나지도 않게 합니다. */
let _nbDragTimer = null;
function _nbDragHasFiles(e){
  const t = e.dataTransfer && e.dataTransfer.types;
  return !!t && Array.from(t).includes('Files');
}
function _nbDropOn(){ return !!document.querySelector('.cb-wrap'); }
function nbDropOverlay(on){
  let ov = document.getElementById('nb-drop-ov');
  if(on && !ov){
    ov = document.createElement('div');
    ov.id = 'nb-drop-ov';
    ov.className = 'nb-drop-ov';
    ov.innerHTML = '<div class="nb-drop-box">📥 놓으면 노트북에 올라갑니다<small>/content 폴더에 저장 · 코드에서는 파일 이름만 쓰면 됩니다</small></div>';
    document.body.appendChild(ov);
  }
  if(!on && ov) ov.remove();
  document.getElementById('nb-up-zone')?.classList.toggle('on', !!on);
}
function _nbDragPing(){
  nbDropOverlay(true);
  clearTimeout(_nbDragTimer);   // 창 밖으로 나가면 dragover 가 끊기므로, 잠시 없으면 표시를 거둠
  _nbDragTimer = setTimeout(() => nbDropOverlay(false), 350);
}
['dragenter', 'dragover'].forEach(type => document.addEventListener(type, e => {
  if(!_nbDropOn() || !_nbDragHasFiles(e)) return;
  e.preventDefault();
  e.stopPropagation();
  if(e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  _nbDragPing();
}, true));
document.addEventListener('drop', e => {
  if(!_nbDropOn() || !_nbDragHasFiles(e)) return;
  e.preventDefault();
  e.stopPropagation();
  clearTimeout(_nbDragTimer);
  nbDropOverlay(false);
  // 폴더는 건너뜀 — webkitGetAsEntry 는 drop 안에서만 읽을 수 있음
  const fileItems = Array.from(e.dataTransfer.items || []).filter(it => it.kind === 'file');
  const files = [];
  let dirs = 0;
  Array.from(e.dataTransfer.files || []).forEach((f, i) => {
    const entry = fileItems[i] && fileItems[i].webkitGetAsEntry ? fileItems[i].webkitGetAsEntry() : null;
    if(entry && entry.isDirectory) dirs++;
    else files.push(f);
  });
  if(files.length || dirs) nbUploadFiles(files, dirs);
}, true);

document.addEventListener('click', e => {
  const el = e.target.closest?.('[data-action="nb-upload-open"]');
  if(!el) return;
  if(typeof closeNbMenu === 'function') closeNbMenu();
  nbShowUpload();
});
function nbSaveBlob(name, bytes){
  const url = URL.createObjectURL(new Blob([bytes]));
  const a = document.createElement('a');
  a.href = url; a.download = name || 'download';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

document.addEventListener('change', async e => {
  if(e.target && e.target.matches && e.target.matches('input[data-nb-upload]')){
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
    const t = el.dataset.tab;
    NB_SIDE_TAB = (t === 'files' || t === 'toc' || t === 'snip') ? t : 'blk';
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
    ['파일', '위의 <b>📤 파일 올리기</b> 를 누르거나 파일을 노트북 위로 끌어다 놓으면 <code>/content</code> 에 올라갑니다. 코드에서는 파일 이름만 씁니다. 왼쪽 <b>📁 파일</b> 창에서 내려받기·지우기.'],
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
