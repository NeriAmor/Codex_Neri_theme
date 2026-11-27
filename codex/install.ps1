$ErrorActionPreference = 'Stop'
$prismSource = Split-Path -Parent $PSScriptRoot
$prismInstall = Join-Path $env:LOCALAPPDATA 'NeriDesktopTheme'
New-Item -ItemType Directory -Path $prismInstall -Force | Out-Null
if ([IO.Path]::GetFullPath($prismSource) -ne [IO.Path]::GetFullPath($prismInstall)) {
foreach ($folder in @('codex','src','sidecars','assets','docs')) {
  Copy-Item -LiteralPath (Join-Path $prismSource $folder) -Destination $prismInstall -Recurse -Force
}
foreach ($file in @('package.json','README.md','启动 Codex 壁纸.cmd','恢复原界面.cmd')) {
  Copy-Item -LiteralPath (Join-Path $prismSource $file) -Destination $prismInstall -Force
}
}
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'Codex Prism Wallpaper.lnk'
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $prismInstall 'codex\launch.ps1') + '"'
$shortcut.WorkingDirectory = $prismInstall
$shortcut.WindowStyle = 7
$shortcut.Description = 'Codex desktop with Wallpaper Prism'
$shortcut.Save()
Write-Host "Installed: $prismInstall"
Write-Host "Shortcut: $shortcutPath"
