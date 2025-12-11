#!/bin/bash
# 04_run_application.sh
# Purpose: Build and run the docker containers.

set -e

echo ">>> [4/4] Deploying Application..."

# Check if .env exists
if [ ! -f "production.env" ]; then
    echo "ERROR: production.env file is missing!"
    exit 1
fi

echo "Building and starting containers using docker-compose.prod.yml..."
docker compose -f docker-compose.prod.yml down --remove-orphans
docker compose -f docker-compose.prod.yml up -d --build

echo "Checking container status..."
sleep 5
docker compose -f docker-compose.prod.yml ps

echo ">>> Deployment script finished. Application should be running at http://217.216.35.29"
echo "If issues arise, check logs with: docker compose -f docker-compose.prod.yml logs -f"
