import sqlite3
import os
import logging
from datetime import datetime, timezone

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
    """Initializes SQLite schema for request audit logging, alert persistence, and vehicle events."""
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
            conn.execute("""
                CREATE TABLE IF NOT EXISTS vehicle_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    description TEXT,
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
                """, (request_id, alert.get("severity") or alert.get("type", "UNKNOWN"), alert.get("message", "")))
    except Exception as e:
        logger.error(f"Failed to record alerts for request {request_id} in DB: {e}")
    finally:
        conn.close()

def record_vehicle_event(event_type, description=None, db_path=None):
    """Persists a driving telemetry event (e.g. overspeeding, hard_braking, collision)."""
    conn = get_connection(db_path)
    try:
        with conn:
            now_iso = datetime.now(timezone.utc).isoformat()
            conn.execute("""
                INSERT INTO vehicle_events (event_type, description, created_at)
                VALUES (?, ?, ?)
            """, (event_type, description or "", now_iso))
    except Exception as e:
        logger.error(f"Failed to record vehicle event {event_type} in DB: {e}")
    finally:
        conn.close()

def get_recent_vehicle_events(limit=10, db_path=None):
    """Retrieves recent vehicle events with relative seconds_ago."""
    conn = get_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, event_type, description, created_at FROM vehicle_events ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        now = datetime.now(timezone.utc)
        results = []
        for row in rows:
            created_str = row["created_at"]
            try:
                if "T" in created_str:
                    event_dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                else:
                    event_dt = datetime.strptime(created_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                seconds_ago = max(0.0, round((now - event_dt).total_seconds(), 1))
            except Exception:
                seconds_ago = 0.0

            results.append({
                "id": row["id"],
                "event_type": row["event_type"],
                "description": row["description"] or "",
                "created_at": created_str,
                "seconds_ago": seconds_ago
            })
        return results
    except Exception as e:
        logger.error(f"Failed to retrieve vehicle events from DB: {e}")
        return []
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
