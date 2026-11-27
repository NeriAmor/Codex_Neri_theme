# 只维护已有的应用入口；插件不生成桌面/开始菜单快捷方式。
function Sync-NeriShortcuts {
  param(
    [string]$DataDir, [string]$NativeAlias, [string]$NativeProfile,
    [int]$DebugPort = 9340, [string[]]$ShortcutRoots,
    $Previous, $Legacy, [string]$IconPath
  )
  $shell = New-Object -ComObject WScript.Shell
  $backupDir = Join-Path $DataDir 'plugin-shortcut-backup'
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  $records = @(); $removed = @()
  $candidates = @(
    foreach ($root in $ShortcutRoots) {
      Get-ChildItem -LiteralPath $root -Filter '*.lnk' -ErrorAction SilentlyContinue
    }
  ) | Sort-Object FullName -Unique
  foreach ($candidate in $candidates) {
    $path = $candidate.FullName
    $link = $shell.CreateShortcut($path)
    $owned = $link.Description -match '^Codex desktop - (Neri Desktop Theme|Wallpaper Prism) enabled$|^Codex desktop with Wallpaper Prism$'
    $isApp = $link.TargetPath -eq $NativeAlias -or $link.TargetPath -match '(?i)[\\/]OpenAI\.Codex_[^\\/]+[\\/]app[\\/](ChatGPT|Codex)\.exe$'
    if (-not $isApp -and -not $owned) { continue }
    $old = @($Previous.shortcuts | Where-Object { $_.path -eq $path }) | Select-Object -First 1
    $original = @($Legacy.shortcuts | Where-Object { $_.path -eq $path }) | Select-Object -First 1
    # 旧主题记录曾把自己生成的入口当作“原有入口”，优先追溯 Prism 的原始记录。
    $provenance = if ($original) { $original } else { $old }
    if ($owned -and (($provenance -and $provenance.created) -or $candidate.BaseName -eq 'Codex Prism Wallpaper')) {
      $archive = Join-Path $backupDir ('removed-' + [guid]::NewGuid().ToString('N') + '.lnk')
      Copy-Item -LiteralPath $path -Destination $archive
      Remove-Item -LiteralPath $path
      $removed += @{ path = $path; backup = $archive }
      continue
    }
    $backup = if ($provenance) { $provenance.backup } else { $null }
    if (-not $backup -or -not (Test-Path -LiteralPath $backup)) {
      $backup = Join-Path $backupDir ('shortcut-' + [guid]::NewGuid().ToString('N') + '.lnk')
      Copy-Item -LiteralPath $path -Destination $backup
    }
    $link.TargetPath = $NativeAlias
    # 执行别名默认使用 chatgpt-desktop 目录；显式使用原生 Codex 目录，避免双实例。
    $link.Arguments = '--user-data-dir="{0}" --remote-debugging-address=127.0.0.1 --remote-debugging-port={1}' -f $NativeProfile, $DebugPort
    $link.WorkingDirectory = Split-Path -Parent $NativeAlias
    if ($IconPath) { $link.IconLocation = $IconPath }
    $link.Description = 'Codex desktop - Neri Desktop Theme enabled'
    $link.Save()
    $records += @{ path = $path; backup = $backup; created = $false }
  }
  return @{ shortcuts = $records; removedShortcuts = $removed; nativeProfile = $NativeProfile }
}
