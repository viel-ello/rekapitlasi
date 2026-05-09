Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = "c:\Users\ipw26\OneDrive\Documents\rekapitlasi\reference-pokja1.docx"
$extractPath = "c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.temp_docx"
if (Test-Path $extractPath) { Remove-Item -Recurse -Force $extractPath }
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $extractPath)
[xml]$doc = Get-Content -Raw -Path "$extractPath\word\document.xml"

$ns = @{ w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main" }

Write-Host "--- PARAGRAPHS ---"
$paras = Select-Xml -Xml $doc -XPath "//w:p" -Namespace $ns | Select-Object -ExpandProperty Node
foreach ($p in $paras | Select-Object -First 15) {
    $text = ($p.InnerText).Trim()
    if ($text) { Write-Host $text }
}

Write-Host "`n--- TABLES ---"
$tables = Select-Xml -Xml $doc -XPath "//w:tbl" -Namespace $ns | Select-Object -ExpandProperty Node
$t_idx = 1
foreach ($tbl in $tables) {
    Write-Host "`nTable $t_idx :"
    $rows = Select-Xml -Xml $tbl -XPath ".//w:tr" -Namespace $ns | Select-Object -ExpandProperty Node
    $r_idx = 1
    foreach ($row in $rows | Select-Object -First 10) {
        $cells = Select-Xml -Xml $row -XPath ".//w:tc" -Namespace $ns | Select-Object -ExpandProperty Node
        $cellTexts = @()
        foreach ($c in $cells) {
            $span = "1"
            $vMerge = "none"
            if ($c.tcPr) {
                if ($c.tcPr.gridSpan) { $span = $c.tcPr.gridSpan.val }
                if ($c.tcPr.vMerge) { 
                    if ($c.tcPr.vMerge.val) { $vMerge = $c.tcPr.vMerge.val } else { $vMerge = "continue" }
                }
            }
            $text = ($c.InnerText).Trim()
            $cellTexts += "[$span`x$vMerge] $text"
        }
        $rowOutput = $cellTexts -join " | "
        Write-Host "  Row $r_idx : $rowOutput"
        $r_idx++
    }
    $t_idx++
}
