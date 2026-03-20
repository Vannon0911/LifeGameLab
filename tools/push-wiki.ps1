param(
  [string]$RepoRoot = ".",
  [string]$Owner = "Vannon0911",
  [string]$Repo = "LifeGameLab"
)

$ErrorActionPreference = "Stop"

$repoPath = (Resolve-Path $RepoRoot).Path
$wikiSource = Join-Path $repoPath "docs/wiki"
if (!(Test-Path $wikiSource)) {
  throw "Wiki source folder not found: $wikiSource"
}

$token = gh auth token
if ([string]::IsNullOrWhiteSpace($token)) {
  throw "No GitHub token available via 'gh auth token'."
}

$wikiUrl = "https://x-access-token:$token@github.com/$Owner/$Repo.wiki.git"
$tempDir = Join-Path $env:TEMP ("$Repo-wiki-sync-" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds())

Write-Host "Cloning wiki repo..."
if (!(git clone $wikiUrl $tempDir)) {
  throw "Clone failed. Ensure wiki is enabled and initialized on GitHub."
}

Write-Host "Syncing pages..."
Get-ChildItem -Path $tempDir -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $wikiSource "*") -Destination $tempDir -Recurse -Force

Set-Location $tempDir
if ((git status --porcelain).Length -eq 0) {
  Write-Host "No wiki changes to push."
  exit 0
}

Write-Host "Committing and pushing..."
git add -A
git commit -m "docs(wiki): sync pages from docs/wiki"
git push origin HEAD

Write-Host "Done. Wiki synced."
