$ErrorActionPreference = 'Stop'
$inputDoc = 'D:\NCKH\Bao cao NCKH bo sung ngan xep 9 tang.docx'
$outputPdf = 'D:\NCKH\output\report-theo-dany\Bao cao NCKH theo dan y.pdf'
$wordApp = $null
$wordDoc = $null
try {
    $wordApp = New-Object -ComObject Word.Application
    $wordApp.Visible = $false
    $wordApp.DisplayAlerts = 0
    $wordDoc = $wordApp.Documents.Open($inputDoc, $false, $false)
    $wordDoc.Fields.Update() | Out-Null
    foreach ($toc in $wordDoc.TablesOfContents) { $toc.Update() }
    foreach ($styleId in @(-20, -21, -22)) {
        $tocStyle = $wordDoc.Styles.Item($styleId)
        $tocStyle.Font.Name = 'Times New Roman'
        $tocStyle.Font.Size = 11
        $tocStyle.ParagraphFormat.SpaceAfter = 2
        $tocStyle.ParagraphFormat.Alignment = 0
    }
    foreach ($toc in $wordDoc.TablesOfContents) {
        $toc.Range.Font.Name = 'Times New Roman'
        $toc.Range.Font.Size = 11
        $toc.Range.ParagraphFormat.SpaceAfter = 2
        $toc.Range.ParagraphFormat.Alignment = 0
    }
    $wordDoc.Repaginate()
    foreach ($toc in $wordDoc.TablesOfContents) { $toc.UpdatePageNumbers() }
    $wordDoc.Save()
    $wordDoc.ExportAsFixedFormat($outputPdf, 17, $false, 0, 0, 1, 9999, 0, $true, $true, 1, $true, $true, $false)
    Write-Output ('Pages: ' + $wordDoc.ComputeStatistics(2))
} finally {
    if ($null -ne $wordDoc) { $wordDoc.Close(0) }
    if ($null -ne $wordApp) { $wordApp.Quit() }
    if ($null -ne $wordDoc) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordDoc) }
    if ($null -ne $wordApp) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordApp) }
}
