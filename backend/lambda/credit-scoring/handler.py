import json
import boto3
import time
import decimal
import os
import uuid
import hashlib

from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
txn_table = dynamodb.Table(os.environ.get('TXN_TABLE', 'tng-finhack-transactions'))
risk_table = dynamodb.Table(os.environ.get('RISK_TABLE', 'tng-finhack-risk-scores'))
invoice_table = dynamodb.Table(os.environ.get('INVOICE_TABLE', 'tng-finhack-invoices'))

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization',
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    'Content-Type': 'application/json'
}


# ---------------------------------------------------------------------------
# Helper: Decimal encoder
# ---------------------------------------------------------------------------
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        return super().default(obj)


def json_response(data, status_code=200):
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(data, cls=DecimalEncoder)
    }


# ---------------------------------------------------------------------------
# Inline credit scorer (no sklearn dependency in Lambda)
# ---------------------------------------------------------------------------
def inline_credit_score(invoice_data):
    """
    Deterministic heuristic scorer that mimics the ML model behaviour.
    Returns score 300-850, risk tier, and synthetic feature breakdown.
    """
    vendor = invoice_data.get('vendor_name', '')
    amount = float(invoice_data.get('amount', 0))
    tenure = invoice_data.get('business_tenure_months', 36)
    consistency = invoice_data.get('payment_consistency_score', 0.75)
    monthly_rev = invoice_data.get('monthly_revenue', 25000)
    txn_vol = invoice_data.get('monthly_txn_volume', 50)

    # Deterministic seed from vendor name
    seed = int(hashlib.md5(vendor.encode()).hexdigest(), 16)
    rng = seed % 1000

    # Base score from business health
    base = 300 + min(tenure * 1.5, 200)
    base += consistency * 250
    base += min(monthly_rev / 1000, 150)
    base += min(txn_vol, 50)

    # Add pseudo-random variation (deterministic per vendor)
    base += (rng % 100) - 50

    score = int(max(300, min(850, base)))

    if score >= 700:
        risk_tier = 'LOW'
    elif score >= 500:
        risk_tier = 'MEDIUM'
    else:
        risk_tier = 'HIGH'

    features = {
        'payment_consistency': round(consistency, 2),
        'business_tenure': round(min(tenure / 240, 1.0), 2),
        'txn_volume': round(min(txn_vol / 500, 1.0), 2),
        'avg_invoice_size': round(min(amount / 200000, 1.0), 2),
        'monthly_revenue': round(min(monthly_rev / 500000, 1.0), 2),
    }

    return {
        'score': score,
        'credit_limit': int(score * 250),
        'risk_tier': risk_tier,
        'features': features
    }


# ---------------------------------------------------------------------------
# Existing handlers (kept untouched)
# ---------------------------------------------------------------------------
def score_user(user_data):
    """Initial deterministic scorer — will be replaced with real ML model in Task 4"""
    return {
        "score": 780,
        "credit_limit": 212500,
        "risk_level": "LOW",
        "features": {
            "payment_consistency": 0.92,
            "business_tenure": 0.85,
            "txn_volume": 0.78
        }
    }


def handle_trigger(event):
    start = time.time()
    body = json.loads(event.get('body', '{}'))
    user_id = body.get('userId', 'demo-user-001')
    result = score_user(body)

    txn_table.put_item(Item={
        'userId': user_id,
        'timestamp': str(int(time.time() * 1000)),
        'creditAmount': decimal.Decimal(str(result['credit_limit'])),
        'riskScore': decimal.Decimal(str(result['score'])),
        'status': 'APPROVED',
        'latencyMs': decimal.Decimal(str(int((time.time() - start) * 1000)))
    })

    return json_response({
        'approved': True,
        'creditAmount': result['credit_limit'],
        'riskScore': result['score'],
        'riskLevel': result['risk_level'],
        'featureImportance': result['features'],
        'processingMs': int((time.time() - start) * 1000)
    })


def handle_transactions(event):
    user_id = event.get('pathParameters', {}).get('userId', 'demo-user-001')
    response = txn_table.query(
        KeyConditionExpression=Key('userId').eq(user_id),
        ScanIndexForward=False,
        Limit=50
    )
    items = [
        {k: float(v) if isinstance(v, decimal.Decimal) else v for k, v in item.items()}
        for item in response.get('Items', [])
    ]
    return json_response({'transactions': items})


def handle_telemetry(event):
    return json_response({
        'deviceId': 'demo-device-001',
        'gps': {'lat': 3.1390, 'lng': 101.6869},
        'battery': 87,
        'signal': -65,
        'temperature': 32.5,
        'timestamp': int(time.time() * 1000)
    })


# ---------------------------------------------------------------------------
# NEW: Invoice financing handlers
# ---------------------------------------------------------------------------
def handle_invoice_upload(event):
    body = json.loads(event.get('body', '{}'))
    user_id = body.get('userId', 'demo-user-001')
    file_b64 = body.get('fileBase64', '')
    file_name = body.get('fileName', 'invoice.pdf')

    invoice_id = f"INV-{uuid.uuid4().hex[:12].upper()}"
    now = int(time.time() * 1000)

    # Simulate Document AI extraction
    vendors = [
        'Syarikat ABC Sdn Bhd', 'Mega Logistics Malaysia', 'Penang Electronics Sdn Bhd',
        'Kuala Lumpur Textiles', 'Johor Bahru Manufacturing Co',
        'Selangor Fresh Produce Sdn Bhd', 'Sabah Timber Exports',
        'Sarawak Seafood Trading', 'Melaka Furniture Works',
        'Perak Mining Supplies Sdn Bhd'
    ]
    buyers = [
        'XYZ Trading', 'Global Imports Pte Ltd', 'Supermart Malaysia',
        'Hypermarket Chain Sdn Bhd', 'Restaurant Group KL',
        'Hotel Supplies Co', 'Export Partners Singapore',
        'Retail Giant Sdn Bhd', 'Wholesale Distributors',
        'Government Procurement Agency'
    ]

    vendor_name = body.get('vendorName') or random_choice_deterministic(vendors, invoice_id)
    buyer_name = body.get('buyerName') or random_choice_deterministic(buyers, invoice_id + 'B')
    amount = decimal.Decimal(str(body.get('amount', round(5000 + (hash(invoice_id) % 195000), 2))))

    line_items = [
        {'description': 'Goods / Services', 'quantity': 1, 'unit_price': amount, 'total': amount}
    ]

    extracted = {
        'vendor_name': vendor_name,
        'buyer_name': buyer_name,
        'invoice_number': body.get('invoiceNumber') or f"INV-{hash(invoice_id) % 99999:05d}",
        'invoice_date': body.get('invoiceDate') or '2026-04-01',
        'due_date': body.get('dueDate') or '2026-05-15',
        'amount': amount,
        'currency': 'RM',
        'line_items': line_items,
    }

    invoice_item = {
        'userId': user_id,
        'invoiceId': invoice_id,
        'timestamp': str(now),
        'status': 'PENDING_REVIEW',
        'fileName': file_name,
        'fileSizeBytes': len(file_b64) * 3 // 4 if file_b64 else 0,
        'vendorName': extracted['vendor_name'],
        'buyerName': extracted['buyer_name'],
        'invoiceNumber': extracted['invoice_number'],
        'invoiceDate': extracted['invoice_date'],
        'dueDate': extracted['due_date'],
        'amount': amount,
        'currency': 'RM',
        'lineItems': json.dumps(line_items),
        'businessTenureMonths': body.get('businessTenureMonths', 36),
        'monthlyRevenue': decimal.Decimal(str(body.get('monthlyRevenue', 25000))),
        'monthlyTxnVolume': body.get('monthlyTxnVolume', 50),
        'paymentConsistencyScore': decimal.Decimal(str(body.get('paymentConsistencyScore', 0.75))),
    }

    invoice_table.put_item(Item=invoice_item)

    return json_response({
        'invoiceId': invoice_id,
        'extractedData': extracted,
        'status': 'PENDING_REVIEW',
        'uploadedAt': now
    })


def random_choice_deterministic(options, seed_str):
    idx = abs(hash(seed_str)) % len(options)
    return options[idx]


def handle_invoice_analyze(event):
    body = json.loads(event.get('body', '{}'))
    invoice_id = body.get('invoiceId')
    user_id = body.get('userId', 'demo-user-001')

    if not invoice_id:
        return json_response({'error': 'invoiceId is required'}, 400)

    # Fetch invoice
    response = invoice_table.get_item(Key={'userId': user_id, 'invoiceId': invoice_id})
    invoice = response.get('Item')
    if not invoice:
        return json_response({'error': 'Invoice not found'}, 404)

    # Simulated fraud checks
    fraud_flags = []
    amount = float(invoice.get('amount', 0))
    inv_number = invoice.get('invoiceNumber', '')

    # Duplicate check
    dup_resp = invoice_table.query(
        IndexName='InvoiceNumberIndex',
        KeyConditionExpression=Key('invoiceNumber').eq(inv_number)
    ) if False else {'Count': 0}  # Skip GSI query for demo; simulate instead

    if amount > 150000:
        fraud_flags.append('Amount exceeds typical threshold')
    if 'TEST' in inv_number.upper() or 'FAKE' in inv_number.upper():
        fraud_flags.append('Suspicious invoice number pattern')
    if amount < 1000:
        fraud_flags.append('Unusually small invoice amount')

    # Deterministic duplicate simulation
    if hash(invoice_id) % 20 == 0:
        fraud_flags.append('Potential duplicate invoice number')

    if fraud_flags:
        fraud_risk = 'HIGH' if len(fraud_flags) > 1 else 'MEDIUM'
    else:
        fraud_risk = 'LOW'

    # Inline credit scoring
    score_result = inline_credit_score({
        'vendor_name': invoice.get('vendorName', ''),
        'amount': amount,
        'business_tenure_months': int(invoice.get('businessTenureMonths', 36)),
        'payment_consistency_score': float(invoice.get('paymentConsistencyScore', 0.75)),
        'monthly_revenue': float(invoice.get('monthlyRevenue', 25000)),
        'monthly_txn_volume': int(invoice.get('monthlyTxnVolume', 50)),
    })

    # Update invoice with analysis
    invoice_table.update_item(
        Key={'userId': user_id, 'invoiceId': invoice_id},
        UpdateExpression='SET #st = :st, fraudRisk = :fr, creditScore = :cs, riskFactors = :rf, analyzedAt = :at',
        ExpressionAttributeNames={'#st': 'status'},
        ExpressionAttributeValues={
            ':st': 'ANALYZED',
            ':fr': fraud_risk,
            ':cs': decimal.Decimal(str(score_result['score'])),
            ':rf': json.dumps(fraud_flags),
            ':at': str(int(time.time() * 1000))
        }
    )

    return json_response({
        'invoiceId': invoice_id,
        'fraudRisk': fraud_risk,
        'fraudFlags': fraud_flags,
        'creditScore': score_result['score'],
        'riskTier': score_result['risk_tier'],
        'riskFactors': score_result['features'],
        'status': 'ANALYZED'
    })


def handle_invoice_offer(event):
    body = json.loads(event.get('body', '{}'))
    invoice_id = body.get('invoiceId')
    user_id = body.get('userId', 'demo-user-001')

    if not invoice_id:
        return json_response({'error': 'invoiceId is required'}, 400)

    response = invoice_table.get_item(Key={'userId': user_id, 'invoiceId': invoice_id})
    invoice = response.get('Item')
    if not invoice:
        return json_response({'error': 'Invoice not found'}, 404)

    amount = float(invoice.get('amount', 0))
    credit_score = int(float(invoice.get('creditScore', 650)))

    base_rate = 0.02
    if credit_score >= 700:
        risk_premium = 0.01
    elif credit_score >= 500:
        risk_premium = 0.02
    else:
        risk_premium = 0.03

    total_fee_rate = base_rate + risk_premium
    advance_rate = 0.95
    offer_amount = round(amount * advance_rate, 2)
    factoring_fee = round(amount * total_fee_rate, 2)
    net_disbursement = round(offer_amount - factoring_fee, 2)

    offer_id = f"OFF-{uuid.uuid4().hex[:10].upper()}"
    estimated_repayment_date = invoice.get('dueDate', '2026-05-15')

    offer_data = {
        'offerId': offer_id,
        'invoiceAmount': amount,
        'advanceRate': advance_rate,
        'offerAmount': offer_amount,
        'baseRate': base_rate,
        'riskPremium': risk_premium,
        'totalFeeRate': total_fee_rate,
        'factoringFee': factoring_fee,
        'netDisbursement': net_disbursement,
        'estimatedRepaymentDate': estimated_repayment_date,
        'creditScore': credit_score,
        'offeredAt': str(int(time.time() * 1000))
    }

    invoice_table.update_item(
        Key={'userId': user_id, 'invoiceId': invoice_id},
        UpdateExpression='SET #st = :st, offerData = :od',
        ExpressionAttributeNames={'#st': 'status'},
        ExpressionAttributeValues={
            ':st': 'OFFER_MADE',
            ':od': json.dumps(offer_data)
        }
    )

    return json_response({
        'invoiceId': invoice_id,
        'offer': offer_data,
        'status': 'OFFER_MADE'
    })


def handle_invoice_accept(event):
    body = json.loads(event.get('body', '{}'))
    invoice_id = body.get('invoiceId')
    offer_id = body.get('offerId')
    user_id = body.get('userId', 'demo-user-001')

    if not invoice_id:
        return json_response({'error': 'invoiceId is required'}, 400)

    response = invoice_table.get_item(Key={'userId': user_id, 'invoiceId': invoice_id})
    invoice = response.get('Item')
    if not invoice:
        return json_response({'error': 'Invoice not found'}, 404)

    offer_data = json.loads(invoice.get('offerData', '{}'))
    net_disbursement = decimal.Decimal(str(offer_data.get('netDisbursement', 0)))
    transaction_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
    now = str(int(time.time() * 1000))

    # Record disbursement transaction
    invoice_table.update_item(
        Key={'userId': user_id, 'invoiceId': invoice_id},
        UpdateExpression='SET #st = :st, transactionId = :tid, disbursedAt = :da, disbursedAmount = :da2, walletBalanceUpdate = :wb',
        ExpressionAttributeNames={'#st': 'status'},
        ExpressionAttributeValues={
            ':st': 'FUNDED',
            ':tid': transaction_id,
            ':da': now,
            ':da2': net_disbursement,
            ':wb': net_disbursement
        }
    )

    # Also log to transactions table for audit
    txn_table.put_item(Item={
        'userId': user_id,
        'timestamp': now,
        'type': 'INVOICE_DISBURSEMENT',
        'invoiceId': invoice_id,
        'transactionId': transaction_id,
        'amount': net_disbursement,
        'status': 'COMPLETED',
        'latencyMs': decimal.Decimal('0')
    })

    return json_response({
        'invoiceId': invoice_id,
        'offerId': offer_id,
        'transactionId': transaction_id,
        'disbursedAmount': float(net_disbursement),
        'walletBalanceUpdate': float(net_disbursement),
        'status': 'FUNDED',
        'fundedAt': now
    })


def handle_list_invoices(event):
    user_id = event.get('pathParameters', {}).get('userId', 'demo-user-001')
    response = invoice_table.query(
        KeyConditionExpression=Key('userId').eq(user_id),
        ScanIndexForward=False,
        Limit=100
    )

    items = []
    for item in response.get('Items', []):
        clean = {k: float(v) if isinstance(v, decimal.Decimal) else v for k, v in item.items()}
        # Deserialize nested JSON strings for API
        for key in ['lineItems', 'offerData', 'riskFactors']:
            if key in clean and isinstance(clean[key], str):
                try:
                    clean[key] = json.loads(clean[key])
                except json.JSONDecodeError:
                    pass
        items.append(clean)

    return json_response({'invoices': items})


# ---------------------------------------------------------------------------
# NEW: Shipment tracking handlers
# ---------------------------------------------------------------------------
def handle_shipment_track(event):
    body = json.loads(event.get('body', '{}'))
    shipment_id = body.get('shipmentId', 'SHP-UNKNOWN')

    # Deterministic simulation based on shipment_id hash
    h = abs(hash(shipment_id))

    routes = [
        {
            'origin': 'Port Klang, Malaysia',
            'destination': 'Singapore Port, Singapore',
            'carrier': 'Maersk Line',
            'waypoints': [
                {'location': 'Port Klang, Malaysia', 'lat': 2.9994, 'lng': 101.3925, 'timestamp': '2026-04-01T08:00:00Z'},
                {'location': 'Malacca Strait', 'lat': 2.1896, 'lng': 102.2501, 'timestamp': '2026-04-02T14:30:00Z'},
                {'location': 'Singapore Port, Singapore', 'lat': 1.2644, 'lng': 103.8225, 'timestamp': '2026-04-03T09:00:00Z'},
            ]
        },
        {
            'origin': 'Johor Bahru, Malaysia',
            'destination': 'Tanjon Pagar, Singapore',
            'carrier': 'DHL Global Forwarding',
            'waypoints': [
                {'location': 'Johor Bahru Customs', 'lat': 1.4927, 'lng': 103.7414, 'timestamp': '2026-04-10T06:00:00Z'},
                {'location': 'Woodlands Checkpoint', 'lat': 1.4381, 'lng': 103.7865, 'timestamp': '2026-04-10T10:00:00Z'},
                {'location': 'Tanjon Pagar, Singapore', 'lat': 1.2735, 'lng': 103.8467, 'timestamp': '2026-04-10T14:00:00Z'},
            ]
        },
        {
            'origin': 'Penang, Malaysia',
            'destination': 'Changi Logistics Hub, Singapore',
            'carrier': 'FedEx Trade Networks',
            'waypoints': [
                {'location': 'Penang Port, Malaysia', 'lat': 5.4141, 'lng': 100.3288, 'timestamp': '2026-04-12T07:00:00Z'},
                {'location': 'Ipoh Transit Hub', 'lat': 4.5975, 'lng': 101.0901, 'timestamp': '2026-04-13T16:00:00Z'},
                {'location': 'KL Central Warehouse', 'lat': 3.1390, 'lng': 101.6869, 'timestamp': '2026-04-14T08:00:00Z'},
                {'location': 'Changi Logistics Hub, Singapore', 'lat': 1.3644, 'lng': 103.9915, 'timestamp': '2026-04-15T11:00:00Z'},
            ]
        }
    ]

    route = routes[h % len(routes)]
    statuses = ['IN_TRANSIT', 'CUSTOMS_HOLD', 'ARRIVED', 'DELIVERED']
    customs_statuses = ['CLEARED', 'PENDING_INSPECTION', 'DOCUMENTS_REQUIRED', 'RELEASED']
    status = statuses[h % len(statuses)]
    customs = customs_statuses[h % len(customs_statuses)]

    current_wp = route['waypoints'][min(h % len(route['waypoints']), len(route['waypoints']) - 1)]

    return json_response({
        'shipmentId': shipment_id,
        'currentLocation': {
            'location': current_wp['location'],
            'lat': current_wp['lat'],
            'lng': current_wp['lng']
        },
        'origin': route['origin'],
        'destination': route['destination'],
        'status': status,
        'eta': '2026-05-01T12:00:00Z',
        'customsStatus': customs,
        'carrier': route['carrier'],
        'waypoints': route['waypoints'],
        'lastUpdated': str(int(time.time() * 1000))
    })


def handle_shipment_verify(event):
    body = json.loads(event.get('body', '{}'))
    shipment_id = body.get('shipmentId', 'SHP-UNKNOWN')
    shipment_value = float(body.get('shipmentValue', 50000))

    h = abs(hash(shipment_id))

    # Simulate IoT + customs + carrier verification
    iot_confirmed = (h % 10) != 0  # 90% pass
    customs_cleared = (h % 5) != 0   # 80% pass
    carrier_verified = (h % 7) != 0  # ~86% pass

    eligible = iot_confirmed and customs_cleared and carrier_verified

    financing_amount = round(shipment_value * 0.85, 2) if eligible else 0.0

    risk_assessment = {
        'iotDeviceStatus': 'ONLINE' if iot_confirmed else 'OFFLINE',
        'iotSignalStrength': -65,
        'customsClearance': 'CLEARED' if customs_cleared else 'HOLD',
        'carrierVerification': 'VERIFIED' if carrier_verified else 'FAILED',
        'deliveryConfirmation': eligible,
        'temperatureIntegrity': 'PASS',
        'sealIntegrity': 'PASS'
    }

    return json_response({
        'shipmentId': shipment_id,
        'eligible': eligible,
        'financingAmount': financing_amount,
        'advanceRate': 0.85,
        'shipmentValue': shipment_value,
        'riskAssessment': risk_assessment
    })


# ---------------------------------------------------------------------------
# NEW: Analytics handler
# ---------------------------------------------------------------------------
def handle_analytics(event):
    user_id = event.get('pathParameters', {}).get('userId', 'demo-user-001')

    # Query all invoices for user
    response = invoice_table.query(
        KeyConditionExpression=Key('userId').eq(user_id),
        ScanIndexForward=False
    )
    invoices = response.get('Items', [])

    total_financed = decimal.Decimal('0')
    total_repaid = decimal.Decimal('0')
    active_invoices = 0
    rate_sum = decimal.Decimal('0')
    rate_count = 0

    cash_flow_monthly = {}

    for inv in invoices:
        status = inv.get('status', 'PENDING_REVIEW')
        amount = decimal.Decimal(str(inv.get('amount', 0)))
        offer_data = inv.get('offerData', '{}')
        if isinstance(offer_data, str):
            try:
                offer_data = json.loads(offer_data)
            except json.JSONDecodeError:
                offer_data = {}

        if status in ['FUNDED', 'REPAID']:
            disbursed = decimal.Decimal(str(offer_data.get('netDisbursement', 0)))
            total_financed += disbursed
            active_invoices += 1 if status == 'FUNDED' else 0
            fee_rate = decimal.Decimal(str(offer_data.get('totalFeeRate', 0)))
            if fee_rate > 0:
                rate_sum += fee_rate
                rate_count += 1

            # Monthly bucket
            ts = inv.get('timestamp', '0')
            month_key = time.strftime('%Y-%m', time.gmtime(int(ts) / 1000)) if ts else '2026-04'
            cash_flow_monthly[month_key] = cash_flow_monthly.get(month_key, decimal.Decimal('0')) + disbursed

        if status == 'REPAID':
            total_repaid += amount

    avg_factoring_rate = round(rate_sum / rate_count, 4) if rate_count > 0 else 0

    # Build last 6 months summary
    now = time.gmtime()
    cash_flow_summary = []
    for i in range(5, -1, -1):
        year = now.tm_year
        month = now.tm_mon - i
        while month <= 0:
            month += 12
            year -= 1
        month_key = f"{year}-{month:02d}"
        cash_flow_summary.append({
            'month': month_key,
            'disbursements': float(cash_flow_monthly.get(month_key, decimal.Decimal('0')))
        })

    # Utilization rate = total financed / hypothetical credit limit proxy
    credit_limit_proxy = max(total_financed * decimal.Decimal('2'), decimal.Decimal('50000'))
    utilization_rate = round(float(total_financed) / float(credit_limit_proxy), 4) if credit_limit_proxy > 0 else 0

    return json_response({
        'userId': user_id,
        'totalFinanced': float(total_financed),
        'totalRepaid': float(total_repaid),
        'activeInvoices': active_invoices,
        'avgFactoringRate': float(avg_factoring_rate),
        'cashFlowSummary': cash_flow_summary,
        'utilizationRate': utilization_rate
    })


# ---------------------------------------------------------------------------
# Main Lambda handler router
# ---------------------------------------------------------------------------
def handler(event, context):
    method = event.get('httpMethod', '')
    path = event.get('path', '')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}
    if method == 'POST' and '/trigger' in path:
        return handle_trigger(event)
    if method == 'GET' and '/transactions' in path:
        return handle_transactions(event)
    if method == 'GET' and '/telemetry' in path:
        return handle_telemetry(event)

    # Invoice routes
    if method == 'POST' and '/invoice/upload' in path:
        return handle_invoice_upload(event)
    if method == 'POST' and '/invoice/analyze' in path:
        return handle_invoice_analyze(event)
    if method == 'POST' and '/invoice/offer' in path:
        return handle_invoice_offer(event)
    if method == 'POST' and '/invoice/accept' in path:
        return handle_invoice_accept(event)
    if method == 'GET' and '/invoices' in path:
        return handle_list_invoices(event)

    # Shipment routes
    if method == 'POST' and '/shipment/track' in path:
        return handle_shipment_track(event)
    if method == 'POST' and '/shipment/verify' in path:
        return handle_shipment_verify(event)

    # Analytics
    if method == 'GET' and '/analytics' in path:
        return handle_analytics(event)

    return {
        'statusCode': 404,
        'headers': CORS_HEADERS,
        'body': json.dumps({'error': 'Not found'})
    }
