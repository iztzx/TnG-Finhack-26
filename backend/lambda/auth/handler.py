"""
AWS Lambda auth service for OUT&IN.

Endpoints:
  POST /api/auth/register  — Create account, return JWT
  POST /api/auth/login     — Verify credentials, return JWT + profile
  GET  /api/auth/me        — Validate JWT, return profile

Security:
  - bcrypt (12 rounds) for password hashing
  - JWT HS256 with 24h expiry
  - Pydantic strict input validation
  - Failed login attempt logging
  - Password hash never included in responses
"""

import json
import os
import secrets
import string
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import bcrypt
import jwt
import boto3
from aws_lambda_powertools import Logger
from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator

# ---------------------------------------------------------------------------
# Structured logger
# ---------------------------------------------------------------------------
logger = Logger(
    service="auth",
    level=os.getenv("LOG_LEVEL", "INFO"),
)

# ---------------------------------------------------------------------------
# DynamoDB
# ---------------------------------------------------------------------------
dynamodb = boto3.resource("dynamodb")
USERS_TABLE = os.environ["USERS_TABLE"]
users_table = dynamodb.Table(USERS_TABLE)

# ---------------------------------------------------------------------------
# JWT config
# ---------------------------------------------------------------------------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_SECONDS = 86400  # 24 hours

# ---------------------------------------------------------------------------
# CORS headers
# ---------------------------------------------------------------------------
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date",
    "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
}


# ===================================================================
# Pydantic models
# ===================================================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone_number: Optional[str] = None
    companyName: Optional[str] = None
    registrationNo: Optional[str] = None
    businessType: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not any(c in "!@#$%^&*()_+-=[]{}|;:',.<>?/`~" for c in v):
            raise ValueError("Password must contain at least one special character")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not any(c in "!@#$%^&*()_+-=[]{}|;:',.<>?/`~" for c in v):
            raise ValueError("Password must contain at least one special character")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not any(c in "!@#$%^&*()_+-=[]{}|;:',.<>?/`~" for c in v):
            raise ValueError("Password must contain at least one special character")
        return v


class UpdateProfileRequest(BaseModel):
    companyName: Optional[str] = None
    registrationNo: Optional[str] = None
    businessType: Optional[str] = None
    phoneNumber: Optional[str] = None


# ===================================================================
# Helpers
# ===================================================================

def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }


def _to_dynamo(item: dict) -> dict:
    """Recursively convert float values to Decimal for DynamoDB."""
    converted = {}
    for key, value in item.items():
        if isinstance(value, float):
            converted[key] = Decimal(str(value))
        elif isinstance(value, dict):
            converted[key] = _to_dynamo(value)
        elif isinstance(value, list):
            converted[key] = [
                _to_dynamo(v) if isinstance(v, dict)
                else Decimal(str(v)) if isinstance(v, float)
                else v
                for v in value
            ]
        else:
            converted[key] = value
    return converted


def _dynamo_to_dict(item: dict) -> dict:
    """Convert DynamoDB Decimal values back to float for JSON responses."""
    if not isinstance(item, dict):
        return item
    converted = {}
    for key, value in item.items():
        if isinstance(value, Decimal):
            converted[key] = float(value)
        elif isinstance(value, dict):
            converted[key] = _dynamo_to_dict(value)
        elif isinstance(value, list):
            converted[key] = [_dynamo_to_dict(v) if isinstance(v, dict) else float(v) if isinstance(v, Decimal) else v for v in value]
        else:
            converted[key] = value
    return converted


def _generate_secure_password(length: int = 14) -> str:
    """Generate a cryptographically secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        pw = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Ensure it meets the strength requirements
        if (any(c.isupper() for c in pw)
                and any(c.islower() for c in pw)
                and any(c.isdigit() for c in pw)
                and any(c in "!@#$%^&*" for c in pw)):
            return pw


def _create_jwt(user_id: str, role: str, email: str = "") -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "role": role,
        "email": email,
        "iat": now,
        "exp": now + JWT_EXPIRY_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _user_profile_from_item(item: dict) -> dict:
    """Extract a safe user profile (no password hash) from a DynamoDB item."""
    profile = _dynamo_to_dict(item)
    profile.pop("passwordHash", None)
    return profile


# ===================================================================
# Route handlers
# ===================================================================

def handle_register(body: dict) -> dict:
    try:
        req = RegisterRequest(**body)
    except ValidationError as exc:
        errors = [
            {"field": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
            for err in exc.errors()
        ]
        return _response(400, {"error": "Validation failed", "details": errors})

    # Check if user already exists
    try:
        existing = users_table.get_item(Key={"id": req.email})
        if "Item" in existing:
            return _response(409, {"error": "An account with this email already exists"})
    except Exception as exc:
        logger.error("DynamoDB read failed during register", extra={"error": str(exc)})
        return _response(500, {"error": "Internal server error"})

    # Hash password
    password_hash = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

    now_utc = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())

    user_item = _to_dynamo({
        "id": req.email,
        "userId": user_id,
        "email": req.email,
        "passwordHash": password_hash,
        "phoneNumber": req.phone_number or "",
        "companyName": req.companyName or "",
        "registrationNo": req.registrationNo or "",
        "businessType": req.businessType or "",
        "role": "user",
        "riskTier": "tier2",
        "kycStatus": "pending",
        "walletBalance": 0.0,
        "creditLimit": 0.0,
        "lastLoginAt": "",
        "createdAt": now_utc,
        "updatedAt": now_utc,
    })

    try:
        users_table.put_item(Item=user_item, ConditionExpression="attribute_not_exists(id)")
    except Exception as exc:
        if "ConditionalCheckFailedException" in str(exc):
            return _response(409, {"error": "An account with this email already exists"})
        logger.error("Failed to save new user", extra={"error": str(exc)})
        return _response(500, {"error": "Failed to create account"})

    token = _create_jwt(user_id, "user", req.email)
    profile = _user_profile_from_item(user_item)

    logger.info("User registered", extra={"email": req.email, "userId": user_id})

    return _response(201, {
        "token": token,
        "profile": profile,
    })


def handle_login(body: dict) -> dict:
    try:
        req = LoginRequest(**body)
    except ValidationError as exc:
        return _response(400, {"error": "Invalid request", "details": str(exc)})

    # Fetch user
    try:
        result = users_table.get_item(Key={"id": req.email})
    except Exception as exc:
        logger.error("DynamoDB read failed during login", extra={"error": str(exc)})
        return _response(500, {"error": "Internal server error"})

    item = result.get("Item")
    if not item:
        logger.warning("Login failed - user not found", extra={"email": req.email})
        return _response(401, {"error": "Invalid email or password"})

    # Verify password
    stored_hash = item.get("passwordHash", "")
    if not stored_hash or not bcrypt.checkpw(req.password.encode("utf-8"), stored_hash.encode("utf-8")):
        logger.warning("Login failed - wrong password", extra={"email": req.email})
        return _response(401, {"error": "Invalid email or password"})

    # Update last login
    now_utc = datetime.now(timezone.utc).isoformat()
    try:
        users_table.update_item(
            Key={"id": req.email},
            UpdateExpression="SET lastLoginAt = :ll, updatedAt = :ua",
            ExpressionAttributeValues={
                ":ll": now_utc,
                ":ua": now_utc,
            },
        )
    except Exception as exc:
        logger.warning("Failed to update lastLoginAt", extra={"error": str(exc)})

    # Generate token
    role = item.get("role", "user")
    user_id = item.get("userId", req.email)
    if isinstance(user_id, Decimal):
        user_id = str(user_id)

    token = _create_jwt(str(user_id), str(role), req.email)
    profile = _user_profile_from_item(dict(item))
    profile["lastLoginAt"] = now_utc

    logger.info("User logged in", extra={"email": req.email, "role": str(role)})

    return _response(200, {
        "token": token,
        "profile": profile,
    })


def handle_forgot_password(body: dict) -> dict:
    """
    Generate a secure temporary password, store its hash as a reset token,
    and return the temporary password so the frontend can display it.

    In production this would email the user via SES/SNS. For the hackathon,
    we return the temp password directly for demo purposes.
    """
    try:
        req = ForgotPasswordRequest(**body)
    except ValidationError as exc:
        return _response(400, {"error": "Validation failed", "details": str(exc)})

    # Check if user exists
    try:
        result = users_table.get_item(Key={"id": req.email})
        item = result.get("Item")
    except Exception as exc:
        logger.error("DynamoDB read failed during forgot-password", extra={"error": str(exc)})
        return _response(500, {"error": "Internal server error"})

    if not item:
        # Don't reveal whether email exists — return success anyway
        logger.info("Forgot-password for non-existent email", extra={"email": req.email})
        return _response(200, {"message": "If an account with that email exists, a reset code has been generated."})

    # Generate a temporary password and a reset token
    temp_password = _generate_secure_password()
    reset_token = secrets.token_urlsafe(32)
    reset_token_hash = bcrypt.hashpw(reset_token.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")
    now_utc = datetime.now(timezone.utc).isoformat()

    # Store the reset token hash and expiry (15 min)
    try:
        users_table.update_item(
            Key={"id": req.email},
            UpdateExpression="SET resetTokenHash = :rth, resetTokenExpiry = :rte, tempPassword = :tp, updatedAt = :ua",
            ExpressionAttributeValues={
                ":rth": reset_token_hash,
                ":rte": str(int(time.time()) + 900),  # 15 min expiry
                ":tp": temp_password,
                ":ua": now_utc,
            },
        )
    except Exception as exc:
        logger.error("Failed to store reset token", extra={"error": str(exc)})
        return _response(500, {"error": "Failed to initiate password reset"})

    logger.info("Password reset initiated", extra={"email": req.email})

    # For hackathon demo: return the temp password and reset token directly
    # In production, you'd email the temp password via SES
    return _response(200, {
        "message": "Reset code generated successfully.",
        "resetToken": reset_token,
        "tempPassword": temp_password,
    })


def handle_reset_password(body: dict) -> dict:
    """
    Verify the reset token and set a new password.
    The user must provide the reset token they received + the new password.
    """
    try:
        req = ResetPasswordRequest(**body)
    except ValidationError as exc:
        errors = [
            {"field": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
            for err in exc.errors()
        ]
        return _response(400, {"error": "Validation failed", "details": errors})

    # Fetch user
    try:
        result = users_table.get_item(Key={"id": req.email})
        item = result.get("Item")
    except Exception as exc:
        logger.error("DynamoDB read failed during reset-password", extra={"error": str(exc)})
        return _response(500, {"error": "Internal server error"})

    if not item:
        return _response(401, {"error": "Invalid or expired reset token"})

    # Verify reset token
    stored_hash = item.get("resetTokenHash", "")
    expiry = item.get("resetTokenExpiry", "0")

    if not stored_hash:
        return _response(401, {"error": "No reset request found. Please request a new one."})

    if int(expiry) < int(time.time()):
        return _response(401, {"error": "Reset token has expired. Please request a new one."})

    if not bcrypt.checkpw(req.reset_token.encode("utf-8"), stored_hash.encode("utf-8")):
        return _response(401, {"error": "Invalid reset token"})

    # Update password
    new_hash = bcrypt.hashpw(req.new_password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
    now_utc = datetime.now(timezone.utc).isoformat()

    try:
        users_table.update_item(
            Key={"id": req.email},
            UpdateExpression="SET passwordHash = :ph, resetTokenHash = :none, resetTokenExpiry = :zero, tempPassword = :none2, updatedAt = :ua",
            ExpressionAttributeValues={
                ":ph": new_hash,
                ":none": "",
                ":zero": "0",
                ":none2": "",
                ":ua": now_utc,
            },
        )
    except Exception as exc:
        logger.error("Failed to update password", extra={"error": str(exc)})
        return _response(500, {"error": "Failed to reset password"})

    logger.info("Password reset successfully", extra={"email": req.email})

    return _response(200, {"message": "Password has been reset successfully. You can now log in with your new password."})


def handle_change_password(email: str, body: dict) -> dict:
    """
    Change password for an authenticated user. Requires current password + new password.
    """
    try:
        req = ChangePasswordRequest(**body)
    except ValidationError as exc:
        errors = [
            {"field": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
            for err in exc.errors()
        ]
        return _response(400, {"error": "Validation failed", "details": errors})

    # Fetch user
    try:
        result = users_table.get_item(Key={"id": email})
        item = result.get("Item")
    except Exception as exc:
        logger.error("DynamoDB read failed during change-password", extra={"error": str(exc)})
        return _response(500, {"error": "Internal server error"})

    if not item:
        return _response(404, {"error": "User not found"})

    # Verify current password
    stored_hash = item.get("passwordHash", "")
    if not stored_hash or not bcrypt.checkpw(req.current_password.encode("utf-8"), stored_hash.encode("utf-8")):
        return _response(401, {"error": "Current password is incorrect"})

    # Update password
    new_hash = bcrypt.hashpw(req.new_password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
    now_utc = datetime.now(timezone.utc).isoformat()

    try:
        users_table.update_item(
            Key={"id": email},
            UpdateExpression="SET passwordHash = :ph, updatedAt = :ua",
            ExpressionAttributeValues={
                ":ph": new_hash,
                ":ua": now_utc,
            },
        )
    except Exception as exc:
        logger.error("Failed to update password", extra={"error": str(exc)})
        return _response(500, {"error": "Failed to change password"})

    logger.info("Password changed successfully", extra={"email": email})

    return _response(200, {"message": "Password changed successfully"})


def handle_update_profile(email: str, body: dict) -> dict:
    """
    Update profile fields for an authenticated user.
    Only updates the fields that are provided and non-null.
    """
    try:
        req = UpdateProfileRequest(**body)
    except ValidationError as exc:
        errors = [
            {"field": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
            for err in exc.errors()
        ]
        return _response(400, {"error": "Validation failed", "details": errors})

    # Fetch user
    try:
        result = users_table.get_item(Key={"id": email})
        item = result.get("Item")
    except Exception as exc:
        logger.error("DynamoDB read failed during update-profile", extra={"error": str(exc)})
        return _response(500, {"error": "Internal server error"})

    if not item:
        return _response(404, {"error": "User not found"})

    # Build update expression dynamically
    update_fields = []
    expression_values = {}

    if req.companyName is not None:
        update_fields.append("companyName = :cn")
        expression_values[":cn"] = req.companyName
    if req.registrationNo is not None:
        update_fields.append("registrationNo = :rn")
        expression_values[":rn"] = req.registrationNo
    if req.businessType is not None:
        update_fields.append("businessType = :bt")
        expression_values[":bt"] = req.businessType
    if req.phoneNumber is not None:
        update_fields.append("phoneNumber = :pn")
        expression_values[":pn"] = req.phoneNumber

    if not update_fields:
        # Nothing to update – return current profile
        profile = _user_profile_from_item(dict(item))
        return _response(200, {"profile": profile})

    now_utc = datetime.now(timezone.utc).isoformat()
    update_fields.append("updatedAt = :ua")
    expression_values[":ua"] = now_utc

    try:
        users_table.update_item(
            Key={"id": email},
            UpdateExpression="SET " + ", ".join(update_fields),
            ExpressionAttributeValues=expression_values,
            ReturnValues="ALL_NEW",
        )
    except Exception as exc:
        logger.error("Failed to update profile", extra={"error": str(exc)})
        return _response(500, {"error": "Failed to update profile"})

    # Fetch fresh profile to return
    try:
        result = users_table.get_item(Key={"id": email})
        item = result.get("Item")
        profile = _user_profile_from_item(dict(item)) if item else {}
    except Exception as exc:
        logger.error("Failed to fetch updated profile", extra={"error": str(exc)})
        profile = {}

    logger.info("Profile updated", extra={"email": email})
    return _response(200, {"profile": profile})


def handle_me(auth_header: str) -> dict:
    if not auth_header or not auth_header.startswith("Bearer "):
        return _response(401, {"error": "Missing or invalid authorization header"})

    token = auth_header[7:]  # strip "Bearer "

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return _response(401, {"error": "Token expired", "code": "TOKEN_EXPIRED"})
    except jwt.InvalidTokenError:
        return _response(401, {"error": "Invalid token"})

    user_id = payload.get("sub", "")
    role = payload.get("role", "user")

    # Fetch fresh profile from DynamoDB
    # We need to find by userId — but our PK is email.
    # The JWT sub contains userId (uuid). We store email as PK.
    # For the /me endpoint, we include email in JWT as well.
    email = payload.get("email", "")

    if email:
        try:
            result = users_table.get_item(Key={"id": email})
            item = result.get("Item")
            if item:
                profile = _user_profile_from_item(dict(item))
                return _response(200, {"profile": profile})
            else:
                logger.warning("User not found for /me", extra={"email": email})
                return _response(404, {"error": "User not found"})
        except Exception as exc:
            logger.error("Failed to fetch profile for /me", extra={"error": str(exc)})
            return _response(500, {"error": "Failed to retrieve profile"})

    return _response(401, {"error": "Invalid token — missing email claim"})


# ===================================================================
# Lambda handler
# ===================================================================

@logger.inject_lambda_context
def handler(event, context):
    # Handle CORS preflight
    if event.get("httpMethod", "") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    path = event.get("path", "")
    method = event.get("httpMethod", "").upper()

    # Parse body
    body = {}
    raw_body = event.get("body", "{}") or "{}"
    try:
        body = json.loads(raw_body)
    except (json.JSONDecodeError, TypeError):
        return _response(400, {"error": "Invalid JSON body"})

    # Route
    if path == "/api/auth/register" and method == "POST":
        return handle_register(body)
    elif path == "/api/auth/login" and method == "POST":
        return handle_login(body)
    elif path == "/api/auth/forgot-password" and method == "POST":
        return handle_forgot_password(body)
    elif path == "/api/auth/reset-password" and method == "POST":
        return handle_reset_password(body)
    elif path == "/api/auth/change-password" and method == "POST":
        auth_header = (event.get("headers") or {}).get("Authorization", "") or (event.get("headers") or {}).get("authorization", "")
        # Verify JWT to get email
        if not auth_header or not auth_header.startswith("Bearer "):
            return _response(401, {"error": "Authentication required"})
        try:
            payload = jwt.decode(auth_header[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
            email = payload.get("email", "")
            if not email:
                return _response(401, {"error": "Invalid token"})
        except jwt.ExpiredSignatureError:
            return _response(401, {"error": "Token expired", "code": "TOKEN_EXPIRED"})
        except jwt.InvalidTokenError:
            return _response(401, {"error": "Invalid token"})
        return handle_change_password(email, body)
    elif path == "/api/auth/profile" and method == "PUT":
        auth_header = (event.get("headers") or {}).get("Authorization", "") or (event.get("headers") or {}).get("authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            return _response(401, {"error": "Authentication required"})
        try:
            payload = jwt.decode(auth_header[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
            email = payload.get("email", "")
            if not email:
                return _response(401, {"error": "Invalid token"})
        except jwt.ExpiredSignatureError:
            return _response(401, {"error": "Token expired", "code": "TOKEN_EXPIRED"})
        except jwt.InvalidTokenError:
            return _response(401, {"error": "Invalid token"})
        return handle_update_profile(email, body)
    elif path == "/api/auth/me" and method == "GET":
        auth_header = (event.get("headers") or {}).get("Authorization", "") or (event.get("headers") or {}).get("authorization", "")
        return handle_me(auth_header)
    else:
        return _response(404, {"error": "Not found"})
