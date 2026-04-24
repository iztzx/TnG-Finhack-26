# Multi-Cloud Deployment Checklist

## Pre-Deployment

### AWS Setup
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS credentials configured (`aws sts get-caller-identity`)
- [ ] SAM CLI installed (`sam --version`)
- [ ] Correct region selected (ap-southeast-1)

### Alibaba Cloud Setup
- [ ] Alibaba Cloud CLI installed (`aliyun --version`)
- [ ] Alibaba credentials configured (`aliyun sts GetCallerIdentity`)
- [ ] Funcraft installed (`fun --version`)
- [ ] Correct region selected (ap-southeast-1)

## AWS Deployment

- [ ] Navigate to `backend/` directory
- [ ] Run `sam build`
- [ ] Run `sam deploy --guided`
- [ ] Deployment successful (no errors)
- [ ] Copy `InvoiceWebhookUrl` from outputs
- [ ] Verify DynamoDB tables created:
  - [ ] tng-finhack-users
  - [ ] tng-finhack-invoices
  - [ ] tng-finhack-offers
  - [ ] tng-finhack-transactions
- [ ] Verify S3 bucket created: `tng-finhack-invoice-uploads-*`
- [ ] Verify Lambda functions created:
  - [ ] tng-finhack-invoice-webhook
  - [ ] tng-finhack-credit-scoring

## Alibaba Cloud Deployment

- [ ] Update `alibaba/template.yml` with AWS webhook URL
- [ ] Navigate to `alibaba/` directory
- [ ] Run `./deploy.sh` (or `fun deploy`)
- [ ] Deployment successful (no errors)
- [ ] Copy `InvoiceUploadUrl` from outputs
- [ ] Verify Function Compute service created: `InvoiceProcessingService`
- [ ] Verify OSS bucket created: `tng-finhack-invoices`

## Frontend Configuration

- [ ] Update `frontend/src/lib/constants.js` with:
  - [ ] Alibaba Cloud Function URL
  - [ ] AWS API Gateway URL
- [ ] Run `npm install` in `frontend/`
- [ ] Run `npm run dev` to start dev server
- [ ] Frontend accessible at `http://localhost:5173`

## Integration Testing

### Test 1: AWS Webhook Direct
```bash
curl -X POST https://YOUR-AWS-WEBHOOK-URL/webhook/invoice \
  -H "Content-Type: application/json" \
  -d '{"invoiceId":"test-123","amount":1000,"status":"PENDING_SCORING"}'
```
- [ ] Returns 200 status
- [ ] Returns JSON with invoiceId, amount, status

### Test 2: Alibaba Cloud Function
```bash
curl -X POST https://YOUR-ALIBABA-FC-URL \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-invoice.pdf"
```
- [ ] Returns 200 status
- [ ] Returns success: true
- [ ] Returns invoiceId (UUID format)

### Test 3: End-to-End Flow
- [ ] Upload invoice via frontend
- [ ] Verify invoice appears in DynamoDB
- [ ] Check AWS CloudWatch logs for webhook invocation
- [ ] Check Alibaba Cloud logs for function invocation

### Test 4: Data Verification
```bash
# Check DynamoDB
aws dynamodb scan --table-name tng-finhack-invoices --limit 5
```
- [ ] Invoice record exists
- [ ] Has correct structure (id, amount, status, extractedData)
- [ ] Status is "PENDING_SCORING"

## Post-Deployment Verification

### AWS Resources
```bash
# List Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `tng-finhack`)].FunctionName'

# List DynamoDB tables
aws dynamodb list-tables --query 'TableNames[?contains(@, `tng-finhack`)]'

# List S3 buckets
aws s3 ls | grep tng-finhack
```

### Alibaba Cloud Resources
```bash
# List Function Compute services
fun service list

# List OSS buckets
aliyun oss ls
```

## Monitoring Setup

- [ ] AWS CloudWatch dashboard created
- [ ] Alibaba Cloud monitoring enabled
- [ ] Log retention configured (7 days minimum)
- [ ] Error alerts configured (optional)

## Security Verification

- [ ] API Gateway CORS configured correctly
- [ ] Lambda execution roles have minimum permissions
- [ ] DynamoDB tables use encryption at rest
- [ ] S3 bucket is not publicly accessible
- [ ] OSS bucket is private
- [ ] No hardcoded credentials in code

## Rollback Plan

If deployment fails:

### AWS Rollback
```bash
aws cloudformation delete-stack --stack-name tng-finhack-backend
```

### Alibaba Cloud Rollback
```bash
fun remove
```

## Success Criteria

✅ All checkboxes above are checked
✅ End-to-end invoice upload works
✅ Data flows from Alibaba → AWS → DynamoDB
✅ No errors in CloudWatch or Alibaba Cloud logs
✅ Frontend can communicate with both clouds

## Next Steps After Successful Deployment

1. Implement Contract B (POST /api/scoring)
2. Implement Contract C (POST /api/disburse)
3. Add user authentication
4. Build frontend invoice management UI
5. Integrate real ML credit scoring model
6. Add WebSocket real-time updates
