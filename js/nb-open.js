/* ═══════════════════════════════════════
   nb-open.js — 🔒 평가용 노트북 열고 닫기 (2026-10-27)

   왜 — 수행평가 노트북을 사이트에 미리 올려 두되, **수업 시간에만** 학생에게
   보이게 합니다. 미리 올리면 학생 목록에 그냥 보여서 집에서 풀어 올 수 있습니다.
   1차 수행평가의 `assess1Open` 과 같은 생각입니다 (views/assess1.js).

   ━━ 어디에 적히나 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     notebooks/{반}/{노트북id}/locked = true   ← 이 노트북은 잠금 (올릴 때 적습니다)
     notebookOpen/{반}/{노트북id}   = true     ← 지금 열려 있음 (선생님이 누릅니다)

   `locked` 가 없으면 **지금까지와 똑같이** 늘 보입니다. 옛 노트북은 하나도
   건드리지 않습니다.

   ━━ 누가 보나 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     선생님 — 늘 보입니다. 잠긴 것에는 열기/닫기 단추가 붙습니다.
     학생   — 열려 있을 때만 보입니다. 보고 있는 중에 닫으면 목록으로 나갑니다.
     test   — 확인용 계정은 닫혀 있어도 보입니다 (1차와 같은 규칙).
═══════════════════════════════════════ */

let NB_OPEN = {};        // { [반id]: { [노트북id]: true } }
let NB_OPEN_WATCH = null;  // { cid, ref, fn }

function _nbOpenRef(cid){ return db.ref(`notebookOpen/${cid}`); }

function _nbIsTest(){
  return !!ST_USER && String(ST_USER.number).toLowerCase() === 'test';
}

/* 이 노트북을 지금 학생이 볼 수 있나 */
function nbIsOpen(cid, nbId){
  return !!(NB_OPEN[cid] && NB_OPEN[cid][nbId]);
}
function nbVisibleToStudent(cid, nb){
  if(!nb || !nb.locked) return true;        // 잠그지 않은 것은 늘 보입니다
  return nbIsOpen(cid, nb.id) || _nbIsTest();
}

async function loadNbOpen(cid){
  if(!cid) return;
  try {
    const s = await _nbOpenRef(cid).get();
    NB_OPEN[cid] = s.exists() ? (s.val() || {}) : {};
  } catch(err){
    console.warn('[평가 노트북] 상태 로드 실패:', err.message || err);
    if(!NB_OPEN[cid]) NB_OPEN[cid] = {};
  }
  return NB_OPEN[cid];
}

/* 선생님이 열고 닫으면 학생 화면이 새로고침 없이 따라오게 */
function nbWatchOpen(cid){
  if(!cid) return;
  if(NB_OPEN_WATCH && NB_OPEN_WATCH.cid === cid) return;
  nbUnwatchOpen();
  const ref = _nbOpenRef(cid);
  const fn = s => {
    NB_OPEN[cid] = s.val() || {};
    // 학생이 보고 있던 노트북이 닫혔으면 목록으로 내보냅니다
    if(VIEW === 'student' && SEL_NOTEBOOK && SEL_NOTEBOOK.locked
       && !nbVisibleToStudent(cid, SEL_NOTEBOOK)){
      if(typeof closeNotebook === 'function') closeNotebook();
      alert('선생님이 평가를 닫았습니다. 지금까지 한 것은 저장되어 있습니다.');
      return;
    }
    if(typeof render === 'function') render();
  };
  ref.on('value', fn, err => console.warn('[평가 노트북] 구독 실패:', err.message || err));
  NB_OPEN_WATCH = { cid, ref, fn };
}
function nbUnwatchOpen(){
  if(NB_OPEN_WATCH){ NB_OPEN_WATCH.ref.off('value', NB_OPEN_WATCH.fn); NB_OPEN_WATCH = null; }
}

/* 선생님이 누르는 것 — 열기/닫기 */
async function nbSetOpen(cid, nbId, on){
  await db.ref(`notebookOpen/${cid}/${nbId}`).set(on ? true : null);
  NB_OPEN[cid] = NB_OPEN[cid] || {};
  if(on) NB_OPEN[cid][nbId] = true; else delete NB_OPEN[cid][nbId];
}
