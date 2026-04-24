#!/bin/bash
# Alibaba Cloud Function Compute Deployment Script

set -euo pipefail

echo "=== Deploying to Alibaba Cloud ==="

# Check if Funcraft is installed (Alibaba's deployment tool)
if ! command -v fun &> /dev/null
then
    echo "Funcraft not found. Installing..."
    npm install -g @alicloud/fun
fi

# Install Python dependencies
echo "Installing Python dependencies..."
cd function-compute/invoice-upload
python3 -m pip install -r requirements.txt -t .
cd ../..

# Deploy using Funcraft
echo "Deploying Function Compute service..."
fun deploy

echo "=== Deployment Complete ==="
echo "Provide AwsWebhookUrl, DashScopeApiKey, and any PDF-specific DashScope values when Funcraft prompts for parameters."
