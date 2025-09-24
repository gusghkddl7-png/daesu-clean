function Set-UniformHeader {
  param(
    [Parameter(Mandatory=$true)][string]$File,
    [Parameter(Mandatory=$true)][string]$Title
  )
  if (!(Test-Path $File)) { Write-Host "파일 없음: $File" -ForegroundColor Red; return }
  $c = Get-Content $File -Raw
  if ($c -notmatch '^\s*"use client";') { $c = '"use client";' + [Environment]::NewLine + $c }
  if ($c -notmatch 'from\s+["'']react["'']') { $c = 'import React from "react";' + [Environment]::NewLine + $c }
  if ($c -notmatch 'from\s+"../components/PageHeader"') {
    $c = 'import PageHeader from "../components/PageHeader";' + [Environment]::NewLine + $c
    $c = 'import StatusLegend from "../components/StatusLegend";' + [Environment]::NewLine + $c
  }
  # <main> 바로 아래에 헤더 삽입(이미 있으면 유지)
  $rx = [regex]::new('(<main[^>]*>)', [Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($c -notmatch '<PageHeader\s') {
    $c = $rx.Replace($c, ('$1' + [Environment]::NewLine + '      <PageHeader title="' + $Title + '" right={<StatusLegend />} />' + [Environment]::NewLine), 1)
  }
  Set-Content $File $c -Encoding UTF8
  Write-Host "적용: $File" -ForegroundColor Green
}
