param([int]$DebugPort = 9340)
$ErrorActionPreference = 'Stop'
if ($DebugPort -lt 1024 -or $DebugPort -gt 65535) { throw 'Invalid debug port.' }
$sourceRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $env:USERPROFILE '.codex\config.toml'
$wasDisabled = $false
if (Test-Path -LiteralPath $configPath) {
  $beforeInstall = [IO.File]::ReadAllText($configPath)
  $wasDisabled = [regex]::IsMatch($beforeInstall,'(?ms)^\[plugins\."neri-desktop-theme@neri-local"\][ \t]*\r?\n(?:(?!^\[).)*?^enabled[ \t]*=[ \t]*false\b')
}
$dataDir = if ($env:CODEX_PRISM_DATA_DIR) { $env:CODEX_PRISM_DATA_DIR } else { Join-Path $env:USERPROFILE '.neri-desktop-theme' }
# 首次安装只迁移数据，不读取旧插件代码；旧设置留作回退。
$legacyData = Join-Path $env:USERPROFILE '.codex-wallpaper-prism'
if (-not (Test-Path -LiteralPath (Join-Path $dataDir 'config.json')) -and (Test-Path -LiteralPath (Join-Path $legacyData 'config.json'))) {
  New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
  foreach ($entry in @('config.json','presets','uploads')) {
    $from = Join-Path $legacyData $entry
    if (Test-Path -LiteralPath $from) { Copy-Item -LiteralPath $from -Destination $dataDir -Recurse -Force }
  }
}
$marketRoot = Join-Path $env:LOCALAPPDATA 'NeriDesktopTheme\marketplace'
$sourcePlugin = Join-Path $marketRoot 'plugins\neri-desktop-theme'
$node = (Get-Command node.exe -ErrorAction Stop).Source
if ([int]((& $node --version).TrimStart('v').Split('.')[0]) -lt 22) { throw 'Node.js 22 or newer is required.' }
$package = Get-AppxPackage -Name 'OpenAI.Codex' | Sort-Object Version -Descending | Select-Object -First 1
if (-not $package) { throw 'Codex desktop is not installed.' }
$cli = Join-Path $package.InstallLocation 'app\resources\codex.exe'
$nativeAlias = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\chatgpt-desktop.exe'
if (-not (Test-Path -LiteralPath $nativeAlias)) { throw 'Enable the chatgpt-desktop.exe app execution alias in Windows Settings before installing.' }
New-Item -ItemType Directory -Path $sourcePlugin -Force | Out-Null
if ([IO.Path]::GetFullPath($sourceRoot) -ne [IO.Path]::GetFullPath($sourcePlugin)) {
  foreach ($folder in @('codex','src','sidecars','assets','docs','.codex-plugin')) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot $folder) -Destination $sourcePlugin -Recurse -Force
  }
  foreach ($file in @('.mcp.json','package.json','README.md','安装.cmd','恢复原界面.cmd','卸载插件.cmd')) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot $file) -Destination $sourcePlugin -Force
  }
}
$mcpPath = Join-Path $sourcePlugin '.mcp.json'
$mcp = Get-Content -Raw -LiteralPath $mcpPath | ConvertFrom-Json
$mcp.mcpServers.neri_theme.command = $node
$mcp.mcpServers.neri_theme.env.CODEX_PRISM_DEBUG_PORT = "$DebugPort"
$mcp.mcpServers.neri_theme.env | Add-Member -NotePropertyName 'CODEX_PRISM_DATA_DIR' -NotePropertyValue $dataDir -Force
$utf8 = New-Object System.Text.UTF8Encoding $false
[IO.File]::WriteAllText($mcpPath, ($mcp | ConvertTo-Json -Depth 20), $utf8)
$catalogDir = Join-Path $marketRoot '.agents\plugins'
New-Item -ItemType Directory -Path $catalogDir -Force | Out-Null
$catalog = @{
  name = 'neri-local'
  interface = @{ displayName = 'Neri Desktop Theme Local' }
  plugins = @(@{ name = 'neri-desktop-theme'; source = @{ source = 'local'; path = './plugins/neri-desktop-theme' }; policy = @{ installation = 'AVAILABLE'; authentication = 'ON_INSTALL' }; category = 'Productivity' })
} | ConvertTo-Json -Depth 20
[IO.File]::WriteAllText((Join-Path $catalogDir 'marketplace.json'), $catalog, $utf8)
$catalogsRaw = & $cli plugin marketplace list --json
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect plugin marketplaces.' }
$catalogs = ($catalogsRaw -join "`n") | ConvertFrom-Json
$existing = @($catalogs.marketplaces | Where-Object { $_.name -eq 'neri-local' })
if ($existing.Count -gt 0 -and [IO.Path]::GetFullPath($existing[0].root) -ne [IO.Path]::GetFullPath($marketRoot)) { throw 'A different marketplace already uses neri-local; it was left unchanged.' }
$marketResult = & $cli plugin marketplace add $marketRoot --json
if ($LASTEXITCODE -ne 0) { throw 'Plugin marketplace registration failed.' }
$installRaw = & $cli plugin add 'neri-desktop-theme@neri-local' --json
if ($LASTEXITCODE -ne 0) { throw 'Native plugin installation failed.' }
$installed = ($installRaw -join "`n") | ConvertFrom-Json
if (-not $installed.installedPath) { throw 'Plugin installation returned no installed path.' }
if ($wasDisabled) {
  $afterInstall = [IO.File]::ReadAllText($configPath)
  $disabledConfig = [regex]::Replace($afterInstall,'(?ms)(^\[plugins\."neri-desktop-theme@neri-local"\][ \t]*\r?\n)(.*?)(?=^\[|\z)', {
    param($m)
    $m.Groups[1].Value + [regex]::Replace($m.Groups[2].Value,'(?m)^enabled[ \t]*=[ \t]*true[ \t]*(?=\r?$)','enabled = false')
  })
  [IO.File]::WriteAllText($configPath,$disabledConfig,$utf8)
  $validate = & $cli plugin list --marketplace neri-local --json 2>&1
  if ($LASTEXITCODE -ne 0) { [IO.File]::WriteAllText($configPath,$afterInstall,$utf8); throw '保留禁用状态时配置校验失败。' }
}

New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
$backupDir = Join-Path $dataDir 'plugin-shortcut-backup'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$recordPath = Join-Path $dataDir 'native-plugin-install.json'
$previous = if (Test-Path -LiteralPath $recordPath) { Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json } else { $null }
$shell = New-Object -ComObject WScript.Shell
$shortcutPaths = @((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Codex.lnk'), (Join-Path ([Environment]::GetFolderPath('Programs')) 'Codex.lnk'))
# 修复用户实际使用的普通 ChatGPT 入口；只匹配本应用，排除 ChatGPT Classic。
# 使用执行别名而非带版本号的 WindowsApps 路径，避免更新后指向旧版 EXE。
$normalStartShortcut = Join-Path ([Environment]::GetFolderPath('Programs')) 'ChatGPT.lnk'
if (-not (Test-Path -LiteralPath $normalStartShortcut)) { $shortcutPaths += $normalStartShortcut }
$normalShortcutRoots = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'), (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar'))
foreach ($shortcutRoot in $normalShortcutRoots) {
  foreach ($candidate in @(Get-ChildItem -LiteralPath $shortcutRoot -Filter '*.lnk' -ErrorAction SilentlyContinue)) {
    $candidateLink = $shell.CreateShortcut($candidate.FullName)
    if ($candidateLink.TargetPath -eq $nativeAlias -or $candidateLink.TargetPath -match '(?i)[\\/]OpenAI\.Codex_[^\\/]+[\\/]app[\\/]ChatGPT\.exe$') {
      $shortcutPaths += $candidate.FullName
    }
  }
}
$shortcutPaths = @($shortcutPaths | Select-Object -Unique)
$records = @()
for ($index = 0; $index -lt $shortcutPaths.Count; $index++) {
  $path = $shortcutPaths[$index]
  $oldRecord = if ($previous) { @($previous.shortcuts | Where-Object { $_.path -eq $path }) | Select-Object -First 1 } else { $null }
  $backup = if ($oldRecord) { $oldRecord.backup } else { $null }
  $created = if ($oldRecord) { [bool]$oldRecord.created } else { -not (Test-Path -LiteralPath $path) }
  if (-not $oldRecord -and -not $created) { $backup = Join-Path $backupDir ("shortcut-{0}.lnk" -f [Guid]::NewGuid().ToString('N')); Copy-Item -LiteralPath $path -Destination $backup -Force }
  $shortcut = $shell.CreateShortcut($path)
  $shortcut.TargetPath = $nativeAlias
  $shortcut.Arguments = "--remote-debugging-address=127.0.0.1 --remote-debugging-port=$DebugPort"
  $shortcut.WorkingDirectory = Split-Path -Parent $nativeAlias
  $shortcut.IconLocation = (Join-Path $package.InstallLocation 'app\resources\icon-chatgpt.ico')
  $shortcut.Description = 'Codex desktop - Neri Desktop Theme enabled'
  $shortcut.WindowStyle = 1
  $shortcut.Save()
  $records += @{ path = $path; backup = $backup; created = $created }
}
$record = @{ pluginId = 'neri-desktop-theme@neri-local'; installedPath = $installed.installedPath; marketplaceRoot = $marketRoot; nativeAlias = $nativeAlias; debugPort = $DebugPort; shortcuts = $records } | ConvertTo-Json -Depth 20
[IO.File]::WriteAllText($recordPath, $record, $utf8)

# Preserve the existing data and settings while switching to the installed plugin runtime.
$infoPath = Join-Path $dataDir 'codex-server.json'
if (Test-Path -LiteralPath $infoPath) {
  try {
    $info = Get-Content -Raw -LiteralPath $infoPath | ConvertFrom-Json
    $uri = "http://127.0.0.1:$($info.port)"
    $headers = @{ 'X-Prism-Token' = $info.token }
    $live = Invoke-RestMethod -Uri "$uri/api/state" -Headers $headers -TimeoutSec 2
    if ($live.pid -eq $info.pid) { Invoke-RestMethod -Uri "$uri/api/stop" -Method Post -Headers $headers -ContentType 'application/json' -Body '{}' | Out-Null; Start-Sleep -Milliseconds 500 }
  } catch { Write-Warning 'Existing wallpaper service could not be stopped; the plugin will reuse it if still healthy.' }
}
$env:CODEX_PRISM_DEBUG_PORT = "$DebugPort"
if (-not $wasDisabled) {
  $activation = Start-Process -FilePath $node -ArgumentList ('"{0}"' -f (Join-Path $installed.installedPath 'codex\activate.mjs')) -WindowStyle Hidden -PassThru
  if (-not $activation.WaitForExit(20000)) { throw 'Plugin activation did not finish in time. Check server-error.log.' }
  if ($activation.ExitCode -ne 0) { throw 'The plugin is installed, but its wallpaper service could not start. Check server-error.log.' }
} else { Write-Host 'Updated plugin; its existing disabled state was preserved. No theme service was started.' }
# 新主题成功启动后再停止旧服务，并精确禁用旧插件，避免双重注入。
$configPath = Join-Path $env:USERPROFILE '.codex\config.toml'
if (Test-Path -LiteralPath $configPath) {
  $originalConfig = [IO.File]::ReadAllText($configPath)
  $updatedConfig = [regex]::Replace($originalConfig, '(?ms)(^\[plugins\."codex-wallpaper-prism@prism-local"\][ \t]*\r?\n)(.*?)(?=^\[|\z)', {
    param($m)
    $m.Groups[1].Value + [regex]::Replace($m.Groups[2].Value, '(?m)^enabled[ \t]*=[ \t]*true[ \t]*(?=\r?$)', 'enabled = false')
  })
  if ($updatedConfig -ne $originalConfig) {
    $legacyConfigBackup = Join-Path $dataDir 'codex-config-before-migration.toml'
    if (-not (Test-Path -LiteralPath $legacyConfigBackup)) { Copy-Item -LiteralPath $configPath -Destination $legacyConfigBackup }
    [IO.File]::WriteAllText($configPath,$updatedConfig,$utf8)
    $configCheck = & $cli plugin list --marketplace neri-local --json 2>&1
    if ($LASTEXITCODE -ne 0) {
      [IO.File]::WriteAllText($configPath,$originalConfig,$utf8)
      throw '插件配置校验失败，已恢复写入前的配置。'
    }
  }
}
$legacyInfoPath = Join-Path $legacyData 'codex-server.json'
if (Test-Path -LiteralPath $legacyInfoPath) {
  try {
    $legacyInfo = Get-Content -Raw -LiteralPath $legacyInfoPath | ConvertFrom-Json
    $legacyHeaders = @{ 'X-Prism-Token' = $legacyInfo.token }
    $legacyUri = "http://127.0.0.1:$($legacyInfo.port)"
    $legacyState = Invoke-RestMethod -Uri "$legacyUri/api/state" -Headers $legacyHeaders -TimeoutSec 2
    if ($legacyState.pid -eq $legacyInfo.pid) { Invoke-RestMethod -Uri "$legacyUri/api/stop" -Method Post -Headers $legacyHeaders -Body '{}' -ContentType 'application/json' | Out-Null }
  } catch { Write-Warning '旧 Prism 服务未能确认停止，请检查是否还有旧版窗口。' }
}
Write-Host ("Installed native plugin: {0}" -f $installed.installedPath)
Write-Host ("Direct Codex shortcut: {0}" -f $shortcutPaths[0])
foreach ($path in $shortcutPaths) { Write-Host ("Wallpaper-ready native shortcut: {0}" -f $path) }
Write-Host 'Open ChatGPT or Codex normally from the repaired shortcuts. No external launcher is needed.'
Write-Host 'An already-running window without the debug port needs one full exit and reopen. Automatic updater relaunches may also require reopening from a repaired shortcut.'
