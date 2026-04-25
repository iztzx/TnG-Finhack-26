#!/usr/bin/env python3
"""
Seed DynamoDB demo data for the TnG FinHack 26 platform.

Creates:
- 2 SME users in the Users table
- 5 historical transactions for one SME in the Transactions table

Usage:
  python backend/scripts/seed-data.py

Optional environment variables:
  AWS_REGION
  USERS_TABLE
  TRANSACTIONS_TABLE
"""

from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import bcrypt
import boto3
from botocore.exceptions import BotoCoreError, ClientError


AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-1")
USERS_TABLE_NAME = os.getenv("USERS_TABLE", "tng-finhack-dev-users")
TRANSACTIONS_TABLE_NAME = os.getenv("TRANSACTIONS_TABLE", "tng-finhack-dev-transactions")


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("seed-data")


def iso_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


DEMO_USER_PASSWORD = os.getenv("SEED_USER_PASSWORD", "Demo@123")
DEMO_ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "Admin@123")


def hash_password(plain: str) -> str:
    """Hash a password with bcrypt (12 rounds)."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def build_users(now: datetime) -> list[dict]:
    user_hash = hash_password(DEMO_USER_PASSWORD)
    admin_hash = hash_password(DEMO_ADMIN_PASSWORD)
    return [
        {
            "id": "user@pantasflow.com",
            "userId": "demo-user-001",
            "companyName": "Nusantara Cross-Border Logistics Sdn. Bhd.",
            "registrationNo": "202201184392",
            "businessType": "Logistics",
            "email": "user@pantasflow.com",
            "phoneNumber": "+60-3-6412 8801",
            "passwordHash": user_hash,
            "role": "user",
            "riskTier": "LOW",
            "kycStatus": "VERIFIED",
            "walletBalance": Decimal("318450.75"),
            "creditLimit": Decimal("500000.00"),
            "lastLoginAt": "",
            "createdAt": iso_utc(now - timedelta(days=320)),
            "updatedAt": iso_utc(now),
        },
        {
            "id": "admin@pantasflow.com",
            "userId": "demo-admin-001",
            "companyName": "TNG Supply Chain Capital (Admin)",
            "registrationNo": "202301015678",
            "businessType": "Financial Services",
            "email": "admin@pantasflow.com",
            "phoneNumber": "+60-3-8888 0001",
            "passwordHash": admin_hash,
            "role": "admin",
            "riskTier": "LOW",
            "kycStatus": "VERIFIED",
            "walletBalance": Decimal("0"),
            "creditLimit": Decimal("0"),
            "lastLoginAt": "",
            "createdAt": iso_utc(now - timedelta(days=365)),
            "updatedAt": iso_utc(now),
        },
        {
            "id": "sme-nusantara-logistics",
            "companyName": "Nusantara Cross-Border Logistics Sdn. Bhd.",
            "registrationNumber": "202201184392",
            "taxIdentificationNumber": "C31458972010",
            "contactPerson": "Aina Sofea Iskandar",
            "email": "finance@nusantaralogistics.com.my",
            "phone": "+60-3-6412 8801",
            "industry": "Freight Forwarding and Warehousing",
            "country": "Malaysia",
            "baseCurrency": "MYR",
            "annualRevenue": Decimal("4850000.00"),
            "creditScore": 756,
            "riskTier": "LOW",
            "kycStatus": "VERIFIED",
            "walletBalance": Decimal("318450.75"),
            "activeInvoices": 4,
            "createdAt": iso_utc(now - timedelta(days=320)),
            "updatedAt": iso_utc(now),
        },
        {
            "id": "sme-harvest-frozen-foods",
            "companyName": "Harvest Frozen Foods Exporters Sdn. Bhd.",
            "registrationNumber": "201903278441",
            "taxIdentificationNumber": "C28917456120",
            "contactPerson": "Marcus Tan Wei Jian",
            "email": "treasury@harvestfrozenfoods.com",
            "phone": "+60-4-218 7789",
            "industry": "Cold Chain Food Export",
            "country": "Malaysia",
            "baseCurrency": "MYR",
            "annualRevenue": Decimal("3620000.00"),
            "creditScore": 701,
            "riskTier": "MEDIUM",
            "kycStatus": "VERIFIED",
            "walletBalance": Decimal("142980.40"),
            "activeInvoices": 2,
            "createdAt": iso_utc(now - timedelta(days=210)),
            "updatedAt": iso_utc(now),
        },
    ]


def build_transactions(now: datetime) -> list[dict]:
    sme_id = "sme-nusantara-logistics"

    return [
        {
            "id": "txn-nusantara-20260418-disbursement",
            "userId": sme_id,
            "companyName": "Nusantara Cross-Border Logistics Sdn. Bhd.",
            "type": "INVOICE_DISBURSEMENT",
            "status": "COMPLETED",
            "currency": "MYR",
            "amount": Decimal("68450.00"),
            "counterparty": "Lion City Retail Imports Pte. Ltd.",
            "invoiceId": "inv-nusantara-1048",
            "description": "Advance payout for Johor-Singapore shipment financing",
            "createdAt": iso_utc(now - timedelta(days=7, hours=2)),
        },
        {
            "id": "txn-nusantara-20260416-fee",
            "userId": sme_id,
            "companyName": "Nusantara Cross-Border Logistics Sdn. Bhd.",
            "type": "FACTORING_FEE",
            "status": "POSTED",
            "currency": "MYR",
            "amount": Decimal("2190.40"),
            "counterparty": "TNG Supply Chain Capital",
            "invoiceId": "inv-nusantara-1048",
            "description": "Origination and platform fee for financed receivable",
            "createdAt": iso_utc(now - timedelta(days=9, hours=6)),
        },
        {
            "id": "txn-nusantara-20260413-collection",
            "userId": sme_id,
            "companyName": "Nusantara Cross-Border Logistics Sdn. Bhd.",
            "type": "BUYER_COLLECTION",
            "status": "SETTLED",
            "currency": "MYR",
            "amount": Decimal("72100.00"),
            "counterparty": "Lion City Retail Imports Pte. Ltd.",
            "invoiceId": "inv-nusantara-1032",
            "description": "Buyer remittance received against financed export invoice",
            "createdAt": iso_utc(now - timedelta(days=12, hours=4)),
        },
        {
            "id": "txn-nusantara-20260409-repayment",
            "userId": sme_id,
            "companyName": "Nusantara Cross-Border Logistics Sdn. Bhd.",
            "type": "FACILITY_REPAYMENT",
            "status": "COMPLETED",
            "currency": "MYR",
            "amount": Decimal("35820.00"),
            "counterparty": "TNG Supply Chain Capital",
            "invoiceId": "inv-nusantara-1027",
            "description": "Repayment of bridge financing facility after buyer settlement",
            "createdAt": iso_utc(now - timedelta(days=16, hours=1)),
        },
        {
            "id": "txn-nusantara-20260405-disbursement",
            "userId": sme_id,
            "companyName": "Nusantara Cross-Border Logistics Sdn. Bhd.",
            "type": "INVOICE_DISBURSEMENT",
            "status": "COMPLETED",
            "currency": "MYR",
            "amount": Decimal("51275.25"),
            "counterparty": "Pacific Home Goods Distribution Sdn. Bhd.",
            "invoiceId": "inv-nusantara-1015",
            "description": "Working capital disbursement for bonded warehouse fulfillment invoice",
            "createdAt": iso_utc(now - timedelta(days=20, hours=3)),
        },
    ]


def seed_items(table, items: list[dict], label: str) -> None:
    logger.info("Seeding %s records into %s", label, table.name)
    with table.batch_writer(overwrite_by_pkeys=["id"]) as batch:
        for item in items:
            batch.put_item(Item=item)
            logger.info("Upserted %s record: %s", label, item["id"])


def main() -> int:
    try:
        logger.info("Starting seed job in region %s", AWS_REGION)
        logger.info("Target tables: users=%s transactions=%s", USERS_TABLE_NAME, TRANSACTIONS_TABLE_NAME)

        session = boto3.Session(region_name=AWS_REGION)
        dynamodb = session.resource("dynamodb")

        users_table = dynamodb.Table(USERS_TABLE_NAME)
        transactions_table = dynamodb.Table(TRANSACTIONS_TABLE_NAME)

        users_table.load()
        transactions_table.load()

        now = datetime.now(timezone.utc)
        users = build_users(now)
        transactions = build_transactions(now)

        seed_items(users_table, users, "user")
        seed_items(transactions_table, transactions, "transaction")

        logger.info("Seed job completed successfully")
        logger.info("Inserted %s users and %s transactions", len(users), len(transactions))
        return 0
    except (ClientError, BotoCoreError) as exc:
        logger.exception("AWS error while seeding demo data: %s", exc)
        return 1
    except Exception as exc:
        logger.exception("Unexpected failure while seeding demo data: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())
