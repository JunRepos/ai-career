param(
  [string]$Dest = "D:\Google drive\ai-career-backup",
  [string]$Repo = "C:\Users\PC\Desktop\github\ai-career"
)
# ═══════════════════════════════════════════════════════════════
#  tools/backup-claude.ps1 — 컴퓨터를 갈아엎기 전에 챙길 것을 모읍니다
#
#  깃허브에 이미 있는 것(코드·문서·덱 원본·검산 스크립트)은 안 담습니다.
#  **깃허브에 없어서 초기화하면 진짜로 사라지는 것**만 담습니다.
#
#    ① 클로드 코드 대화 기록 · 메모리 · 설정   (~/.claude)
#    ② 레포에 없는 파일   .claude/launch.json · 손본 *.pptx
#    ③ 되살리는 법을 적은 RESTORE.md
#
#  쓰는 법
#    powershell -ExecutionPolicy Bypass -File tools\backup-claude.ps1
#    powershell -ExecutionPolicy Bypass -File tools\backup-claude.ps1 -Dest "E:\backup"
#
#  ⚠ 지우지 않습니다(/E). 여러 번 돌려도 바뀐 것만 새로 옮깁니다.
#  ⚠ **이 파일은 UTF-8 BOM 으로 저장해야 합니다.** PowerShell 5.1 은 BOM 이 없으면
#    .ps1 을 cp949 로 읽어서 한글이 전부 깨집니다. (2026-08-28 실제로 겪음)
#  ⚠ RESTORE.md 본문은 작은따옴표 here-string 으로 씁니다 —
#    큰따옴표로 쓰면 백틱(`)이 이스케이프로 먹혀 스크립트가 깨집니다. (PowerShell 5.1)
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = 'Stop'
$claudeHome = Join-Path $env:USERPROFILE '.claude'

Write-Output "■ 백업 시작"
Write-Output "   보낼 곳 : $Dest"
Write-Output "   레포    : $Repo"
Write-Output ""

New-Item -ItemType Directory -Force -Path $Dest | Out-Null

# ── ① 클로드 코드 홈 ──────────────────────────────────────────
#    projects = 대화 기록(제일 큼) · 그 안에 memory 도 들어 있습니다
#    telemetry 는 안 담습니다 (쓸모 없고 계속 커집니다)
$homeDst = Join-Path $Dest 'claude-home'
foreach ($sub in @('projects', 'sessions', 'session-env', 'tasks', 'backups')) {
  $src = Join-Path $claudeHome $sub
  if (Test-Path $src) {
    Write-Output "  · ~/.claude/$sub"
    robocopy $src (Join-Path $homeDst $sub) /E /NFL /NDL /NJH /NJS /R:2 /W:2 | Out-Null
  }
}
New-Item -ItemType Directory -Force -Path $homeDst | Out-Null
$settings = Join-Path $claudeHome 'settings.json'
if (Test-Path $settings) {
  Copy-Item $settings $homeDst -Force
  Write-Output "  · ~/.claude/settings.json"
}

# ── ② 레포에 없는 파일 (.gitignore 에 걸린 것들) ──────────────
$extra = Join-Path $Dest 'repo-extras'
New-Item -ItemType Directory -Force -Path $extra | Out-Null

$launch = Join-Path $Repo '.claude\launch.json'
if (Test-Path $launch) {
  New-Item -ItemType Directory -Force -Path (Join-Path $extra '.claude') | Out-Null
  Copy-Item $launch (Join-Path $extra '.claude') -Force
  Write-Output "  · .claude/launch.json  (미리보기 서버 설정 — 레포에 없음)"
}

$pptxDst = Join-Path $extra 'pptx'
New-Item -ItemType Directory -Force -Path $pptxDst | Out-Null
$n = 0
foreach ($dir in @((Join-Path $Repo 'tools\samples'),
                   (Join-Path $env:USERPROFILE 'Downloads'))) {
  if (-not (Test-Path $dir)) { continue }
  Get-ChildItem -Path $dir -Filter '*.pptx' -File -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName $pptxDst -Force
    $n++
  }
}
Write-Output "  · 손본 pptx $n개  (레포에 없음)"

# ── ③ 되살리는 법 ────────────────────────────────────────────
$commit = (git -C $Repo rev-parse --short HEAD 2>$null)
if (-not $commit) { $commit = '(모름)' }
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'

$restore = @'
# 되살리는 법

**만든 때** {STAMP} · **그때 레포 커밋** {COMMIT}

이 폴더에는 **깃허브에 없는 것만** 들어 있습니다.
코드·문서·덱 원본·검산 스크립트는 전부 깃허브에 있으니 여기 없습니다.

---

## 1. 레포부터 — 이것만 해도 하네스는 다 살아납니다

    git clone https://github.com/JunRepos/ai-career.git
    cd ai-career
    npm install

⚠ **경로를 그대로 맞추세요** — `C:\Users\PC\Desktop\github\ai-career`
대화 기록 폴더 이름이 **절대 경로를 인코딩**하고 있어서, 경로가 다르면 대화를 못 찾습니다.

그다음 새 대화를 열어 **`HANDOFF.md` 를 통째로 붙여넣으면** 지금까지의 맥락을 이어받습니다.
`CLAUDE.md` 는 대화마다 자동으로 읽히고, `docs/course-map.md` 에 진도와 결정 기록이 있습니다.

**여기까지가 확실하게 되는 부분입니다.**

## 2. 레포에 없던 파일 되돌리기

    repo-extras\.claude\launch.json  ->  <레포>\.claude\launch.json
    repo-extras\pptx\*.pptx          ->  <레포>\tools\samples\

pptx 는 선생님이 PowerPoint 로 손보신 것들입니다. `.gitignore` 에 걸려 깃허브에 없습니다.

## 3. 대화 기록 되살리기 — 될 수도, 안 될 수도

    claude-home\  ->  C:\Users\<사용자>\.claude\

그리고 레포 폴더에서

    claude --resume

* **사용자 이름이 `PC` 가 아니면** `claude-home\projects\` 안의 폴더 이름을 바꿔야 합니다.
  폴더 이름이 곧 경로입니다 — 예) `C--Users-PC-Desktop-github-ai-career` 를
  `C--Users-철수-Desktop-github-ai-career` 로.
* ⚠ **보장된 방법이 아닙니다.** 공식 백업 기능이 아니라 파일을 그대로 옮기는 것이라,
  클로드 코드가 판올림되면 안 열릴 수 있습니다.
* **대화가 안 열려도 1번만 해두면 일하는 데는 지장이 없습니다.**

## 4. 깃허브에도, 여기에도 없는 것

원래부터 구글 드라이브에 있습니다. 그대로 두세요.

* 옵시디언 볼트 — 차시 노트
* 교과서 PDF · 평가계획서

## 5. 다시 백업할 때

    powershell -ExecutionPolicy Bypass -File tools\backup-claude.ps1

바뀐 것만 새로 옮깁니다. 지우지 않습니다.
'@

$restore = $restore.Replace('{STAMP}', $stamp).Replace('{COMMIT}', $commit)
Set-Content -Path (Join-Path $Dest 'RESTORE.md') -Value $restore -Encoding UTF8
Write-Output "  · RESTORE.md"

# ── 확인 ─────────────────────────────────────────────────────
$all = Get-ChildItem $Dest -Recurse -File -ErrorAction SilentlyContinue
$size = ($all | Measure-Object -Property Length -Sum).Sum
Write-Output ""
Write-Output ("■ 끝 — 파일 {0}개 · {1:N0} MB" -f $all.Count, ($size / 1MB))
Write-Output "   $Dest"
Write-Output "   되살리는 법은 그 안의 RESTORE.md 를 보세요."
