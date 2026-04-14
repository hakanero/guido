"""
auth.py
JWT authentication helpers and Flask route decorator.
"""

import os
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: int, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def login_required(f):
    """Decorator that requires a valid JWT in the Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid authorization header"}), 401

        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        if payload is None:
            return jsonify({"error": "Invalid or expired token"}), 401

        g.user_id = payload["user_id"]
        g.user_email = payload["email"]
        return f(*args, **kwargs)

    return decorated


def optional_auth(f):
    """Decorator that sets g.user_id if a valid JWT is present, but doesn't require it."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            payload = decode_token(token)
            if payload:
                g.user_id = payload["user_id"]
                g.user_email = payload["email"]
            else:
                g.user_id = None
                g.user_email = None
        else:
            g.user_id = None
            g.user_email = None
        return f(*args, **kwargs)

    return decorated
