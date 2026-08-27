/* ═══════════════════════════════════════
   tools/deck-png.mjs — pptx 를 PNG 로 내보내기 (Windows · PowerPoint 필요)

   앱의 수업자료는 PNG 묶음입니다. PowerPoint 에서 손본 pptx 를
   '슬라이드1.PNG, 슬라이드2.PNG …' 로 뽑아 그대로 올릴 수 있게 합니다.
   (지금까지 올라간 자료도 이 이름 규칙입니다)

   쓰는 법
     node tools/deck-png.mjs <파일.pptx> [-o 나올폴더] [--w 1920] [--h 1080]

   ⚠ LibreOffice 말고 PowerPoint COM 을 씁니다. 실행 중 PowerPoint 창이 잠깐 뜹니다.
═══════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

function die(msg){ console.error('✖ ' + msg); process.exit(1); }

const argv = process.argv.slice(2);
if(!argv.length){
  console.log('쓰는 법: node tools/deck-png.mjs <파일.pptx> [-o 나올폴더] [--w 1920] [--h 1080]');
  process.exit(0);
}
const src = path.resolve(argv[0]);
if(!fs.existsSync(src)) die(`파일이 없습니다: ${src}`);

const flag = (name, def) => {
  const i = argv.indexOf(name);
  return i > 0 && argv[i + 1] ? argv[i + 1] : def;
};
const outDir = path.resolve(flag('-o', path.join(path.dirname(src), path.basename(src, '.pptx') + '_png')));
const W = parseInt(flag('--w', '1920'), 10);
const H = parseInt(flag('--h', '1080'), 10);

fs.mkdirSync(outDir, { recursive: true });
for(const f of fs.readdirSync(outDir)) if(/\.png$/i.test(f)) fs.unlinkSync(path.join(outDir, f));

/* PowerShell 로 넘기는 값은 따옴표 하나까지 문제가 되므로 파일에 적어 넘깁니다.

   ⚠ 이미 PowerPoint 가 떠 있으면 **끝내지 않습니다.** 예전에는 무조건 Quit() 을 불러서
     선생님이 편집 중이던 창까지 같이 닫혔습니다. 이제는 우리가 띄운 경우에만 닫고,
     원래 떠 있던 경우에는 우리가 연 파일만 닫고 나옵니다.
     저장 안 한 편집이 있으면 아예 시작하지 않습니다. */
const ps = `
$ErrorActionPreference = 'Stop'
$mine = $false
try {
  $ppt = [Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application')
} catch {
  $ppt = New-Object -ComObject PowerPoint.Application
  $mine = $true
}
if (-not $mine) {
  foreach ($p in $ppt.Presentations) {
    if (-not $p.Saved) { throw ("PowerPoint 에 저장하지 않은 편집이 있습니다: " + $p.Name + " — 저장하고 다시 해주세요.") }
  }
}
try {
  $pres = $ppt.Presentations.Open('${src.replace(/'/g, "''")}', $true, $false, $false)
  $n = $pres.Slides.Count
  for ($i = 1; $i -le $n; $i++) {
    $out = Join-Path '${outDir.replace(/'/g, "''")}' ("슬라이드" + $i + ".PNG")
    $pres.Slides.Item($i).Export($out, "PNG", ${W}, ${H})
  }
  $pres.Close()
  Write-Output ("OK " + $n)
} finally {
  if ($mine) { $ppt.Quit() }
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
`;
const tmp = path.join(os.tmpdir(), `deck-png-${process.pid}.ps1`);
fs.writeFileSync(tmp, '﻿' + ps, 'utf8');   // BOM — 한글 경로가 깨지지 않게

const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmp],
                    { encoding: 'utf8' });
fs.unlinkSync(tmp);

if(r.status !== 0){
  console.error(r.stdout || '');
  console.error(r.stderr || '');
  die('PowerPoint 내보내기가 실패했습니다. PowerPoint 가 열려 있으면 닫고 다시 해보세요.');
}
const made = fs.readdirSync(outDir).filter(f => /\.PNG$/i.test(f)).length;
console.log(`✔ ${made}장 — ${outDir}`);
console.log('  앱 → 선생님 → 수업자료 → 새 자료 올리기 에서 이 폴더의 PNG 를 통째로 선택하세요.');
