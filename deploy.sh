#!/usr/bin/env bash
set -Eeuo pipefail

# This script runs on the VPS from the project directory.
# Configure MAINTENANCE_DEPLOY_TOKEN in the VPS .env file before enabling CI deployment.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source ./.env
  set +a
fi

: "${MAINTENANCE_DEPLOY_TOKEN:?MAINTENANCE_DEPLOY_TOKEN must be set in .env}"

MAINTENANCE_API_URL="${MAINTENANCE_API_URL:-http://127.0.0.1:3000/api/maintenance/restart-warning/deploy}"
PM2_APP_NAME="${PM2_APP_NAME:-taskino}"

echo 'Broadcasting the 60-second maintenance warning...'
curl --fail --silent --show-error --request POST "$MAINTENANCE_API_URL" \
  --header "x-maintenance-deploy-token: $MAINTENANCE_DEPLOY_TOKEN"

echo 'Waiting 60 seconds before deployment...'
sleep 60

git pull --ff-only origin master
npm ci
npm run build

# Add an executable scripts/migrate.sh file if this deployment needs migrations.
if [[ -x scripts/migrate.sh ]]; then
  ./scripts/migrate.sh
fi

pm2 reload "$PM2_APP_NAME" --update-env
echo 'Deployment completed.'
