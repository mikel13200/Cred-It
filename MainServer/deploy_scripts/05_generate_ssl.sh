#!/bin/bash
# 05_generate_ssl.sh
# Purpose: Generate Self-Signed SSL Certificate for IP Address

set -e
echo ">>> [5/6] Generating Self-Signed SSL Certificate..."

mkdir -p ssl

# Generate a self-signed cert valid for 365 days
# CN=217.216.35.25 ensures it matches your IP
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=217.216.35.25"

echo ">>> SSL Certificate generated in ./ssl/"
