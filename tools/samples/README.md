# 덱 원본 · 만든 자료

## 이름 규칙

**`lessonN-*` 의 N = 진도표 차시 = 덱 제목 앞의 번호.** 셋을 늘 같게 씁니다.

> 예전에는 오리엔테이션을 1차시로 세는 옛 번호가 섞여 있었습니다
> (`lesson5-blind` 인데 제목은 「4. 맹목적 탐색」). 2026-09-05 에 전부 맞췄습니다.
> **옵시디언 노트의 차시 번호는 아직 하나씩 큽니다** — 노트 「6차시 … 균일 비용」 = 진도표 5차시.

| 덱 원본 | 덱 제목 | 만든 것 |
|---|---|---|
| `lesson2-system.deck.json` | 2. 인공지능 시스템 | 20장 |
| `lesson3-search.deck.json` | 3. 문제 해결과 탐색 | 39장 |
| `lesson4-blind.deck.json` | 4. 맹목적 탐색 | 63장 |
| `lesson4-algo.deck.json` | 4차시 BFS·DFS 알고리즘 보충 | 22장 (따로 뽑아 끼움) |
| `lesson5-uniform.deck.json` | 5. 균일 비용 탐색 | 26장 · 생성기 `verify/lesson5-deck.py` |
| `lesson6-smart.deck.json` | 6. 지능적 탐색 | 46장 · 생성기 `verify/lesson6-deck.py` |
| `lesson7-reason.deck.json` | 7. 지식의 표현과 추론 | 20장 · 생성기 `verify/lesson7-deck.py` |
| `layouts-catalog.deck.json` | 배치 견본 | 20장 — 어떤 배치가 있는지 눈으로 볼 때 |

## 덱 말고 들어 있는 것

| 파일 | 무엇 |
|---|---|
| `lesson5-worksheet.html` / `.pdf` | 종이 학습지(A4 인쇄용). `-edit.html` 은 브라우저에서 글자를 고치는 판 |
| `assess1-guide` / `-sheet` / `-key` `.html`·`.pdf` | 1차 수행평가 안내서·평가지·교사용 채점 기준 (`verify/assess1-docs.py` 가 만듦) |
| `music-answers.json` | 「음악 추천 시스템 분석하기」 학습지 답 |
| `*.pptx` · `*_png/` · `upload_png/` | **`.gitignore`** — 만든 결과물이라 레포에 안 올라갑니다. 백업 스크립트가 담아 갑니다 |

> ⚠ **덱 JSON 을 손으로 고치지 마세요.** 생성기(`verify/lessonN-deck.py`)를 고쳐 다시 뽑습니다.
> 손으로 고치면 검산값과 어긋납니다. (CLAUDE.md 14)
