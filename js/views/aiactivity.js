/* ═══════════════════════════════════════
   views/aiactivity.js — 학습지

   정의: aiactivity-data.js (기본) + Firebase (선생님이 만든 것)
   학생: 활동 목록 → 작성(자동 저장) → 제출
   선생님: 활동 만들기·수정 + 열기/닫기 + 학생별 답안 확인 + CSV
═══════════════════════════════════════ */

/* ── 도트 숫자 (3×5) — 문항 번호를 사이트의 도트 언어로 표기 ── */
const DOT_DIGITS = {
  '0': ['###','#.#','#.#','#.#','###'],
  '1': ['.#.','##.','.#.','.#.','###'],
  '2': ['###','..#','###','#..','###'],
  '3': ['###','..#','###','..#','###'],
  '4': ['#.#','#.#','###','..#','..#'],
  '5': ['###','#..','###','..#','###'],
  '6': ['###','#..','###','#.#','###'],
  '7': ['###','..#','..#','..#','..#'],
  '8': ['###','#.#','###','#.#','###'],
  '9': ['###','#.#','###','..#','###'],
};

function _dotNum(n){
  const digits = String(n).split('').map(ch => {
    const rows = DOT_DIGITS[ch] || DOT_DIGITS['0'];
    const cells = rows.join('').split('')
      .map(c => `<i class="${c === '#' ? 'on' : ''}"></i>`).join('');
    return `<span class="dnum-d">${cells}</span>`;
  }).join('');
  return `<span class="dnum">${digits}</span>`;
}

/* ═══════════════════════════════════════
   학생 — 학습지
═══════════════════════════════════════ */

function vStAiActivity(){
  /* 풀고 있는 학습지가 정해져 있으면 그것부터 그립니다.
     단원에 걸어둔 학습지는 '학생에게 보내기' 를 안 눌러도 열려야 하는데,
     열림 목록부터 검사하면 잠김 화면으로 떨어졌습니다. */
  if(AIA_VIEW === 'do' && AIA_SEL) return _vStAiaDo();

  const list = aiaOpenFor(SEL_CLS);
  if(!list.length) return emptyBox('🔒', '지금 열려 있는 학습지가 없어요. 선생님 안내를 기다려주세요.');

  const cards = list.map(a => `
    <button class="aia-row" data-action="aia-pick" data-aid="${esc(a.id)}">
      <div class="aia-row-body">
        <div class="aia-row-sub">${esc(a.subtitle || '학습지')}</div>
        <div class="aia-row-title">${esc(a.title)}</div>
        <div class="aia-row-meta">문항 ${(a.questions || []).length}개</div>
      </div>
      <span class="aia-row-go">→</span>
    </button>`).join('');

  return `<div class="aia-rows">${cards}</div>`;
}

function _vStAiaDo(){
  const act = AIA_SEL;
  const qs = act.questions || [];
  const submitted = !!AIA_SUB?.submittedAt;

  // 안내(note)는 번호를 안 매기고, 답을 쓰는 문항만 1,2,3… 으로 셉니다
  let no = 0;
  const body = qs.map(q => _aiaQuestion(q, (q.type === 'note') ? null : ++no)).join('');

  const status = submitted
    ? `<span class="rep-chip done">제출 완료 · ${fmtDt(AIA_SUB.submittedAt)}</span>`
    : `<span class="rep-chip">아직 제출하지 않음</span>`;
  const saved = AIA_SAVING ? '<span class="rep-saving">저장 중…</span>'
    : AIA_SUB?.updatedAt ? `<span class="rep-saved">마지막 저장 ${fmtDt(AIA_SUB.updatedAt)}</span>` : '';

  return `<button class="rep-back" data-action="aia-back">← 학습지 목록</button>
    <div class="rep">
      <div class="rep-head">
        <div class="rep-kicker">${esc(act.subtitle || '학습지')}</div>
        <div class="rep-title">${esc(act.title)}</div>
        ${act.intro ? `<div class="rep-intro">${esc(act.intro)}</div>` : ''}
        <div class="rep-status">${status}${submitted ? '<span class="rep-hint">고쳐서 다시 제출할 수 있어요</span>' : ''}</div>
      </div>
      <div class="rep-qs">${body}</div>
      <div class="rep-foot">
        ${saved}
        <button class="btn-sm" data-action="aia-save" ${AIA_SAVING ? 'disabled' : ''}>임시 저장</button>
        <button class="btn-p btn-sm" data-action="aia-submit" ${AIA_SAVING ? 'disabled' : ''}>${submitted ? '다시 제출' : '제출하기'}</button>
      </div>
    </div>`;
}


/* ── 문항 렌더 (유형별) ── */
function _aiaQuestion(q, no){
  const head = `<div class="ws-q-head">
    ${no ? `<span class="ws-q-no">${_dotNum(no)}</span>` : ''}
    <span class="ws-q-text">${esc(q.text)}</span>
  </div>${q.desc ? `<div class="ws-q-desc">${esc(q.desc)}</div>` : ''}`;

  // 안내 상자 — 읽기만 함
  if(q.type === 'note'){
    return `<div class="ws-block">
      <div class="ws-sec-title">${esc(q.text)}</div>
      <div class="ws-note">
        ${q.desc ? `<div class="ws-note-body">${esc(q.desc)}</div>` : ''}
        ${q.url ? `<a class="ws-note-url" href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.url)}</a>` : ''}
      </div>
    </div>`;
  }

  // 보기 고르기
  if(q.type === 'check'){
    const picked = Array.isArray(AIA_ANSWERS[q.id]) ? AIA_ANSWERS[q.id] : [];
    const opts = (q.options || []).map(o => `
      <label class="ws-check${picked.includes(o) ? ' on' : ''}">
        <input type="checkbox" data-action="aia-check" data-fid="${esc(q.id)}" value="${esc(o)}" ${picked.includes(o) ? 'checked' : ''}/>
        <span class="ws-check-box"></span><span>${esc(o)}</span>
      </label>`).join('');
    return `<div class="ws-block">
      <div class="ws-choice">
        <div class="ws-choice-title">${esc(q.text)}</div>
        <div class="ws-choice-grid" style="--cols:${q.cols || 2}">${opts}</div>
      </div>
    </div>`;
  }

  // 표 채우기
  if(q.type === 'table'){
    const cols = q.cols || [];
    const fixed = _tableLabels(q, AIA_ANSWERS);
    const rows = Math.max(fixed.length, (q.fixed || []).length + (q.extra || 0));
    const val = AIA_ANSWERS[q.id] || {};
    const head2 = `<tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>`;
    let bodyRows = '';
    for(let r = 0; r < rows; r++){
      const label = fixed[r];
      bodyRows += `<tr data-row="${r + 1}">${cols.map((_, c) => {
        const colName = esc(cols[c] || '');
        if(c === 0 && label !== undefined){
          return `<td class="ws-td-fixed" data-label="${colName}">${esc(label)}</td>`;
        }
        const v = val[r]?.[c] || '';
        return `<td data-label="${colName}"><input type="text" class="ws-cell" data-action="aia-cell" data-fid="${esc(q.id)}" data-r="${r}" data-c="${c}" placeholder="${colName}" value="${esc(v)}"/></td>`;
      }).join('')}</tr>`;
    }
    return `<div class="ws-block">
      ${head}
      <div class="ws-table-wrap"><table class="ws-table">
        <thead>${head2}</thead><tbody>${bodyRows}</tbody>
      </table></div>
    </div>`;
  }

  // 책 고르기 — 학습지 안에서 바로 검색하고, 신청 조건을 만족하는 책만 고를 수 있습니다
  if(q.type === 'book') return _aiaBookQuestion(q, head);

  // 기본 — 줄노트 답변칸
  return `<div class="ws-block">
    ${head}
    ${q.imageUrl ? `<img class="ws-img" src="${esc(q.imageUrl)}" alt="" data-action="preview-img" data-url="${esc(q.imageUrl)}" data-name="${esc(q.text)}"/>` : ''}
    <textarea class="ws-lines" data-action="aia-input" data-fid="${esc(q.id)}" rows="${q.rows || 3}">${esc(AIA_ANSWERS[q.id] || '')}</textarea>
  </div>`;
}

/* 고른 책을 보여주는 카드 — 왼쪽 표지, 오른쪽 정보.
   후보를 눌렀을 때와 확정한 뒤 모두 같은 모양이라 함수 하나로 씁니다. */
function _aiaBookCard(b, done){
  const rows = [
    ['저자', b.author], ['출판사', b.publisher],
    ['출판년도', b.year], ['정가', bookPrice(b.price)], ['ISBN', b.isbn],
  ].filter(([, v]) => (v || '').toString().trim())
   .map(([k, v]) => `<div class="ws-bk-row">
      <span class="ws-bk-k">${esc(k)}</span><span class="ws-bk-v">${esc(v)}</span>
    </div>`).join('');

  const cover = b.cover
    ? `<img src="${esc(b.cover)}" alt="${esc(b.title)} 표지"/>`
    : `<span class="ws-bk-noimg">📖</span>`;

  return `<div class="ws-bk-detail${done ? ' done' : ''}">
    ${done ? '<div class="ws-bk-done">✔ 이 책으로 정했어요</div>' : ''}
    <div class="ws-bk-dbody">
      <div class="ws-bk-dcov">${cover}</div>
      <div class="ws-bk-dinfo">
        <div class="ws-bk-dtitle">${esc(b.title)}</div>
        <div class="ws-bk-rows">${rows}</div>
      </div>
    </div>
  </div>`;
}

/* ── 책 고르기 문항 ──
   검색 상태는 AIA_BOOK[문항id] 에 둡니다 (답안이 아니라 화면 상태라서).
   고른 책만 AIA_ANSWERS 에 { title, author, publisher, year, price, isbn } 로 들어갑니다. */
function _aiaBookQuestion(q, head){
  const picked = AIA_ANSWERS[q.id];
  const S = AIA_BOOK[q.id] || {};

  // 이미 고른 책이 있으면 그것만 보여줍니다
  if(picked && picked.title){
    return `<div class="ws-block">${head}
      ${_aiaBookCard(picked, true)}
      <button class="btn-sm ws-bk-reset" data-action="aia-book-reset" data-fid="${esc(q.id)}">다시 고르기</button>
    </div>`;
  }

  const cards = (S.results || []).map((b, i) => {
    const on = S.pick === i;
    const cover = b.cover
      ? `<img src="${esc(b.cover)}" alt=""/>`
      : `<span class="ws-bk-noimg">📖</span>`;
    return `<button class="ws-bk-card${on ? ' on' : ''}" data-action="aia-book-pick" data-fid="${esc(q.id)}" data-i="${i}">
      <span class="ws-bk-cov">${cover}</span>
      <span class="ws-bk-t">${esc(b.title)}</span>
      <span class="ws-bk-a">${esc(b.author || '')}</span>
      <span class="ws-bk-a">${esc(b.publisher || '')} · ${esc(b.year || '')}</span>
      <span class="ws-bk-p">${esc(bookPrice(b.price))}</span>
    </button>`;
  }).join('');

  // 고른 후보의 판정 — 통과해야 [이 책으로 정하기] 가 나옵니다
  let verdict = '';
  if(S.pick != null && S.results && S.results[S.pick]){
    const b = S.results[S.pick];
    const v = bookVerdict(b);
    const notes = v.notes.map(n => `<div class="ws-bk-note ${esc(n.kind)}">${esc(n.text)}</div>`).join('');
    verdict = `<div class="ws-bk-verdict">
      ${_aiaBookCard(b, false)}
      ${S.checking ? '<div class="ws-bk-note warn">절판 여부를 확인하는 중이에요…</div>' : notes}
      ${(!v.blocked && !S.checking)
        ? `<button class="btn-p btn-sm" data-action="aia-book-confirm" data-fid="${esc(q.id)}">이 책으로 정하기</button>`
        : ''}
    </div>`;
  }

  return `<div class="ws-block">${head}
    <div class="ws-bk">
      <div class="ws-bk-search">
        <input class="ws-bk-q" type="search" data-action="aia-book-q" data-fid="${esc(q.id)}"
          value="${esc(S.q || '')}" placeholder="책 제목이나 저자를 검색하세요" enterkeyhint="search"/>
        <button class="btn-p btn-sm" data-action="aia-book-search" data-fid="${esc(q.id)}"
          ${S.loading ? 'disabled' : ''}>${S.loading ? '검색 중…' : '검색'}</button>
      </div>
      ${S.err ? `<div class="ws-bk-note bad">${esc(S.err)}</div>` : ''}
      ${cards ? `<div class="ws-bk-grid">${cards}</div>` : ''}
      ${(!cards && !S.loading && S.searched) ? '<div class="ws-bk-empty">검색 결과가 없어요. 제목을 조금 바꿔서 다시 검색해 보세요.</div>' : ''}
      ${verdict}
    </div>
  </div>`;
}

/* 표 첫 칸에 미리 박아둘 이름들.
   fillFrom 이 있으면 그 문항에서 고른 보기가 이어서 들어갑니다.
   (진로 학습지의 '고른 과목이 표에 자동으로' 요구사항 — 이 학습지 전용) */
function _tableLabels(q, answers){
  const base = q.fixed || [];
  if(!q.fillFrom) return base;
  const picked = q.fillFrom.flatMap(fid => {
    const v = (answers || {})[fid];
    return Array.isArray(v) ? v : [];
  });
  return [...base, ...picked];
}

/* 답안을 사람이 읽는 글로 — 선생님 화면·CSV·세특 복사에서 공용 */
function aiaAnswerText(q, v, answers){
  if(q.type === 'book') return (v && v.title) ? bookLine(v) : '';
  if(q.type === 'check') return Array.isArray(v) ? v.join(', ') : (v || '');
  if(q.type === 'table'){
    if(!v || typeof v !== 'object') return '';
    const cols = q.cols || [], fixed = _tableLabels(q, answers);
    const lines = [];
    Object.keys(v).sort((a,b) => a - b).forEach(r => {
      const cells = cols.map((c, ci) => (ci === 0 && fixed[r] !== undefined) ? fixed[r] : (v[r]?.[ci] || ''));
      if(cells.some(x => (x || '').trim())) lines.push(cells.filter(x => (x||'').trim()).join(' / '));
    });
    return lines.join('\n');
  }
  return v || '';
}

/* ═══════════════════════════════════════
   선생님 — 학습지 관리
═══════════════════════════════════════ */

function vTcAiActivity(){
  if(!TC_CLS) return emptyBox('👆', '관리할 반을 먼저 선택하세요.');
  if(AIA_EDIT) return _vTcAiaEditor();
  if(AIA_VIEW === 'tcStudent' && AIA_SEL && AIA_TC_SEL_SNUM) return _vTcAiaStudent();

  if(AIA_SEL) return _vTcAiaStudentList();

  const all = aiaListFor(TC_CLS);
  const list = all.filter(a => !AIA_HIDDEN[a.id]);
  const hidden = all.filter(a => AIA_HIDDEN[a.id]);

  const cards = list.map(a => {
    const open = !!AIA_OPEN[a.id];
    return `<div class="aia-row ${open ? 'is-open' : ''}">
      <div class="aia-row-body" data-action="aia-tc-pick" data-aid="${esc(a.id)}" style="cursor:pointer">
        <div class="aia-row-sub">${esc(a.subtitle || '학습지')}</div>
        <div class="aia-row-title">${esc(a.title)}</div>
        <div class="aia-row-meta">문항 ${(a.questions || []).length}개 · ${open ? '학생 화면에 보이는 중' : '학생에게 안 보임'}</div>
      </div>
      <div class="aia-row-acts">
        <button class="${open ? 'btn-xs' : 'btn-p btn-sm'}" data-action="aia-toggle-open" data-aid="${esc(a.id)}" data-on="${open ? '0' : '1'}">
          ${open ? '학생에게 숨기기' : '학생에게 보내기'}
        </button>
        <button class="btn-xs" data-action="aia-tc-pick" data-aid="${esc(a.id)}">답안</button>
        ${a.custom
          ? `<button class="btn-xs" data-action="aia-edit" data-aid="${esc(a.id)}">수정</button>
             <button class="btn-xs btn-danger" data-action="aia-del" data-aid="${esc(a.id)}" data-title="${esc(a.title)}">삭제</button>`
          /* 코드에 박아둔 기본 학습지는 지우거나 고칠 수 없습니다(앱 업데이트 때 되살아나니까).
             대신 복사본을 만들어 고치고, 안 쓸 거면 이 반 목록에서 치워둡니다. */
          : `<button class="btn-xs" data-action="aia-clone" data-aid="${esc(a.id)}">복제해서 수정</button>
             <button class="btn-xs btn-danger" data-action="aia-hide" data-aid="${esc(a.id)}" data-title="${esc(a.title)}">목록에서 빼기</button>`}
      </div>
    </div>`;
  }).join('');

  // 빼둔 학습지 — 되돌릴 수 있게 접어서 보여줍니다
  const hiddenBox = hidden.length ? `
    <div class="aia-hidden-box">
      <div class="aia-hidden-t">목록에서 뺀 학습지 ${hidden.length}개</div>
      ${hidden.map(a => `<div class="aia-hidden-row">
        <span>${esc(a.title)}${a.subtitle ? ` <i>${esc(a.subtitle)}</i>` : ''}</span>
        <button class="btn-xs" data-action="aia-unhide" data-aid="${esc(a.id)}">되돌리기</button>
      </div>`).join('')}
    </div>` : '';

  return `<div class="box-info" style="margin-bottom:16px"><b>학생에게 보내기</b>를 누르면 그 학습지가 학생 홈 맨 위에 바로 뜹니다. 수업이 끝나면 <b>숨기기</b>를 누르세요. (작성한 답안은 그대로 남습니다)</div>
    <div class="aia-tc-bar">
      <div class="sec-title" style="margin:0">학습지 ${list.length}개</div>
      <button class="btn-p btn-sm" data-action="aia-new">+ 학습지 만들기</button>
    </div>
    ${list.length ? `<div class="aia-rows">${cards}</div>`
                  : emptyBox('📭', '학습지가 없습니다. 위 버튼으로 만들어보세요.')}
    ${hiddenBox}`;
}

// 안내(note)는 번호를 안 매기므로, 앞의 안내를 빼고 센 번호
function _qbNo(questions, i){
  let n = 0;
  for(let k = 0; k <= i; k++) if((questions[k].type || 'text') !== 'note') n++;
  return n;
}

/* ── 학습지 만들기·수정 ── */
function _vTcAiaEditor(){
  const d = AIA_DRAFT || { title: '', subtitle: '', intro: '', questions: [] };
  const isNew = AIA_EDIT === 'new';

  const qs = (d.questions || []).map((q, i) => {
    const t = q.type || 'text';
    // 유형 고르기 — 글/안내/체크박스/표
    const typeBtns = [['text','글'],['note','안내'],['check','체크박스'],['table','표'],['book','책 고르기']].map(([k, l]) =>
      `<button class="btn-xs${t === k ? ' btn-p' : ''}" data-action="qb-type" data-i="${i}" data-t="${k}">${l}</button>`
    ).join('');

    // 유형마다 다른 설정칸
    let extra = '';
    if(t === 'text'){
      extra = `<label class="qb-rows">답변 칸
          <select data-action="qb-rows" data-i="${i}">
            ${[1,2,3,4,6,10].map(r => `<option value="${r}"${(q.rows || 3) === r ? ' selected' : ''}>${r}줄</option>`).join('')}
          </select></label>`;
    } else if(t === 'note'){
      extra = `<span class="qb-hint">읽기만 하는 안내 상자입니다 (답변칸 없음)</span>`;
    } else if(t === 'check'){
      extra = `<label class="qb-rows">칸 수
          <select data-action="qb-cols" data-i="${i}">
            ${[1,2,3,4].map(c => `<option value="${c}"${(q.cols || 2) === c ? ' selected' : ''}>${c}칸</option>`).join('')}
          </select></label>`;
    } else if(t === 'book'){
      extra = `<span class="qb-hint">학생이 학습지 안에서 책을 검색해 고릅니다 (신청 조건 자동 확인)</span>`;
    } else if(t === 'table'){
      extra = `<label class="qb-rows">빈 줄
          <select data-action="qb-extra" data-i="${i}">
            ${[0,1,2,3,4,5,6,8,10].map(n => `<option value="${n}"${(q.extra || 3) === n ? ' selected' : ''}>${n}줄</option>`).join('')}
          </select></label>`;
    }

    // 유형별 본문 입력칸 (보기 목록 / 표 열·행 / 안내 링크)
    let fields = `<input class="qb-desc" type="text" data-action="qb-field" data-i="${i}" data-k="desc"
        placeholder="설명 (선택) — 질문 아래 작은 글씨" value="${esc(q.desc || '')}"/>`;
    if(t === 'note'){
      fields += `<input class="qb-desc" type="text" data-action="qb-field" data-i="${i}" data-k="url"
        placeholder="링크 주소 (선택) — 영상·자료" value="${esc(q.url || '')}"/>`;
    }
    if(t === 'check'){
      fields += `<textarea class="qb-desc" data-action="qb-field" data-i="${i}" data-k="_options" rows="3"
        placeholder="보기를 한 줄에 하나씩 적으세요&#10;유튜브 추천&#10;챗GPT&#10;번역기">${esc((q.options || []).join('\n'))}</textarea>`;
    }
    if(t === 'table'){
      fields += `<input class="qb-desc" type="text" data-action="qb-field" data-i="${i}" data-k="_cols"
        placeholder="열 이름을 쉼표로 — 예: 인공지능, 인식, 추론" value="${esc((q.cols || []).join(', '))}"/>`;
      fields += `<input class="qb-desc" type="text" data-action="qb-field" data-i="${i}" data-k="_fixed"
        placeholder="첫 칸에 미리 넣을 항목 (선택, 쉼표로)" value="${esc((q.fixed || []).join(', '))}"/>`;
      // 앞선 체크박스 문항에서 고른 보기를 표에 자동으로 넣기
      const checkQs = (d.questions || []).map((x, xi) => ({ x, xi }))
        .filter(o => (o.x.type === 'check') && o.xi < i);
      if(checkQs.length){
        const opts = checkQs.map(o =>
          `<option value="${esc(o.x.id)}"${(q.fillFrom || []).includes(o.x.id) ? ' selected' : ''}>${o.xi + 1}번에서 고른 것</option>`
        ).join('');
        fields += `<label class="qb-rows">자동 채우기
          <select data-action="qb-fillfrom" data-i="${i}">
            <option value="">안 씀</option>${opts}
          </select></label>`;
      }
    }

    return `
    <div class="qb">
      <div class="qb-no">${t === 'note' ? '<span class="qb-note-mark">안내</span>' : _dotNum(_qbNo(d.questions, i))}</div>
      <div class="qb-main">
        <div class="qb-types">${typeBtns}</div>
        <textarea class="qb-text" data-action="qb-text" data-i="${i}" rows="2"
          placeholder="${t === 'note' ? '안내 제목' : '질문을 적으세요'}">${esc(q.text || '')}</textarea>
        ${fields}
        <div class="qb-tools">
          ${extra}
          ${t !== 'note' ? `<label class="btn-xs qb-img-btn">
            ${q.imageUrl ? '이미지 교체' : '이미지 추가'}
            <input type="file" accept="image/*" data-action="qb-img" data-i="${i}" hidden/>
          </label>` : ''}
          ${q.imageUrl ? `<button class="btn-xs btn-danger" data-action="qb-img-del" data-i="${i}">이미지 삭제</button>` : ''}
          <span class="qb-spacer"></span>
          <button class="btn-xs" data-action="qb-move" data-i="${i}" data-dir="up" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn-xs" data-action="qb-move" data-i="${i}" data-dir="down" ${i === d.questions.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="btn-xs btn-danger" data-action="qb-del" data-i="${i}">삭제</button>
        </div>
        ${q._uploading ? '<div class="qb-uploading">이미지 올리는 중…</div>' : ''}
        ${q.imageUrl ? `<img class="qb-img" src="${esc(q.imageUrl)}" alt=""/>` : ''}
      </div>
    </div>`;
  }).join('');

  return `<button class="rep-back" data-action="aia-edit-cancel">← 학습지 목록</button>
    <div class="section">
      <div class="sec-title">${isNew ? '학습지 만들기' : '학습지 수정'}</div>
      <div class="form">
        <div class="field"><label>제목</label>
          <input type="text" id="qb-title" data-action="qb-meta" data-k="title" value="${esc(d.title)}"/></div>
        <div class="field"><label>작은 제목 (차시 등)</label>
          <input type="text" id="qb-subtitle" data-action="qb-meta" data-k="subtitle" value="${esc(d.subtitle)}"/></div>
        <div class="field"><label>안내문</label>
          <textarea id="qb-intro" data-action="qb-meta" data-k="intro" rows="3">${esc(d.intro)}</textarea></div>
      </div>
    </div>

    <div class="aia-tc-bar">
      <div class="sec-title" style="margin:0">문항 ${d.questions.length}개</div>
      <button class="btn-sm" data-action="qb-add">+ 문항 추가</button>
    </div>
    ${d.questions.length ? `<div class="qb-list">${qs}</div>`
                         : emptyBox('📝', '문항이 없습니다. 위 버튼으로 추가하세요.')}

    <div class="rep-foot">
      <div id="qb-err" class="err" style="flex:1"></div>
      <button class="btn-sm" data-action="aia-edit-cancel">취소</button>
      <button class="btn-p btn-sm" data-action="aia-edit-save" ${AIA_SAVING ? 'disabled' : ''}>${AIA_SAVING ? '저장 중…' : '저장'}</button>
    </div>`;
}

/* ── 학생별 작성 현황 ── */
function _vTcAiaStudentList(){
  const act = AIA_SEL;
  const subs = AIA_ALL_SUBS || {};
  const fieldIds = aiaFieldIds(act);

  const rows = STUDENTS.map(st => {
    const sub = subs[st.number];
    const answers = sub?.answers || {};
    const qs = (act.questions || []).filter(q => q.type !== 'note');
    const filled = qs.filter(q => (aiaAnswerText(q, answers[q.id], answers) || '').trim()).length;
    const pct = fieldIds.length ? Math.round(filled / fieldIds.length * 100) : 0;
    const submitted = !!sub?.submittedAt;
    return `<tr>
      <td>${esc(st.number)}</td>
      <td>${esc(st.name)}</td>
      <td>
        <span class="aia-fill-chip ${pct === 100 ? 'full' : pct >= 50 ? 'mid' : pct > 0 ? 'low' : 'none'}">${filled}/${fieldIds.length}</span>
        <div class="sbar" style="width:80px;display:inline-block;margin-left:6px;vertical-align:middle"><div class="sbar-fill" style="width:${pct}%"></div></div>
      </td>
      <td>${submitted
        ? `<span class="aia-submit-chip done">제출</span><div style="font-size:10px;color:var(--text3);margin-top:2px">${fmtDt(sub.submittedAt)}</div>`
        : sub ? '<span class="aia-submit-chip pending">미제출</span>'
              : '<span style="color:var(--text3)">–</span>'}</td>
      <td>${sub?.updatedAt ? fmtDt(sub.updatedAt) : '<span style="color:var(--text3)">미작성</span>'}</td>
      <td><button class="btn-xs" data-action="aia-tc-view" data-snum="${esc(st.number)}" ${sub ? '' : 'disabled'}>보기</button></td>
    </tr>`;
  }).join('');

  const writtenCount = STUDENTS.filter(st => subs[st.number]?.updatedAt).length;
  const submittedCount = STUDENTS.filter(st => subs[st.number]?.submittedAt).length;

  return `<div class="aia-tc-head">
    <button class="btn-sm" data-action="aia-tc-back">← 학습지 목록</button>
    <div class="aia-tc-head-title">${esc(act.title)}</div>
    <button class="btn-sm" data-action="aia-export-csv">답안 CSV</button>
  </div>
  <div class="asmt-stat-grid">
    <div class="stat-card"><div class="stat-num">${STUDENTS.length}</div><div class="stat-label">전체 학생</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#3b82f6">${writtenCount}</div><div class="stat-label">작성 중·작성함</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--ok)">${submittedCount}</div><div class="stat-label">제출 완료</div></div>
  </div>
  ${STUDENTS.length === 0
    ? emptyBox('👥', '먼저 학생을 등록하세요.')
    : `<div style="overflow-x:auto"><table class="tbl aia-tc-table">
        <thead><tr><th>학번</th><th>이름</th><th>작성률</th><th>제출</th><th>마지막 저장</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`}`;
}

/* ── 한 학생의 답안 ── */
function _vTcAiaStudent(){
  const act = AIA_SEL;
  const snum = AIA_TC_SEL_SNUM;
  const st = STUDENTS.find(s => s.number === snum);
  const sub = AIA_ALL_SUBS[snum] || null;
  if(!st) return emptyBox('❓', `학번 ${snum} 학생을 찾을 수 없어요.`);

  const back = `<div class="aia-tcs-header">
    <button class="btn-sm" data-action="aia-tc-back-list">← 학생 목록</button>
    <div class="aia-tcs-info">
      <span class="aia-tcs-snum">${esc(st.number)}</span>
      <span class="aia-tcs-name">${esc(st.name)}</span>
      ${sub?.submittedAt
        ? `<span class="chip chip-green">제출 ${fmtDt(sub.submittedAt)}</span>`
        : sub ? '<span class="chip" style="background:#f59e0b;color:#fff">미제출(작성 중)</span>'
              : '<span class="chip">미작성</span>'}
    </div>
  </div>`;

  if(!sub) return back + emptyBox('📭', '아직 작성된 답안이 없어요.');

  const answers = sub.answers || {};
  let no = 0;
  const qs = (act.questions || []).filter(q => q.type !== 'note').map(q => {
    const v = (aiaAnswerText(q, answers[q.id], answers) || '').trim();
    return `<div class="ws-block">
      <div class="ws-q-head"><span class="ws-q-no">${_dotNum(++no)}</span><span class="ws-q-text">${esc(q.text)}</span></div>
      <pre class="rep-a${v ? '' : ' empty'}">${v ? esc(v) : '(무응답)'}</pre>
    </div>`;
  }).join('');

  return back + `<div class="rep"><div class="rep-qs">${qs}</div></div>`;
}
