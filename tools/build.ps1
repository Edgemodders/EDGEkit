<#
.SYNOPSIS
  Builds EDGEkit for Windows x64: fetch Code - OSS, brand it, bundle the EDGE
  extensions, build the app and its installer.

.DESCRIPTION
  DRAFT for phase K1: the upstream steps follow Code - OSS's documented build
  (its Node version from .nvmrc, npm ci, the gulp tasks for Windows) and have not
  been run yet. K1 runs this, fixes it and records the exact tool versions in
  docs\dev-setup.md. Output goes to build\, which git ignores.

.PARAMETER SkipFetch
  Reuse build\vscode as it is.

.EXAMPLE
  .\tools\build.ps1
#>
param([switch] $SkipFetch)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$vscode = Join-Path $root 'build\vscode'

if (-not $SkipFetch) { & (Join-Path $PSScriptRoot 'fetch-vscode.ps1') }
if (-not (Test-Path $vscode)) { throw "No Code - OSS checkout in $vscode." }

node (Join-Path $PSScriptRoot 'brand.mjs')
if ($LASTEXITCODE) { throw 'Branding failed.' }
node (Join-Path $PSScriptRoot 'bundle.mjs')
if ($LASTEXITCODE) { throw 'Bundling the extensions failed.' }

# Code - OSS expects the Node version in its .nvmrc.
$want = (Get-Content (Join-Path $vscode '.nvmrc') -Raw).Trim()
$have = (node --version).TrimStart('v')
if ($have -ne $want) { Write-Warning "Code - OSS wants Node $want; this shell has $have (nvm use $want)." }

Push-Location $vscode
try {
    npm ci
    if ($LASTEXITCODE) { throw 'npm ci failed in Code - OSS.' }
    # The minified Windows app, then the per-user installer.
    npm run gulp -- vscode-win32-x64-min
    if ($LASTEXITCODE) { throw 'The Code - OSS build failed.' }
    npm run gulp -- vscode-win32-x64-user-setup
    if ($LASTEXITCODE) { throw 'The installer build failed.' }
}
finally {
    Pop-Location
}
Write-Output "EDGEkit is built: see $(Join-Path $root 'build')"
