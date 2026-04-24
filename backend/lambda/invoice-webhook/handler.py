import json
import os
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
invoices_table = dynamodb.Table(os.environ['INVOICES_TABLE'])

def handler(event, context):
    """
    AWS Lambda webhook receiver for Alibaba Cloud invoice data.
    
    Receives structured JSON from Alibaba Cloud Function Compute,
    saves to DynamoDB, and returns success response.
    
    Input (from Alibaba Cloud):
    {
        "invoiceId": "uuid",
        "amount": float,
        "status": "PENDING_SCORING",
        "extractedData": {...},
        "timestamp": "ISO8601",
        "source": "alibaba_cloud_document_ai"
    }
    
    Output (Contract A):
    {
        "invoiceId": "uuid",
        "amount": float,
        "status": "PENDING_SCORING"
    }
    """
    try:
        # Parse incoming webhook payload
        body = json.loads(event.get('body', '{}'))
        
        invoice_id = body.get('invoiceId')
        amount = body.get('amount')
        extracted_data = body.get('extractedData', {})
        
        if not invoice_id or amount is None:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Missing required fields: invoiceId, amount'
                })
            }
        
        # Save to DynamoDB
        invoice_item = {
            'id': invoice_id,
            'amount': amount,
            'status': 'PENDING_SCORING',
            'extractedData': extracted_data,
            'source': body.get('source', 'alibaba_cloud'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        invoices_table.put_item(Item=invoice_item)
        
        # Return Contract A response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'invoiceId': invoice_id,
                'amount': float(amount),
                'status': 'PENDING_SCORING'
            })
        }
        
    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
