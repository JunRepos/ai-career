/* ═══════════════════════════════════════
   book-picker.js — 책 고르기 (학습지 문항 type:'book')

   학생이 학습지 안에서 바로 책을 검색하고, 신청 조건을 만족하는 책만 고를 수 있게 합니다.
   고른 책은 { title, author, publisher, year, price, isbn } 로 답안에 저장되고,
   선생님 CSV 에서 열이 하나씩 나뉘어 나옵니다 (사서 선생님께 그대로 보낼 수 있게).

   신청 조건 — 학교 기준이 바뀌면 아래 세 숫자만 고치면 됩니다.
     · 도서관에 없는 책          (library-holdings.js 의 제목과 대조)
     · 절판이 아닌 책            (카카오 status + 알라딘 stockStatus 교차확인)
     · 정가 BOOK_PRICE_MIN ~ MAX
     · 진로 도서는 BOOK_YEAR_MIN 년 이후 — 문학은 예외라 자동 판정이 안 됩니다.
       분야 정보를 주는 API 가 없어서, 경고만 띄우고 판단은 학생에게 맡깁니다.
═══════════════════════════════════════ */

const BOOK_PRICE_MIN = 7000;
const BOOK_PRICE_MAX = 20000;
const BOOK_YEAR_MIN  = 2024;

/* 카카오 도서 검색 REST 키.
   ⚠ 공개 페이지에 올라가므로 developers.kakao.com 에서
      플랫폼 > Web 사이트 도메인을 이 앱 주소로 제한해 두세요. */
const BOOK_KAKAO_KEY = 'dc9982ba6407b017f32c1e5d4150b785';
/* 알라딘 — 절판 교차확인용 (카카오 status 는 비어 있는 경우가 잦습니다) */
const BOOK_TTB_KEY = 'ttbcdjsdj19981946001';

/* ── 제목 맞대보기 ──
   ISBN 이 없어 제목으로만 대조하므로, 판본 차이(괄호·권수·개정판)는 지우고 봅니다.
   부분일치는 6자 이상일 때만 — 소장 도서가 6천 권이라 기준이 낮으면 엉뚱하게 걸립니다. */
function _bookNormTitle(t){
  return String(t || '').toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/[\s\-–—:·,.'"“”‘’!?0-9]/g, '')
    .replace(/양장본|리커버|개정판|세트|합본|에디션|스페셜/g, '');
}

let _bookHoldingsIdx = null;
function _bookHoldings(){
  if(_bookHoldingsIdx) return _bookHoldingsIdx;
  const list = (typeof LIB_HOLDINGS === 'undefined' ? [] : LIB_HOLDINGS);
  _bookHoldingsIdx = list.map(t => ({ title: t, norm: _bookNormTitle(t) })).filter(h => h.norm);
  return _bookHoldingsIdx;
}

/* 도서관에 있는 책이면 소장 목록의 제목을, 없으면 null 을 돌려줍니다. */
function bookInLibrary(title){
  const nt = _bookNormTitle(title);
  if(!nt) return null;
  const hit = _bookHoldings().find(h =>
    h.norm === nt ||
    (nt.length >= 6 && h.norm.includes(nt)) ||
    (h.norm.length >= 6 && nt.includes(h.norm)));
  return hit ? hit.title : null;
}

/* ── 카카오 도서 검색 ──
   price 가 정가, sale_price 가 할인가입니다. 신청서에는 정가를 씁니다. */
async function bookSearch(query){
  const digits = String(query).replace(/-/g, '');
  const isIsbn = /^\d{10}$|^97[89]\d{10}$/.test(digits);
  const url = 'https://dapi.kakao.com/v3/search/book?size=12'
    + (isIsbn ? '&target=isbn' : '')
    + '&query=' + encodeURIComponent(isIsbn ? digits : query);

  const r = await fetch(url, { headers: { Authorization: 'KakaoAK ' + BOOK_KAKAO_KEY } });
  if(r.status === 401) throw new Error('검색 키가 만료됐어요. 선생님께 알려주세요.');
  if(!r.ok) throw new Error('검색 서버에 연결하지 못했어요 (' + r.status + ')');

  const data = await r.json();
  return (data.documents || []).map(d => {
    const isbns = String(d.isbn || '').split(/\s+/);
    return {
      title: d.title,
      author: (d.authors || []).join(', ')
        + ((d.translators && d.translators.length) ? ' (옮김: ' + d.translators.join(', ') + ')' : ''),
      publisher: d.publisher,
      year: String(d.datetime || '').slice(0, 4),
      price: Number(d.price) || 0,
      isbn: isbns.find(x => x.length === 13) || '',
      cover: d.thumbnail || '',
      status: (d.status || '').trim(),
    };
  }).filter(b => b.title);
}

/* ── 알라딘 절판 교차확인 (JSONP — 알라딘이 CORS 를 안 열어줍니다) ──
   실패하면 null 을 돌려주고, 카카오 status 만 씁니다. 검색 자체는 막지 않습니다. */
let _bookCbSeq = 0;
function bookAladinStatus(isbn13){
  return new Promise(resolve => {
    if(!isbn13){ resolve(null); return; }
    const cb = '__bk' + (++_bookCbSeq);
    const s = document.createElement('script');
    const timer = setTimeout(() => { done(); resolve(null); }, 5000);
    function done(){ clearTimeout(timer); delete window[cb]; s.remove(); }
    window[cb] = data => {
      done();
      try {
        const it = (data.item || [])[0];
        resolve(it ? { status: (it.stockStatus || '').trim(), price: Number(it.priceStandard) || 0 } : null);
      } catch(e){ resolve(null); }
    };
    s.onerror = () => { done(); resolve(null); };
    s.src = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=' + encodeURIComponent(BOOK_TTB_KEY)
      + '&itemIdType=ISBN13&ItemId=' + encodeURIComponent(isbn13) + '&output=js&callback=' + cb;
    document.head.appendChild(s);
  });
}

function bookSoldOut(b){
  const s = (b.status || '').trim();
  return !!s && /절판|품절/.test(s);
}

/* ── 신청 조건 판정 ──
   blocked 가 true 면 이 책은 고를 수 없습니다.
   연도는 blocked 로 잡지 않습니다 — 문학이면 통과라서 학생이 판단해야 합니다. */
function bookVerdict(b){
  const notes = [];
  let blocked = false;

  if(bookSoldOut(b)){
    blocked = true;
    notes.push({ kind: 'bad', text: '이 책은 현재 ' + (b.status || '절판') + ' 상태예요. 신청할 수 없어요.' });
  }

  const owned = bookInLibrary(b.title);
  if(owned){
    blocked = true;
    notes.push({ kind: 'bad', text: '이미 우리 도서관에 있는 책이에요 — 「' + owned + '」. '
      + '도서관에 있는 책은 새로 사지 않고 빌려서 읽습니다. 도서관에서 바로 대출하세요! '
      + '제목만 비슷한 다른 책이라면 선생님께 말씀해 주세요.' });
  }

  if(!b.price){
    blocked = true;
    notes.push({ kind: 'bad', text: '정가를 확인하지 못했어요. 다른 책을 고르거나 선생님께 말씀해 주세요.' });
  } else if(b.price < BOOK_PRICE_MIN || b.price > BOOK_PRICE_MAX){
    blocked = true;
    notes.push({ kind: 'bad', text: '정가가 ' + bookPrice(b.price) + '이에요. 신청할 수 있는 가격은 '
      + bookPrice(BOOK_PRICE_MIN) + ' ~ ' + bookPrice(BOOK_PRICE_MAX) + '이에요.' });
  }

  const yr = Number(b.year) || 0;
  const yearWarn = !blocked && yr && yr < BOOK_YEAR_MIN;
  if(yearWarn){
    notes.push({ kind: 'warn', text: yr + '년에 나온 책이에요. 진로 관련 책이라면 신청할 수 없어요 — '
      + BOOK_YEAR_MIN + '년 이후에 나온 책만 됩니다. 소설·시·에세이 같은 문학이라면 출판년도와 상관없이 신청할 수 있어요.' });
  }

  if(!blocked && !yearWarn){
    notes.push({ kind: 'ok', text: '신청할 수 있는 책이에요. 도서관에 없고, 지금 살 수 있고, 정가도 조건에 맞아요.' });
  }
  return { blocked, yearWarn, notes };
}

function bookPrice(n){
  const v = Number(n) || 0;
  return v ? v.toLocaleString('ko-KR') + '원' : '정가 미확인';
}

/* 신청서 한 줄 — 선생님이 사서 선생님께 보낼 때 쓰는 형식 */
function bookLine(b){
  if(!b || !b.title) return '';
  return [b.title, b.author || '저자 미확인', b.publisher || '출판사 미확인',
          b.year || '출판년도 미확인', bookPrice(b.price)].join(' / ');
}
