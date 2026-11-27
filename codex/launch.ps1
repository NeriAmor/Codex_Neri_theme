param([int]$DebugPort = 9340, [switch]$StudioOnly)
$ErrorActionPreference = 'Stop'
$prismRoot = Split-Path -Parent $PSScriptRoot
$prismData = if ($env:CODEX_PRISM_DATA_DIR) { $env:CODEX_PRISM_DATA_DIR } else { Join-Path $env:USERPROFILE '.neri-desktop-theme' }
New-Item -ItemType Directory -Path $prismData -Force | Out-Null
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw 'Node.js 22 or newer is required: https://nodejs.org/' }
$nodeMajor = [int]((& $nodeCommand.Source --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) { throw 'Node.js 22 or newer is required.' }
$infoPath = Join-Path $prismData 'codex-server.json'
$info = $null
if (Test-Path -LiteralPath $infoPath) {
  try {
    $candidate = Get-Content -Raw -LiteralPath $infoPath | ConvertFrom-Json
    $reply = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/state" -f $candidate.port) -Headers @{ 'X-Prism-Token' = $candidate.token } -TimeoutSec 3
    if ($reply.pid -eq $candidate.pid) { $info = $candidate }
  } catch {}
}
if (-not $info) {
  $env:CODEX_PRISM_DEBUG_PORT = "$DebugPort"
  $env:CODEX_PRISM_DATA_DIR = $prismData
  $cleanElectron = $env:ELECTRON_RUN_AS_NODE
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  try {
    Start-Process -FilePath $nodeCommand.Source -ArgumentList @(('"{0}"' -f (Join-Path $PSScriptRoot 'server.mjs'))) -WorkingDirectory $prismRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $prismData 'server.log') -RedirectStandardError (Join-Path $prismData 'server-error.log') | Out-Null
  } finally { if ($null -ne $cleanElectron) { $env:ELECTRON_RUN_AS_NODE = $cleanElectron } }
  for ($attempt = 0; $attempt -lt 80; $attempt++) {
    Start-Sleep -Milliseconds 250
    try {
      $candidate = Get-Content -Raw -LiteralPath $infoPath | ConvertFrom-Json
      $reply = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/state" -f $candidate.port) -Headers @{ 'X-Prism-Token' = $candidate.token } -TimeoutSec 1
      if ($reply.pid -eq $candidate.pid) { $info = $candidate; break }
    } catch {}
  }
  if (-not $info) { throw "Prism failed to start. See $prismData\server-error.log" }
}
Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/panel" -f $info.port) -Method Post -Headers @{ 'X-Prism-Token' = $info.token } -ContentType 'application/json' -Body '{}' | Out-Null
if ($StudioOnly) { exit }
$prismDebugPort = [int]$info.debugPort
try { $null = Invoke-RestMethod -Uri "http://127.0.0.1:$prismDebugPort/json/version" -TimeoutSec 1; exit } catch {}
$codexProcesses = Get-Process -Name ChatGPT -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*OpenAI.Codex*' }
if ($codexProcesses) {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show('Codex is running without the Prism debug port. Fully exit Codex (including the tray), then run this launcher again. Your current session has not been interrupted.', 'Prism - One-time restart required') | Out-Null
  exit
}
$codexPackage = Get-AppxPackage -Name 'OpenAI.Codex' | Sort-Object Version -Descending | Select-Object -First 1
$codexExe = if ($env:CODEX_PRISM_EXE) { $env:CODEX_PRISM_EXE } elseif ($codexPackage) { Join-Path $codexPackage.InstallLocation 'app\ChatGPT.exe' } else { $null }
if (-not $codexExe -or -not (Test-Path -LiteralPath $codexExe)) { throw 'Codex desktop executable not found. Set CODEX_PRISM_EXE to its full executable path.' }
$cleanElectron = $env:ELECTRON_RUN_AS_NODE
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
try { Start-Process -FilePath $codexExe -ArgumentList @('--remote-debugging-address=127.0.0.1',"--remote-debugging-port=$prismDebugPort") -WindowStyle Hidden | Out-Null }
finally { if ($null -ne $cleanElectron) { $env:ELECTRON_RUN_AS_NODE = $cleanElectron } }
