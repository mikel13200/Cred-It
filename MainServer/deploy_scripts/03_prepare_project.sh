#!/bin/bash
# 03_prepare_project.sh
# Purpose: Set permissions and prepare directory structure.
# This assumes the project files are already present in the current directory.

set -e

echo ">>> [3/4] Preparing Project..."

# Ensure we are in the project root (sanity check)
if [ ! -f "requirements.txt" ]; then
    echo "ERROR: requirements.txt not found. Are you running this script from the project root?"
    exit 1
fi

echo "Creating necessary directories for data/logs..."
# Create logs directory if not exists
mkdir -p logs

# Set permissions for the scripts (to be sure)
chmod +x deploy_scripts/*.sh

echo "Adjusting firewall rules (Allow 80, 443, 22)..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Enable firewall if not enabled (Caution: verify ssh is allowed first, which we did above)
# sudo ufw --force enable 

echo ">>> Project preparation complete."
