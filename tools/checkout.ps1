<#
.SYNOPSIS
  Prints where the Code - OSS checkout lives, for the other build scripts.

.DESCRIPTION
  "vscode" in local.json (this PC's settings, not committed), else build\vscode.
  Upstream's install runs tools through the shell with unquoted paths (node-gyp in
  build/npm/preinstall.ts at 1.140.0), so the path must not contain a space.

.EXAMPLE
  $vscode = & .\tools\checkout.ps1
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$local = Join-Path $root 'local.json'
$path = if (Test-Path $local) { (Get-Content $local -Raw | ConvertFrom-Json).vscode } else { $null }
if (-not $path) { $path = Join-Path $root 'build\vscode' }
$path = [IO.Path]::GetFullPath($path)
if ($path -match '\s') {
    throw "The Code - OSS checkout path has a space ($path), which upstream's build cannot handle. Set ""vscode"" in local.json to a folder without spaces (docs/dev-setup.md)."
}
$path
