import sqlite3
import os
import logging

logger = logging.getLogger("vehicle_assistant")

def get_db_path():
    """Dynamically reads the configured database path from environment."""
    return os.environ.get("SQLITE_DB_PATH", "audit_history.db")

def get_connection(db_path=None):
    path = db_path or get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path=None):
    """Initializes SQLite schema for request audit logging and alert persistence."""
    conn = get_connection(db_path)
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    request_id TEXT NOT NULL,
                    endpoint TEXT NOT NULL,
                    method TEXT NOT NULL,
                    intent TEXT,
                    risk_level TEXT,
                    message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    request_id TEXT,
                    alert_type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
    finally:
        conn.close()

def record_request(request_id, endpoint, method, intent=None, risk_level=None, message=None, db_path=None):
    """Persists an API interaction record to SQLite."""
    conn = get_connection(db_path)
    try:
        with conn:
            conn.execute("""
                INSERT INTO audit_requests (request_id, endpoint, method, intent, risk_level, message)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (request_id, endpoint, method, intent, risk_level, message))
    except Exception as e:
        logger.error(f"Failed to record request {request_id} in DB: {e}")
    finally:
        conn.close()

def record_alerts(request_id, alerts, db_path=None):
    """Persists generated active vehicle alerts to SQLite."""
    if not alerts:
        return

    conn = get_connection(db_path)
    try:
        with conn:
            for alert in alerts:
                conn.execute("""
                    INSERT INTO audit_alerts (request_id, alert_type, message)
                    VALUES (?, ?, ?)
                """, (request_id, alert.get("type", "UNKNOWN"), alert.get("message", "")))
    except Exception as e:
        logger.error(f"Failed to record alerts for request {request_id} in DB: {e}")
    finally:
        conn.close()

def get_recent_requests(limit=50, db_path=None):
    """Retrieves recent audited requests."""
    conn = get_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_requests ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def get_recent_alerts(limit=50, db_path=None):
    """Retrieves recent audited alerts."""
    conn = get_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_alerts ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()
