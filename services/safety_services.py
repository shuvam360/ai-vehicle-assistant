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

def _get_min_tyre_pressure(vehicle):
    tp = vehicle.get("tyre_pressure", 32.0)
    if isinstance(tp, dict):
        return min(tp.values()) if tp else 32.0
    if isinstance(tp, (int, float)):
        return float(tp)
    return 32.0

def analyze_safety(vehicle):
    risks = []
    flags = []
    risk_level = "LOW"

    if not isinstance(vehicle, dict):
        return {
            "risk_level": "LOW",
            "risks": [],
            "flags": ["No collision detected", "Driver behaviour normal"]
        }

    # 1. Collision check
    collision = vehicle.get("collision_detected", False)
    if collision:
        risks.append("Possible collision detected.")
        flags.append("Possible collision detected")
        risk_level = escalate_risk(risk_level, "CRITICAL")
    else:
        flags.append("No collision detected")

    # 2. Overspeeding check
    speed = vehicle.get("speed", 0)
    if speed > 100:
        risks.append("Vehicle is overspeeding.")
        flags.append("Overspeeding")
        risk_level = escalate_risk(risk_level, "HIGH")
    elif speed > 80:
        risks.append("Vehicle speed is high.")
        flags.append("Vehicle speed high")
        risk_level = escalate_risk(risk_level, "MEDIUM")
    else:
        flags.append("Driver behaviour normal")

    # 3. Engine temperature check
    engine_temp = vehicle.get("engine_temp", vehicle.get("engine_temperature", 90))
    if engine_temp >= 120:
        risks.append("Engine temperature is critically high.")
        flags.append("Engine temperature critical")
        risk_level = escalate_risk(risk_level, "CRITICAL")
    elif engine_temp >= 105:
        risks.append("Engine temperature is high.")
        flags.append("Engine temperature high")
        risk_level = escalate_risk(risk_level, "MEDIUM")

    # 4. Tyre pressure check (across all 4 tyres or scalar)
    tyre_press = _get_min_tyre_pressure(vehicle)
    if tyre_press < 25:
        risks.append("Tyre pressure is critically low.")
        flags.append("Low tyre pressure")
        risk_level = escalate_risk(risk_level, "HIGH")
    elif tyre_press < 30:
        risks.append("Tyre pressure is low.")
        flags.append("Low tyre pressure")
        risk_level = escalate_risk(risk_level, "MEDIUM")

    # 5. Battery check
    battery = vehicle.get("battery_voltage", 12.6)
    if battery < 11.5:
        risks.append("Battery voltage is critically low.")
        flags.append("Battery voltage critical")
        risk_level = escalate_risk(risk_level, "HIGH")
    elif battery < 12.0:
        risks.append("Battery voltage is low.")
        flags.append("Battery voltage low")
        risk_level = escalate_risk(risk_level, "MEDIUM")

    return {
        "risk_level": risk_level,
        "risks": risks,
        "flags": flags
    }