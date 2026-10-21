<#
.SYNOPSIS
  Fetches Code - OSS at the release EDGEkit builds on (upstream.json) into the
  checkout folder (tools\checkout.ps1: "vscode" in local.json, else build\vscode).

.DESCRIPTION
  A shallow clone of microsoft/vscode at one tag. Nothing from upstream is
  committed: the checkout is outside the repo, or in build\, which git ignores.
  Run again after changing the tag; it replaces the checkout.

.EXAMPLE
  .\tools\fetch-vscode.ps1
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$upstream = Get-Content (Join-Path $root 'upstream.json') -Raw | ConvertFrom-Json
if (-not $upstream.tag) { throw 'No upstream tag yet: choose one in upstream.json (phase K0).' }

$target = & (Join-Path $PSScriptRoot 'checkout.ps1')
# Empty the folder rather than delete it: a shell or file watcher holding the folder itself
# open makes deleting it fail, and git clones into an empty folder fine.
New-Item -ItemType Directory -Force $target | Out-Null
Get-ChildItem $target -Force | Remove-Item -Recurse -Force

# Upstream keeps only test caches in Git LFS (extensions/copilot/test/simulation/cache/*.sqlite
# at 1.140.0); the build does not need them, so the clone leaves them as pointer files.
$env:GIT_LFS_SKIP_SMUDGE = '1'
# Quiet: Windows PowerShell takes git's "Cloning into" line on stderr for an error when the output is
# redirected, and stops the script there (found 2026-10-21).
git clone --quiet --depth 1 --branch $upstream.tag $upstream.repository $target
if ($LASTEXITCODE) { throw "Cloning $($upstream.repository) at $($upstream.tag) failed." }
Write-Output "Code - OSS $($upstream.tag) is in $target"
