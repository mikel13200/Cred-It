#!/bin/bash
# 02_install_docker.sh
# Purpose: Install Docker and Docker Compose

set -e

echo ">>> [2/4] Installing Docker..."

if command -v docker &> /dev/null; then
    echo "Docker is already installed."
else
    echo "Downloading Docker installation script..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    
    echo "Running Docker installation script..."
    sudo sh get-docker.sh
    
    echo "Cleaning up..."
    rm get-docker.sh
    
    echo "Docker installed successfully."
fi

echo "Verifying Docker installation..."
docker --version
docker compose version

echo ">>> Docker installation complete."
