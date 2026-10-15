<#
.SYNOPSIS
  Fetches Code - OSS at the release EDGEkit builds on (upstream.json) into build\vscode.

.DESCRIPTION
  A shallow clone of microsoft/vscode at one tag. Nothing from upstream is
  committed: build\ is ignored by git. Run again after changing the tag; it
  replaces build\vscode. DRAFT: written from upstream's documented build, not yet
  run (phase K1).

.EXAMPLE
  .\tools\fetch-vscode.ps1
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$upstream = Get-Content (Join-Path $root 'upstream.json') -Raw | ConvertFrom-Json
if (-not $upstream.tag) { throw 'No upstream tag yet: choose one in upstream.json (phase K0).' }

$target = Join-Path $root 'build\vscode'
# Empty the folder rather than delete it: a shell or file watcher holding the folder itself
# open makes deleting it fail, and git clones into an empty folder fine.
New-Item -ItemType Directory -Force $target | Out-Null
Get-ChildItem $target -Force | Remove-Item -Recurse -Force

# Upstream keeps only test caches in Git LFS (extensions/copilot/test/simulation/cache/*.sqlite
# at 1.140.0); the build does not need them, so the clone leaves them as pointer files.
$env:GIT_LFS_SKIP_SMUDGE = '1'
git clone --depth 1 --branch $upstream.tag $upstream.repository $target
if ($LASTEXITCODE) { throw "Cloning $($upstream.repository) at $($upstream.tag) failed." }
Write-Output "Code - OSS $($upstream.tag) is in $target"
