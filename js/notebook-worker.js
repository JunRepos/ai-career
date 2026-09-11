/* ═══════════════════════════════════════
   notebook-worker.js — Pyodide 워커 (노트북 · Colab 흉내)

   · Pyodide 0.27.7 (Python 3.12 · pandas 2.2 · numpy 2.0 · scikit-learn 1.6) — Colab 과 같은 판
     (0.25 의 pandas 1.5 는 df.corr() 가 글자 열을 조용히 빼 버려 Colab 과 결과가 달랐습니다)
   · 파이썬 쪽 준비는 js/notebook-boot.py — !명령 · %매직 · 표시 · 한글 글꼴 · git clone
   · 출력은 나오는 즉시 {type:'out'} 로 보냅니다 (print · 표 · 그림 · 오류가 차례대로)

   메인 → 워커  {id, action:'preload'|'run'|'reset'|'fs-list'|'fs-read'|'fs-write'|'fs-delete', …}
                {type:'init-stdin', buffer} · {type:'input-reply', value}
   워커 → 메인  {type:'status', text} · {type:'out', id, cellId, kind, a, b}
                {type:'request-input', cellId, prompt} · {type:'download', name, bytes} · {id, ok, …}

   ⚠ 이 사이트는 교차 출처 격리(coi-serviceworker)를 꺼 두었습니다 — 학교 PC 에서 페이지가 통째로
     실패한 적이 있어서. 그래서 SharedArrayBuffer 가 대개 없고, input() 은 JSPI(최신 크롬·엣지·웨일)로
     받습니다. 둘 다 안 되면 input() 은 알기 쉬운 오류를 냅니다.
═══════════════════════════════════════ */

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
importScripts(PYODIDE_URL + 'pyodide.js');

const SITE = new URL('../', self.location.href).href;          // 사이트 뿌리 — vendor/ 가 여기 있음
const VER = new URL(self.location.href).searchParams.get('v') || '';

let pyodide = null;
let bootP = null;
let preloadP = null;
let curId = null, curCell = null;
let pendingInput = null;

function post(m, transfer){ self.postMessage(m, transfer || []); }
function status(text){ post({type: 'status', text: text || ''}); }
function pkgMsg(msg){
  const m = String(msg || '').match(/^Loading (.+)$/);
  return m ? '필요한 도구를 받는 중… (' + m[1].split(',').slice(0, 4).join(',') + ')' : '';
}

// ── stdin SharedArrayBuffer (교차 출처 격리가 켜진 곳에서만) ──
const STDIN_BUF_SIZE = 4096;
let stdinCtrl = null, stdinData = null, stdinSupported = false;
function syncStdinReadLine(prompt){
  Atomics.store(stdinCtrl, 0, 0);
  Atomics.store(stdinCtrl, 1, 0);
  post({type: 'request-input', cellId: curCell, prompt: prompt || ''});
  Atomics.wait(stdinCtrl, 0, 0);
  if(Atomics.load(stdinCtrl, 0) === 2) return null;
  const len = Atomics.load(stdinCtrl, 1);
  return new TextDecoder().decode(stdinData.slice(0, len));
}

function emit(kind, a, b){
  if(kind === 'status'){ status(a); return; }
  post({type: 'out', id: curId, cellId: curCell, kind, a: a == null ? '' : String(a), b: b == null ? '' : String(b)});
}

const INPUT_PY = `
def __nb_input(prompt=''):
    p = '' if prompt is None else str(prompt)
    v = _nb_input_sab(p) if _nb_input_sab_ok() else None
    if v is None:
        try:
            from pyodide.ffi import run_sync, can_run_sync
            ok = can_run_sync()
        except Exception:
            ok = False
        if not ok:
            raise RuntimeError('이 브라우저에서는 input() 을 쓸 수 없습니다. 값을 변수에 직접 넣어 쓰세요. (예: name = "홍길동")')
        v = run_sync(_nb_input_async(p))
    if v is None:
        raise KeyboardInterrupt('입력을 취소했습니다')
    _nb_emit('stream', 'stdout', p + str(v) + '\\n')
    return str(v)
builtins.input = __nb_input
`;

function boot(){
  if(bootP) return bootP;
  bootP = (async () => {
    status('파이썬을 불러오는 중… (처음 한 번은 20초쯤 걸립니다)');
    pyodide = await loadPyodide({indexURL: PYODIDE_URL});
    await pyodide.loadPackage(['micropip'], {messageCallback: () => {}});
    const g = pyodide.globals;
    g.set('_nb_emit', emit);
    g.set('_nb_site', SITE);
    g.set('_nb_input_sab_ok', () => stdinSupported);
    g.set('_nb_input_sab', p => syncStdinReadLine(p));
    g.set('_nb_input_async', p => new Promise(res => {
      pendingInput = res;
      post({type: 'request-input', cellId: curCell, prompt: p || ''});
    }));
    g.set('_nb_download', (name, bytes) => {
      const u8 = new Uint8Array(bytes);
      const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      post({type: 'download', name: String(name), bytes: buf}, [buf]);
    });
    const src = await (await fetch(SITE + 'js/notebook-boot.py?v=' + encodeURIComponent(VER))).text();
    pyodide.runPython(src);
    pyodide.runPython(INPUT_PY);
    status('');
  })();
  bootP.catch(() => { bootP = null; });
  return bootP;
}

function preload(){
  if(!preloadP){
    preloadP = (async () => {
      await boot();
      await pyodide.loadPackage(['numpy', 'pandas', 'matplotlib'], {messageCallback: m => { const t = pkgMsg(m); if(t) status(t); }});
      await pyodide.runPythonAsync('await __nb_setup_mpl()');
      status('');
    })();
    preloadP.catch(() => { preloadP = null; });
  }
  return preloadP;
}

// ── /content 파일 창 ──
function safePath(p){
  const clean = String(p || '').replace(/\\/g, '/').split('/').filter(s => s && s !== '.' && s !== '..').join('/');
  return '/content' + (clean ? '/' + clean : '');
}
function fsList(){
  const FS = pyodide.FS, out = [], root = '/content';
  (function walk(dir, depth){
    let names;
    try { names = FS.readdir(dir); } catch(e){ return; }
    names.filter(n => n !== '.' && n !== '..').sort().forEach(n => {
      if(out.length >= 3000) return;
      const p = dir + '/' + n;
      let st;
      try { st = FS.stat(p); } catch(e){ return; }
      const isDir = FS.isDir(st.mode);
      out.push({p: p.slice(root.length + 1), d: isDir, s: isDir ? 0 : st.size});
      if(isDir && depth < 8) walk(p, depth + 1);
    });
  })(root, 0);
  return out;
}

self.onmessage = async e => {
  const m = e.data || {};

  if(m.type === 'init-stdin'){
    try {
      stdinCtrl = new Int32Array(m.buffer, 0, 2);
      stdinData = new Uint8Array(m.buffer, 8, STDIN_BUF_SIZE);
      Atomics.load(stdinCtrl, 0);
      stdinSupported = true;
    } catch(err){ stdinSupported = false; }
    post({type: 'init-stdin-done', supported: stdinSupported});
    return;
  }
  if(m.type === 'input-reply'){
    if(pendingInput){ const r = pendingInput; pendingInput = null; r(m.value == null ? null : String(m.value)); }
    return;
  }

  const {id, action} = m;
  try {
    await boot();
    if(action === 'preload'){
      await preload();
      post({id, ok: true});
      return;
    }
    if(action === 'run'){
      if(preloadP) await preloadP.catch(() => {});
      curId = id; curCell = m.cellId || null;
      // ! · % 줄은 빼고 import 를 찾아 필요한 패키지를 먼저 받습니다
      const scan = String(m.code || '').split('\n').map(l => /^\s*[!%]/.test(l) ? '' : l).join('\n');
      try {
        await pyodide.loadPackagesFromImports(scan, {messageCallback: msg => { const t = pkgMsg(msg); if(t) status(t); }});
      } catch(err){ /* 모르는 모듈은 파이썬이 ModuleNotFoundError 로 알려 줍니다 */ }
      pyodide.globals.set('__nb_src', String(m.code || ''));
      const ok = await pyodide.runPythonAsync('await __nb_run(__nb_src)');
      status('');
      post({id, ok: !!ok});
      return;
    }
    if(action === 'reset'){
      pyodide.runPython('__nb_reset()');
      post({id, ok: true});
      return;
    }
    if(action === 'fs-list'){
      post({id, ok: true, files: fsList()});
      return;
    }
    if(action === 'fs-write'){
      const p = safePath(m.path);
      pyodide.FS.mkdirTree(p.slice(0, p.lastIndexOf('/')) || '/content');
      pyodide.FS.writeFile(p, new Uint8Array(m.bytes));
      post({id, ok: true});
      return;
    }
    if(action === 'fs-read'){
      const data = pyodide.FS.readFile(safePath(m.path));
      const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      post({id, ok: true, bytes: buf}, [buf]);
      return;
    }
    if(action === 'fs-delete'){
      const p = safePath(m.path);
      if(p === '/content') throw new Error('/content 는 지울 수 없습니다');
      pyodide.globals.set('__nb_p', p);
      pyodide.runPython('import os, shutil\n(shutil.rmtree if os.path.isdir(__nb_p) else os.remove)(__nb_p)');
      post({id, ok: true});
      return;
    }
    post({id, ok: false, error: '알 수 없는 요청: ' + action});
  } catch(err){
    status('');
    const msg = (err && err.message) ? err.message : String(err || '알 수 없는 오류');
    if(action === 'run'){
      emit('error', JSON.stringify({ename: 'Error', evalue: msg.split('\n').pop(), tb: msg,
        hint: /Failed to fetch|NetworkError|importScripts/i.test(msg) ? '파이썬을 받지 못했습니다. 인터넷 연결을 확인하고 [런타임 › 다시 시작]을 눌러 보세요.' : ''}), '');
    }
    post({id, ok: false, error: msg});
  } finally {
    if(action === 'run'){ curId = null; curCell = null; }
  }
};
