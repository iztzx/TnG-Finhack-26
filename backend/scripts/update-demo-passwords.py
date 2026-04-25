#!/usr/bin/env python3
"""
Update demo account password hashes in AWS DynamoDB.

Use this after the comprehensive credential rename to ensure
AWS has the same passwords as the local frontend prefills.

Usage:
  python backend/scripts/update-demo-passwords.py

Optional environment variables:
  AWS_REGION      (default: ap-southeast-1)
  USERS_TABLE     (default: tng-finhack-dev-users)
"""

import os
import sys

import bcrypt
import boto3
from botocore.exceptions import ClientError

AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-1")
USERS_TABLE_NAME = os.getenv("USERS_TABLE", "tng-finhack-dev-users")

# Must match frontend/src/pages/Login.jsx and backend/scripts/seed-data.py
CREDENTIALS = {
    "user@outandin.com": "Demo@123",
    "admin@outandin.com": "Admin@123",
}


def hash_password(plain: str) -> str:
    """Hash a password with bcrypt (12 rounds) — same as auth Lambda."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def main() -> int:
    try:
        session = boto3.Session(region_name=AWS_REGION)
        dynamodb = session.resource("dynamodb")
        table = dynamodb.Table(USERS_TABLE_NAME)
        table.load()
    except ClientError as exc:
        print(f"Failed to connect to DynamoDB: {exc}")
        return 1

    for email, password in CREDENTIALS.items():
        new_hash = hash_password(password)
        try:
            table.update_item(
                Key={"id": email},
                UpdateExpression="SET passwordHash = :ph, updatedAt = :ua",
                ExpressionAttributeValues={
                    ":ph": new_hash,
                    ":ua": "2026-04-26T00:00:00Z",
                },
            )
            print(f"Updated password hash for {email}")
        except ClientError as exc:
            print(f"Failed to update {email}: {exc}")
            return 1

    print("All demo account passwords updated successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
