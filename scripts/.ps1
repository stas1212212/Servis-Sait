function pu {

    param(
        [string]$Message = ""
    )

    $repo = git rev-parse --show-toplevel 2>$null

    if (-not $repo) {
        Write-Host "Not a Git repository."
        return
    }

    Set-Location $repo

    $changes = git status --porcelain

    if (-not $changes) {
        Write-Host "No changes."
        return
    }

    git add .

    if ($Message -eq "") {
        $Message = Read-Host "Commit message"
    }

    git commit -m "$Message"

    git push origin main

    Write-Host "Done!"
}

# Git Status
function gs {
    git status
}

# Git Log
function gl {
    git log --oneline --graph --decorate -10
}

# Показать путь к репозиторию
function whereami {
    git rev-parse --show-toplevel
}

# Открыть проект в VS Code
function openproj {
    code .
}

# Сделать резервную копию
function backup {

    $date = Get-Date -Format "dd-MM-yyyy_HH-mm"

    Compress-Archive `
        -Path * `
        -DestinationPath "backup_$date.zip" `
        -Force

    Write-Host "Backup created."
}

# Скопировать дерево проекта
function copytree {

    tree /F | Set-Clipboard

    Write-Host "Project tree copied."
}

# Открыть GitHub репозиторий
function repo {

    $url = git config --get remote.origin.url

    if ($url) {

        $url = $url.Replace(".git","")

        $url = $url.Replace("git@github.com:","https://github.com/")

        Start-Process $url

    }

}

function snapshot {

    $repo = git rev-parse --show-toplevel 2>$null

    if (-not $repo) {
        Write-Host "Not a Git repository."
        return
    }

    Set-Location $repo

    $output = "snapshot.txt"

    if (Test-Path $output) {
        Remove-Item $output
    }

    Get-ChildItem -Recurse -Include *.html,*.css,*.js |
    Where-Object {
        $_.FullName -notmatch "\\.git\\" -and
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\vendor\\"
    } |
    ForEach-Object {

        Add-Content $output ""
        Add-Content $output "================================================="
        Add-Content $output "FILE: $($_.FullName.Replace($repo,''))"
        Add-Content $output "================================================="
        Add-Content $output ""

        Get-Content $_.FullName | Add-Content $output
    }

    Write-Host ""
    Write-Host "Snapshot created:"
    Write-Host "$repo\$output"

}

function c {
    Clear-Host
}

function helpme {

Write-Host ""
Write-Host "====== PULT CLI ======"
Write-Host ""
Write-Host "pu ""message""    Push project"
Write-Host "gs              Git status"
Write-Host "gl              Git log"
Write-Host "repo            Open GitHub"
Write-Host "backup          Create backup"
Write-Host "snapshot        Export project"
Write-Host "copytree        Copy tree"
Write-Host "openproj        Open VS Code"
Write-Host "whereami        Repository path"
Write-Host ""

}