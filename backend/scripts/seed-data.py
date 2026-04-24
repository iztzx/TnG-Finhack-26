#!/usr/bin/env python3
"""
Seed DynamoDB with 60+ realistic Malaysian transactions for TnG FinHack 26 demo.
Run after deployment: python seed-data.py
"""
import boto3
import random
import time
import decimal
import os
import uuid
import json

# ---------------------------------------------------------------------------
# Malaysian names — diverse ethnic representation
# ---------------------------------------------------------------------------
MALAY_FIRST = [
    "Ahmad", "Siti", "Nurul", "Mohammed", "Aminah", "Hassan", "Faridah", "Ismail",
    "Faisal", "Zainab", "Razak", "Halimah", "Azman", "Sharifah", "Hafiz", "Datin",
    "Imran", "Rohaya", "Syed", "Mastura", "Aisyah", "Ibrahim", "Khadijah", "Muhammad",
    "Nadia", "Amirul", "Salmah", "Fatin", "Hakim", "Zulkifli", "Ayu", "Badrul",
]
MALAY_LAST = [
    "Bin Ismail", "Binti Abdullah", "Aini", "Hassan", "Rahman", "Yusof", "Hamzah",
    "Omar", "Ibrahim", "Bakar", "Ismail", "Osman", "Hussain", "Ramli", "Salleh",
    "Samad", "Binti Hassan", "Bin Abdullah", "Binti Ismail", "Bin Mohd Noor",
    "Binti Ramli", "Bin Omar", "Binti Yusof", "Bin Razak",
]

CHINESE_FIRST = [
    "Lee", "Tan", "Wong", "Chong", "Lim", "Chew", "Liew", "Yap", "Goh", "Ng",
    "Teoh", "Ong", "Chin", "Koh", "Heng", "Chan", "Lau", "Foo", "Choong", "Yong",
    "Siew Lian", "Wei Ming", "Xiao Ling", "Jia Hui", "Kah Wai", "Mei Ling", "Chee Keong",
]
CHINESE_LAST = [
    "Tan", "Lim", "Lee", "Chong", "Wong", "Ng", "Chew", "Liew", "Yap", "Goh",
    "Teoh", "Ong", "Lau", "Chan", "Koh", "Heng", "Foo", "Yong", "Choong",
    "Raj", "Singh", "Menon", "Nair", "Pillai", "Gopal", "Krishnan", "Ramasamy",
    "Subramaniam", "Nadarajan", "Maniam", "Ravi", "Sharma", "Patel", "Gupta",
    "Venkatesh", "Balakrishnan", "Jayaraman", "Sundaram", "Thiagarajan", "Muthu",
]

INDIAN_FIRST = [
    "Rajesh", "Kavitha", "Vijay", "Lakshmi", "Subramaniam", "Ganesan", "Maniam",
    "Nadarajan", "Ramasamy", "Priya", "Arun", "Deepa", "Karthik", "Anitha",
    "Suresh", "Meena", "Prakash", "Shanti", "Ravi", "Sangeeta", "Vignesh", "Latha",
    "Thinesh", "Kamala", "Dev", "Nisha", "Sanjay", "Indira", "Mohandas", "Revathi",
]
INDIAN_LAST = [
    "Kumar", "Menon", "Nair", "Singh", "Gopal", "Krishnan", "Ramasamy",
    "Subramaniam", "Pillai", "Raj", "Patel", "Gupta", "Sharma", "Venkataraman",
    "Iyer", "Srinivasan", "Murthy", "Rao", "Chandran", "Devan", "Govindasamy",
    "Sivakumar", "Thangavelu", "Vadivelu", "Narayanan", "Balasubramaniam",
]

SABAH_SARAWAK_FIRST = [
    "Joseph", "Mary", "John", "Grace", "Peter", "Roselyn", "Paul", "Agnes",
    "Anthony", "Janet", "Christopher", "Doris", "Raymond", "Catherine", "Benedict",
    "Margaret", "Stephen", "Florence", "Martin", "Lucy", "Alexander", "Teresa",
    "Dominic", "Rita", "Francis", "Helen", "Gilbert", "Esther", "Ignatius", "Monica",
]
SABAH_SARAWAK_LAST = [
    "Bin Jumat", "Binti Salleh", "Anak Nyawai", "Anak Tugang", "Bin Jalil",
    "Binti Abdul Rahman", "Bin Tagal", "Binti Buja", "Bin Majak", "Binti Lajim",
    "Bin Ghani", "Binti Pating", "Bin Limpakan", "Binti Sedom", "Bin Lunsing",
    "Anak Mawan", "Anak Jenu", "Bin Agus", "Binti Damit", "Bin Salleh",
]

FIRST_NAME_POOL = MALAY_FIRST + CHINESE_FIRST + INDIAN_FIRST + SABAH_SARAWAK_FIRST
LAST_NAME_POOL = MALAY_LAST + CHINESE_LAST + INDIAN_LAST + SABAH_SARAWAK_LAST

# ---------------------------------------------------------------------------
# Malaysian business names by sector
# ---------------------------------------------------------------------------
BUSINESS_NAMES = {
    "retail": [
        "Kedai Runcit Ahmad", "Lee's Electronics", "Raj Mini Market", "Siti Mart",
        "Bintang Supermart", "Wong Hardware", "Kedai Serbaneka Hassan",
        "Gopal's Textiles", "Subang Jaya Grocer", "Kota Raya Trading",
        "Ara Damansara Mart", "Setiawangsa Retail", "Bangsar Grocers",
        "Petaling Street Supplies", "Taman Maluri Store", "Cheras Convenience",
        "Wangsa Maju Mart", "Mont Kiara Provisions", "Desa Kiara Grocer",
        "Kepong Retail Hub", "Sentul Storehouse", "Masjid India Traders",
        "KL Central Mart", "Brickfields Bazaar", "Pudu Market Hall",
    ],
    "fnb": [
        "Nasi Lemak Corner", "Kopitiam Ong", "Raj's Banana Leaf", "Sate Kajang House",
        "Bak Kut Teh King", "Mamak Stall 24Jam", "Lim's Chicken Rice",
        "Roti Canai Station", "Teh Tarik Hub", "Nasi Kandar Line Clear",
        "Dim Sum Palace", "Burger Ramly Stand", "Laksa Sarawak Corner",
        "Hokkien Mee Stall", "Tandoori Nights", "Cendol Bukit Bintang",
        "Ais Kacang Corner", "Yong Tau Foo House", "Char Kway Teow King",
        "Sup Kambing Stall", "Nasi Ayam Gemas", "Kedai Kopi Pagi",
        "Steamboat Junction", "Dapur Tradisi", "Restoran Selera Malaysia",
    ],
    "services": [
        "Ahmad's Laundry", "Lee Accounting Services", "Raj Consultancy",
        "Siti Cleaning Co", "Hassan Logistics Support", "Wong Tax Advisory",
        "Faridah Printing", "Ismail Legal Services", "Zainab Daycare",
        "Faisal IT Support", "Halimah Salon", "Azman Security",
        "Sharifah Tuition Centre", "Hafiz Car Wash", "Rohaya Tailoring",
        "Syed Courier", "Mastura Spa", "Imran Translation", "Aisyah Events",
        "Badrul Plumbing", "Khadijah Pharmacy", "Amirul Photography",
        "Nadia Wedding Planner", "Hakim Auto Detailing", "Salmah Counselling",
    ],
    "manufacturing": [
        "Ahmad Furniture Factory", "Lee Plastic Works", "Raj Metal Engineering",
        "Siti Garment Manufacturing", "Hassan Rubber Processing", "Wong Electronics Assembly",
        "Faridah Food Processing", "Ismail Woodcraft", "Zainab Textile Mill",
        "Faisal Auto Parts", "Halimah Cosmetics Lab", "Azman Steel Fabrication",
        "Sharifah Packaging", "Hafiz Precision Tools", "Rohaya Batik House",
        "Syed Concrete Products", "Mastura Ceramic Works", "Imran Solar Panels",
        "Aisyah Furniture", "Badrul Plastic Moulding", "Khadijah Garments",
        "Amirul Circuit Boards", "Nadia Printing Press", "Hakim Glassworks",
        "Salmah Leather Goods",
    ],
    "logistics": [
        "Ahmad Express Delivery", "Lee Freight Forwarding", "Raj Cargo Services",
        "Siti Last Mile", "Hassan Warehouse Solutions", "Wong Cold Chain",
        "Faridah Parcel Hub", "Ismail Transport", "Zainab Distribution",
        "Faisal Fleet Management", "Halimah Courier", "Azman Haulage",
        "Sharifah Supply Chain", "Hafiz Logistics Park", "Rohaya Dispatch",
        "Syed Port Services", "Mastura Air Freight", "Imran Rail Cargo",
        "Aisyah Trucking", "Badrul Shipping", "Khadijah Import Export",
        "Amirul Container Yard", "Nadia Express", "Hakim Fulfillment",
        "Salmah Inventory Hub",
    ],
    "tech": [
        "Ahmad Software House", "Lee Digital Solutions", "Raj Cloud Technologies",
        "Siti Fintech Startup", "Hassan Cybersecurity", "Wong AI Labs",
        "Faridah E-Commerce", "Ismail Mobile Apps", "Zainab Data Analytics",
        "Faisal Blockchain Studio", "Halimah UX Agency", "Azman SaaS Solutions",
        "Sharifah DevOps", "Hafiz Web Services", "Rohaya Tech Support",
        "Syed Gaming Studio", "Mastura EdTech", "Imran HealthTech",
        "Aisyah PropTech", "Badrul AgriTech", "Khadijah InsurTech",
        "Amirul Robotics", "Nadia Drone Services", "Hakim IoT Solutions",
        "Salmah Digital Marketing",
    ],
}

# ---------------------------------------------------------------------------
# KL area addresses with postcodes
# ---------------------------------------------------------------------------
KL_LOCATIONS = [
    ("Jalan Bukit Bintang, Kuala Lumpur", "55100"),
    ("Jalan Sultan Ismail, Kuala Lumpur", "50250"),
    ("Jalan Tun Razak, Kuala Lumpur", "50400"),
    ("Jalan Ampang, Kuala Lumpur", "50450"),
    ("Jalan Kuching, Kuala Lumpur", "51200"),
    ("Jalan Cheras, Kuala Lumpur", "56100"),
    ("Jalan Pudu, Kuala Lumpur", "55100"),
    ("Jalan Imbi, Kuala Lumpur", "55100"),
    ("Jalan Raja Chulan, Kuala Lumpur", "50200"),
    ("Jalan Bangsar, Kuala Lumpur", "59200"),
    ("Jalan Mont Kiara, Kuala Lumpur", "50480"),
    ("Jalan Damansara, Kuala Lumpur", "60000"),
    ("Jalan Petaling, Kuala Lumpur", "50000"),
    ("Jalan SS15, Subang Jaya", "47500"),
    ("Jalan Universiti, Petaling Jaya", "46350"),
    ("Jalan USJ 1, Subang Jaya", "47600"),
    ("Jalan PJU 1A/4, Ara Damansara", "47301"),
    ("Jalan Setiawangsa, Kuala Lumpur", "54200"),
    ("Jalan Wangsa Maju, Kuala Lumpur", "53300"),
    ("Jalan Sri Hartamas, Kuala Lumpur", "50480"),
    ("Jalan Desa Kiara, Kuala Lumpur", "60000"),
    ("Jalan TAR, Kuala Lumpur", "50100"),
    ("Jalan Masjid India, Kuala Lumpur", "50100"),
    ("Jalan Chow Kit, Kuala Lumpur", "50350"),
    ("Jalan Sentul, Kuala Lumpur", "51000"),
    ("Jalan Kepong, Kuala Lumpur", "52100"),
    ("Jalan Ipoh, Kuala Lumpur", "51200"),
    ("Jalan Genting Klang, Kuala Lumpur", "53300"),
    ("Jalan Loke Yew, Kuala Lumpur", "55200"),
    ("Jalan Mahameru, Kuala Lumpur", "50480"),
    ("Jalan Duta, Kuala Lumpur", "50480"),
    ("Jalan Semantan, Kuala Lumpur", "50490"),
    ("Jalan Universiti, Kuala Lumpur", "50603"),
    ("Jalan Cochrane, Kuala Lumpur", "55100"),
    ("Jalan Peel, Kuala Lumpur", "55100"),
    ("Jalan Yew, Kuala Lumpur", "55100"),
    ("Jalan San Peng, Kuala Lumpur", "55200"),
    ("Jalan Loke Yew, Kuala Lumpur", "55200"),
    ("Jalan Belfield, Kuala Lumpur", "50490"),
    ("Jalan Travers, Kuala Lumpur", "50480"),
]

# ---------------------------------------------------------------------------
# IoT device IDs matching simulator / dashboard format
# ---------------------------------------------------------------------------
DEVICE_IDS = [
    "IoT-Gateway-01", "IoT-Gateway-02", "IoT-Gateway-03", "IoT-Gateway-04",
    "IoT-Gateway-05", "IoT-Gateway-06", "IoT-Gateway-07", "IoT-Gateway-08",
    "TNG-DEV-A1B2", "TNG-DEV-C3D4", "TNG-DEV-E5F6", "TNG-DEV-G7H8",
    "TNG-DEV-I9J0", "TNG-DEV-K1L2", "TNG-DEV-M3N4", "TNG-DEV-O5P6",
]

# ---------------------------------------------------------------------------
# Sector mapping aligned with ML model feature engineering
# ---------------------------------------------------------------------------
VALID_SECTORS = ["retail", "fnb", "services", "manufacturing", "logistics", "tech"]

STATUSES = ["APPROVED", "APPROVED", "APPROVED", "REJECTED", "PENDING"]  # weighted


def generate_user_id():
    first = random.choice(FIRST_NAME_POOL)
    last = random.choice(LAST_NAME_POOL)
    return f"{first.lower()}-{last.lower().replace(' ', '-')}-{random.randint(100, 999)}"


def generate_name():
    return f"{random.choice(FIRST_NAME_POOL)} {random.choice(LAST_NAME_POOL)}"


def generate_transaction():
    user_id = generate_user_id()
    now = int(time.time() * 1000)
    # spread over last 30 days
    timestamp = now - random.randint(0, 30 * 24 * 60 * 60 * 1000)
    credit_amount = decimal.Decimal(str(round(random.uniform(500, 500000), 2)))
    risk_score = decimal.Decimal(str(random.randint(300, 850)))
    status = random.choice(STATUSES)
    latency = decimal.Decimal(str(random.randint(12, 450)))
    sector = random.choice(VALID_SECTORS)
    address, postcode = random.choice(KL_LOCATIONS)
    business_name = random.choice(BUSINESS_NAMES[sector])
    device_id = random.choice(DEVICE_IDS)

    return {
        'userId': user_id,
        'timestamp': str(timestamp),
        'creditAmount': credit_amount,
        'riskScore': risk_score,
        'status': status,
        'latencyMs': latency,
        'name': generate_name(),
        'businessName': business_name,
        'address': address,
        'postcode': postcode,
        'industrySector': sector,
        'businessType': sector.replace('fnb', 'Food & Beverage').replace('tech', 'Technology').title(),
        'tenureMonths': random.randint(6, 240),
        'deviceId': device_id,
        'monthlyRevenue': decimal.Decimal(str(round(random.uniform(2000, 450000), 2))),
        'numEmployees': random.randint(1, 120),
        'monthlyTxnVolume': random.randint(10, 400),
        'paymentConsistencyScore': decimal.Decimal(str(round(random.uniform(0.35, 0.98), 2))),
    }


def seed_table(table_name, count=60):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)

    print(f"Seeding {count} transactions into {table_name}...")
    with table.batch_writer() as batch:
        for i in range(count):
            txn = generate_transaction()
            batch.put_item(Item=txn)
            if (i + 1) % 10 == 0:
                print(f"  ...{i + 1} records written")
    print(f"Done. Total records seeded: {count}")


def seed_risk_scores(table_name, count=40):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)

    print(f"Seeding {count} risk scores into {table_name}...")
    with table.batch_writer() as batch:
        for i in range(count):
            user_id = generate_user_id()
            score = decimal.Decimal(str(random.randint(300, 850)))
            sector = random.choice(VALID_SECTORS)
            batch.put_item(Item={
                'userId': user_id,
                'riskScore': score,
                'riskLevel': random.choice(['LOW', 'MEDIUM', 'HIGH']),
                'lastUpdated': str(int(time.time() * 1000)),
                'modelVersion': 'v1.0-gradient-boosting',
                'industrySector': sector,
                'businessName': random.choice(BUSINESS_NAMES[sector]),
                'topFeature': random.choice([
                    'payment_consistency_score',
                    'business_tenure_months',
                    'monthly_revenue',
                    'monthly_txn_volume',
                    'avg_txn_size',
                ]),
                'confidence': decimal.Decimal(str(round(random.uniform(0.72, 0.96), 2))),
            })
            if (i + 1) % 10 == 0:
                print(f"  ...{i + 1} records written")
    print(f"Done. Total risk scores seeded: {count}")


# ---------------------------------------------------------------------------
# Malaysian invoice vendors / buyers
# ---------------------------------------------------------------------------
MALAYSIAN_VENDORS = [
    "Syarikat ABC Sdn Bhd", "Mega Logistics Malaysia", "Penang Electronics Sdn Bhd",
    "Kuala Lumpur Textiles", "Johor Bahru Manufacturing Co", "Selangor Fresh Produce Sdn Bhd",
    "Sabah Timber Exports", "Sarawak Seafood Trading", "Melaka Furniture Works",
    "Perak Mining Supplies Sdn Bhd", "Negeri Sembilan Chemicals", "Pahang Palm Oil Refinery",
    "Terengganu Fishery Co", "Kelantan Batik House", "Kedah Rice Mill Sdn Bhd",
    "Putrajaya Tech Solutions", "Cyberjaya Software House", "Shah Alam Auto Parts",
    "Klang Port Services", "Ipoh Construction Materials",
]

MALAYSIAN_BUYERS = [
    "XYZ Trading", "Global Imports Pte Ltd", "Supermart Malaysia",
    "Hypermarket Chain Sdn Bhd", "Restaurant Group KL", "Hotel Supplies Co",
    "Export Partners Singapore", "Retail Giant Sdn Bhd", "Wholesale Distributors",
    "Government Procurement Agency", "Aeon Big Malaysia", "Giant Mall Sdn Bhd",
    "Mydin Wholesale", "Tesco Malaysia Procurement", "Shell Malaysia Trading",
    "Petronas Vendor Program", "CIMB Supplier Network", "Maybank Vendor Portal",
    "Public Bank Procurement", "Sunway Group Purchasing",
]

INVOICE_STATUSES = [
    "PENDING_REVIEW", "PENDING_REVIEW", "PENDING_REVIEW",
    "ANALYZED", "ANALYZED",
    "OFFER_MADE", "OFFER_MADE",
    "FUNDED", "FUNDED", "FUNDED", "FUNDED",
    "REPAID", "REPAID", "REPAID",
    "REJECTED",
]


def generate_invoice(user_id=None):
    if user_id is None:
        user_id = generate_user_id()
    invoice_id = f"INV-{uuid.uuid4().hex[:12].upper()}"
    now = int(time.time() * 1000)
    # Spread over last 90 days
    timestamp = now - random.randint(0, 90 * 24 * 60 * 60 * 1000)

    vendor = random.choice(MALAYSIAN_VENDORS)
    buyer = random.choice(MALAYSIAN_BUYERS)
    amount = decimal.Decimal(str(round(random.uniform(5000, 200000), 2)))
    inv_num = f"INV-{random.randint(10000, 99999)}"
    inv_date = time.strftime('%Y-%m-%d', time.gmtime((timestamp - random.randint(0, 30 * 24 * 60 * 60 * 1000)) / 1000))
    due_date = time.strftime('%Y-%m-%d', time.gmtime((timestamp + random.randint(15, 90) * 24 * 60 * 60 * 1000) / 1000))
    status = random.choice(INVOICE_STATUSES)

    tenure = random.randint(6, 240)
    monthly_rev = decimal.Decimal(str(round(random.uniform(5000, 450000), 2)))
    txn_vol = random.randint(10, 400)
    consistency = decimal.Decimal(str(round(random.uniform(0.35, 0.98), 2)))

    item = {
        'userId': user_id,
        'invoiceId': invoice_id,
        'timestamp': str(timestamp),
        'status': status,
        'fileName': f"{invoice_id}.pdf",
        'fileSizeBytes': random.randint(15000, 500000),
        'vendorName': vendor,
        'buyerName': buyer,
        'invoiceNumber': inv_num,
        'invoiceDate': inv_date,
        'dueDate': due_date,
        'amount': amount,
        'currency': 'RM',
        'lineItems': json.dumps([
            {'description': 'Goods / Services', 'quantity': 1, 'unit_price': amount, 'total': amount}
        ]),
        'businessTenureMonths': tenure,
        'monthlyRevenue': monthly_rev,
        'monthlyTxnVolume': txn_vol,
        'paymentConsistencyScore': consistency,
    }

    # If status is ANALYZED or beyond, add analysis fields
    if status in ('ANALYZED', 'OFFER_MADE', 'FUNDED', 'REPAID', 'REJECTED'):
        score = random.randint(350, 850)
        if score >= 700:
            risk_tier = 'LOW'
        elif score >= 500:
            risk_tier = 'MEDIUM'
        else:
            risk_tier = 'HIGH'
        fraud_risk = random.choice(['LOW', 'LOW', 'LOW', 'MEDIUM', 'HIGH'])
        item['fraudRisk'] = fraud_risk
        item['creditScore'] = decimal.Decimal(str(score))
        item['riskTier'] = risk_tier
        item['riskFactors'] = json.dumps([] if fraud_risk == 'LOW' else ['Amount exceeds typical threshold'])
        item['analyzedAt'] = str(timestamp + random.randint(60000, 3600000))

    # If status is OFFER_MADE or beyond, add offer
    if status in ('OFFER_MADE', 'FUNDED', 'REPAID'):
        credit_score = int(item.get('creditScore', 650))
        base_rate = 0.02
        if credit_score >= 700:
            risk_premium = 0.01
        elif credit_score >= 500:
            risk_premium = 0.02
        else:
            risk_premium = 0.03
        total_fee_rate = base_rate + risk_premium
        advance_rate = 0.95
        offer_amount = round(float(amount) * advance_rate, 2)
        factoring_fee = round(float(amount) * total_fee_rate, 2)
        net_disbursement = round(offer_amount - factoring_fee, 2)
        offer_id = f"OFF-{uuid.uuid4().hex[:10].upper()}"

        offer_data = {
            'offerId': offer_id,
            'invoiceAmount': float(amount),
            'advanceRate': advance_rate,
            'offerAmount': offer_amount,
            'baseRate': base_rate,
            'riskPremium': risk_premium,
            'totalFeeRate': total_fee_rate,
            'factoringFee': factoring_fee,
            'netDisbursement': net_disbursement,
            'estimatedRepaymentDate': due_date,
            'creditScore': credit_score,
            'offeredAt': str(timestamp + random.randint(3600000, 7200000))
        }
        item['offerData'] = json.dumps(offer_data)

    # If status is FUNDED or REPAID, add disbursement
    if status in ('FUNDED', 'REPAID'):
        offer_data = json.loads(item['offerData'])
        net = decimal.Decimal(str(offer_data['netDisbursement']))
        item['transactionId'] = f"TXN-{uuid.uuid4().hex[:12].upper()}"
        item['disbursedAt'] = str(timestamp + random.randint(7200000, 14400000))
        item['disbursedAmount'] = net
        item['walletBalanceUpdate'] = net

    return item


def seed_invoices(table_name, count=35):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)

    print(f"Seeding {count} invoices into {table_name}...")
    with table.batch_writer() as batch:
        for i in range(count):
            inv = generate_invoice()
            batch.put_item(Item=inv)
            if (i + 1) % 10 == 0:
                print(f"  ...{i + 1} invoices written")
    print(f"Done. Total invoices seeded: {count}")


if __name__ == '__main__':
    txn_table_name = os.environ.get('TXN_TABLE', 'tng-finhack-transactions')
    risk_table_name = os.environ.get('RISK_TABLE', 'tng-finhack-risk-scores')
    invoice_table_name = os.environ.get('INVOICE_TABLE', 'tng-finhack-invoices')

    seed_table(txn_table_name, count=60)
    seed_risk_scores(risk_table_name, count=40)
    seed_invoices(invoice_table_name, count=35)
    print("All seeding completed successfully!")
