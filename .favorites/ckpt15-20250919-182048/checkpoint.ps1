param(
  [ValidateSet("list","new","restore")] [string]$cmd = "list",
  [string]$Id,
  [string]$Message,
  [string]$Root = (Split-Path -Parent $MyInvocation.MyCommand.Path)
)

$ErrorActionPreference = "Stop"
Set-Location $Root
$cpBase = Join-Path $Root ".checkpoints"
New-Item -ItemType Directory -Force -Path $cpBase | Out-Null

function Get-NextId {
  $ids = Get-ChildItem $cpBase -Directory -ErrorAction SilentlyContinue |
         Where-Object { $_.Name -match '^cp-(\d{3})-' } |
         ForEach-Object { [int]$Matches[1] }
  if ($ids.Count -eq 0) { return "001" }
  return "{0:d3}" -f ((($ids | Measure-Object -Maximum).Maximum) + 1)
}

switch ($cmd) {
  "list" {
    Write-Host "📚 Checkpoints (newest first):`n"
    Get-ChildItem $cpBase -Directory |
      Sort-Object Name -Descending |
      ForEach-Object {
        $meta = Join-Path $_.FullName "META.txt"
        $tag  = if (Test-Path $meta) { (Get-Content $meta -Raw).Trim() } else { "" }
        "{0}  ->  {1}" -f $_.Name, $_.FullName
      }
    break
  }

  "new" {
    $newId = if ($Id) { "{0:d3}" -f [int]$Id } else { Get-NextId }
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $dst   = Join-Path $cpBase ("cp-{0}-{1}" -f $newId,$stamp)
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    $excludeDirs = @("node_modules",".next",".turbo",".checkpoints",".favorites","dist","build","coverage","pnpm-store",".git\objects")
    & robocopy $Root $dst /MIR /XD $excludeDirs /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null

    $gitHead = if (Test-Path ".git\HEAD") { (Get-Content ".git\HEAD" -Raw).Trim() } else { "n/a" }
    @"
id: $newId
created: $stamp
message: $Message
source: $Root
excludes: $($excludeDirs -join ', ')
git_head: $gitHead
"@ | Set-Content -Encoding UTF8 (Join-Path $dst "META.txt")

    Write-Host "✅ created cp-$newId at $dst"
    break
  }

  "restore" {
    if (-not $Id) { Write-Error "restore에는 -Id (예: 009) 필요"; break }
    $pattern = "cp-{0}-*" -f ("{0:d3}" -f [int]$Id)
    $cand = Get-ChildItem $cpBase -Directory | Where-Object { $_.Name -like $pattern } |
            Sort-Object Name -Descending | Select-Object -First 1
    if (-not $cand) { Write-Error "❌ 해당 ID의 체크포인트가 없음: $Id"; break }

    # 현재 상태를 safety 백업(임시)으로 보관
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safety = Join-Path $cpBase ("_pre-restore-from-{0}-{1}" -f ("{0:d3}" -f [int]$Id),$stamp)
    New-Item -ItemType Directory -Force -Path $safety | Out-Null
    $excludeDirs = @("node_modules",".next",".turbo",".checkpoints",".favorites","dist","build","coverage","pnpm-store",".git\objects")
    & robocopy $Root $safety /MIR /XD $excludeDirs /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null

    # 복구 (미러링)
    & robocopy $cand.FullName $Root /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    Write-Host "✅ restored from $($cand.FullName)"
    Write-Host "↩️ safety snapshot: $safety"
    break
  }
}
