$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\대수\Downloads\daesu-clean'
$env:NEXT_TELEMETRY_DISABLED = '1'
$devLine = 'npm run dev -- -p 3200 -H 0.0.0.0'
Write-Host ('▶ ' + $devLine) -ForegroundColor Green
iex $devLine
