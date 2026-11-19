param(
    [ValidateSet('doctor', 'all', 'content', 'content-twoside', 'deliverables',
                 'bulletin-vi', 'bulletin-en', 'summary-vi', 'summary-en', 'smoke', 'check')]
    [string[]]$Target = @('all', 'smoke', 'check'),
    [ValidateSet('auto', 'biblatex', 'bibtex')]
    [string]$Bibliography = 'auto',
    [string]$Python = 'python'
)

$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
# A fresh terminal picks up these paths automatically. Refresh them here as
# well so a build works immediately after per-user tool installation.
$env:PATH = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + $env:PATH
$miktexBin = Join-Path $env:LOCALAPPDATA 'Programs/MiKTeX/miktex/bin/x64'
if (Test-Path -LiteralPath $miktexBin) { $env:PATH = $miktexBin + ';' + $env:PATH }

$reportRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $reportRoot
try {
    foreach ($item in $Target) {
        switch ($item) {
            'doctor' { & $Python scripts/doctor.py }
            'check' { & $Python scripts/check_template.py }
            'all' {
                & $Python scripts/build.py content --bibliography $Bibliography
                if ($LASTEXITCODE -ne 0) { throw "Build failed: content ($LASTEXITCODE)" }
                & $Python scripts/build.py content --twoside --bibliography $Bibliography
            }
            'content-twoside' {
                & $Python scripts/build.py content --twoside --bibliography $Bibliography
            }
            'deliverables' {
                foreach ($form in @('bulletin-vi', 'bulletin-en', 'summary-vi', 'summary-en')) {
                    & $Python scripts/build.py $form --bibliography $Bibliography
                    if ($LASTEXITCODE -ne 0) { throw "Build failed: $form ($LASTEXITCODE)" }
                }
            }
            default { & $Python scripts/build.py $item --bibliography $Bibliography }
        }
        if ($LASTEXITCODE -ne 0) { throw "Report target failed: $item ($LASTEXITCODE)" }
    }
}
finally { Pop-Location }
