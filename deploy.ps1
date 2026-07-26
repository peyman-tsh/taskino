Write-Host 'Broadcasting the 60-second maintenance warning...'

Invoke-RestMethod `
  -Method Post `
  -Uri $maintenanceApiUrl `
  -Headers @{ 'x-maintenance-deploy-token' = $env:MAINTENANCE_DEPLOY_TOKEN } |
  Out-Null

Write-Host 'Waiting 60 seconds before deployment...'
Start-Sleep -Seconds 60

try {

    Invoke-CheckedCommand 'git' @('pull', '--ff-only', 'origin', 'master')

    Invoke-CheckedCommand 'npm.cmd' @('ci')

    Invoke-CheckedCommand 'npm.cmd' @('run', 'build')

    $migrationScript = Join-Path $PSScriptRoot 'scripts\migrate.ps1'
    if (Test-Path -LiteralPath $migrationScript) {
        & $migrationScript
    }

    Invoke-CheckedCommand 'pm2.cmd' @('reload', $pm2AppName, '--update-env')

    Write-Host 'Deployment completed.'

}
finally {

    Write-Host 'Finishing maintenance...'

    for ($attempt = 1; $attempt -le 12; $attempt++) {

        try {

            Invoke-RestMethod `
                -Method Post `
                -Uri $maintenanceFinishApiUrl `
                -Headers @{
                    'x-maintenance-deploy-token' = $env:MAINTENANCE_DEPLOY_TOKEN
                } |
                Out-Null

            Write-Host 'Maintenance finished.'

            break

        }
        catch {

            if ($attempt -eq 12) {
                Write-Warning 'Failed to finish maintenance.'
            }

            Start-Sleep -Seconds 5
        }
    }
}