param(
    [ValidateRange(1024,65535)][int]$Port = 5380,
    [string]$ProjectName = ('washgo-fe-ci-' + [Guid]::NewGuid().ToString('N').Substring(0,8)),
    [string]$ImageTag,
    [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
if ($ProjectName -notmatch '^washgo-fe-ci-[a-z0-9-]+$') { throw 'Use an isolated project name beginning with washgo-fe-ci-.' }
if (!$ImageTag) { $ImageTag = "${ProjectName}:latest" }
if ($ImageTag -notmatch '^[a-z0-9][a-z0-9._/:-]+$') { throw 'Invalid image tag.' }
$results = Join-Path $PSScriptRoot 'results'
New-Item -ItemType Directory -Path $results -Force | Out-Null
$compose = @('compose','--env-file',(Join-Path $PSScriptRoot 'ci.env'),'-p',$ProjectName,'-f',(Join-Path $PSScriptRoot 'compose.yml'))
$oldPort = $env:WASHGO_FE_CI_PORT
$oldImage = $env:WASHGO_FE_CI_IMAGE
$env:WASHGO_FE_CI_PORT = "$Port"
$env:WASHGO_FE_CI_IMAGE = $ImageTag
$baseUrl = "http://127.0.0.1:$Port"
$succeeded = $false
'RUNNING' | Set-Content (Join-Path $results 'docker-result.txt')
try {
    $start = @('up','-d','--wait','--wait-timeout','120')
    if ($SkipBuild) { $start += '--no-build' }
    else { $start += '--build' }
    & docker @compose @start
    if ($LASTEXITCODE -ne 0) { throw 'Isolated FE Compose failed to start.' }
    & docker @compose exec -T frontend nginx -t
    if ($LASTEXITCODE -ne 0) { throw 'Nginx configuration is invalid.' }
    $health = Invoke-WebRequest "$baseUrl/healthz" -UseBasicParsing -TimeoutSec 10
    if ($health.StatusCode -ne 200 -or $health.Content.Trim() -ne 'ok') { throw 'FE health check failed.' }
    $index = Invoke-WebRequest "$baseUrl/login" -UseBasicParsing -TimeoutSec 10
    $deepLink = Invoke-WebRequest "$baseUrl/orders/ci-order" -UseBasicParsing -TimeoutSec 10
    if ($index.Content -notmatch '<div id="root">' -or $deepLink.Content -ne $index.Content) { throw 'SPA deep-link fallback failed.' }
    $assetPath = [regex]::Match($index.Content, 'src="(/assets/[^" ]+\.js)"').Groups[1].Value
    if (!$assetPath) { throw 'Built JavaScript asset missing.' }
    $asset = Invoke-WebRequest "$baseUrl$assetPath" -UseBasicParsing -TimeoutSec 10
    if ($asset.Headers['Cache-Control'] -notmatch 'immutable') { throw 'Hashed asset caching failed.' }
    foreach ($probe in @(@{ Path='/assets/ci-missing.js'; Status=404 }, @{ Path='/api/auth/me'; Status=401 })) {
        $status = 0
        try { $response = Invoke-WebRequest "$baseUrl$($probe.Path)" -UseBasicParsing -TimeoutSec 10; $status = [int]$response.StatusCode }
        catch { if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode } else { throw } }
        if ($status -ne $probe.Status) { throw "Unexpected status for $($probe.Path): $status" }
    }
    $proxy = Invoke-RestMethod "$baseUrl/api/probe?scope=ci" -Headers @{ Authorization='Bearer ci-only' } -TimeoutSec 10
    if ($proxy.path -ne '/probe?scope=ci' -or !$proxy.authorized) { throw 'API prefix/query/Bearer forwarding failed.' }
    $websocket = New-Object System.Net.WebSockets.ClientWebSocket
    $timeout = New-Object System.Threading.CancellationTokenSource
    $timeout.CancelAfter(10000)
    try {
        $websocket.Options.SetRequestHeader('Authorization', 'Bearer ci-only')
        $null = $websocket.ConnectAsync([Uri]"ws://127.0.0.1:$Port/api/ws?scope=ci", $timeout.Token).GetAwaiter().GetResult()
        $buffer = New-Object byte[] 128
        $received = $websocket.ReceiveAsync([ArraySegment[byte]]::new($buffer), $timeout.Token).GetAwaiter().GetResult()
        if ([Text.Encoding]::UTF8.GetString($buffer, 0, $received.Count) -ne 'ci-websocket-ok') { throw 'WebSocket forwarding failed.' }
    }
    finally { $websocket.Dispose(); $timeout.Dispose() }
    $succeeded = $true
    'PASS: healthy Nginx, SPA refresh, hashed assets, missing-asset404, API401/prefix/query/Bearer and WebSocket upgrade; isolated mock upstream.' | Set-Content (Join-Path $results 'docker-result.txt')
    Write-Output 'PASS: frontend Docker smoke checks.'
}
finally {
    & docker @compose logs --no-color *> (Join-Path $results 'containers.log')
    & docker @compose down --volumes --remove-orphans
    $cleanupExit = $LASTEXITCODE
    $env:WASHGO_FE_CI_PORT = $oldPort
    $env:WASHGO_FE_CI_IMAGE = $oldImage
    if (!$succeeded -or $cleanupExit -ne 0) { 'FAIL: see step output and containers.log.' | Set-Content (Join-Path $results 'docker-result.txt') }
    if ($cleanupExit -ne 0) { throw 'Isolated CI cleanup failed.' }
}
