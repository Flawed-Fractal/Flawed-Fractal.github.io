Add-Type -AssemblyName System.Drawing

$size = 64
$bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$background = [System.Drawing.ColorTranslator]::FromHtml('#111416')
$border = [System.Drawing.ColorTranslator]::FromHtml('#2b3033')
$accent = [System.Drawing.ColorTranslator]::FromHtml('#ec784f')

$graphics.Clear($background)

$pen = New-Object System.Drawing.Pen($border, 2)
$graphics.DrawRectangle($pen, 1, 1, 61, 61)

$font = New-Object System.Drawing.Font('Consolas', 20, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$brush = New-Object System.Drawing.SolidBrush($accent)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$graphics.DrawString('CC', $font, $brush, (New-Object System.Drawing.RectangleF(0, 1, $size, $size)), $format)

$output = Join-Path (Split-Path -Parent $PSScriptRoot) 'favicon.png'
$bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)

$format.Dispose()
$brush.Dispose()
$font.Dispose()
$pen.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
