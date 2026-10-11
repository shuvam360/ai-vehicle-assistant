RISK_RANK = {
    "LOW": 0,
    "MEDIUM": 1,
    "HIGH": 2,
    "CRITICAL": 3
}

def escalate_risk(current_level, new_level):
    """Escalates risk_level so it only ever moves upward in severity."""
    current_val = RISK_RANK.get(current_level, 0)
    new_val = RISK_RANK.get(new_level, 0)
    return new_level if new_val > current_val else current_level

def analyze_safety(vehicle):
    risks = []
    risk_level = "LOW"

    if not isinstance(vehicle, dict):
        return {
            "risk_level": "LOW",
            "risks": []
        }

    # Overspeeding check
    speed = vehicle.get("speed", 0)
    if speed > 100:
        risks.append("Vehicle is overspeeding.")
        risk_level = escalate_risk(risk_level, "HIGH")
    elif speed > 80:
        risks.append("Vehicle speed is high.")
        risk_level = escalate_risk(risk_level, "MEDIUM")

    # Engine temperature check
    engine_temp = vehicle.get("engine_temperature", 90)
    if engine_temp >= 120:
        risks.append("Engine temperature is critically high.")
        risk_level = escalate_risk(risk_level, "CRITICAL")
    elif engine_temp >= 105:
        risks.append("Engine temperature is high.")
        risk_level = escalate_risk(risk_level, "MEDIUM")

    # Tyre pressure check
    tyre_press = vehicle.get("tyre_pressure", 32)
    if tyre_press < 25:
        risks.append("Tyre pressure is critically low.")
        risk_level = escalate_risk(risk_level, "HIGH")
    elif tyre_press < 30:
        risks.append("Tyre pressure is low.")
        risk_level = escalate_risk(risk_level, "MEDIUM")

    # Battery check
    battery = vehicle.get("battery_voltage", 12.6)
    if battery < 11.5:
        risks.append("Battery voltage is critically low.")
        risk_level = escalate_risk(risk_level, "HIGH")
    elif battery < 12.0:
        risks.append("Battery voltage is low.")
        risk_level = escalate_risk(risk_level, "MEDIUM")

    return {
        "risk_level": risk_level,
        "risks": risks
    }