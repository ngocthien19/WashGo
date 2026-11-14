param([string]$BaseCommit)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if ($BaseCommit -and $BaseCommit -notmatch '^[0-9a-fA-F]{40}$') { throw 'Invalid base commit.' }
Push-Location $repoRoot
try {
    if ($BaseCommit) { & git -c "safe.directory=$repoRoot" diff --check $BaseCommit HEAD -- . }
    else { & git -c "safe.directory=$repoRoot" diff --check HEAD -- . }
    if ($LASTEXITCODE -ne 0) { throw 'Changed lines contain whitespace errors.' }
    $scripts = Get-ChildItem (Join-Path $repoRoot 'tools/ci'), (Join-Path $repoRoot 'tests/ci') -Filter '*.ps1' -Recurse |
        Where-Object { $_.FullName -notmatch '[\\/]results[\\/]' }
    foreach ($script in $scripts) {
        $parseErrors = $null
        [System.Management.Automation.Language.Parser]::ParseFile($script.FullName, [ref]$null, [ref]$parseErrors) | Out-Null
        if ($parseErrors.Count) { throw "PowerShell syntax check failed: $($script.Name)" }
    }
    & node --check (Join-Path $repoRoot 'tests/ci/upstream.js')
    if ($LASTEXITCODE -ne 0) { throw 'Upstream fixture syntax check failed.' }
    Write-Output "PASS: diff whitespace and syntax of $($scripts.Count) PowerShell scripts and the mock upstream."
}
finally { Pop-Location }
