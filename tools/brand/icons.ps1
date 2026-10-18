# Renders EDGEkit's Windows icons and installer images from tools/brand/icons.html with
# headless Chrome, and packs them with ImageMagick (magick on the PATH, or its default folder).
#
#   .\tools\brand\icons.ps1
#
# Output (committed, copied over upstream's resources/win32 by tools/brand.mjs):
#   product/win32/code.ico, sessions.ico     the app icon, 16 to 256 px
#   product/win32/<type>.ico                 the 27 file-type icons upstream associates
#   product/win32/inno-big-*.bmp             the installer's side image, at 7 scales
#   product/win32/inno-small-*.bmp           the installer's corner image, at 7 scales
#   product/win32/code_150x150.png, code_70x70.png   Start menu tiles
#   product/workbench/code-icon.svg          the logo in the title bar and elsewhere in the app
# Each icon is drawn large (256 px) and simple (32 px); the sizes from 48 up come from the large
# one and those from 32 down from the simple one, so the small sizes stay readable.

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$win32 = Join-Path $repo 'product\win32'
$workbench = Join-Path $repo 'product\workbench'
$work = Join-Path $repo 'build\icons'
foreach ($d in $win32, $workbench, $work) { New-Item -ItemType Directory -Force $d | Out-Null }

$chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw 'Chrome or Edge not found.' }
$magick = (Get-Command magick -ErrorAction SilentlyContinue).Source
if (-not $magick) { $magick = Get-ChildItem "$env:ProgramFiles\ImageMagick-*\magick.exe" -ErrorAction SilentlyContinue | Select-Object -Last 1 -ExpandProperty FullName }
if (-not $magick) { throw 'ImageMagick (magick.exe) not found.' }

$url = 'file:///' + ((Join-Path $PSScriptRoot 'icons.html') -replace '\\', '/')
$profileDir = Join-Path $env:TEMP 'edgekit-brand-chrome'

function Render($query, $file, $width, $height, $scale = 1, $background = '00000000') {
    $target = Join-Path $work $file
    if (Test-Path $target) { Remove-Item $target }
    # Chrome logs harmless errors to stderr. Windows PowerShell 5.1 would treat them as fatal under 'Stop'.
    $ErrorActionPreference = 'Continue'
    # The virtual time budget gives the web fonts time to load before the screenshot.
    & $chrome --headless=new --disable-gpu --hide-scrollbars --no-first-run "--user-data-dir=$profileDir" `
        "--window-size=$width,$height" "--force-device-scale-factor=$scale" "--default-background-color=$background" `
        --virtual-time-budget=5000 "--screenshot=$target" "$url`?$query" 2>$null | Out-Null
    $ErrorActionPreference = 'Stop'
    if (-not (Test-Path $target)) { throw "Render failed: $file" }
    $target
}

function Magick { & $magick @args; if ($LASTEXITCODE) { throw "magick failed: $args" } }

# An .ico from a large and a simple render: sizes over 32 from the large one, the rest from the simple one.
function Ico($large, $simple, $ico, [int[]] $sizes) {
    $parts = foreach ($s in $sizes) {
        $part = Join-Path $work ("{0}-{1}.png" -f [IO.Path]::GetFileNameWithoutExtension($ico), $s)
        Magick $(if ($s -gt 32) { $large } else { $simple }) -resize "${s}x${s}" $part
        $part
    }
    Magick @parts (Join-Path $win32 $ico)
    Write-Output "Wrote product\win32\$ico"
}

# The app icon (also the agents window's sessions.ico).
$appSizes = 16, 20, 24, 32, 40, 48, 64, 96, 128, 256
$appLarge = Render 'app=256' 'app-256.png' 256 256
$appSimple = Render 'app=32' 'app-32.png' 32 32 4
Ico $appLarge $appSimple 'code.ico' $appSizes
Copy-Item (Join-Path $win32 'code.ico') (Join-Path $win32 'sessions.ico') -Force
Write-Output 'Wrote product\win32\sessions.ico'

# The file-type icons, one per upstream file icon (the labels are in icons.html).
$files = [ordered]@{
    bower = 'BWR'; c = 'C'; config = 'CFG'; cpp = 'C++'; csharp = 'C#'; css = 'CSS'; default = ''; go = 'GO'
    html = 'HTML'; jade = 'PUG'; java = 'JAVA'; javascript = 'JS'; json = '{ }'; less = 'LESS'; markdown = 'MD'
    php = 'PHP'; powershell = 'PS'; python = 'PY'; react = 'JSX'; ruby = 'RB'; sass = 'SASS'; shell = '>_'
    sql = 'SQL'; typescript = 'TS'; vue = 'VUE'; xml = 'XML'; yaml = 'YML'
}
$fileSizes = 16, 20, 24, 32, 48, 64, 96, 128, 256
foreach ($name in $files.Keys) {
    $label = [uri]::EscapeDataString($files[$name])
    $large = Render "file=$label&size=256" "$name-256.png" 256 256
    $simple = Render "file=$label&size=32" "$name-32.png" 32 32 4
    Ico $large $simple "$name.ico" $fileSizes
}

# The installer's images, at Inno Setup's seven scales (100 to 250 %), each upstream's exact size.
# 8-bit palette BMPs, as upstream's; any difference in shape is filled with the image's own background.
$big = @{ 100 = '164x314'; 125 = '192x386'; 150 = '246x459'; 175 = '273x556'; 200 = '328x604'; 225 = '355x700'; 250 = '410x797' }
$small = @{ 100 = '55x55'; 125 = '64x68'; 150 = '83x80'; 175 = '92x97'; 200 = '110x106'; 225 = '119x123'; 250 = '138x140' }
foreach ($pct in $big.Keys | Sort-Object) {
    $scale = $pct / 100
    $b = Render 'wizard=big' "wizard-big-$pct.png" 164 314 $scale 'ff08090d'
    Magick $b -resize "$($big[$pct])" -background '#08090d' -gravity center -extent "$($big[$pct])" -alpha off -colors 256 -type Palette "BMP3:$(Join-Path $win32 "inno-big-$pct.bmp")"
    $s = Render 'wizard=small' "wizard-small-$pct.png" 55 55 $scale 'ffffffff'
    Magick $s -resize "$($small[$pct])" -background white -gravity center -extent "$($small[$pct])" -alpha off -colors 256 -type Palette "BMP3:$(Join-Path $win32 "inno-small-$pct.bmp")"
    Write-Output "Wrote product\win32\inno-big-$pct.bmp, inno-small-$pct.bmp"
}

# Start menu tiles: the logo on a transparent ground; VisualElementsManifest.xml gives the colour.
foreach ($t in 150, 70) {
    $tile = Render "tile=$t" "tile-$t.png" $t $t 2
    Magick $tile -resize "${t}x${t}" (Join-Path $win32 "code_${t}x${t}.png")
    Write-Output "Wrote product\win32\code_${t}x${t}.png"
}

# The in-app logo: the simple icon as a PNG inside an SVG, so it stays crisp from the 16 px title bar up.
$logo = Render 'app=32' 'logo-128.png' 32 32 4
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($logo))
$svg = "<svg xmlns=`"http://www.w3.org/2000/svg`" xmlns:xlink=`"http://www.w3.org/1999/xlink`" viewBox=`"0 0 128 128`"><image width=`"128`" height=`"128`" xlink:href=`"data:image/png;base64,$b64`"/></svg>"
[IO.File]::WriteAllText((Join-Path $workbench 'code-icon.svg'), $svg)
Write-Output 'Wrote product\workbench\code-icon.svg'
