param([int]$Port=3200)
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$bak  = Get-ChildItem (Join-Path $root "checkpoints\*.zip") -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $bak) { Write-Error "체크포인트(zip)가 없습니다. 먼저 'npm run ckpt'를 실행하세요."; exit 1 }

$rest = Join-Path $root "_restored"
if (Test-Path $rest) { Remove-Item $rest -Recurse -Force }
Expand-Archive -Path $bak.FullName -DestinationPath $rest -Force
Write-Host "✅ 복구 완료: $rest" -ForegroundColor Green

# 복구 폴더에서 바로 실행 (기존 dev 서버는 먼저 종료하세요)
Set-Location $rest
npm i
npm run dev -- -p $Port
