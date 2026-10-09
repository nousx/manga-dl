# Rasterize the repository SVG with Windows' vector renderer. No network or packages.
# Supported source primitives: rounded rect and path, using the shared SVG/WPF path syntax.
Add-Type -AssemblyName PresentationCore, WindowsBase
$assetDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../resources"))
[xml]$source = Get-Content -LiteralPath (Join-Path $assetDirectory "mark.svg") -Raw
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$images = [Collections.Generic.List[byte[]]]::new()
$brush = {
  param([string]$color)
  if (!$color -or $color -eq "none") { return $null }
  return [Windows.Media.SolidColorBrush]::new([Windows.Media.ColorConverter]::ConvertFromString($color))
}
foreach ($size in $sizes) {
  $visual = [Windows.Media.DrawingVisual]::new()
  $drawing = $visual.RenderOpen()
  $drawing.PushTransform([Windows.Media.ScaleTransform]::new($size / 256.0, $size / 256.0))
  foreach ($element in $source.svg.ChildNodes) {
    if ($element.Name -eq "rect") {
      $geometry = [Windows.Media.RectangleGeometry]::new(
        [Windows.Rect]::new([double]$element.x, [double]$element.y, [double]$element.width, [double]$element.height),
        [double]$element.rx, [double]$element.rx)
    } elseif ($element.Name -eq "path") {
      $geometry = [Windows.Media.Geometry]::Parse($element.d)
    } else { continue }
    $fill = & $brush $element.fill
    $pen = $null
    if ($element.stroke -and $element.stroke -ne "none") {
      $pen = [Windows.Media.Pen]::new((& $brush $element.stroke), [double]$element.'stroke-width')
      if ($element.'stroke-linecap' -eq "round") {
        $pen.StartLineCap = $pen.EndLineCap = [Windows.Media.PenLineCap]::Round
      }
      if ($element.'stroke-linejoin' -eq "round") { $pen.LineJoin = [Windows.Media.PenLineJoin]::Round }
    }
    $drawing.DrawGeometry($fill, $pen, $geometry)
  }
  $drawing.Pop()
  $drawing.Close()
  $bitmap = [Windows.Media.Imaging.RenderTargetBitmap]::new($size, $size, 96, 96, [Windows.Media.PixelFormats]::Pbgra32)
  $bitmap.Render($visual)
  $encoder = [Windows.Media.Imaging.PngBitmapEncoder]::new()
  $encoder.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($bitmap))
  $stream = [IO.MemoryStream]::new()
  $encoder.Save($stream)
  $png = $stream.ToArray()
  $stream.Dispose()
  $images.Add($png)
  [IO.File]::WriteAllBytes((Join-Path $assetDirectory "icon-$size.png"), $png)
}
$stream = [IO.MemoryStream]::new()
$writer = [IO.BinaryWriter]::new($stream)
$writer.Write([uint16]0)
$writer.Write([uint16]1)
$writer.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($index = 0; $index -lt $sizes.Count; $index++) {
  $dimension = if ($sizes[$index] -eq 256) { 0 } else { $sizes[$index] }
  $writer.Write([byte]$dimension)
  $writer.Write([byte]$dimension)
  $writer.Write([uint16]0)
  $writer.Write([uint16]1)
  $writer.Write([uint16]32)
  $writer.Write([uint32]$images[$index].Length)
  $writer.Write([uint32]$offset)
  $offset += $images[$index].Length
}
foreach ($png in $images) { $writer.Write([byte[]]$png) }
[IO.File]::WriteAllBytes((Join-Path $assetDirectory "icon.ico"), $stream.ToArray())
$writer.Dispose()
$stream.Dispose()
Write-Output "Generated 7 PNGs and resources/icon.ico from resources/mark.svg"
