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

// 안내(note)는 번호를 안 매깁니다 — 앱과 같은 규칙
function renderQuestion(q, no){
  const head = `<div class="ws-q-head">
      ${no ? `<span class="ws-q-no">${no}</span>` : ''}
      <span class="ws-q-text">${esc(q.text)}</span>
    </div>${q.desc ? `<div class="ws-q-desc">${esc(q.desc)}</div>` : ''}`;

  if(q.type === 'note'){
    return `<div class="ws-block">
      <div class="ws-sec-title">${esc(q.text)}</div>
      <div class="ws-note">
        ${q.desc ? `<div class="ws-note-body">${esc(q.desc)}</div>` : ''}
        ${q.url ? `<a class="ws-note-url" href="${esc(q.url)}">${esc(q.url)}</a>` : ''}
      </div></div>`;
  }

  if(q.type === 'check'){
    const opts = (q.options || []).map(o =>
      `<label class="ws-check"><span class="ws-check-box"></span><span>${esc(o)}</span></label>`).join('');
    return `<div class="ws-block"><div class="ws-choice">
      <div class="ws-choice-title">${esc(q.text)}</div>
      ${q.desc ? `<div class="ws-q-desc" style="margin-left:0">${esc(q.desc)}</div>` : ''}
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
        ? `<td class="ws-td-fixed">${esc(fixed[r])}</td>`
        : `<td><input type="text" class="ws-cell" placeholder="${esc(c)}"/></td>`).join('') + '</tr>';
    }
    // fillFrom 자리는 학생이 고른 보기가 들어옵니다 — 미리보기에선 그 사실만 표시
    const note = (q.fillFrom || []).length
      ? `<div class="ws-q-desc" style="margin-left:0">↑ 앞에서 고른 보기가 첫 칸에 자동으로 들어갑니다</div>` : '';
    return `<div class="ws-block">${head}
      <div class="ws-table-wrap"><table class="ws-table">
        <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${body}</tbody></table></div>${note}</div>`;
  }

  return `<div class="ws-block">${head}
    <textarea class="ws-lines" rows="${q.rows || 3}"></textarea></div>`;
}

function build(sheet){
  let no = 0;
  const qs = (sheet.questions || [])
    .map(q => renderQuestion(q, q.type === 'note' ? null : ++no)).join('');
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
</style>
<div class="pv-wrap">
  <div class="pv-bar">
    <span class="pv-tag">미리보기</span>
    <span>학생이 보게 될 모습 그대로입니다 · 문항 ${answerable}개</span>
  </div>
  <div class="rep">
    <div class="rep-head">
      <div class="rep-kicker">${esc(sheet.subtitle || '학습지')}</div>
      <div class="rep-title">${esc(sheet.title || '')}</div>
      ${sheet.intro ? `<div class="rep-intro">${esc(sheet.intro)}</div>` : ''}
    </div>
    <div class="rep-qs">${qs}</div>
  </div>
  <div class="pv-note">고칠 곳을 말씀해 주시면 반영해서 다시 보여드립니다.<br>
    확정되면 그대로 반에 올립니다 — 앱에서 수정·삭제할 수 있는 학습지로 들어갑니다.</div>
</div>`;
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
