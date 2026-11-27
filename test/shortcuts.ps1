$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\codex\shortcuts.ps1')
$fixture = Join-Path (Join-Path $PSScriptRoot '..\artifacts') ('shortcut-fixture-' + [guid]::NewGuid().ToString('N'))
$fixture = [IO.Path]::GetFullPath($fixture)
$links = Join-Path $fixture 'links'
New-Item -ItemType Directory -Path $links -Force | Out-Null
$shell = New-Object -ComObject WScript.Shell
$alias = Join-Path $env:WINDIR 'System32\cmd.exe'
$normal = Join-Path $links 'ChatGPT.lnk'
$duplicate = Join-Path $links 'Codex.lnk'
$unrelated = Join-Path $links 'Other.lnk'
foreach ($path in @($normal, $duplicate)) {
  $s = $shell.CreateShortcut($path); $s.TargetPath = $alias
  $s.Description = 'Codex desktop - Neri Desktop Theme enabled'; $s.Save()
}
$s = $shell.CreateShortcut($unrelated); $s.TargetPath = Join-Path $env:WINDIR 'explorer.exe'; $s.Save()
$otherHash = (Get-FileHash -LiteralPath $unrelated).Hash
$normalBackup = Join-Path $fixture 'original.lnk'
Copy-Item -LiteralPath $normal -Destination $normalBackup
$legacy = @{shortcuts = @(@{path=$normal;created=$false;backup=$normalBackup}, @{path=$duplicate;created=$true})}
# 重现旧版错误：新记录把原插件创建的 Codex.lnk 误记为原有入口。
$previous = @{shortcuts = @(@{path=$duplicate;created=$false})}
$profile = Join-Path $fixture 'native profile'
$result = Sync-NeriShortcuts -DataDir $fixture -NativeAlias $alias -NativeProfile $profile -ShortcutRoots @($links) -Previous $previous -Legacy $legacy
if (Test-Path -LiteralPath $duplicate) { throw 'Old generated shortcut was not removed.' }
if (@(Get-ChildItem -LiteralPath $links -Filter '*.lnk').Count -ne 2) { throw 'Unexpected shortcuts were created.' }
$s = $shell.CreateShortcut($normal)
if ($s.Arguments -notlike ('*--user-data-dir="' + $profile + '"*')) { throw 'Native profile was not used.' }
if ($s.Arguments -notmatch '--remote-debugging-port=9340') { throw 'Existing entry lost theme access.' }
if ((Get-FileHash -LiteralPath $unrelated).Hash -ne $otherHash) { throw 'Unrelated shortcut changed.' }
if (@($result.shortcuts).Count -ne 1 -or $result.shortcuts[0].backup -ne $normalBackup) { throw 'Original restore record lost.' }
$again = Sync-NeriShortcuts -DataDir $fixture -NativeAlias $alias -NativeProfile $profile -ShortcutRoots @($links) -Previous $result -Legacy $legacy
if (@($again.shortcuts).Count -ne 1 -or (Test-Path -LiteralPath $duplicate)) { throw 'Upgrade recreated a theme shortcut.' }
$empty = Join-Path $fixture 'empty'; New-Item -ItemType Directory -Path $empty | Out-Null
$none = Sync-NeriShortcuts -DataDir $fixture -NativeAlias $alias -NativeProfile $profile -ShortcutRoots @($empty)
if (@($none.shortcuts).Count -ne 0 -or @(Get-ChildItem -LiteralPath $empty).Count -ne 0) { throw 'Fresh install created shortcuts.' }
Write-Host '8 passed: remove legacy duplicate, no new entries, canonical profile, debug access, preserve unrelated link, original backup, repeat upgrade, empty install.'
