$ErrorActionPreference = "Stop"

function Invoke-CheckedCommand {
    param(
        [string]$Command,
        [string[]]$Arguments
    )

    Write-Host ">> $Command $($Arguments -join ' ')"

    & $Command @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE"
    }
}

# ------------------------
# Load .env
# ------------------------

$envFile = Join-Path $PSScriptRoot ".env"

if (!(Test-Path $envFile)) {
    throw ".env file not found."
}

Get-Content $envFile | ForEach-Object {

    if ($_ -match '^\s*#') { return }
    if ([string]::IsNullOrWhiteSpace($_)) { return }

    if ($_ -match '^\s*([^=]+)=(.*)$') {

        [Environment]::SetEnvironmentVariable(
            $matches[1].Trim(),
            $matches[2].Trim(),
            "Process"
        )

    }
}

$maintenanceApiUrl       = $env:MAINTENANCE_API_URL
$maintenanceFinishApiUrl = $env:MAINTENANCE_FINISH_API_URL
$pm2AppName              = $env:PM2_APP_NAME

Push-Location $PSScriptRoot

Write-Host "Working directory: $(Get-Location)"

Write-Host "Broadcasting maintenance..."

Invoke-RestMethod `
    -Method Post `
    -Uri $maintenanceApiUrl `
    -Headers @{
        "x-maintenance-deploy-token" = $env:MAINTENANCE_DEPLOY_TOKEN
    } | Out-Null

Write-Host "Waiting 60 seconds..."
Start-Sleep 60

try {

   Invoke-CheckedCommand "npm.cmd" @("install")

    Invoke-CheckedCommand "npm.cmd" @("run","build")

    $migrationScript = Join-Path $PSScriptRoot "scripts\migrate.ps1"

    if (Test-Path $migrationScript) {

        & $migrationScript

        if ($LASTEXITCODE -ne 0) {
            throw "Migration failed."
        }

    }

    Invoke-CheckedCommand "pm2.cmd" @(
        "reload",
        $pm2AppName,
        "--update-env"
    )

    Write-Host "Deployment completed."

}
finally {

    Write-Host "Finishing maintenance..."

    Invoke-RestMethod `
        -Method Post `
        -Uri $maintenanceFinishApiUrl `
        -Headers @{
            "x-maintenance-deploy-token" = $env:MAINTENANCE_DEPLOY_TOKEN
        } | Out-Null

    Write-Host "Maintenance finished."

}