# === 프로젝트에서 'Tab 이동 방해' 가능성 높은 코드 싹 스캔 ===
$ErrorActionPreference = "Stop"

# 0) 스크립트가 있는 폴더를 루트로 사용 (한글/공백 경로 안전)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $root) { $root = (Get-Location).Path }
Set-Location -LiteralPath $root

# 1) 결과 저장 위치
$fav = Join-Path $root ".favorites"
if (!(Test-Path $fav)) { New-Item -ItemType Directory -Force $fav | Out-Null }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outTxt = Join-Path $fav ("tab-suspects-" + $stamp + ".txt")

# 2) 스캔 패턴(탭 가로채기/지연 흔적)
$patterns = @(
  'onKeyDown',
  'onKeyUp',
  'preventDefault\(',
  '\bTab\b',
  'key(Code|)\s*===?\s*(9|["'']Tab["''])',
  'addEventListener\(\s*["'']keydown["'']',
  'isComposing',
  'composition(start|update|end)'
)

# 3) node_modules 제외하고 TS/JS 전파일 검사 + 주변 컨텍스트 같이 추출
$files = Get-ChildItem -Recurse -File -Include *.tsx,*.ts,*.jsx,*.js `
  | Where-Object { $_.FullName -notmatch '\\node_modules\\' }

$hits = @()
foreach ($f in $files) {
  $m = Select-String -Path $f.FullName -Pattern $patterns -AllMatches -Context 2,2
  if ($m) { $hits += $m }
}

# 4) 리포트 만들기
$sb = New-Object System.Text.StringBuilder
$null = $sb.AppendLine("=== TAB Suspects Report ($stamp) ===")
$null = $sb.AppendLine("Root: $root")
$null = $sb.AppendLine("")

# 4-1) 파일 목록 요약
$paths = $hits | Select-Object -ExpandProperty Path -Unique
$null = $sb.AppendLine(">> 의심 파일 목록 (" + $paths.Count + "개)")
foreach ($p in $paths) {
  $rel = $p.Replace($root + [IO.Path]::DirectorySeparatorChar, "")
  $null = $sb.AppendLine(" - " + $rel)
}
$null = $sb.AppendLine("")

# 4-2) 매치된 코드 조각
$null = $sb.AppendLine(">> 상세 매치 (파일:줄번호 주변 2줄 컨텍스트)")
foreach ($h in $hits) {
  $rel = $h.Path.Replace($root + [IO.Path]::DirectorySeparatorChar, "")
  $null = $sb.AppendLine("---- " + $rel + ":" + $h.LineNumber + " ----")
  $ctx = @()
  if ($h.Context) {
    if ($h.Context.PreContext) { $ctx += $h.Context.PreContext }
    $ctx += (">>> " + $h.Line)
    if ($h.Context.PostContext) { $ctx += $h.Context.PostContext }
  } else {
    $ctx += (">>> " + $h.Line)
  }
  foreach ($line in $ctx) { $null = $sb.AppendLine($line) }
  $null = $sb.AppendLine("")
}

# 5) 저장 + 열기
$sb.ToString() | Set-Content -Encoding UTF8 $outTxt
Write-Host "리포트 저장: $outTxt" -ForegroundColor Green
Start-Process notepad.exe $outTxt
