def generate_alerts(vehicle, health, safety):
    alerts = []

    if not isinstance(health, dict):
        health = {}
    if not isinstance(safety, dict):
        safety = {}

    # Health warnings
    for warning in health.get("warnings", []):
        alerts.append({
            "type": "WARNING",
            "message": warning
        })

    # Safety risks
    risk_level = safety.get("risk_level", "LOW")
    for risk in safety.get("risks", []):
        alert_type = "WARNING"

        if risk_level == "HIGH":
            alert_type = "CRITICAL"
        elif risk_level == "CRITICAL":
            alert_type = "EMERGENCY"

        alerts.append({
            "type": alert_type,
            "message": risk
        })

    return alerts