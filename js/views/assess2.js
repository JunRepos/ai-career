/* ═══════════════════════════════════════
   views/assess2.js — 📝 2차 수행평가 (인공지능 기초)
   기계학습 알고리즘을 적용하여 데이터 기반 문제 해결하기 · 영역 만점 25점

   (2026-10-27 선생님 — 「평가 탭에 2차 수행평가라고 탭을 생성한 다음에 거기다가
   넣어줘. 선생님은 수행평가에 내용을 확인 및 수정할 수 있어야」)

   노트북 목록에 섞여 있으면 찾기 어렵고, 평가용인지도 한눈에 안 보입니다.
   여기 한 자리에 모읍니다 — 문 여닫기 · 입장 비밀번호 · 내용 확인과 수정.

   문과 비밀번호는 js/nb-open.js 가 맡습니다.
     aiactivity/submissions/{반}/nbGate/{id} = 'closed' | 'open'
     aiactivity/submissions/{반}/nbPw/{id}   = {salt, iter, hash}
═══════════════════════════════════════ */

const A2_NB_ID = 'assess2fruit';   // verify/assess2-nb.py 가 올리는 id

function vTcAssess2(){
  if(TC_CLS?.type !== 'ai') return emptyBox('📝', '인공지능 기초 반에서만 씁니다.');

  // 노트북을 열어 놓은 상태면 그대로 노트북 화면을 보여 줍니다
  if(SEL_NOTEBOOK) return vNotebookDetail(true);

  const cid = TC_CLS.id;
  const nb = NOTEBOOKS.find(n => n.id === A2_NB_ID);
  const gated = nbIsGated(cid, A2_NB_ID);
  const open = nbIsOpen(cid, A2_NB_ID);
  const hasPw = nbHasPw(cid, A2_NB_ID);

  if(!nb){
    return `<div class="section">
      <div class="sec-title">📝 2차 수행평가</div>
      ${emptyBox('📭', '아직 올라오지 않았습니다. <code>python verify/assess2-nb.py --upload --replace</code> 로 올립니다.')}
    </div>`;
  }

  const stateLine = !gated
    ? '<b style="color:#C8102E">평가용으로 잠겨 있지 않습니다</b> — 학생에게 그냥 보입니다'
    : (open
        ? '🔓 <b>열림</b> — 지금 학생 목록에 보입니다'
        : '🔒 <b>닫힘</b> — 학생 목록에 보이지 않습니다');

  return `<div class="section">
    <div class="sec-title">📝 2차 수행평가 — 기계학습 알고리즘을 적용하여 데이터 기반 문제 해결하기</div>

    <div class="box-info" style="margin-bottom:10px">
      노트북 <b>15점</b>(전처리 근거 · 알고리즘 선정 · 성능 평가) +
      종이 논술 <b>10점</b>(문제 정의 · 결과 해석) · 기본점수 10점<br>
      <span style="color:var(--text2)">${esc(TC_CLS.name || cid)} · ${nb.cells?.length || 0}개 셀</span>
    </div>

    <div class="a2-card">
      <div class="a2-row">
        <div class="a2-k">지금 상태</div>
        <div class="a2-v">${stateLine}</div>
      </div>
      <div class="a2-row">
        <div class="a2-k">입장 비밀번호</div>
        <div class="a2-v">${hasPw
          ? '설정되어 있습니다 — 문이 열려 있어도 <b>맞혀야</b> 들어갑니다'
          : '<b>없습니다</b> — 문이 열리면 학생이 바로 들어옵니다'}</div>
      </div>
      <div class="a2-btns">
        <button class="btn-p" data-action="open-notebook" data-nid="${A2_NB_ID}"
          title="학생이 보는 그대로 열립니다. 시뮬레이션이라 원본이 바뀌지 않습니다."
          >📖 내용 확인 · 수정</button>
        <button class="btn-s" data-action="nb-set-pw" data-nid="${A2_NB_ID}"
          >🔑 비밀번호 ${hasPw ? '바꾸기' : '정하기'}</button>
        ${gated ? `<button class="${open ? 'btn-danger' : 'btn-p'}"
          data-action="nb-toggle-open" data-nid="${A2_NB_ID}"
          >${open ? '🔒 닫기' : '🔓 학생에게 열기'}</button>` : ''}
      </div>
    </div>

    <div class="box-info" style="margin-top:12px">
      <b>📖 내용 확인 · 수정</b> 을 누르면 <b>🧪 시뮬레이션</b> 으로 열립니다 —
      블록을 끌어다 놓고 실행해 봐도 <b>원본이 바뀌지 않습니다.</b><br>
      내용을 정말 고치시려면 노트북 윗줄에서 <b>🧪 시뮬레이션 → ✏️ 원본 수정</b> 으로 바꾸세요.
      그 뒤에 한 것은 <b>학생이 받는 노트북에 그대로 저장됩니다.</b>
    </div>

    <div class="box-info" style="margin-top:8px">
      ⚠ 비밀번호는 <b>원래 글자를 저장하지 않습니다</b> (PBKDF2 해시만).
      다만 DB 규칙이 열려 있어 <b>작정하면 뚫립니다</b> — 확실한 잠금은 <b>문을 닫아 두는 것</b>입니다.
    </div>
  </div>`;
}
