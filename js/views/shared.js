/* ═══════════════════════════════════════
   views/shared.js — 공통 UI 컴포넌트

   여러 화면에서 재사용하는 UI 조각들입니다.
   탭 버튼, 빈 화면, 공지카드 등
═══════════════════════════════════════ */

// 다중 반 선택 체크박스 (신규 등록 시에만 표시)
//   과목별로 묶어서 보여줍니다 — 반이 8개라 한 줄로 늘어놓으면 찾기 어려움.
function multiClassPicker(idPrefix, currentClassId){
  const groups = SUBJECTS.map(s => {
    const chips = classesOf(s.key).map(c => {
      const checked = c.id === currentClassId ? 'checked' : '';
      return `<label class="cls-chip">
        <input type="checkbox" class="${idPrefix}-cls-chk" value="${c.id}" ${checked}/>
        <span>${esc(c.short || c.label)}</span>
      </label>`;
    }).join('');
    if(!chips) return '';
    return `<div class="cls-chip-group">
      <div class="cls-chip-label" style="color:${s.tint}">${esc(s.label)}</div>
      <div class="cls-chip-row">${chips}</div>
    </div>`;
  }).join('');

  return `<div class="field">
    <label>등록할 반 선택</label>
    <div class="cls-chip-box">
      ${groups}
      <div class="cls-chip-actions">
        <button type="button" class="btn-xs" onclick="document.querySelectorAll('.${idPrefix}-cls-chk').forEach(c=>c.checked=true)">전체 선택</button>
        <button type="button" class="btn-xs" onclick="document.querySelectorAll('.${idPrefix}-cls-chk').forEach(c=>c.checked=false)">전체 해제</button>
      </div>
    </div>
  </div>`;
}

// 선택된 반 ID 배열 가져오기
function getSelectedClasses(idPrefix){
  return Array.from(document.querySelectorAll(`.${idPrefix}-cls-chk:checked`)).map(c => c.value);
}

// 탭 버튼 생성
function tab(label, key, active, fn){
  return `<button class="tab${active === key ? ' active' : ''}" onclick="${fn}">${label}</button>`;
}

// ── 드로어(슬라이드 사이드바) 메뉴 — 현재 메뉴 구조 재사용 ──
// 그룹 데이터는 _stNavGroups()/_tcNavGroups() 그대로, 마크업만 .drawer-item 으로.
// onclick 의 setST/setTC 는 기존 그대로 + closeDrawer() 추가.
function drawerNavHtml(){
  const isTC = IS_TC;
  const groups = isTC ? _tcNavGroups((TC_CLS?.type || 'normal') === 'info') : _stNavGroups();
  const activeKey = isTC ? TC_TAB : ST_TAB;
  const setter = isTC ? 'setTC' : 'setST';
  const cls = isTC ? TC_CLS : SEL_CLS;
  const who = isTC
    ? '👩‍🏫 선생님'
    : `${esc(ST_USER?.number || '')} ${esc(ST_USER?.name || '')}`;
  const subjKey = cls?.type;
  const subj = SUBJECT_MAP[subjKey];
  const subjTint = subj?.tint || 'var(--pl-yellow)';
  // 반 도트 아이콘 — 반 선택 화면에서 본 것과 같은 그림이라 "지금 어느 반인지"가 바로 보임
  const idx = cls ? Math.max(0, classesOf(subjKey).findIndex(c => c.id === cls.id)) : 0;
  // 작은 정사각 색 타일 — 지금 어느 과목을 보고 있는지 색으로 구분.
  // (도트 아이콘은 38px 에서는 뭉개져서 반 번호를 대신 씁니다)
  const mark = `<div class="brand-mark" style="background:${subjTint}">${cls ? esc(cls.short || '') : ''}</div>`;

  // Padlet 사이드바처럼 인사말 → 그 아래 반 타일. 요일별 한 줄이 매번 조금씩 달라집니다.
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const d = new Date();
  const hello = isTC
    ? `안녕하세요 선생님`
    : `안녕하세요 ${esc(ST_USER?.name || '')} 님`;
  const greet = `<div class="drawer-greet">
      <div class="greet-hi">${hello}</div>
      <div class="greet-sub">즐거운 ${DAYS[d.getDay()]}요일입니다!</div>
    </div>`;

  const brand = greet + `<div class="drawer-brand">
      ${mark}
      <div class="brand-who">
        <div class="brand-name">${esc(cls?.label || '인공지능 기초 · 진로')}</div>
        <div class="brand-sub">${isTC ? '관리 중' : esc(ST_USER?.number || '')}</div>
      </div>
    </div>`;

  // 선생님: 반 전환을 사이드바에서 바로 (예전 콘텐츠 상단 '관리 반' 바를 대체)
  const switcher = isTC
    ? `<div class="drawer-switch">
        <label for="tc-cls-sel">관리 반</label>
        <select id="tc-cls-sel">
          <option value=""${!TC_CLS ? ' selected' : ''}>반 선택…</option>
          ${CLASSES.map(c => `<option value="${c.id}"${TC_CLS?.id === c.id ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}
        </select>
      </div>`
    : '';

  const nav = groups.map(g => {
    const head = g.label
      ? `<div class="drawer-label">${g.dot ? '<span class="drawer-dot"></span>' : ''}${esc(g.label)}</div>`
      : '<div class="drawer-gap"></div>';
    const items = g.items.map(it =>
      `<button class="drawer-item${activeKey === it.key ? ' active' : ''}" onclick="${setter}('${it.key}');closeDrawer()"><span class="ico">${it.ico}</span><span class="drawer-text">${esc(it.label)}</span></button>`
    ).join('');
    return head + items;
  }).join('');

  const foot = `<div class="drawer-foot">
      <button class="drawer-foot-btn" onclick="goHome()">처음으로</button>
      <button class="drawer-foot-btn danger" onclick="${isTC ? 'logoutTeacher()' : 'logoutStudent()'}">로그아웃</button>
    </div>`;

  return brand + switcher + `<nav class="drawer-nav">${nav}</nav>` + foot;
}

// ── 콘텐츠 페이지 헤더 ──
//   Padlet 홈의 큰 "최근" 제목 자리. 모든 탭 위에 같은 형식으로 붙습니다.
//   (render.js 가 <main> 맨 앞에 한 번만 넣으므로 각 탭 뷰는 손댈 필요 없음)
function pageHead(){
  const cls = IS_TC ? TC_CLS : SEL_CLS;
  const title = currentTitle();
  // 부제 — 학생은 반 이름, 선생님은 반 + 시간표
  let sub = cls?.label || '';
  if(IS_TC && cls?.when) sub += ` · ${cls.when}${cls.room ? ` · ${cls.room}실` : ''}`;
  if(!IS_TC && cls?.when) sub += ` · ${cls.when}`;

  // 우측 보조 정보 — 목록 개수 (Padlet 의 정렬 링크 자리)
  const count = _pageCount();
  return `<div class="page-head">
    <div>
      <div class="page-title">${esc(title)}</div>
      ${sub ? `<div class="page-sub">${esc(sub)}</div>` : ''}
    </div>
    ${count ? `<div class="page-count">${esc(count)}</div>` : ''}
  </div>`;
}

// 헤더 우측에 띄울 개수 표시 (탭마다 의미가 다름)
function _pageCount(){
  const key = IS_TC ? TC_TAB : ST_TAB;
  if(key === 'notice')   return NOTICES.length   ? `공지 ${NOTICES.length}개` : '';
  if(key === 'assign')   return ASSIGNMENTS.length ? `수업 ${ASSIGNMENTS.length}개` : '';
  if(key === 'board')    return POSTS.length     ? `궁금증 ${POSTS.length}개` : '';
  if(key === 'students') return STUDENTS.length  ? `학생 ${STUDENTS.length}명` : '';
  if(key === 'portfolio'){
    const snum = IS_TC ? TC_PF_SNUM : ST_USER?.number;
    if(IS_TC && !snum) return STUDENTS.length ? `학생 ${STUDENTS.length}명` : '';
    if(!ASSIGNMENTS.length) return '';
    const done = ASSIGNMENTS.filter(a => SUBMISSIONS[a.id]?.[snum]).length;
    return `제출 ${done} / ${ASSIGNMENTS.length}`;
  }
  return '';
}

// 현재 탭 라벨 (상단바 제목)
function currentTitle(){
  if(VIEW === 'post-detail') return '궁금증';
  if(VIEW === 'assign-detail') return '수업';
  if(VIEW === 'new-post') return '궁금증 남기기';
  if(VIEW === 'oj-solve') return OJ_SEL_PROB?.title || '문제 풀이';
  const isTC = IS_TC;
  const key = isTC ? TC_TAB : ST_TAB;
  if(!isTC && key.indexOf('unit-') === 0){
    const u = assignUnit(key.slice(5));
    return u ? `${u.roman}. ${u.label}` : '수업';
  }
  const groups = isTC ? _tcNavGroups((TC_CLS?.type || 'normal') === 'info') : _stNavGroups();
  for(const g of groups) for(const it of g.items) if(it.key === key) return it.label;
  return isTC ? '관리' : '홈';
}

// 콘텐츠 폭 클래스 — IDE형은 full, 표/분할은 wide, 나머지 기본(960)
function contentWidthClass(){
  if(VIEW === 'oj-solve') return 'full';   // 분할 패널 — 전체 폭
  const key = IS_TC ? TC_TAB : ST_TAB;
  if(key === 'notebook' || key === 'mission') return 'full';
  const wide = IS_TC ? (typeof _tcWideTab === 'function' && _tcWideTab())
                     : (VIEW === 'student' && typeof _stWideTab === 'function' && _stWideTab());
  return wide ? 'wide' : '';
}

// 빈 화면 표시
function emptyBox(icon, msg){
  return `<div class="empty"><div class="empty-icon">${icon}</div>${msg}</div>`;
}

// 파일 그룹을 묶어서 렌더링 (학생/선생님 공용)
function groupFiles(files){
  const groups = {};
  files.forEach(f => {
    const gid = f.groupId || f.id;
    if(!groups[gid]) groups[gid] = {title: f.groupTitle || '', desc: f.groupDesc || '', uploadedAt: f.uploadedAt, files: []};
    groups[gid].files.push(f);
  });
  return groups;
}

// 파일 카드 렌더링 (개별 파일)
function fileCardHtml(f, opts = {}){
  const buttons = [];
  if(isImg(f.name)) buttons.push(`<button class="btn-xs" data-action="preview-img" data-url="${esc(f.url)}" data-name="${esc(f.name)}">👁</button>`);
  buttons.push(`<button class="btn-xs btn-p" data-action="dl-tc-file" data-id="${f.id}">↓${opts.dlLabel ? ' ' + opts.dlLabel : ''}</button>`);
  if(opts.canDelete) buttons.push(`<button class="btn-xs btn-danger" data-action="del-tc-file" data-id="${f.id}" data-path="${esc(f.storagePath || '')}" data-fname="${esc(f.name)}">✕</button>`);
  return `<div class="file-card" style="margin-bottom:6px">
    <div class="file-icon">${fIcon(f.name)}</div>
    <div class="file-info"><div class="file-name">${esc(f.name)}</div><div class="file-meta2">${fmtSz(f.size)}</div></div>
    <div style="display:flex;gap:4px;flex-wrap:wrap">${buttons.join('')}</div>
  </div>`;
}

// 공지사항 카드 (학생/선생님 공용)
function noticeCard(n, isTeacher = false){
  // 다중 파일 지원 (files 배열이 있으면 사용, 없으면 기존 단일 파일 호환)
  const allFiles = n.files && n.files.length > 1
    ? n.files
    : n.fileName ? [{name: n.fileName, url: n.fileUrl, path: n.filePath}] : [];

  const imgHtml = allFiles.length
    ? allFiles.map(f => isImg(f.name)
        ? `<img src="${esc(f.url)}" alt="${esc(f.name)}"
            style="max-width:100%;border-radius:var(--r-md);margin-top:10px;display:block;cursor:pointer"
            data-action="preview-img" data-url="${esc(f.url)}" data-name="${esc(f.name)}"/>`
        : `<div class="file-card" style="margin-top:10px;margin-bottom:0">
            <div class="file-icon">${fIcon(f.name)}</div>
            <div class="file-info"><div class="file-name">${esc(f.name)}</div></div>
            <button class="btn-p btn-sm" data-action="dl-notice-file" data-url="${esc(f.url)}" data-name="${esc(f.name)}">다운로드</button>
          </div>`
      ).join('')
    : '';

  const tcBtns = isTeacher ? `
    <div style="display:flex;gap:5px;margin-top:10px;flex-wrap:wrap">
      <button class="btn-xs" data-action="notice-move-up" data-nid="${n.id}" title="위로">▲</button>
      <button class="btn-xs" data-action="notice-move-down" data-nid="${n.id}" title="아래로">▼</button>
      <button class="btn-xs" data-action="edit-notice" data-nid="${n.id}"
        data-ntitle="${esc(n.title)}" data-ncontent="${esc(n.content)}" data-npin="${n.isPinned}">✏️ 수정</button>
      <button class="btn-xs" data-action="toggle-pin" data-nid="${n.id}" data-pinned="${n.isPinned}">${n.isPinned ? '📌 고정해제' : '📌 고정'}</button>
      <button class="btn-xs btn-danger" data-action="del-notice" data-nid="${n.id}" data-ntitle="${esc(n.title)}">삭제</button>
    </div>` : '';

  return `<div class="${n.isPinned ? 'box-pin section' : 'section'}" style="margin-bottom:10px">
    ${n.isPinned ? `<div class="pin-label">📌 고정 공지</div>` : ''}
    <div style="font-size:14px;font-weight:700;margin-bottom:5px">${esc(n.title)}</div>
    <div style="font-size:13px;color:var(--text2);white-space:pre-line">${esc(n.content)}</div>
    ${imgHtml}
    <div style="font-size:11px;color:var(--text3);margin-top:8px">${fmtDt(n.createdAt)}</div>
    ${tcBtns}
  </div>`;
}
