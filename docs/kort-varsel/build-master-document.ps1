# Bygger MASTER-DOCUMENT.md = preamble + MASTER.md + README.md + 01..07
# Korrekt UTF-8: ingress ligger i MASTER-DOCUMENT-PREAMBLE.md (ersatt {{DATUM}}).
# Kor fran repo-rot: powershell -ExecutionPolicy Bypass -File docs/kort-varsel/build-master-document.ps1

$ErrorActionPreference = "Stop"
$base = $PSScriptRoot
$out = Join-Path $base "MASTER-DOCUMENT.md"
$utf8 = New-Object System.Text.UTF8Encoding $false
$datum = Get-Date -Format "yyyy-MM-dd"

$preamblePath = Join-Path $base "MASTER-DOCUMENT-PREAMBLE.md"
if (-not (Test-Path $preamblePath)) { throw "Saknas: $preamblePath" }
$preamble = [System.IO.File]::ReadAllText($preamblePath, [System.Text.Encoding]::UTF8).Replace("{{DATUM}}", $datum)

$sb = New-Object System.Text.StringBuilder
[void]$sb.Append($preamble)
[void]$sb.Append([System.IO.File]::ReadAllText((Join-Path $base "MASTER.md"), [System.Text.Encoding]::UTF8))

$append = {
  param($rubrik, $filnamn)
  [void]$sb.Append([System.Environment]::NewLine + [System.Environment]::NewLine + "---" + [System.Environment]::NewLine + [System.Environment]::NewLine)
  [void]$sb.Append($rubrik + [System.Environment]::NewLine + [System.Environment]::NewLine)
  [void]$sb.Append([System.IO.File]::ReadAllText((Join-Path $base $filnamn), [System.Text.Encoding]::UTF8))
}

& $append "# DEL B - README (docs/kort-varsel/README.md)" "README.md"
& $append "# DEL C - 01 Teknisk (01-TEKNISK.md)" "01-TEKNISK.md"
& $append "# DEL D - 02 Statistik (02-STATISTIK.md)" "02-STATISTIK.md"
& $append "# DEL E - 03 Prediktion (03-PREDIKTION.md)" "03-PREDIKTION.md"
& $append "# DEL F - 04 GDPR (04-GDPR.md)" "04-GDPR.md"
& $append "# DEL G - 05 Open source (05-OPEN-SOURCE.md)" "05-OPEN-SOURCE.md"
& $append "# DEL H - 06 Vision (06-VISION.md)" "06-VISION.md"
& $append "# DEL I - 07 AI-forberedelse (07-AI-FORBEREDELSE.md)" "07-AI-FORBEREDELSE.md"

[System.IO.File]::WriteAllText($out, $sb.ToString(), $utf8)
Write-Host "Wrote $out ($((Get-Item $out).Length) bytes)"
