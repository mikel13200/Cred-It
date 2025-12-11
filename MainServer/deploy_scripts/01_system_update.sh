#!/bin/bash
# 01_system_update.sh
# Purpose: Update system packages and install dependencies

# Stop script on error
set -e

echo ">>> [1/4] Starting System Update..."
echo "Updating package list..."
sudo apt-get update

echo "Upgrading packages..."
sudo apt-get upgrade -y

echo "Installing essential tools (curl, git, ufw)..."
sudo apt-get install -y curl git ufw

echo ">>> System update complete."
