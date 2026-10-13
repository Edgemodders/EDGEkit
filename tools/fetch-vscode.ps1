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
if (Test-Path $target) { Remove-Item -Recurse -Force $target }
New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null

git clone --depth 1 --branch $upstream.tag $upstream.repository $target
if ($LASTEXITCODE) { throw "Cloning $($upstream.repository) at $($upstream.tag) failed." }
Write-Output "Code - OSS $($upstream.tag) is in $target"
