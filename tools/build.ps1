<#
.SYNOPSIS
  Builds EDGEkit for Windows x64: fetch Code - OSS, brand it, bundle the EDGE
  extensions, take Copilot out, build the app and its installer.

.DESCRIPTION
  DRAFT for phase K1: the upstream steps follow Code - OSS's documented build
  (its Node version from .nvmrc, npm ci, the gulp tasks for Windows) and have not
  been run yet. K1 runs this, fixes it and records the exact tool versions in
  docs\dev-setup.md. Output goes to build\, which git ignores.

.PARAMETER SkipFetch
  Reuse the Code - OSS checkout as it is (tools\checkout.ps1 says where it is).

.EXAMPLE
  .\tools\build.ps1
#>
param([switch] $SkipFetch)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$vscode = & (Join-Path $PSScriptRoot 'checkout.ps1')

if (-not $SkipFetch) { & (Join-Path $PSScriptRoot 'fetch-vscode.ps1') }
if (-not (Test-Path $vscode)) { throw "No Code - OSS checkout in $vscode." }

# Bundle first: it lists the built-in EDGE extensions that branding adds to product.json.
node (Join-Path $PSScriptRoot 'bundle.mjs')
if ($LASTEXITCODE) { throw 'Bundling the extensions failed.' }
node (Join-Path $PSScriptRoot 'brand.mjs') (Join-Path $vscode 'product.json')
if ($LASTEXITCODE) { throw 'Branding failed.' }
# No Copilot (design, K0 decisions). It changes the dependencies, so it comes before npm ci.
node (Join-Path $PSScriptRoot 'remove-copilot.mjs')
if ($LASTEXITCODE) { throw 'Removing Copilot failed.' }

# EDGEkit's name for upstream's in the app's text (K2, the trademark sweep).
node (Join-Path $PSScriptRoot 'remove-branding.mjs')
if ($LASTEXITCODE) { throw 'Removing upstream branding failed.' }

# EDGEkit's small edits to upstream: no appx, signature check off by default, and the rest.
node (Join-Path $PSScriptRoot 'patch-upstream.mjs')
if ($LASTEXITCODE) { throw 'Patching upstream failed.' }

# Code - OSS expects the Node version in its .nvmrc. Take it from nvm-windows for this
# build only, without "nvm use", which would switch Node for every program on the PC.
$want = (Get-Content (Join-Path $vscode '.nvmrc') -Raw).Trim()
$have = (node --version).TrimStart('v')
if ($have -ne $want) {
    $nvmNode = if ($env:NVM_HOME) { Join-Path $env:NVM_HOME "v$want" } else { $null }
    if (-not $nvmNode -or -not (Test-Path (Join-Path $nvmNode 'node.exe'))) {
        throw "Code - OSS wants Node $want; this shell has $have. Install it with: nvm install $want"
    }
    $env:Path = "$nvmNode;$env:Path"
    Write-Output "Using Node $want from $nvmNode for this build."
}

# The Windows build runs signtool.exe (to strip signatures before it stamps version
# details on native files). It comes with the Windows SDK; take the newest x64 one.
if (-not (Get-Command signtool.exe -ErrorAction SilentlyContinue)) {
    $kits = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
    $signtool = Get-ChildItem $kits -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName 'x64\signtool.exe') } |
        Sort-Object { [version]$_.Name } | Select-Object -Last 1
    if (-not $signtool) { throw "No signtool.exe in $kits. Install the Windows SDK with the Visual Studio Installer (docs\dev-setup.md)." }
    $env:Path = "$(Join-Path $signtool.FullName 'x64');$env:Path"
    Write-Output "Using signtool from the Windows SDK $($signtool.Name) for this build."
}

# The app's commit (in About, and the key of its caches) is this repo's, not the upstream tag's,
# which every EDGEkit release on one upstream shares. The build takes it from here (getVersion.ts).
$env:BUILD_SOURCEVERSION = (git -C $root rev-parse HEAD).Trim()

Push-Location $vscode
try {
    npm ci
    if ($LASTEXITCODE) { throw 'npm ci failed in Code - OSS.' }
    # The minified Windows app, the update helper the installer ships in tools\, then the
    # per-user installer.
    npm run gulp -- vscode-win32-x64-min
    if ($LASTEXITCODE) { throw 'The Code - OSS build failed.' }
    npm run gulp -- vscode-win32-x64-inno-updater
    if ($LASTEXITCODE) { throw 'Adding the update helper failed.' }
    npm run gulp -- vscode-win32-x64-user-setup
    if ($LASTEXITCODE) { throw 'The installer build failed.' }
}
finally {
    Pop-Location
}
Write-Output "EDGEkit is built: see $(Join-Path $root 'build')"
