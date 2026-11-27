$ErrorActionPreference = 'Stop'
$dataDir = if ($env:CODEX_PRISM_DATA_DIR) { $env:CODEX_PRISM_DATA_DIR } else { Join-Path $env:USERPROFILE '.neri-desktop-theme' }
$recordPath = Join-Path $dataDir 'native-plugin-install.json'
if (-not (Test-Path -LiteralPath $recordPath)) { throw 'Native plugin installation record not found.' }
$record = Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
& (Join-Path $PSScriptRoot 'restore.ps1')
$package = Get-AppxPackage -Name 'OpenAI.Codex' | Sort-Object Version -Descending | Select-Object -First 1
if (-not $package) { throw 'Codex desktop CLI could not be located.' }
$cli = Join-Path $package.InstallLocation 'app\resources\codex.exe'
& $cli plugin remove 'neri-desktop-theme@neri-local' --json
if ($LASTEXITCODE -ne 0) { throw 'Native plugin removal failed.' }
$shell = New-Object -ComObject WScript.Shell
foreach ($entry in $record.shortcuts) {
  if (-not (Test-Path -LiteralPath $entry.path)) { continue }
  $current = $shell.CreateShortcut($entry.path)
  if ($current.TargetPath -ne $record.nativeAlias -or $current.Description -ne 'Codex desktop - Neri Desktop Theme enabled') { Write-Warning "Changed shortcut left intact: $($entry.path)"; continue }
  if ($entry.created) { Remove-Item -LiteralPath $entry.path }
  elseif ($entry.backup -and (Test-Path -LiteralPath $entry.backup)) { Copy-Item -LiteralPath $entry.backup -Destination $entry.path -Force }
}
Write-Host 'Native wallpaper plugin removed. Your wallpaper files and settings were preserved.'
