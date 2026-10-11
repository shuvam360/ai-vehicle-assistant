import threading
from datetime import datetime, timezone

_alerts_lock = threading.Lock()
_active_alerts = {}

def _get_min_tyre_pressure(vehicle):
    tp = vehicle.get("tyre_pressure", 32.0)
    if isinstance(tp, dict):
        return min(tp.values()) if tp else 32.0
    if isinstance(tp, (int, float)):
        return float(tp)
    return 32.0

def generate_alerts(vehicle=None, health=None, safety=None):
    """
    Evaluates vehicle conditions, generates deduplicated active alerts,
    maintains original created_at timestamps, and clears alerts when conditions normalize.
    """
    global _active_alerts

    if not isinstance(vehicle, dict):
        vehicle = {}
    if not isinstance(health, dict):
        health = {}
    if not isinstance(safety, dict):
        safety = {}

    current_conditions = {}

    # 1. Collision Alert
    if vehicle.get("collision_detected", False):
        current_conditions["ALERT_COLLISION"] = {
            "severity": "EMERGENCY",
            "message": "Possible collision detected. Are you okay?"
        }

    # 2. Engine Temperature Alert
    engine_temp = vehicle.get("engine_temp", vehicle.get("engine_temperature", 90))
    if engine_temp >= 120:
        current_conditions["ALERT_ENGINE_TEMP"] = {
            "severity": "CRITICAL",
            "message": "Engine temperature is critically high. Please stop safely."
        }
    elif engine_temp >= 105:
        current_conditions["ALERT_ENGINE_TEMP"] = {
            "severity": "WARNING",
            "message": "Engine temperature is high."
        }

    # 3. Tyre Pressure Alert
    min_tyre = _get_min_tyre_pressure(vehicle)
    if min_tyre < 25:
        current_conditions["ALERT_TYRE_PRESSURE"] = {
            "severity": "CRITICAL",
            "message": "Tyre pressure is critically low."
        }
    elif min_tyre < 30:
        current_conditions["ALERT_TYRE_PRESSURE"] = {
            "severity": "WARNING",
            "message": "Tyre pressure is low."
        }

    # 4. Battery Voltage Alert
    battery_volt = vehicle.get("battery_voltage", 12.6)
    if battery_volt < 11.5:
        current_conditions["ALERT_BATTERY"] = {
            "severity": "CRITICAL",
            "message": "Battery voltage is critically low."
        }
    elif battery_volt < 12.0:
        current_conditions["ALERT_BATTERY"] = {
            "severity": "WARNING",
            "message": "Battery voltage is low."
        }

    # 5. Overspeeding Alert
    speed = vehicle.get("speed", 0)
    if speed > 100:
        current_conditions["ALERT_OVERSPEED"] = {
            "severity": "CRITICAL",
            "message": "Vehicle is overspeeding."
        }

    # 6. Additional warnings from health or safety if not already captured
    for warning in health.get("warnings", []):
        if "Engine" in warning and "ALERT_ENGINE_TEMP" not in current_conditions:
            current_conditions["ALERT_ENGINE_HEALTH"] = {
                "severity": "WARNING",
                "message": warning
            }
        elif "Tyre" in warning and "ALERT_TYRE_PRESSURE" not in current_conditions:
            current_conditions["ALERT_TYRE_HEALTH"] = {
                "severity": "WARNING",
                "message": warning
            }

    with _alerts_lock:
        now_iso = datetime.now(timezone.utc).isoformat()

        # Update / add active alerts
        for alert_id, info in current_conditions.items():
            if alert_id not in _active_alerts:
                _active_alerts[alert_id] = {
                    "id": alert_id,
                    "severity": info["severity"],
                    "type": info["severity"],  # Backward compatibility
                    "message": info["message"],
                    "created_at": now_iso
                }
            else:
                # Update message and severity if escalated, but retain original created_at
                _active_alerts[alert_id]["severity"] = info["severity"]
                _active_alerts[alert_id]["type"] = info["severity"]
                _active_alerts[alert_id]["message"] = info["message"]

        # Clear alerts whose conditions are no longer present
        cleared_ids = [aid for aid in _active_alerts if aid not in current_conditions]
        for aid in cleared_ids:
            del _active_alerts[aid]

        return list(_active_alerts.values())

def clear_all_alerts():
    """Resets all active alerts."""
    global _active_alerts
    with _alerts_lock:
        _active_alerts.clear()