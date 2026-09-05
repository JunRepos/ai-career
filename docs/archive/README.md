# 보관 — 지금은 쓰지 않는 문서와 코드

**여기 있는 것은 읽지 않습니다.** 옛날 것이라 지금 상태와 어긋납니다.
지우지 않고 남겨 둔 이유는 언젠가 되찾을 일이 있을까 해서입니다.

지금 읽어야 할 것은 네 개뿐입니다 — `CLAUDE.md` · `docs/course-map.md` · `HANDOFF.md` · `tools/deck-spec.md`.

## 문서

| 파일 | 무엇 | 왜 뺐나 |
|---|---|---|
| `PROJECT_CONTEXT.md` | `informatics` 앱(정보 교과) 전체 문서 | **다른 앱 문서**입니다. 반 목록이 `c2-1~c2-6` 이라 이 레포와 어긋납니다 |
| `SESSION_HANDOFF.md` | 2026-06-15 세션 인수인계 | **다른 레포의 ML 수행평가** 작업. 맨 위 "즉시 할 일" 이 지금 것으로 읽힙니다 |
| `OJ_20_PROBLEMS_PROPOSAL.md` | 파이썬 OJ 문제 20개 제안 | 이 앱은 OJ 메뉴가 빠져 있습니다 |
| `OJ_HARD_5_PROPOSAL.md` | 어려운 OJ 5문제 제안 | 위와 같음 |
| `SEARCH_GAME_PROPOSAL.md` | 탐색 실습 게임 **구상**서 | 게임을 다 만들었으니 역할이 끝났습니다 (`js/games/`) |

## `verify-2026-08/` — 옛 검산기

`diagram` 좌표가 겹치는지 검사하던 파일들입니다. **검사하는 판이 지금 자료에 없습니다.**

- `lesson6-check.mjs` — `S A B C D E F G H T` **산 판**. **폐기한 언덕 오르기·최상 우선**의 판입니다
- `lesson6-city.mjs` · `lesson5-check.mjs` — 같은 세대
- `lesson6-slide3.deck.json` — 폐기한 「5. 지능적 탐색」의 3번 장만 고치려고 만든 한 장짜리

기하 검사기 자체(`check()`)는 쓸 만해서 **`verify/layout-check.mjs`** 로 살려 두었습니다.
여기 있는 파일들은 그것을 불러 씁니다.
