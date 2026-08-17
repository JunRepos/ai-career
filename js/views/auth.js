/* ═══════════════════════════════════════
   views/auth.js — 로그인 / 비밀번호 변경 화면

   학생 로그인, 선생님 로그인, 최초 비밀번호 변경
═══════════════════════════════════════ */

// 로그인 카드 껍데기 — 도트 아이콘 + 제목 + 본문. 세 화면이 같은 틀을 씁니다.
//   tint: 강조색, icon: 도트 <i> 묶음(없으면 생략)
function _authCard({ back, tint, icon, eyebrow, title, body }){
  return `<div class="auth">
    ${back ? `<button class="auth-back" onclick="${back.fn}">← ${esc(back.label)}</button>` : ''}
    <div class="auth-card" style="--tint:${tint}">
      <div class="auth-glow"></div>
      ${icon ? `<div class="auth-icon">${icon}</div>` : ''}
      <div class="auth-eyebrow">${esc(eyebrow)}</div>
      <div class="auth-title">${esc(title)}</div>
      ${body}
    </div>
  </div>`;
}

// 학생 로그인
function vStudentLogin(){
  const subjKey = SEL_CLS?.type;
  const subj = SUBJECT_MAP[subjKey];
  const idx = Math.max(0, classesOf(subjKey).findIndex(c => c.id === SEL_CLS?.id));
  const tint = subj?.tint || 'var(--accent)';

  return _authCard({
    back: { fn: 'backToClasses()', label: '반 다시 선택' },
    tint,
    icon: subj ? _dotIcon(subjKey, idx) : '',
    eyebrow: subj?.label || '수업',
    title: `${SEL_CLS?.short || SEL_CLS?.label || ''}반`,
    body: `
      <div class="auth-form">
        <div class="auth-field">
          <label for="sl-num">학번</label>
          <input id="sl-num" type="text" inputmode="numeric" placeholder="예) 20101" maxlength="10" autocomplete="off"/>
        </div>
        <div class="auth-field">
          <label for="sl-pw">비밀번호</label>
          <input id="sl-pw" type="password" placeholder="처음이면 학번과 같습니다" autocomplete="current-password"/>
        </div>
        <div id="sl-err" class="auth-err"></div>
        <button id="sl-btn" class="auth-submit">로그인</button>
      </div>
      <div class="auth-note">계정이 없다면 선생님께 등록을 요청하세요</div>`
  });
}

// 비밀번호 강제 변경 (최초 로그인)
function vChangePw(){
  const subj = SUBJECT_MAP[SEL_CLS?.type];
  return _authCard({
    tint: subj?.tint || 'var(--accent)',
    eyebrow: '보안',
    title: '비밀번호를 바꿔주세요',
    body: `
      <div class="auth-lead">처음 로그인했습니다. 학번과 같은 비밀번호는 다른 사람이 쉽게 알 수 있어요.</div>
      <div class="auth-form">
        <div class="auth-field">
          <label for="cp-new">새 비밀번호</label>
          <input id="cp-new" type="password" placeholder="4자 이상" autocomplete="new-password"/>
        </div>
        <div class="auth-field">
          <label for="cp-con">한 번 더</label>
          <input id="cp-con" type="password" placeholder="같은 비밀번호" autocomplete="new-password"/>
        </div>
        <div id="cp-err" class="auth-err"></div>
        <button id="cp-btn" class="auth-submit">바꾸고 시작하기</button>
      </div>`
  });
}

// 선생님 로그인
function vTeacherLogin(){
  const tint = 'var(--pl-yellow)';
  if(FIRST_SETUP) return _authCard({
    back: { fn: 'goHome()', label: '처음으로' },
    tint,
    eyebrow: '선생님',
    title: '비밀번호 설정',
    body: `
      <div class="auth-lead">이 기기에서 처음 여는 앱입니다. 선생님 비밀번호를 정해주세요.</div>
      <div class="auth-form">
        <div class="auth-field">
          <label for="tl-pw">새 비밀번호</label>
          <input id="tl-pw" type="password" placeholder="4자 이상" autocomplete="new-password"/>
        </div>
        <div class="auth-field">
          <label for="tl-pw2">한 번 더</label>
          <input id="tl-pw2" type="password" placeholder="같은 비밀번호" autocomplete="new-password"/>
        </div>
        <div id="tl-err" class="auth-err"></div>
        <button id="tl-btn" class="auth-submit">설정하고 로그인</button>
      </div>`
  });

  return _authCard({
    back: { fn: 'goHome()', label: '처음으로' },
    tint,
    eyebrow: '선생님',
    title: '로그인',
    body: `
      <div class="auth-form">
        <div class="auth-field">
          <label for="tl-pw">비밀번호</label>
          <input id="tl-pw" type="password" placeholder="비밀번호" autocomplete="current-password"/>
        </div>
        <div id="tl-err" class="auth-err"></div>
        <button id="tl-btn" class="auth-submit">로그인</button>
      </div>`
  });
}
