/* ═══════════════════════════════════════
   tools/deck-upload.mjs — 슬라이드 PNG 를 두 반에 올립니다

   앱의 '새 자료 올리기' 와 똑같은 자리에 똑같은 모양으로 넣습니다.
     Storage : slides/{반}/{stamp}_{000}_{파일명}
     DB      : slides/{반}/decks/{자료id} = { title, updatedAt, images:[{name,url,path}] }

   ⚠ 여러 반에 올려도 **자료 id 는 하나**로 통일합니다 (앱 규칙).
   ⚠ '이번 시간에 열기'(live)는 건드리지 않습니다. 수업 때 선생님이 직접 엽니다.

   쓰는 법
     node tools/deck-upload.mjs <PNG폴더> --title "5. 지능적 탐색" --classes ai-2B,ai-2D
     node tools/deck-upload.mjs --list                  # 반별 자료 목록만 보기
     node tools/deck-upload.mjs --dry <PNG폴더>          # 올릴 것만 확인하고 멈춤
═══════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const DB     = 'https://sindong-informatics-default-rtdb.firebaseio.com';
const BUCKET = 'sindong-informatics.firebasestorage.app';
const CLASSES_DEFAULT = ['ai-2B', 'ai-2D'];

const die = m => { console.error('✖ ' + m); process.exit(1); };

/* ── 인자 ── */
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : def;
};
const has = name => argv.includes('--' + name);
const dir = argv.find(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true);

/* ── DB 읽기·쓰기 (규칙이 열려 있어 인증 없이 됩니다) ── */
async function dbGet(p){
  const r = await fetch(`${DB}/${p}.json`);
  if(!r.ok) throw new Error(`DB 읽기 실패 ${r.status} — ${p}`);
  return r.json();
}
async function dbPut(p, body){
  const r = await fetch(`${DB}/${p}.json`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if(!r.ok) throw new Error(`DB 쓰기 실패 ${r.status} — ${p} — ${await r.text()}`);
  return r.json();
}

/* Storage 업로드 — 앱(웹 SDK)이 만드는 것과 같은 다운로드 주소가 나옵니다.
   41장을 이어서 올리다 보면 중간에 한 번씩 끊깁니다(실제로 그랬습니다). 앱의
   uploadFile() 처럼 세 번까지 다시 시도합니다. */
const TRIES = 3;
async function upload(file, objPath){
  const buf = fs.readFileSync(file);
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(objPath)}`;
  let last = null;
  for(let t = 1; t <= TRIES; t++){
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: buf });
      if(!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      const j = await r.json();
      const token = (j.downloadTokens || '').split(',')[0];
      if(!token) throw new Error('다운로드 주소를 못 받았습니다');
      return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objPath)}?alt=media&token=${token}`;
    } catch(e){
      last = e;
      if(t < TRIES) await new Promise(r => setTimeout(r, 1500 * t));
    }
  }
  throw new Error(`올리기 실패(${TRIES}번 시도) — ${objPath} — ${last?.message || last}`);
}
async function del(objPath){
  await fetch(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objPath)}`,
    { method: 'DELETE' }).catch(() => {});
}

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
/* 슬라이드1.PNG … 슬라이드41.PNG 를 숫자 순서로 (앱의 정렬과 같게) */
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true });

async function list(cids){
  for(const cid of cids){
    const decks = (await dbGet(`slides/${cid}/decks`)) || {};
    const live  = (await dbGet(`slides/${cid}/live`)) || {};
    console.log(`\n■ ${cid} — 자료 ${Object.keys(decks).length}개 · 이번 시간에 열린 것: ${live.deckId || '(없음)'}`);
    for(const [id, d] of Object.entries(decks))
      console.log(`   ${id === live.deckId ? '▶' : ' '} ${id}  ${(d.images || []).length}장  ${d.title || ''}`);
  }
}

/* 이미 올린 자료에서 한 장만 갈아 끼웁니다 — 한 장 고쳤다고 41장을 다시 올리지 않게 */
async function replacePage(cids, deckId, page, file){
  const idx = page - 1;
  for(const cid of cids){
    const deck = await dbGet(`slides/${cid}/decks/${deckId}`);
    if(!deck) throw new Error(`${cid} 에 자료 ${deckId} 가 없습니다`);
    const images = deck.images || [];
    if(!images[idx]) throw new Error(`${cid} 의 자료에 ${page}번 장이 없습니다 (${images.length}장)`);
    const old = images[idx];
    const stamp = Date.now();
    const objPath = `slides/${cid}/${stamp}_${String(idx).padStart(3, '0')}_${path.basename(file)}`;
    const url = await upload(file, objPath);
    images[idx] = { name: path.basename(file), url, path: objPath };
    await dbPut(`slides/${cid}/decks/${deckId}`, {
      ...deck, images, updatedAt: new Date().toISOString(),
    });
    if(old.path) await del(old.path);            // 옛 그림은 지웁니다 (용량만 먹습니다)
    console.log(`  ${cid} — ${page}번 장 교체 ✔`);
  }
  console.log('\n■ 올린 뒤 DB 를 다시 읽어 확인');
  for(const cid of cids){
    const d = await dbGet(`slides/${cid}/decks/${deckId}`);
    const im = (d.images || [])[idx];
    const st = im ? (await fetch(im.url, { method: 'HEAD' })).status : '없음';
    console.log(`  ${cid} — ${(d.images || []).length}장 · ${page}번 장 "${im?.name}" HTTP ${st}`);
  }
}

/* 올린 자료에서 한 장을 빼냅니다.
   ⚠ 뒤쪽 장의 쪽 번호가 하나씩 당겨집니다. 학생 메모는 쪽 번호로 저장되므로
     (slides/{반}/notes/{자료id}/{학번}/{쪽}) **메모가 있으면 어긋납니다.**
     그래서 메모가 하나라도 있으면 멈춥니다. */
async function removePage(cids, deckId, page){
  const idx = page - 1;
  for(const cid of cids){
    const notes = await dbGet(`slides/${cid}/notes/${deckId}`);
    if(notes && Object.keys(notes).length)
      throw new Error(`${cid} 에 이 자료의 학생 메모가 있습니다 (${Object.keys(notes).length}명). `
        + '장을 빼면 쪽 번호가 밀려 메모가 어긋납니다 — 손으로 확인하세요.');
  }
  for(const cid of cids){
    const deck = await dbGet(`slides/${cid}/decks/${deckId}`);
    if(!deck) throw new Error(`${cid} 에 자료 ${deckId} 가 없습니다`);
    const images = deck.images || [];
    if(!images[idx]) throw new Error(`${cid} 의 자료에 ${page}번 장이 없습니다 (${images.length}장)`);
    const [gone] = images.splice(idx, 1);
    await dbPut(`slides/${cid}/decks/${deckId}`, {
      ...deck, images, updatedAt: new Date().toISOString(),
    });
    if(gone.path) await del(gone.path);
    console.log(`  ${cid} — ${page}번 장 뺐습니다 (${images.length + 1}장 → ${images.length}장)`);
  }
  console.log('\n■ 뺀 뒤 DB 를 다시 읽어 확인');
  for(const cid of cids){
    const d = await dbGet(`slides/${cid}/decks/${deckId}`);
    console.log(`  ${cid} — ${(d.images || []).length}장 · ${page}번 장은 이제 "${(d.images || [])[idx]?.name}"`);
  }
}

/* ── 시작 ── */
const cids = (flag('classes') || CLASSES_DEFAULT.join(',')).split(',').map(s => s.trim()).filter(Boolean);

if(has('remove-page')){
  const page = parseInt(flag('remove-page'), 10);
  const deckId = flag('id');
  if(!deckId || !page) die('--remove-page <쪽> --id <자료id> 를 주세요.');
  console.log(`${cids.join(', ')} 의 자료 ${deckId} 에서 ${page}번 장을 뺍니다\n`);
  await removePage(cids, deckId, page);
  process.exit(0);
}

if(has('list')){ await list(cids); process.exit(0); }

if(has('replace-page')){
  const page = parseInt(flag('replace-page'), 10);
  const deckId = flag('id');
  const file = flag('file');
  if(!deckId || !page || !file) die('--replace-page <쪽> --id <자료id> --file <PNG> 를 모두 주세요.');
  if(!fs.existsSync(file)) die(`파일이 없습니다: ${file}`);
  console.log(`${cids.join(', ')} 의 자료 ${deckId} 에서 ${page}번 장을 ${path.basename(file)} 로 갈아 끼웁니다\n`);
  await replacePage(cids, deckId, page, file);
  process.exit(0);
}

if(!dir || !fs.existsSync(dir)) die('PNG 폴더를 찾을 수 없습니다. 예) node tools/deck-upload.mjs "tools/samples/…_png"');
const files = fs.readdirSync(dir).filter(f => /\.png$/i.test(f)).sort(natural);
if(!files.length) die(`${dir} 안에 PNG 가 없습니다.`);

const title = flag('title') || `수업자료 (${files.length}장)`;
console.log(`올릴 것 — ${files.length}장 · 제목 "${title}" · 반 ${cids.join(', ')}`);
console.log(`  첫 장 ${files[0]} … 끝 장 ${files[files.length - 1]}`);

if(has('dry')){ console.log('\n--dry 라서 여기서 멈춥니다.'); process.exit(0); }

const deckId = flag('id') || genId();
const stamp  = Date.now();
console.log(`자료 id — ${deckId}\n`);

const done = [], failed = [];
for(const cid of cids){
  const images = [];
  try {
    for(let i = 0; i < files.length; i++){
      const objPath = `slides/${cid}/${stamp}_${String(i).padStart(3, '0')}_${files[i]}`;
      const url = await upload(path.join(dir, files[i]), objPath);
      images.push({ name: files[i], url, path: objPath });
      process.stdout.write(`\r  ${cid}  ${i + 1}/${files.length}`);
    }
    await dbPut(`slides/${cid}/decks/${deckId}`, {
      title, updatedAt: new Date().toISOString(), images,
    });
    console.log(`\r  ${cid}  ${files.length}/${files.length}  ✔ 올렸습니다`);
    done.push(cid);
  } catch(e){
    /* 한 반이 실패하면 그 반의 조각 파일은 지웁니다 — 반쪽짜리 자료를 남기지 않습니다 */
    console.log(`\r  ${cid}  ✖ ${e.message}`);
    for(const im of images) await del(im.path);
    failed.push(cid);
  }
}

/* 실제로 DB 를 다시 읽어 확인합니다 */
console.log('\n■ 올린 뒤 DB 를 다시 읽어 확인');
for(const cid of cids){
  const d = await dbGet(`slides/${cid}/decks/${deckId}`);
  const live = (await dbGet(`slides/${cid}/live`)) || {};
  console.log(`  ${cid} — ${d ? `${(d.images || []).length}장 · "${d.title}"` : '✖ 없음'}`
    + ` · 이번 시간에 열린 것: ${live.deckId || '(없음)'}`);
}
if(failed.length) die(`실패한 반: ${failed.join(', ')}`);
console.log(`\n자료 id — ${deckId}  (두 반 같은 id)`);
console.log('학생에게 보이게 하려면 앱에서 이 자료의 [이번 시간에 열기] 를 누르세요.');
