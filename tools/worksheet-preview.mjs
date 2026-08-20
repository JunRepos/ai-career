/* ═══════════════════════════════════════
   tools/worksheet-preview.mjs — 학습지 미리보기 만들기

   학습지를 반에 올리기 전에, 학생이 보게 될 모습 그대로 HTML 로 뽑습니다.
   앱의 진짜 학습지 스타일(css/styles.css 의 .rep / .ws-*)을 그대로 긁어
   쓰기 때문에 미리보기와 실제 화면이 어긋나지 않습니다.

   쓰는 법
     node tools/worksheet-preview.mjs <학습지.json> [-o 나올파일.html]

   학습지 JSON 은 앱이 쓰는 그 모양 그대로입니다.
     { title, subtitle, intro, questions:[ {id,type,text,desc,...} ] }
     type: text(기본) | note | check | table
═══════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

function die(msg){ console.error('✖ ' + msg); process.exit(1); }

/* ── 앱 CSS 에서 학습지에 쓰이는 규칙만 뽑아옵니다 ──
     · 주석을 먼저 걷어냅니다 — 주석 안 중괄호가 파서를 어긋나게 합니다
     · @media 블록은 통째로 건너뜁니다 — 모바일 규칙이 섞여 들어오지 않게 */
function worksheetCss(){
  let css = fs.readFileSync(path.join(ROOT, 'css', 'styles.css'), 'utf8');
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');

  const keep = sel => /(^|[\s,>])\.(ws-|rep(?![a-z]))/.test(sel);
  const out = [];
  let i = 0;

  while(i < css.length){
    const open = css.indexOf('{', i);
    if(open < 0) break;
    const sel = css.slice(i, open).trim();

    // 블록 끝 찾기 (@media 안에 규칙이 중첩돼 있으므로 깊이를 셉니다)
    let depth = 1, j = open + 1;
    while(j < css.length && depth > 0){
      if(css[j] === '{') depth++;
      else if(css[j] === '}') depth--;
      j++;
    }

    if(!sel.startsWith('@') && keep(sel)){
      out.push(sel + '{' + css.slice(open + 1, j - 1).trim() + '}');
    }
    i = j;
  }

  if(!out.length) die('앱 CSS 에서 학습지 스타일을 못 찾았습니다.');
  return out.join('\n');
}

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* 고칠 수 있는 글자 — 선생님이 미리보기에서 바로 고치는 자리.
   data-p 는 학습지 JSON 안의 위치(예: q.3.text, q.1.options.2)라서,
   고친 내용이 그대로 앱에 들어갈 데이터가 됩니다. */
const ed = (path, text, cls) =>
  `<span class="ed${cls ? ' ' + cls : ''}" contenteditable="true" spellcheck="false"
     data-p="${esc(path)}">${esc(text)}</span>`;

// 안내(note)는 번호를 안 매깁니다 — 앱과 같은 규칙
function renderQuestion(q, no, qi){
  const P = 'q.' + qi;
  const head = `<div class="ws-q-head">
      ${no ? `<span class="ws-q-no">${no}</span>` : ''}
      <span class="ws-q-text">${ed(P + '.text', q.text)}</span>
    </div>${q.desc !== undefined ? `<div class="ws-q-desc">${ed(P + '.desc', q.desc)}</div>` : ''}`;

  if(q.type === 'note'){
    return `<div class="ws-block">
      <div class="ws-sec-title">${ed(P + '.text', q.text)}</div>
      <div class="ws-note">
        ${q.desc !== undefined ? `<div class="ws-note-body">${ed(P + '.desc', q.desc)}</div>` : ''}
        ${q.url ? `<a class="ws-note-url" href="${esc(q.url)}">${esc(q.url)}</a>` : ''}
      </div></div>`;
  }

  if(q.type === 'check'){
    const opts = (q.options || []).map((o, oi) =>
      `<label class="ws-check"><span class="ws-check-box"></span>${ed(P + '.options.' + oi, o)}</label>`).join('');
    return `<div class="ws-block"><div class="ws-choice">
      <div class="ws-choice-title">${ed(P + '.text', q.text)}</div>
      ${q.desc !== undefined ? `<div class="ws-q-desc" style="margin-left:0">${ed(P + '.desc', q.desc)}</div>` : ''}
      <div class="ws-choice-grid" style="--cols:${q.cols || 2}">${opts}</div>
    </div></div>`;
  }

  if(q.type === 'table'){
    const cols = q.cols || [];
    const fixed = q.fixed || [];
    const rows = Math.max(1, fixed.length + (q.extra ?? 3));
    let body = '';
    for(let r = 0; r < rows; r++){
      body += '<tr>' + cols.map((c, ci) => (ci === 0 && fixed[r] !== undefined)
        ? `<td class="ws-td-fixed">${ed(P + '.fixed.' + r, fixed[r])}</td>`
        : `<td><input type="text" class="ws-cell" placeholder="${esc(c)}"/></td>`).join('') + '</tr>';
    }
    // fillFrom 자리는 학생이 고른 보기가 들어옵니다 — 미리보기에선 그 사실만 표시
    const note = (q.fillFrom || []).length
      ? `<div class="ws-q-desc" style="margin-left:0">↑ 앞에서 고른 보기가 첫 칸에 자동으로 들어갑니다</div>` : '';
    return `<div class="ws-block">${head}
      <div class="ws-table-wrap"><table class="ws-table">
        <thead><tr>${cols.map((c, ci) => `<th>${ed(P + '.cols.' + ci, c)}</th>`).join('')}</tr></thead>
        <tbody>${body}</tbody></table></div>${note}</div>`;
  }

  return `<div class="ws-block">${head}
    <textarea class="ws-lines" rows="${q.rows || 3}"></textarea></div>`;
}

function build(sheet){
  let no = 0;
  const qs = (sheet.questions || [])
    .map((q, qi) => renderQuestion(q, q.type === 'note' ? null : ++no, qi)).join('');
  const answerable = (sheet.questions || []).filter(q => q.type !== 'note').length;

  return `<title>${esc(sheet.title || '학습지')} — 미리보기</title>
<style>
  /* 앱의 전역 리셋 — 이게 없으면 여백이 실제 화면과 어긋납니다 (styles.css 34줄) */
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{margin:0;background:#EFE9E2;
    font-family:Pretendard,-apple-system,"Segoe UI",system-ui,sans-serif}
  .pv-wrap{max-width:900px;margin:0 auto;padding:26px 16px 60px}
  .pv-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:16px;
    font-size:12.5px;color:#6E665E}
  .pv-tag{background:#fff;border:1px solid #E4DCD3;border-radius:99px;
    padding:4px 11px;font-weight:700}
  .pv-note{margin-top:16px;font-size:12.5px;color:#6E665E;text-align:center;line-height:1.75}
  ${worksheetCss()}
  /* 미리보기에서만 — 종이를 가운데로 띄웁니다 */
  .rep{margin:0 auto;box-shadow:0 6px 24px rgba(80,60,40,.10)}

  /* ── 고칠 수 있는 글자 ── */
  .ed{outline:none;border-radius:3px;padding:0 2px;margin:0 -2px;
    transition:background .12s, box-shadow .12s;cursor:text}
  .ed:hover{background:rgba(166,85,42,.07)}
  .ed:focus{background:#fff;box-shadow:0 0 0 2px rgba(166,85,42,.45)}
  .ed.changed{background:rgba(166,85,42,.10);box-shadow:inset 0 -2px 0 rgba(166,85,42,.45)}
  .ed:empty::before{content:'(비어 있음)';color:#B9AFA5}

  /* ── 아래 고정 바 ── */
  .pv-dock{position:fixed;left:0;right:0;bottom:0;z-index:9;
    display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;
    padding:11px 16px;background:rgba(255,255,255,.96);border-top:1px solid #E4DCD3;
    backdrop-filter:blur(4px);font-size:13px;color:#6E665E}
  .pv-dock b{color:#A6552A}
  .pv-btn{border:1px solid #E4DCD3;background:#fff;color:#33302E;border-radius:8px;
    padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
  .pv-btn:hover{background:#FBF2EA}
  .pv-btn.main{background:#A6552A;border-color:#A6552A;color:#fff}
  .pv-btn.main:hover{filter:brightness(1.07)}
  .pv-out{position:fixed;inset:auto 16px 64px 16px;max-width:900px;margin:0 auto;
    display:none;max-height:52vh;overflow:auto;z-index:10;
    background:#2E2A26;color:#F2EDE7;border-radius:10px;padding:14px 16px;
    font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;
    white-space:pre-wrap;word-break:break-all;box-shadow:0 10px 30px rgba(0,0,0,.25)}
</style>
<div class="pv-wrap">
  <div class="pv-bar">
    <span class="pv-tag">고칠 수 있는 미리보기</span>
    <span>글자를 눌러 바로 고치세요 · 문항 ${answerable}개</span>
  </div>
  <div class="rep">
    <div class="rep-head">
      <div class="rep-kicker">${ed('subtitle', sheet.subtitle || '학습지')}</div>
      <div class="rep-title">${ed('title', sheet.title || '')}</div>
      <div class="rep-intro">${ed('intro', sheet.intro || '')}</div>
    </div>
    <div class="rep-qs">${qs}</div>
  </div>
  <div class="pv-note">고친 곳은 밑줄로 표시됩니다. 다 고치셨으면 아래 <b>고친 내용 복사</b>를 눌러<br>
    저에게 붙여넣어 주세요 — 그대로 반에 올립니다.</div>
</div>

<div class="pv-out" id="out"></div>
<div class="pv-dock">
  <span id="cnt">고친 곳 <b>0</b>군데</span>
  <button class="pv-btn main" id="copy">고친 내용 복사</button>
  <button class="pv-btn" id="show">내용 보기</button>
  <button class="pv-btn" id="reset">되돌리기</button>
</div>

<script>
const SHEET = ${JSON.stringify(sheet)};
const ORIG  = JSON.parse(JSON.stringify(SHEET));

// data-p 경로("q.3.text")를 따라가 값을 넣습니다
function setAt(obj, path, val){
  const ks = path.split('.');
  let o = obj;
  for(let i = 0; i < ks.length - 1; i++){
    const k = ks[i] === 'q' ? 'questions' : ks[i];
    if(o[k] === undefined) o[k] = {};
    o = o[k];
  }
  o[ks[ks.length - 1]] = val;
}
function getAt(obj, path){
  return path.split('.').reduce((o, k) => o?.[k === 'q' ? 'questions' : k], obj);
}

const eds = [...document.querySelectorAll('.ed')];
function sync(el){
  const p = el.dataset.p;
  const v = el.innerText.replace(/\\u00a0/g, ' ').trim();
  setAt(SHEET, p, v);
  el.classList.toggle('changed', v !== String(getAt(ORIG, p) ?? '').trim());
  document.querySelector('#cnt b').textContent = document.querySelectorAll('.ed.changed').length;
}
eds.forEach(el => {
  el.addEventListener('input', () => sync(el));
  // 줄바꿈은 문장 편집에 방해라 막습니다
  el.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); el.blur(); } });
  el.addEventListener('paste', e => {          // 서식 없이 글자만
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text'));
  });
});

const json = () => JSON.stringify(SHEET, null, 2);
document.getElementById('copy').onclick = async (e) => {
  const btn = e.currentTarget;
  try { await navigator.clipboard.writeText(json()); btn.textContent = '✓ 복사됐어요'; }
  catch(_){ document.getElementById('out').style.display = 'block';
            document.getElementById('out').textContent = json();
            btn.textContent = '아래 내용을 복사하세요'; }
  setTimeout(() => { btn.textContent = '고친 내용 복사'; }, 1800);
};
document.getElementById('show').onclick = () => {
  const o = document.getElementById('out');
  const on = o.style.display === 'block';
  o.style.display = on ? 'none' : 'block';
  if(!on) o.textContent = json();
};
document.getElementById('reset').onclick = () => {
  if(!confirm('고친 내용을 모두 되돌릴까요?')) return;
  location.reload();
};
</script>`;
}

// ── 실행 ──
const args = process.argv.slice(2);
const src = args.find(a => !a.startsWith('-'));
if(!src) die('학습지 JSON 파일을 지정하세요.  예) node tools/worksheet-preview.mjs sheet.json');
const oi = args.indexOf('-o');
const out = oi >= 0 ? args[oi + 1] : src.replace(/\.json$/, '') + '-preview.html';

let sheet;
try { sheet = JSON.parse(fs.readFileSync(src, 'utf8')); }
catch(e){ die('JSON 을 읽지 못했습니다: ' + e.message); }
if(!sheet.questions?.length) die('questions 가 비어 있습니다.');

fs.writeFileSync(out, build(sheet), 'utf8');
console.log(`✓ ${out}  (문항 ${sheet.questions.length}개)`);
