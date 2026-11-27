param([string]$UpstreamPath = (Join-Path $PSScriptRoot 'upstream'))
$ErrorActionPreference = 'Stop'
$upstream = (Resolve-Path -LiteralPath $UpstreamPath).ProviderPath
if (-not (Test-Path -LiteralPath (Join-Path $upstream 'packages/effects/builtin/caret/effect.js'))) {
    throw 'Pass the extracted Woodfish Theme v8.2.3 source folder.'
}
Push-Location -LiteralPath $PSScriptRoot
try {
    npx.cmd --yes --package=esbuild@0.25.12 esbuild renderer.js --bundle --target=chrome120 --format=iife --tree-shaking=true "--alias:@upstream=$upstream" "--alias:@woodfish/renderer-runtime=$upstream/packages/renderer-runtime/src/index.ts" "--alias:@woodfish/theme-core=$upstream/packages/theme-core/src/index.ts" --outfile=effects.js
    if ($LASTEXITCODE -ne 0) { throw 'Bundle failed.' }
} finally {
    Pop-Location
}
