"""
db.py
Database connection and schema initialization for Neon PostgreSQL.
Uses psycopg3 (psycopg) for Python 3.14 compatibility.
"""

import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_conn():
    """Get a new database connection."""
    return psycopg.connect(DATABASE_URL)


def init_db():
    """Create tables if they don't exist."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    display_name VARCHAR(100) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    started_at TIMESTAMP DEFAULT NOW(),
                    ended_at TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS location_history (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    latitude DOUBLE PRECISION NOT NULL,
                    longitude DOUBLE PRECISION NOT NULL,
                    place_name VARCHAR(500),
                    recorded_at TIMESTAMP DEFAULT NOW()
                );
            """)
            conn.commit()
    print("Database tables initialized.")


def query(sql, params=None, fetchone=False, fetchall=False):
    """Execute a query and optionally fetch results."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            if fetchone:
                result = cur.fetchone()
            elif fetchall:
                result = cur.fetchall()
            else:
                result = None
            conn.commit()
            return result


def query_with_columns(sql, params=None, fetchone=False):
    """Execute a query and return results as list of dicts (or single dict)."""
    with get_conn() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(sql, params)
            if fetchone:
                return cur.fetchone()
            else:
                return cur.fetchall()
