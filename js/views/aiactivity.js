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
  const list = aiaOpenFor(SEL_CLS);
  if(!list.length) return emptyBox('🔒', '지금 열려 있는 학습지가 없어요. 선생님 안내를 기다려주세요.');

  if(AIA_VIEW === 'do' && AIA_SEL) return _vStAiaDo();

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

  // 기본 — 줄노트 답변칸
  return `<div class="ws-block">
    ${head}
    ${q.imageUrl ? `<img class="ws-img" src="${esc(q.imageUrl)}" alt="" data-action="preview-img" data-url="${esc(q.imageUrl)}" data-name="${esc(q.text)}"/>` : ''}
    <textarea class="ws-lines" data-action="aia-input" data-fid="${esc(q.id)}" rows="${q.rows || 3}">${esc(AIA_ANSWERS[q.id] || '')}</textarea>
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

  const list = aiaListFor(TC_CLS);
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
        ${a.custom ? `<button class="btn-xs" data-action="aia-edit" data-aid="${esc(a.id)}">수정</button>
          <button class="btn-xs btn-danger" data-action="aia-del" data-aid="${esc(a.id)}" data-title="${esc(a.title)}">삭제</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `<div class="box-info" style="margin-bottom:16px"><b>학생에게 보내기</b>를 누르면 그 학습지가 학생 홈 맨 위에 바로 뜹니다. 수업이 끝나면 <b>숨기기</b>를 누르세요. (작성한 답안은 그대로 남습니다)</div>
    <div class="aia-tc-bar">
      <div class="sec-title" style="margin:0">학습지 ${list.length}개</div>
      <button class="btn-p btn-sm" data-action="aia-new">+ 학습지 만들기</button>
    </div>
    ${list.length ? `<div class="aia-rows">${cards}</div>`
                  : emptyBox('📭', '학습지가 없습니다. 위 버튼으로 만들어보세요.')}`;
}

/* ── 학습지 만들기·수정 ── */
function _vTcAiaEditor(){
  const d = AIA_DRAFT || { title: '', subtitle: '', intro: '', questions: [] };
  const isNew = AIA_EDIT === 'new';

  const qs = (d.questions || []).map((q, i) => `
    <div class="qb">
      <div class="qb-no">${_dotNum(i + 1)}</div>
      <div class="qb-main">
        <textarea class="qb-text" data-action="qb-text" data-i="${i}" rows="2">${esc(q.text || '')}</textarea>
        <div class="qb-tools">
          <label class="qb-rows">답변 칸
            <select data-action="qb-rows" data-i="${i}">
              ${[2,3,4,6,10].map(r => `<option value="${r}"${(q.rows || 3) === r ? ' selected' : ''}>${r}줄</option>`).join('')}
            </select>
          </label>
          <label class="btn-xs qb-img-btn">
            ${q.imageUrl ? '이미지 교체' : '이미지 추가'}
            <input type="file" accept="image/*" data-action="qb-img" data-i="${i}" hidden/>
          </label>
          ${q.imageUrl ? `<button class="btn-xs btn-danger" data-action="qb-img-del" data-i="${i}">이미지 삭제</button>` : ''}
          <span class="qb-spacer"></span>
          <button class="btn-xs" data-action="qb-move" data-i="${i}" data-dir="up" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn-xs" data-action="qb-move" data-i="${i}" data-dir="down" ${i === d.questions.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="btn-xs btn-danger" data-action="qb-del" data-i="${i}">삭제</button>
        </div>
        ${q._uploading ? '<div class="qb-uploading">이미지 올리는 중…</div>' : ''}
        ${q.imageUrl ? `<img class="qb-img" src="${esc(q.imageUrl)}" alt=""/>` : ''}
      </div>
    </div>`).join('');

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
