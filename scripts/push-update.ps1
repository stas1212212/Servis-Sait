copyfileparam(
    [string]$Branch = "main"
)

$repo = git rev-parse --show-toplevel 2>$null
if (-not $repo) {
    Write-Error "Сначала откройте папку с Git-репозиторием."
    exit 1
}

Set-Location $repo

$changes = git status --porcelain
if (-not $changes) {
    Write-Host "Нет изменений для коммита."
    exit 0
}

git add .

$lastMessage = git log -1 --pretty=%s 2>$null
$version = "1.0"

if ($lastMessage -match 'UPdate\s+(\d+)\.(\d+)') {
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2] + 1
    $version = "$major.$minor"
}

git commit -m "UPdate $version"
git push -u origin $Branch
