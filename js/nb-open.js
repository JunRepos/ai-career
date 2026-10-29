/* ═══════════════════════════════════════
   nb-open.js — 🔒 평가용 노트북 열고 닫기 · 선생님 시뮬레이션 (2026-10-27)

   왜 — 수행평가 노트북을 사이트에 미리 올려 두되, **수업 시간에만** 학생에게
   보이게 합니다. 미리 올리면 학생 목록에 그냥 보여서 집에서 풀어 올 수 있습니다.
   1차 수행평가의 `assess1Open` 과 같은 생각입니다 (views/assess1.js).

   ━━ 어디에 적히나 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     aiactivity/submissions/{반}/nbGate/{노트북id} = 'closed' | 'open'

   **키가 있으면 평가용**이고, 없으면 지금까지와 똑같이 늘 보입니다.
   옛 노트북은 하나도 건드리지 않습니다.

   ⚠ 왜 notebooks/ 안이 아니라 여기인가 —
     database.rules.json 의 notebooks/$classId/$nbId 는 `$other: validate false` 라
     title · cells · createdAt **말고는 어떤 키도 거부**합니다 (401).
     규칙을 고치려면 Firebase 에 배포해야 하는데, 보안 설정이라 함부로 건드리지
     않습니다. aiactivity/submissions/{반} 은 쓰기가 열려 있어 그대로 씁니다.

   ━━ 누가 보나 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     선생님 — 늘 보입니다. 🔒 닫힘 / 🔓 열림 표시와 열기·닫기 단추가 붙습니다.
     학생   — 열려 있을 때만 보입니다. 보고 있는 중에 닫으면 목록으로 나갑니다.
     test   — 확인용 계정은 닫혀 있어도 보입니다 (1차와 같은 규칙).

   ━━ 선생님 시뮬레이션 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   (2026-10-27 선생님 — 「닫힌 상태로 선생님은 시뮬레이션 하고 수정할 수 있도록」)
   평가용 노트북을 선생님이 열면 **시뮬레이션**으로 시작합니다. 블록을 끌어다
   놓고 실행해 봐도 **원본이 바뀌지 않습니다.** 원본을 고치려면 윗줄에서
   「✏️ 원본 수정」 으로 바꿉니다.
     그냥 두면 선생님이 미리 풀어 본 답이 그대로 저장돼 학생이 그것을 받습니다.
═══════════════════════════════════════ */

/* { [반id]: { [노트북id]: 'closed' | 'open' | 'archived' } }

   · closed / open — **평가용**. 선생님이 열어야 학생에게 보입니다.
   · archived      — **보관**. 블록판으로 바뀐 **옛판**입니다 (2026-10-29 선생님 —
                     「똑같은 게 2개 있는데 헷갈리니까 학생들이 명확하게」).
                     학생 목록에서 **사라지고**, 선생님에게는 「보관」 표시와 함께
                     보입니다. 지우지 않는 까닭은 **학생 작업이 그 안에 있기** 때문입니다. */
let NB_GATE = {};
let NB_GATE_WATCH = null;  // { cid, ref, fn }
let NB_SIM = true;         // 평가용 노트북을 선생님이 열었을 때 — true 면 원본을 안 건드립니다

function _nbGateRef(cid){ return db.ref(`aiactivity/submissions/${cid}/nbGate`); }

function _nbIsTest(){
  return !!ST_USER && String(ST_USER.number).toLowerCase() === 'test';
}

/* 이 노트북의 상태 — 'closed' · 'open' · 'archived' · 없으면 undefined */
function nbState(cid, nbId){
  return (NB_GATE[cid] || {})[nbId];
}
/* 보관한 옛판인가 — 블록판으로 바뀌어 학생에게는 더 이상 내지 않는 것 */
function nbIsArchived(cid, nbId){
  return nbState(cid, nbId) === 'archived';
}
/* 이 노트북이 평가용인가 (문이 달려 있나) — 보관은 평가용이 아닙니다 */
function nbIsGated(cid, nbId){
  const st = nbState(cid, nbId);
  return st === 'closed' || st === 'open';
}
/* 지금 열려 있나 */
function nbIsOpen(cid, nbId){
  return (NB_GATE[cid] || {})[nbId] === 'open';
}
/* 학생 목록에 보일 것인가 */
function nbVisibleToStudent(cid, nb){
  if(!nb) return true;
  if(nbIsArchived(cid, nb.id)) return false;       // 보관한 옛판 — 학생에게 안 냅니다
  if(!nbIsGated(cid, nb.id)) return true;          // 평가용이 아니면 늘 보입니다
  return nbIsOpen(cid, nb.id) || _nbIsTest();
}
/* 선생님이 이 노트북을 시뮬레이션으로 보고 있나 — 저장을 막는 자리에서 씁니다 */
function nbInSim(){
  return !!(IS_TC && TC_CLS && SEL_NOTEBOOK
            && nbIsGated(TC_CLS.id, SEL_NOTEBOOK.id) && NB_SIM);
}

/* ── 지금 노트북을 **짜는 중**인가 (2026-10-28) ──
   빈칸 토글 · 설명 고치기 · 그림 넣기처럼 **원본을 바꾸는 손잡이**는
   이 셋이 모두 참일 때만 보여 줍니다.
     · 선생님이고
     · 🧪 시뮬레이션이 아니고 (저장되지 않는데 고친 줄 알면 안 됩니다)
     · 학생 진도를 들여다보는 중이 아니다 (그건 읽기 전용입니다)
   학생 화면에는 **어떤 경우에도** 나오지 않습니다. */
function nbCanAuthor(){
  if(typeof IS_TC === 'undefined' || !IS_TC) return false;
  if(typeof NB_VIEWING_STUDENT !== 'undefined' && NB_VIEWING_STUDENT) return false;
  return !nbInSim();
}

async function loadNbGate(cid){
  if(!cid) return;
  try {
    const s = await _nbGateRef(cid).get();
    NB_GATE[cid] = s.exists() ? (s.val() || {}) : {};
  } catch(err){
    console.warn('[평가 노트북] 상태 로드 실패:', err.message || err);
    if(!NB_GATE[cid]) NB_GATE[cid] = {};
  }
  return NB_GATE[cid];
}

/* 선생님이 열고 닫으면 학생 화면이 새로고침 없이 따라오게 */
function nbWatchGate(cid){
  if(!cid) return;
  if(NB_GATE_WATCH && NB_GATE_WATCH.cid === cid) return;
  nbUnwatchGate();
  const ref = _nbGateRef(cid);
  const fn = s => {
    NB_GATE[cid] = s.val() || {};
    // 학생이 보고 있던 평가가 닫혔으면 목록으로 내보냅니다
    if(!IS_TC && SEL_NOTEBOOK && !nbVisibleToStudent(cid, SEL_NOTEBOOK)){
      if(typeof closeNotebook === 'function') closeNotebook();
      alert('선생님이 평가를 닫았습니다. 지금까지 한 것은 저장되어 있습니다.');
      return;
    }
    if(typeof render === 'function') render();
  };
  ref.on('value', fn, err => console.warn('[평가 노트북] 구독 실패:', err.message || err));
  NB_GATE_WATCH = { cid, ref, fn };
}
function nbUnwatchGate(){
  if(NB_GATE_WATCH){ NB_GATE_WATCH.ref.off('value', NB_GATE_WATCH.fn); NB_GATE_WATCH = null; }
}

/* 선생님이 누르는 것 — 열기/닫기 */
async function nbSetOpen(cid, nbId, on){
  await _nbGateRef(cid).child(nbId).set(on ? 'open' : 'closed');
  NB_GATE[cid] = NB_GATE[cid] || {};
  NB_GATE[cid][nbId] = on ? 'open' : 'closed';
}

/* 📦 보관하기 / 되돌리기 (2026-10-29 선생님).
   **지우지 않습니다** — 학생 작업이 그 안에 있습니다. 목록에서만 뺍니다. */
async function nbSetArchived(cid, nbId, on){
  if(on) await _nbGateRef(cid).child(nbId).set('archived');
  else   await _nbGateRef(cid).child(nbId).remove();
  NB_GATE[cid] = NB_GATE[cid] || {};
  if(on) NB_GATE[cid][nbId] = 'archived';
  else   delete NB_GATE[cid][nbId];
}

/* ═══════════════ 🔑 입장 비밀번호 ═══════════════
   (2026-10-27 선생님 — 「토글이 켜져있어도 비밀번호로 들어갈 수 있게.
   비밀번호는 선생님이 설정할 수 있게」)

   문이 열려 있어도 **비밀번호를 맞혀야** 들어갑니다. 두 겹입니다.
     문이 닫힘 → 목록에 아예 안 보임
     문이 열림 + 비밀번호 있음 → 보이지만 비밀번호를 넣어야 들어감
     문이 열림 + 비밀번호 없음 → 그냥 들어감

   **비밀번호 자체는 어디에도 저장하지 않습니다.** 1차와 같은 PBKDF2-SHA256
   (무작위 salt · 25만 번)으로 바꾼 해시만 둡니다. 레포·코드·DB 어디에도
   원래 글자는 남지 않습니다.
     aiactivity/submissions/{반}/nbPw/{노트북id} = {salt, iter, hash}

   ⚠ 알아 둘 것 — DB 규칙이 열려 있어, 이 해시는 **마음먹으면 바꿔 끼울 수
     있습니다.** 1차 때 해시를 코드에 둔 까닭이 그것입니다. 여기서는 선생님이
     직접 정하실 수 있어야 해서 DB 에 둡니다. 「수업 전에 미리 들어가 보는 것」
     을 막는 잠금이지, 작정한 사람을 막는 잠금이 아닙니다.
     한 번 맞히면 그 **탭을 닫을 때까지만** 유지됩니다 (sessionStorage).
═══════════════════════════════════════════════ */

let NB_PW = {};        // { [반id]: { [노트북id]: {salt, iter, hash} } }
let NB_PW_ERR = '';    // 학생 화면에 보일 말
let NB_PW_BUSY = false;
let NB_PW_ASK = null;  // 지금 비밀번호를 묻고 있는 노트북 id

function _nbPwRef(cid){ return db.ref(`aiactivity/submissions/${cid}/nbPw`); }
const _nbHex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');

async function loadNbPw(cid){
  if(!cid) return;
  try {
    const s = await _nbPwRef(cid).get();
    NB_PW[cid] = s.exists() ? (s.val() || {}) : {};
  } catch(err){
    console.warn('[평가 노트북] 비밀번호 로드 실패:', err.message || err);
    if(!NB_PW[cid]) NB_PW[cid] = {};
  }
  return NB_PW[cid];
}

function nbHasPw(cid, nbId){ return !!(NB_PW[cid] && NB_PW[cid][nbId]); }

/* 이 탭에서 이미 맞혔나 */
function _nbPwKey(cid, nbId){
  const g = (NB_PW[cid] || {})[nbId];
  return 'nbpw:' + cid + ':' + nbId + ':' + (g ? String(g.hash).slice(0, 12) : '');
}
function nbPwPassed(cid, nbId){
  try { return sessionStorage.getItem(_nbPwKey(cid, nbId)) === '1'; } catch(e){ return false; }
}

/* 지금 이 노트북을 열려면 비밀번호를 물어야 하나 */
function nbNeedPw(cid, nbId){
  if(IS_TC) return false;                       // 선생님은 묻지 않습니다
  if(!nbIsGated(cid, nbId)) return false;
  if(!nbHasPw(cid, nbId)) return false;
  return !nbPwPassed(cid, nbId);
}

async function _nbDerive(pw, saltHex, iter){
  const salt = Uint8Array.from(String(saltHex).match(/../g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw),
                                            'PBKDF2', false, ['deriveBits']);
  return _nbHex(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, key, 256));
}

/* 학생이 넣은 것을 맞혀 봅니다 */
async function nbPwCheck(cid, nbId, pw){
  const g = (NB_PW[cid] || {})[nbId];
  if(!g) return true;
  const got = await _nbDerive(pw, g.salt, g.iter);
  if(got !== g.hash) return false;
  try { sessionStorage.setItem(_nbPwKey(cid, nbId), '1'); } catch(e){}
  return true;
}

/* 선생님이 정합니다. pw 가 비면 비밀번호를 없앱니다. */
async function nbSetPw(cid, nbId, pw){
  if(!pw){
    await _nbPwRef(cid).child(nbId).remove();
    if(NB_PW[cid]) delete NB_PW[cid][nbId];
    return null;
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iter = 250000;
  const saltHex = _nbHex(salt.buffer);
  const hash = await _nbDerive(pw, saltHex, iter);
  const rec = { salt: saltHex, iter, hash };
  await _nbPwRef(cid).child(nbId).set(rec);    // 원래 글자는 보내지 않습니다
  NB_PW[cid] = NB_PW[cid] || {};
  NB_PW[cid][nbId] = rec;
  return rec;
}
