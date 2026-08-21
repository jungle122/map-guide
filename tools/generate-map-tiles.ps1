param(
  [Parameter()]
  [ValidatePattern('^v[0-9][0-9A-Za-z._-]*$')]
  [string]$Version = 'v1',

  [Parameter()]
  [string]$VipsPath = '',

  [Parameter()]
  [ValidateRange(128, 1024)]
  [int]$TileSize = 512,

  [Parameter()]
  [ValidateRange(80, 100)]
  [int]$Quality = 88,

  [Parameter()]
  [ValidateSet('jpg', 'webp')]
  [string]$Format = 'webp'
)

$ErrorActionPreference = 'Stop'

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$inputPath = Join-Path $workspaceRoot 'assets\map\huanglian-map.jpg'
$tilesRoot = Join-Path $workspaceRoot 'assets\map\tiles'
$outputDir = Join-Path $tilesRoot $Version
$outputBase = Join-Path $outputDir 'huanglian'
$descriptorPath = "$outputBase.dzi"
$tileDirectory = "${outputBase}_files"

if (-not (Test-Path -LiteralPath $inputPath -PathType Leaf)) {
  throw "Map source not found: $inputPath"
}

$resolvedTilesRoot = [System.IO.Path]::GetFullPath($tilesRoot).TrimEnd('\') + '\'
$resolvedOutputDir = [System.IO.Path]::GetFullPath($outputDir).TrimEnd('\') + '\'
if (-not $resolvedOutputDir.StartsWith($resolvedTilesRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to generate tiles outside $tilesRoot"
}
if (Test-Path -LiteralPath $outputDir) {
  throw "Tile version already exists: $outputDir. Use a new immutable version name."
}

if (-not $VipsPath) {
  $vipsCommand = Get-Command vips -ErrorAction SilentlyContinue
  if ($vipsCommand) { $VipsPath = $vipsCommand.Source }
}
if (-not $VipsPath -or -not (Test-Path -LiteralPath $VipsPath -PathType Leaf)) {
  throw 'libvips was not found. Pass -VipsPath with the full path to vips.exe.'
}

$vipsBin = Split-Path -Parent $VipsPath
$vipsHeaderPath = Join-Path $vipsBin 'vipsheader.exe'
if (-not (Test-Path -LiteralPath $vipsHeaderPath -PathType Leaf)) {
  throw "vipsheader.exe was not found beside vips.exe: $vipsBin"
}

$width = [int](& $vipsHeaderPath -f width $inputPath)
$height = [int](& $vipsHeaderPath -f height $inputPath)
if ($width -ne 8091 -or $height -ne 5669) {
  throw "Unexpected map dimensions: ${width}x${height}; expected 8091x5669."
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

try {
  $suffixOptions = if ($Format -eq 'jpg') { "Q=$Quality,optimize-coding" } else { "Q=$Quality,effort=6" }
  $suffix = ".$Format[$suffixOptions]"
  & $VipsPath dzsave $inputPath $outputBase `
    --layout dz `
    --tile-size $TileSize `
    --overlap 1 `
    --depth onepixel `
    --region-shrink mean `
    --suffix $suffix

  if ($LASTEXITCODE -ne 0) {
    throw "libvips dzsave failed with exit code $LASTEXITCODE"
  }

  if (-not (Test-Path -LiteralPath $descriptorPath -PathType Leaf)) {
    throw "DZI descriptor was not generated: $descriptorPath"
  }
  if (-not (Test-Path -LiteralPath $tileDirectory -PathType Container)) {
    throw "DZI tile directory was not generated: $tileDirectory"
  }

  # libvips writes source-image metadata beside the tiles. OpenSeadragon does
  # not use it, so keep the deploy artifact limited to the DZI and tile files.
  $vipsMetadataPath = Join-Path $tileDirectory 'vips-properties.xml'
  if (Test-Path -LiteralPath $vipsMetadataPath -PathType Leaf) {
    Remove-Item -LiteralPath $vipsMetadataPath -Force
  }

  $descriptor = Get-Content -LiteralPath $descriptorPath -Raw
  if ($descriptor -notmatch ('TileSize="{0}"' -f $TileSize) -or
      $descriptor -notmatch 'Overlap="1"' -or
      $descriptor -notmatch ('Format="{0}"' -f $Format) -or
      $descriptor -notmatch 'Width="8091"' -or
      $descriptor -notmatch 'Height="5669"') {
    throw 'Generated DZI descriptor does not match the required map geometry.'
  }

  $maxLevel = [int][Math]::Ceiling([Math]::Log([Math]::Max($width, $height), 2))
  $maxLevelDir = Join-Path $tileDirectory ([string]$maxLevel)
  $expectedColumns = [int][Math]::Ceiling($width / [double]$TileSize)
  $expectedRows = [int][Math]::Ceiling($height / [double]$TileSize)
  $expectedTopTiles = $expectedColumns * $expectedRows
  $actualTopTiles = @(Get-ChildItem -LiteralPath $maxLevelDir -Filter "*.$Format" -File).Count
  if ($actualTopTiles -ne $expectedTopTiles) {
    throw "Unexpected highest-level tile count: $actualTopTiles; expected $expectedTopTiles."
  }

  $allTiles = @(Get-ChildItem -LiteralPath $tileDirectory -Filter "*.$Format" -File -Recurse)
  $totalBytes = ($allTiles | Measure-Object -Property Length -Sum).Sum
  [pscustomobject]@{
    Version = $Version
    Dimensions = "${width}x${height}"
    MaxLevel = $maxLevel
    TileSize = $TileSize
    Format = $Format
    TileCount = $allTiles.Count
    TotalBytes = $totalBytes
    Descriptor = $descriptorPath
  }
} catch {
  if (Test-Path -LiteralPath $outputDir) {
    Remove-Item -LiteralPath $outputDir -Recurse -Force
  }
  throw
}
