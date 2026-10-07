/* ═══════════════════════════════════════
   slide-preload.js — 수업자료를 한 번에 받아 두기 (2026-10-07)

   왜 만들었나
     장을 넘길 때마다 그 장의 PNG 를 그때 받아 와서 끊겼습니다.
     수업자료를 열 때 **그 자료의 모든 장을 한 번에 받고 디코딩까지** 해 두면,
     그 뒤로는 넘길 때 네트워크도 디코딩도 없어 바로 바뀝니다.

   받아 둔 그림은 SL_IMG 에 Image 객체로 들고 있습니다.
   참조를 들고 있어야 브라우저가 디코딩한 것을 버리지 않습니다.

   쓰는 곳
     afterRender() → slEnsurePreload()   — 수업자료 화면이 그려질 때마다 확인
     처음 여는 자료면 책 펼치는 화면을 띄우고, 다 받으면 저절로 사라집니다.
═══════════════════════════════════════ */

const SL_IMG = new Map();        // url → HTMLImageElement (디코딩까지 끝낸 것)
const SL_DECK_READY = new Set(); // 다 받아 둔 자료 id
const SL_DECK_OPENED = new Set(); // 책을 이미 펼쳐 준 자료 id (한 자료에 한 번만)
let SL_PRELOADING = null;        // 지금 받는 중인 자료 id (중복 실행 막기)
let SL_PRELOAD_SEQ = 0;          // 화면을 여러 번 바꿔도 옛 작업이 덮지 않게

/* 이 자료가 이미 다 준비됐나 */
function slDeckReady(deck){
  return !!deck && SL_DECK_READY.has(deck.id);
}

/* 그림이 있는 장만 — 실습(게임) 장은 받을 것이 없습니다 */
function _slUrls(deck){
  return ((deck && deck.images) || [])
    .filter(im => im && im.url && im.type !== 'game')
    .map(im => im.url);
}

/* 약속 하나에 시간 제한을 겁니다 — 끝나지 않아도 넘어갑니다 */
function _slWithin(p, ms){
  return Promise.race([p, new Promise(r => setTimeout(r, ms))]);
}

/* 한 장 받기 — 다 받고 디코딩까지 끝나면 resolve.
   실패하거나 오래 걸려도 resolve 합니다 (한 장 때문에 수업이 멈추면 안 됩니다).

   ⚠ img.decode() 는 **창이 가려져 있으면 끝나지 않습니다.**
      그대로 기다리면 preload 가 6장에서 멈춰 버립니다(2026-10-07 확인).
      그래서 시간 제한을 걸고, 내려받기 자체에도 제한을 둡니다. */
function _slLoadOne(url){
  if(SL_IMG.has(url)) return Promise.resolve(SL_IMG.get(url));
  const got = new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      SL_IMG.set(url, img);
      // 디코딩까지 해 두면 화면에 올릴 때 다시 풀어내지 않습니다 (못 해도 그만).
      // 창이 가려져 있으면 decode() 가 끝나지 않으므로 아예 건너뜁니다 — 보일 때 알아서 합니다.
      if(img.decode && !document.hidden){
        _slWithin(img.decode().catch(() => {}), 1200).then(() => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  return _slWithin(got, 15000);          // 한 장에 15초까지만 기다립니다
}

/* 자료 하나를 받기.

   돌려주는 약속은 **앞의 OPEN_N 장**이 들어오면 바로 끝납니다 — 책을 그때 펼칩니다.
   나머지는 뒤에서 계속 받습니다. 60장짜리를 다 받으려면 20초 가까이 걸리는데,
   선생님은 1장부터 보시므로 그동안 기다릴 이유가 없습니다.
   (다 받으면 SL_DECK_READY 에 들어가 다음에는 책을 다시 펼치지 않습니다)

   onProgress(받은 수, 기다리는 수) 가 한 장마다 불립니다. */
const SL_OPEN_N = 10;      // 이만큼 들어오면 화면을 엽니다
const SL_LANES = 10;       // 한 번에 받는 수

function slPreloadDeck(deck, onProgress){
  if(!deck) return Promise.resolve(true);
  if(slDeckReady(deck)) return Promise.resolve(true);
  const urls = _slUrls(deck);
  if(!urls.length){ SL_DECK_READY.add(deck.id); return Promise.resolve(true); }

  const seq = ++SL_PRELOAD_SEQ;
  SL_PRELOADING = deck.id;
  const target = Math.min(SL_OPEN_N, urls.length);
  let done = 0;
  let openNow;
  const opened = new Promise(r => { openNow = r; });
  if(onProgress) onProgress(0, target);

  let next = 0;
  async function lane(){
    while(next < urls.length){
      const i = next++;
      await _slLoadOne(urls[i]);
      done++;
      if(seq === SL_PRELOAD_SEQ && onProgress) onProgress(Math.min(done, target), target);
      if(done >= target) openNow(true);
    }
  }
  Promise.all(Array.from({length: Math.min(SL_LANES, urls.length)}, lane)).then(() => {
    if(seq === SL_PRELOAD_SEQ){
      SL_DECK_READY.add(deck.id);
      SL_PRELOADING = null;
    }
  });
  return opened;
}

/* ── 책 펼치는 화면 ──
   #root 밖(body 바로 아래)에 둡니다. render() 가 #root 를 통째로 갈아 끼우므로
   안에 두면 글자가 바뀔 때마다 사라집니다. */
function _slLoaderEl(){
  let el = document.getElementById('sl-loader');
  if(el) return el;
  el = document.createElement('div');
  el.id = 'sl-loader';
  el.className = 'sl-loader';
  el.innerHTML = `
    <div class="sl-book" aria-hidden="true">
      <div class="sl-book-back"></div>
      <div class="sl-book-page p1"></div>
      <div class="sl-book-page p2"></div>
      <div class="sl-book-page p3"></div>
      <div class="sl-book-cover"></div>
    </div>
    <div class="sl-loader-title" id="sl-loader-title">수업자료를 펼치는 중</div>
    <div class="sl-loader-bar"><i id="sl-loader-fill"></i></div>
    <div class="sl-loader-sub" id="sl-loader-sub">0 / 0장</div>`;
  document.body.appendChild(el);
  // 다음 프레임에 on 을 붙여야 애니메이션이 처음부터 돕니다
  requestAnimationFrame(() => el.classList.add('on'));
  return el;
}

function _slLoaderShow(title){
  const el = _slLoaderEl();
  el.classList.remove('done');
  const t = document.getElementById('sl-loader-title');
  if(t) t.textContent = title || '수업자료를 펼치는 중';
}

function _slLoaderProgress(done, total){
  const fill = document.getElementById('sl-loader-fill');
  const sub = document.getElementById('sl-loader-sub');
  if(fill) fill.style.width = (total ? Math.round(done / total * 100) : 0) + '%';
  if(sub) sub.textContent = `${done} / ${total}장`;
}

function _slLoaderHide(){
  const el = document.getElementById('sl-loader');
  if(!el) return;
  el.classList.add('done');           // 책이 활짝 펴지면서 사라집니다
  setTimeout(() => el.remove(), 520);
}

/* ── 화면이 그려질 때마다 확인 ──
   수업자료를 보고 있고 그 자료를 아직 안 받았으면 받습니다. */
function slEnsurePreload(){
  if(typeof curDeck !== 'function') return;
  const onSlides = !!document.querySelector('.sl-stage, .sl-thumbs, .pv-wrap');
  const deck = curDeck();
  if(!onSlides || !deck || !deck.id){ _slLoaderHide(); return; }
  if(slDeckReady(deck) || SL_DECK_OPENED.has(deck.id)){ _slLoaderHide(); return; }
  if(SL_PRELOADING === deck.id) return;        // 이미 받는 중

  const total = _slUrls(deck).length;
  if(!total){ SL_DECK_READY.add(deck.id); return; }

  SL_DECK_OPENED.add(deck.id);                 // 책은 자료마다 한 번만 펼칩니다
  _slLoaderShow(deck.title ? deck.title : '수업자료를 펼치는 중');

  const t0 = Date.now();
  // 수업이 멈추면 안 되므로, 오래 걸리면 화면부터 열어 주고 나머지는 뒤에서 받습니다
  const giveUp = setTimeout(_slLoaderHide, 12000);

  slPreloadDeck(deck, _slLoaderProgress).then(() => {
    clearTimeout(giveUp);
    // 책 펼치는 동작이 번쩍이지 않게 최소 0.9초는 보여 줍니다
    setTimeout(_slLoaderHide, Math.max(0, 900 - (Date.now() - t0)));
    // 받아 둔 그림으로 지금 장을 바로 갈아 끼웁니다
    slSwapNow();
  });
}

/* 화면에 떠 있는 <img> 를 받아 둔 것으로 바꿔 끼웁니다.
   같은 주소면 브라우저가 캐시에서 바로 꺼내 쓰므로 깜빡임이 없습니다. */
function slSwapNow(){
  document.querySelectorAll('.sl-img, .pv-img').forEach(el => {
    const cached = SL_IMG.get(el.src);
    if(cached && cached.naturalWidth) el.decoding = 'sync';
  });
}

/* 다음 장을 미리 받아 두기 — 아직 통째로 안 받은 상태에서도 넘김이 덜 끊깁니다 */
function slWarmNeighbors(page){
  const deck = (typeof curDeck === 'function') ? curDeck() : null;
  const imgs = (deck && deck.images) || [];
  [page + 1, page + 2, page - 1].forEach(i => {
    const im = imgs[i];
    if(im && im.url && im.type !== 'game') _slLoadOne(im.url);
  });
}
