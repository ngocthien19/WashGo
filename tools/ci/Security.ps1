param([string]$ReportsDirectory = (Join-Path $PSScriptRoot '../../tests/ci/results/security'))
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
New-Item -ItemType Directory -Path $ReportsDirectory -Force | Out-Null
$reports = (Resolve-Path $ReportsDirectory).Path
'[]' | Set-Content (Join-Path $reports 'gitleaks.json') -Encoding UTF8
& docker run --rm -v "${repoRoot}:/repo:ro" -v "${reports}:/reports" `
    -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0=/repo `
    ghcr.io/gitleaks/gitleaks:v8.30.0@sha256:691af3c7c5a48b16f187ce3446d5f194838f91238f27270ed36eef6359a574d9 `
    git /repo --redact --no-banner --log-opts=--all --report-format=json --report-path=/reports/gitleaks.json
$leakExit = $LASTEXITCODE
if ($leakExit -notin @(0,1)) { throw "Secret scanner could not complete (exit $leakExit)." }

Push-Location $repoRoot
try {
    $auditText = & npm audit --json --audit-level=high
    $auditExit = $LASTEXITCODE
    $auditText | Set-Content (Join-Path $reports 'npm-audit.json') -Encoding UTF8
    $audit = ($auditText -join "`n") | ConvertFrom-Json
    if ($auditExit -notin @(0,1) -or $audit.error -or !$audit.metadata.vulnerabilities) { throw 'npm audit could not complete; see report.' }
    $findings = $audit.metadata.vulnerabilities
    if ($leakExit -eq 1) { Write-Output 'FAIL: secret findings exist; values are redacted.' }
    Write-Output "npm audit: $($findings.high) High; $($findings.critical) Critical."
    if ($leakExit -ne 0 -or $findings.high -gt 0 -or $findings.critical -gt 0) { throw 'Security gate failed. Fix findings; do not disable the scan.' }
    Write-Output 'PASS: Git secret scan and npm audit, including dev/transitive dependencies (no High/Critical findings).'
}
finally { Pop-Location }
