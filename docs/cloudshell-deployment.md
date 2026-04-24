# Deploy Using AWS CloudShell

## Why CloudShell
- No local AWS credential setup required
- AWS CLI, SAM CLI, and Python are already available
- Fastest path for hackathon deployment

## Step-by-Step Deployment

### 1. Open AWS CloudShell
1. Sign in to the AWS Console
2. Open CloudShell from the top-right toolbar
3. Wait for the shell to initialize

### 2. Upload or clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO/backend
```

### 3. Deploy AWS infrastructure
```bash
sam build
sam deploy --guided
```

Use `ap-southeast-1` unless your team has chosen a different region.

### 4. Capture stack outputs
```bash
aws cloudformation describe-stacks \
  --stack-name tng-finhack-backend \
  --query 'Stacks[0].Outputs' \
  --output table
```

Copy the `InvoiceWebhookUrl` output. You will need it during Alibaba deployment.

### 5. Verify AWS deployment
```bash
WEBHOOK_URL="YOUR_WEBHOOK_URL_FROM_OUTPUTS"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId":"test-123","amount":1000,"status":"PENDING_SCORING"}'
```

## Next Steps

1. Copy the `InvoiceWebhookUrl` from the stack outputs
2. Deploy [alibaba/template.yml](/C:/TNGFinhack26/TnG-Finhack-26/alibaba/template.yml)
3. Provide `AwsWebhookUrl` and the required `DASHSCOPE` parameters when Funcraft prompts for them
4. Test end-to-end invoice upload

## Troubleshooting

### SAM CLI not found
```bash
pip install --user aws-sam-cli
export PATH="$PATH:$HOME/.local/bin"
```

### Stack already exists
```bash
aws cloudformation delete-stack --stack-name tng-finhack-backend
aws cloudformation wait stack-delete-complete --stack-name tng-finhack-backend
sam deploy --guided
```

### CloudShell timeout
- Sessions time out after inactivity
- Files persist between sessions for a limited period
- Reopen CloudShell and continue from the repo directory
