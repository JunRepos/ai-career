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

let NB_GATE = {};          // { [반id]: { [노트북id]: 'closed'|'open' } }
let NB_GATE_WATCH = null;  // { cid, ref, fn }
let NB_SIM = true;         // 평가용 노트북을 선생님이 열었을 때 — true 면 원본을 안 건드립니다

function _nbGateRef(cid){ return db.ref(`aiactivity/submissions/${cid}/nbGate`); }

function _nbIsTest(){
  return !!ST_USER && String(ST_USER.number).toLowerCase() === 'test';
}

/* 이 노트북이 평가용인가 (문이 달려 있나) */
function nbIsGated(cid, nbId){
  return !!(NB_GATE[cid] && NB_GATE[cid][nbId]);
}
/* 지금 열려 있나 */
function nbIsOpen(cid, nbId){
  return (NB_GATE[cid] || {})[nbId] === 'open';
}
/* 학생 목록에 보일 것인가 */
function nbVisibleToStudent(cid, nb){
  if(!nb || !nbIsGated(cid, nb.id)) return true;   // 평가용이 아니면 늘 보입니다
  return nbIsOpen(cid, nb.id) || _nbIsTest();
}
/* 선생님이 이 노트북을 시뮬레이션으로 보고 있나 — 저장을 막는 자리에서 씁니다 */
function nbInSim(){
  return !!(IS_TC && TC_CLS && SEL_NOTEBOOK
            && nbIsGated(TC_CLS.id, SEL_NOTEBOOK.id) && NB_SIM);
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
