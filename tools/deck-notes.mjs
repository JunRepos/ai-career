/* ═══════════════════════════════════════
   tools/deck-notes.mjs — 슬라이드별 메모를 모아서 보여줍니다

   선생님이 장마다 적어 둔 **고칠 것**을 클로드가 읽어 가는 통로입니다.
   두 군데를 읽을 수 있습니다.

     ① 앱   — 🎤 발표자 보기 → '내 대본 메모'  (slides/{반}/tcNotes/{자료id}/{쪽})
     ② pptx — PowerPoint 발표자 노트           (python-pptx 로 읽습니다)

   쓰는 법
     node tools/deck-notes.mjs --id <자료id> --class ai-2B        # 앱 메모 읽기
     node tools/deck-notes.mjs --pptx "…/파일.pptx"               # PowerPoint 노트 읽기
     node tools/deck-notes.mjs --id <자료id> --class ai-2B --only  # 고칠 것만 추려서

   ⚠ '내 대본 메모'는 수업 중에 보는 대본이기도 합니다. 고쳐 달라는 말은
     줄 맨 앞에 **>>** 를 붙여 주세요. --only 는 그 줄만 뽑아 옵니다.
       >> 이 장 제목이 너무 기네. '휴리스틱값' 으로
═══════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const DB = 'https://sindong-informatics-default-rtdb.firebaseio.com';
const MARK = '>>';                      // 고쳐 달라는 줄의 표시

const die = m => { console.error('✖ ' + m); process.exit(1); };
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const has = n => argv.includes('--' + n);

/* ── 앱의 대본 메모 ── */
async function fromApp(cid, deckId){
  const r = await fetch(`${DB}/slides/${cid}/tcNotes/${deckId}.json`);
  if(!r.ok) die(`대본 메모를 못 읽었습니다 (HTTP ${r.status})`);
  const v = (await r.json()) || {};
  const d = await (await fetch(`${DB}/slides/${cid}/decks/${deckId}.json`)).json();
  const total = (d?.images || []).length;
  /* 쪽은 0부터 저장됩니다 — 사람이 세는 번호로 바꿔서 보여줍니다 */
  const notes = Object.entries(v)
    .map(([page, text]) => ({ page: Number(page) + 1, text: String(text) }))
    .sort((a, b) => a.page - b.page);
  return { title: d?.title || '(제목 없음)', total, notes };
}

/* ── PowerPoint 발표자 노트 ── */
function fromPptx(file){
  /* ⚠ 콘솔로 바로 뱉으면 한글이 깨집니다(cp949). UTF-8 파일로 주고받습니다. */
  const out = path.join(os.tmpdir(), `deck-notes-${process.pid}.json`);
  const py = `
import json
from pptx import Presentation
p = Presentation(r"""${file}""")
notes = []
for i, s in enumerate(p.slides, 1):
    if not s.has_notes_slide: continue
    t = s.notes_slide.notes_text_frame.text.strip()
    if t: notes.append({"page": i, "text": t})
with open(r"""${out}""", "w", encoding="utf-8") as f:
    json.dump({"total": len(p.slides), "notes": notes}, f, ensure_ascii=False)
`;
  const tmp = path.join(os.tmpdir(), `deck-notes-${process.pid}.py`);
  fs.writeFileSync(tmp, py, 'utf8');
  const r = spawnSync('python', [tmp], { encoding: 'utf8', maxBuffer: 1 << 24 });
  fs.unlinkSync(tmp);
  if(r.status !== 0) die('PowerPoint 노트를 못 읽었습니다:\n' + (r.stderr || ''));
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.unlinkSync(out);
  return { title: path.basename(file), total: j.total, notes: j.notes };
}

/* ── 보여주기 ── */
function show({ title, total, notes }, onlyMarked){
  const picked = onlyMarked
    ? notes.map(n => ({ ...n, text: n.text.split('\n').filter(l => l.trim().startsWith(MARK)).join('\n') }))
           .filter(n => n.text.trim())
    : notes;
  console.log(`■ ${title} — ${total}장 · 메모 있는 장 ${notes.length}개`
    + (onlyMarked ? ` · '${MARK}' 붙은 장 ${picked.length}개` : ''));
  if(!picked.length){
    console.log(onlyMarked
      ? `\n고쳐 달라는 줄(${MARK})이 없습니다.`
      : '\n메모가 없습니다.');
    return;
  }
  for(const n of picked){
    console.log(`\n── ${n.page}장 ` + '─'.repeat(Math.max(0, 40 - String(n.page).length)));
    for(const line of n.text.split('\n')){
      const mark = line.trim().startsWith(MARK) ? '  ▶ ' : '    ';
      console.log(mark + line.replace(new RegExp(`^\\s*${MARK}\\s*`), ''));
    }
  }
}

/* ── 시작 ── */
const pptx = flag('pptx');
if(pptx){
  if(!fs.existsSync(pptx)) die(`파일이 없습니다: ${pptx}`);
  show(fromPptx(path.resolve(pptx)), has('only'));
} else {
  const id = flag('id'), cid = flag('class', 'ai-2B');
  if(!id) die('자료 id 를 주세요.  예) node tools/deck-notes.mjs --id mtb9mukkdas19 --class ai-2B');
  show(await fromApp(cid, id), has('only'));
}
