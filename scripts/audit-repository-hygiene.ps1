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
Write-Output 'Remote task branches compared with the canonical line:'

$remoteBranches = git for-each-ref --format='%(refname:short)' refs/remotes/origin |
    Where-Object { $_ -notin @('origin', 'origin/HEAD', 'origin/main') }

if (@($remoteBranches).Count -eq 0) {
    Write-Output '  none'
}

foreach ($branchName in $remoteBranches) {
    $counts = (git rev-list --left-right --count "$BaseRef...$branchName") -split '\s+'
    $behind = [int]$counts[0]
    $ahead = [int]$counts[1]
    $state = if ($ahead -eq 0) { 'fully merged/superseded; delete remote branch' } else { 'unmerged; preserve' }
    Write-Output ("  {0}: behind={1}, ahead={2}, {3}" -f $branchName, $behind, $ahead, $state)
    if ($ahead -eq 0) {
        $findings++
    }
}

Write-Output ''
Write-Output 'Registered worktrees:'
$worktreeListing = @(git worktree list --porcelain)
if ($LASTEXITCODE -ne 0) { throw 'Could not list registered worktrees.' }
$worktreeRecords = @((($worktreeListing -join "`n") -split "`n`n") | Where-Object { $_ -match '^worktree ' })
$completedWorktrees = 0

for ($index = 0; $index -lt $worktreeRecords.Count; $index++) {
    $record = $worktreeRecords[$index]
    $worktreePath = ($record -split "`n")[0].Substring(9)
    $isPrimary = $index -eq 0
    $isLocked = $record -match '(?m)^locked(?: |$)'
    if (-not (Test-Path -LiteralPath $worktreePath)) {
        Write-Output "  MISSING: $worktreePath"
        $findings++
        continue
    }

    $worktreeBranch = git -C $worktreePath branch --show-current
    if ($LASTEXITCODE -ne 0) { throw "Could not read branch: $worktreePath" }
    if (-not $worktreeBranch) { $worktreeBranch = '(detached)' }
    $dirtyPaths = @(git -C $worktreePath status --porcelain=v1 --untracked-files=all)
    if ($LASTEXITCODE -ne 0) { throw "Could not read working-tree state: $worktreePath" }
    $dirtyCount = $dirtyPaths.Count
    $unmergedCount = git -C $worktreePath rev-list --count "$BaseRef..HEAD"
    if ($LASTEXITCODE -ne 0) { throw "Could not verify integration: $worktreePath" }
    $ignoredPaths = @(git -C $worktreePath ls-files --others --ignored --exclude-standard --directory)
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect ignored files: $worktreePath" }

    $state = if ($dirtyCount -eq 0) { 'clean' } else { "dirty ($dirtyCount paths); preserve" }
    if ($isPrimary -or $worktreeBranch -eq 'main') {
        $state += '; primary/main checkout; keep'
    } elseif ($isLocked) {
        $state += '; locked worktree; keep'
    } elseif ([int]$unmergedCount -gt 0) {
        $state += "; $unmergedCount unmerged commits; preserve"
    } elseif ($dirtyCount -eq 0) {
        $state += '; integrated; cleanup candidate after activity/ignored-file review'
        $completedWorktrees++
        $findings++
    }
    Write-Output "  $worktreeBranch - $state - $worktreePath"
    if ($ignoredPaths.Count -gt 0) {
        Write-Output "    Ignored local paths: $($ignoredPaths.Count); inspect and preserve unique data before removal."
    }
    if ($dirtyCount -gt 0) { $findings++ }
}
Write-Output "Completed worktrees requiring cleanup review: $completedWorktrees"

Write-Output ''
Write-Output "Findings requiring review: $findings"
if ($FailOnFindings -and $findings -gt 0) {
    exit 1
}
