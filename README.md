# 🧠 인공지능 기초 · 진로

인공지능 기초, 진로와 직업 수업용 학습 관리 웹앱입니다.
선생님이 공지·수업 자료·과제를 올리면 학생이 작업물을 제출하고, 선생님이 제출물을 확인·다운로드합니다.

- 배포: https://junrepos.github.io/ai-career/
- 정보 교과용 앱: https://github.com/JunRepos/informatics (별도 레포)

## 구조

`informatics` 레포에서 갈라져 나온 프로젝트입니다. **코드는 아무것도 지우지 않았습니다** —
OJ·노트북·미션·퀴즈·AI 코딩·기계학습·수행평가 등 정보 교과용 기능이 모두 그대로 들어 있고,
메뉴에서만 빠져 있습니다. 나중에 이 과목에서 쓰고 싶으면 메뉴에 다시 넣기만 하면 됩니다.

| 파일 | 역할 |
|---|---|
| `js/config.js` | Firebase 설정, **반 목록**(`CLASSES`) |
| `js/constants.js` | **과목별 단원 체계**(`SUBJECT_UNITS`), 단원 조회 함수 |
| `js/views/` | 화면 렌더링 |
| `js/events/` | 클릭·폼 이벤트 처리 |
| `database.rules.json`, `storage.rules` | Firebase 보안 규칙 |

## Firebase — informatics 와 공유합니다

같은 Firebase 프로젝트(`sindong-informatics`)를 씁니다. 데이터는 **반 id 로 완전히 갈립니다.**

| 앱 | 반 id |
|---|---|
| informatics | `c2-1`~`c2-6`, `info-2A`, `info-2B` |
| 이 앱 | `ai-2A`, `ai-2B`, `career-2A`, `career-2B` |

⚠ **보안 규칙 파일은 두 레포에 똑같이 들어 있고, 배포하면 프로젝트 전체를 덮어씁니다.**
한쪽만 고쳐서 `firebase deploy` 하면 다른 쪽 반이 저장 불가가 됩니다.
규칙을 고칠 일이 생기면 **두 레포의 `database.rules.json`·`storage.rules` 를 같은 내용으로 맞춘 뒤** 배포하세요.

## 반 추가하기

1. `js/config.js` 의 `CLASSES` 에 추가 (`type` 은 `ai` / `career`)
2. `database.rules.json` 과 `storage.rules` 의 반 id 정규식에 추가
3. `firebase deploy --only database,storage`
4. informatics 레포의 규칙 파일에도 같은 내용 반영

## 새 과목 추가하기

`js/constants.js` 의 `SUBJECT_UNITS` 에 `과목키: [단원 4개]` 를 넣고,
`js/views/student.js` 의 `DASH_UNIT_VIS` 에 단원별 이모지·색을 넣으면 됩니다.
