# Group A private repositories: authenticated git checkout + unified Windows QA.
# Does not upload source, change GitHub visibility, alter billing, or submit anything to Microsoft Store.
[CmdletBinding()]
param(
 [string]$Workspace = (Join-Path $env:USERPROFILE 'GroupA-Private-QA-20261025'),
 [switch]$SkipInstall
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) { throw 'Git for Windows is required. Sign in to GitHub for private repository access.' }
if (-not (Get-Command powershell.exe -ErrorAction SilentlyContinue)) { throw 'Windows PowerShell is required.' }
$targets = @(
 [pscustomobject]@{ name='UsedItemShopSimulator'; branch='work/ui-handoff-review-20261025' },
 [pscustomobject]@{ name='FactoryInspectionSimulator'; branch='work/ui-handoff-review-20261025' },
 [pscustomobject]@{ name='game-new'; branch='work/unified-qa-20261025' },
 [pscustomobject]@{ name='game-stadium'; branch='work/unified-qa-20261025' },
 [pscustomobject]@{ name='game'; branch='work/unified-qa-20261025' }
)
New-Item -ItemType Directory -Path $Workspace -Force | Out-Null
$results = @()
foreach ($target in $targets) {
 $where = Join-Path $Workspace $target.name
 $entry=[ordered]@{ product=$target.name; branch=$target.branch; sourceCommit=$null; status='HOLD'; issue=$null; evidence=$null }
 try {
   # Existing folders may contain uncommitted user work. NEVER delete or reset them.
   if (Test-Path $where) { throw "Target already exists; refusing overwrite: $where. Choose a new Workspace." }
   $url = "https://github.com/shihuiarenjinba-png/$($target.name).git"
   & git.exe clone --depth 1 --single-branch --branch $target.branch -- $url $where
   if ($LASTEXITCODE -ne 0) { throw 'Authenticated GitHub clone failed. Check private-repo permissions.' }
   Push-Location $where
   try {
     $sha=(& git.exe rev-parse --verify HEAD).Trim()
     if ($sha -notmatch '^[0-9a-f]{40}$') { throw 'Commit SHA not available.' }
     $entry.sourceCommit=$sha
     $runner=Join-Path $where 'scripts/run-unified-qa-windows.ps1'
     if (-not (Test-Path $runner)) { throw 'The expected QA runner script is missing from this branch.' }
     $args=@('-NoProfile','-ExecutionPolicy','Bypass','-File',$runner)
     if ($SkipInstall) { $args+='-SkipInstall' }
     & powershell.exe @args
     if ($LASTEXITCODE -ne 0) { throw "Windows source/UI tests failed (exit $LASTEXITCODE)." }
     $resultFile=Join-Path $where 'unified-ui-evidence/LOCAL_QA_HANDOFF.json'
     if (-not (Test-Path $resultFile)) { throw 'No QA proof. PASS may not be inferred.' }
     $report=Get-Content $resultFile -Raw | ConvertFrom-Json
     if ($report.status -ne 'PASS' -or $report.sourceCommit -ne $sha) {
       throw 'QA result is not PASS or does not match checked-out Git SHA.'
     }
     if (@($report.screenshots).Count -lt 2) { throw 'Screenshots and their hashes are insufficient.' }
     $entry.status='PASS';$entry.evidence=$resultFile
   } finally { Pop-Location }
 } catch {
   $entry.issue=$_.Exception.Message
   Write-Warning "$($target.name): $($entry.issue)"
 }
 $results+=([pscustomobject]$entry)
}
$summary=[ordered]@{
 checkedAtUtc=[DateTimeOffset]::UtcNow.ToString('o')
 phase='GROUP_A_FIVE_PRIVATE_LOCAL_QA'
 githubRunnerBillingOrVisibilityChanged=$false
 storeSubmissionPerformed=$false
 storeCertificationConfirmed=$false
 results=$results
 passCount=@($results|Where-Object status -eq PASS).Count
 holdCount=@($results|Where-Object status -ne PASS).Count
}
$summaryPath=Join-Path $Workspace 'GROUP_A_FIVE_QA_SUMMARY.json'
$summary|ConvertTo-Json -Depth 8|Set-Content $summaryPath -Encoding utf8
Write-Host "QA summary: $summaryPath"
if ($summary.holdCount -gt 0) { throw "$($summary.holdCount) products not yet PASS. See QA summary, logs and per-repo screenshots." }
Write-Host 'GROUP_A_PRIVATE_FIVE_LOCAL_QA_PASS; still NOT Store-signed, WACK-tested, or approved for sale.'
