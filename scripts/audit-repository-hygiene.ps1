[CmdletBinding()]
param(
    [string]$BaseRef = 'origin/main',
    [switch]$FailOnFindings
)

$ErrorActionPreference = 'Stop'

git rev-parse --verify --quiet $BaseRef | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Base ref '$BaseRef' does not exist. Fetch remote refs first."
}

$findings = 0
$baseCommit = git rev-parse --short=12 $BaseRef
$currentBranch = git branch --show-current
if (-not $currentBranch) {
    $currentBranch = '(detached)'
}

Write-Output "Base: $BaseRef ($baseCommit)"
Write-Output "Current checkout: $currentBranch"

$previewRef = 'origin/release/preview'
git rev-parse --verify --quiet $previewRef | Out-Null
if ($LASTEXITCODE -eq 0) {
    $previewCounts = (git rev-list --left-right --count "$BaseRef...$previewRef") -split '\s+'
    $canonicalOnly = [int]$previewCounts[0]
    $previewOnly = [int]$previewCounts[1]
    $previewState = if ($previewOnly -gt 0) {
        'SYNC REQUIRED: Preview-only history must return to the canonical line'
    } elseif ($canonicalOnly -gt 0) {
        'Preview is behind the canonical line'
    } else {
        'canonical and Preview histories are synchronized'
    }
    Write-Output ("Release integration: canonical-only={0}, preview-only={1}, {2}" -f $canonicalOnly, $previewOnly, $previewState)
    if ($previewOnly -gt 0) {
        $findings++
    }
}

Write-Output ''
Write-Output 'Local branches compared with the canonical line:'

$localBranches = git for-each-ref --format='%(refname:short)' refs/heads
foreach ($branchName in $localBranches) {
    $counts = (git rev-list --left-right --count "$BaseRef...$branchName") -split '\s+'
    $behind = [int]$counts[0]
    $ahead = [int]$counts[1]
    $state = if ($ahead -eq 0 -and $branchName -ne 'main') { 'fully merged/superseded' } elseif ($ahead -gt 0) { 'local-only commits' } else { 'canonical' }
    Write-Output ("  {0}: behind={1}, ahead={2}, {3}" -f $branchName, $behind, $ahead, $state)
    if ($ahead -eq 0 -and $branchName -ne 'main') {
        $findings++
    }
}

Write-Output ''
Write-Output 'Registered worktrees:'
$worktreePaths = git worktree list --porcelain |
    Select-String '^worktree ' |
    ForEach-Object { $_.Line.Substring(9) }

foreach ($worktreePath in $worktreePaths) {
    if (-not (Test-Path -LiteralPath $worktreePath)) {
        Write-Output "  MISSING: $worktreePath"
        $findings++
        continue
    }

    $worktreeBranch = git -C $worktreePath branch --show-current
    if (-not $worktreeBranch) {
        $worktreeBranch = '(detached)'
    }
    $dirtyCount = @(git -C $worktreePath status --porcelain=v1).Count
    $state = if ($dirtyCount -eq 0) { 'clean' } else { "dirty ($dirtyCount paths)" }
    Write-Output "  $worktreeBranch - $state - $worktreePath"
    if ($dirtyCount -gt 0) {
        $findings++
    }
}

Write-Output ''
Write-Output "Findings requiring review: $findings"
if ($FailOnFindings -and $findings -gt 0) {
    exit 1
}
