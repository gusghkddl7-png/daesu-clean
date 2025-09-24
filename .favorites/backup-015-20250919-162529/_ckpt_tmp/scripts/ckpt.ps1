param([string]$Note="")
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$time = Get-Date -Format yyyyMMdd_HHmmss
$label = ($Note -replace '[^\p{L}\p{Nd}_-]','_')
$dest = Join-Path $root "checkpoints"
$tmp  = Join-Path $root "_ckpt_tmp"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }

# node_modules, .next, checkpoints 제외 복사
robocopy $root $tmp /E /R:0 /W:0 /XD node_modules .next checkpoints > $null

$zip = Join-Path $dest ("ckpt_{0}{1}.zip" -f $time, $(if($label){ "_$label"}else{"" }))
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$tmp\*" -DestinationPath $zip -Force
Remove-Item $tmp -Recurse -Force
Write-Host "✅ 체크포인트 저장: $zip" -ForegroundColor Green
