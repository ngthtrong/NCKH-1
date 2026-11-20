$ErrorActionPreference = 'Stop'
$inputDoc = 'D:\NCKH\Research Report.docx'
$outputPdf = 'D:\NCKH\output\report-revision-qa\Research Report.pdf'
$wordApp = $null
$wordDoc = $null
try {
    $wordApp = New-Object -ComObject Word.Application
    $wordApp.Visible = $false
    $wordApp.DisplayAlerts = 0
    $wordDoc = $wordApp.Documents.Open($inputDoc, $false, $false)
    $wordDoc.Fields.Update() | Out-Null
    foreach ($toc in $wordDoc.TablesOfContents) { $toc.Update() }
    $wordDoc.Repaginate()
    foreach ($toc in $wordDoc.TablesOfContents) { $toc.UpdatePageNumbers() }
    $wordDoc.Save()
    $wordDoc.ExportAsFixedFormat($outputPdf, 17, $false, 0, 0, 1, 9999, 0, $true, $true, 1, $true, $true, $false)
    Write-Output ('Pages: ' + $wordDoc.ComputeStatistics(2))
    Write-Output ('PDF: ' + $outputPdf)
} finally {
    if ($null -ne $wordDoc) { $wordDoc.Close(0) }
    if ($null -ne $wordApp) { $wordApp.Quit() }
    if ($null -ne $wordDoc) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordDoc) }
    if ($null -ne $wordApp) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordApp) }
}
