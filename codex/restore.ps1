$ErrorActionPreference = 'Stop'
$prismData = if ($env:CODEX_PRISM_DATA_DIR) { $env:CODEX_PRISM_DATA_DIR } else { Join-Path $env:USERPROFILE '.neri-desktop-theme' }
$infoPath = Join-Path $prismData 'codex-server.json'
if (Test-Path -LiteralPath $infoPath) {
  $info = Get-Content -Raw -LiteralPath $infoPath | ConvertFrom-Json
  $headers = @{ 'X-Prism-Token' = $info.token; 'Content-Type' = 'application/json' }
  $uri = "http://127.0.0.1:$($info.port)"
  try {
    Invoke-RestMethod -Uri "$uri/api/restore" -Method Post -Headers $headers -Body '{}' | Out-Null
    Invoke-RestMethod -Uri "$uri/api/stop" -Method Post -Headers $headers -Body '{}' | Out-Null
  } catch { Write-Warning $_.Exception.Message }
}
Write-Host 'Prism stopped. Launch Codex normally to run without the debug port.'
