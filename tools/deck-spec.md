# 덱 JSON 설명서

`tools/deck-build.mjs` 가 읽는 파일 모양입니다. 옵시디언 차시 노트를 이 JSON 으로 옮기면
pptx 가 나옵니다. 표본은 `tools/samples/lesson3-system.deck.json` (3차시 전체).

```bash
node tools/deck-build.mjs tools/samples/lesson3-system.deck.json
node tools/deck-png.mjs "인공지능기초_3차시_인공지능시스템.pptx"
```

## 맨 바깥

| 이름 | 뜻 |
|---|---|
| `title` | 자료 이름 (앱에 올릴 때 쓰는 이름과 맞추면 편합니다) |
| `kicker` | 표지 위 작은 글씨. 예 `인공지능 기초 · 1-1-2` |
| `out` | 나올 pptx 이름 (`-o` 로 덮어쓸 수 있음) |
| `media` | 이미지 폴더. 기본값은 옵시디언 첨부 폴더 `04_Archive/99_media` |
| `slides` | 슬라이드 배열 |

## 글 안에서 쓰는 표시

| 표시 | 결과 |
|---|---|
| `**말**` | 굵게 + 갈색 강조 |
| `[[   ]]` | 학생이 채울 빈칸 (밑줄). 안에 글을 넣으면 답이 채워진 모양 |
| `앞 — 뒤` | (bullets 에서) 앞은 굵게, 뒤는 작은 설명으로 두 줄 |

이미지는 파일 이름만 적으면 `media` 폴더에서 찾습니다.
옵시디언에서 `![[Pasted image 20260824093545.png]]` 로 붙인 그림은
`"image": "Pasted image 20260824093545.png"` 로 그대로 쓰면 됩니다.

## 슬라이드 종류

### `title` — 표지
`title` `subtitle` `kicker` `image`

### `section` — 큰 구분
`num`(01) `title` `desc`

### `quiz` — 지난 시간 확인
`title` `items:[{ text, tag }]` — `tag` 없으면 Q1, Q2 … 가 붙습니다

### `cards` — 카드 묶음 (가장 자주 씀)
`title` `num` `cards:[…]`

카드 하나: `label`(작은 머리말) `text`(큰 글) `desc`(설명) `pills`(알약들)
`wide:true` 한 줄 전체 · `small:true` 큰 글을 조금 작게 · `accent:true` 머리말을 갈색으로
`grow` 두 칸일 때 너비 비율 (기본 0.5)

> 카드가 한 장에 안 들어가면 만들 때 ⚠ 경고가 뜹니다. 글을 줄이거나 장을 나누세요.

### `bullets` — 글 + 그림 (본문 기본)
`title` `num` `lead`(첫 문장) `bullets:[…]` `pills` `note:{label,text}`
`image` `imageSide:"right"` (기본은 왼쪽)

### `steps` — ① → ② → ③ 단계
`title` `lead` `steps:[{n,label,desc}]` `foot` `image`

### `fill` — 빈칸 채우기 (수업 중 학생 답을 받아 적는 장)
`title` `image` `rows:["입력 (인식)", …]`
답을 미리 채우려면 `rows:[{label,answer}]`

### `table` — 비교표
`title` `head:[…]` `rows:[[…]]` `foot` `firstCol`(첫 칸 너비, 기본 3.4)

### `summary` — 오늘 정리
`title` `items:[…]` `foot`

### `gallery` — 그림 여러 장
`title` `items:[{image,label,text}]`

### `image` — 그림 한 장 크게
`title` `image` `caption`

## 모든 슬라이드 공통

`notes` 를 적으면 PowerPoint 발표자 노트로 들어갑니다.
앱의 **🎤 발표자 보기 → 내 대본 메모** 에 그대로 옮겨 적으면 수업 중에 보입니다.

## 만든 뒤

1. PowerPoint 로 열어 어색한 줄바꿈·넘침을 손봅니다 (여기서 장을 빼거나 더해도 됩니다)
2. `node tools/deck-png.mjs <파일.pptx>` 로 PNG 를 뽑습니다
3. 앱 → 선생님 → 수업자료 → 새 자료 올리기 → **두 반(ai-2B, ai-2D) 모두 체크**

---

## 옵시디언 노트에서 오는 지시 (선생님과의 약속)

**기본은 지시 없음입니다.** 차시 노트에는 수업 내용만 있고, 배치는 노트를 읽고 직접 정합니다.
(4차시 덱 28장도 지시 없이 노트만 보고 만든 것입니다.)

선생님이 원하는 그림이 있을 때만 그 자리에 한 줄이 들어옵니다.

```markdown
### 용어 네 개
> [!slide] 여기는 표로 비교하면 좋겠어
```

- **형식이 정해져 있지 않습니다.** 자유로운 한국어 문장입니다. 읽고 알아서 맞추세요.
- `이 장은 빼도 됨` · `두 장으로 쪼개줘` · `그림 크게` · `너무 빽빽해` 같은 말이 옵니다
- 배치 이름(아래 표)을 그대로 쓰실 수도 있지만, 외우시라고 강요하지 마세요.
- 상자 안의 `대본: …` 줄은 그 슬라이드의 `notes` 로 넣습니다.

**배치 이름을 쓰셨을 때의 대응**

| 노트에 적힌 이름 | type |
|---|---|
| 표지 | `title` |
| 구분 | `section` (뒤의 숫자가 `num`) |
| 질문 | `quiz` |
| 카드 | `cards` |
| 글그림 | `bullets` |
| 단계 | `steps` |
| 빈칸 | `fill` |
| 표 | `table` |
| 정리 | `summary` |
| 사진 | `image` |
| 사진모음 | `gallery` |

`건너뜀` 슬라이드로 안 만듦 · `앞 장에` 앞 슬라이드에 합침 · `2장으로` 나눠서

**본문 표시** — `**굵게**` 는 강조, `[  ]` 는 빈칸, `![[그림.png]]` 는 그 장의 `image`.

## PPT 를 보고 말로 고치실 때

"12장 표로 바꿔" 처럼 말씀하시면, 덱 JSON 을 고쳐 다시 뽑은 뒤
**그 지시를 차시 노트의 해당 자리에도 `> [!slide]` 한 줄로 적어 두세요.**
다음에 다시 만들 때 같은 결과가 나옵니다.
