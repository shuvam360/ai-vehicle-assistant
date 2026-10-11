def _get_min_tyre_pressure(vehicle):
    tp = vehicle.get("tyre_pressure", 32.0)
    if isinstance(tp, dict):
        return min(tp.values()) if tp else 32.0
    if isinstance(tp, (int, float)):
        return float(tp)
    return 32.0

def calculate_vehicle_health(vehicle):
    if not isinstance(vehicle, dict):
        vehicle = {}

    warnings = []
    overall_deduction = 0

    # 1. Engine Component Analysis
    engine_temp = vehicle.get("engine_temp", vehicle.get("engine_temperature", 90))
    engine_vibration = vehicle.get("engine_vibration", 1.2)
    engine_score = 100

    if engine_temp >= 120:
        engine_score -= 40
        overall_deduction += 30
        warnings.append("Engine temperature is critically high.")
    elif engine_temp >= 105:
        engine_score -= 20
        overall_deduction += 15
        warnings.append("Engine temperature is high.")

    if engine_vibration >= 4.0:
        engine_score -= 30
        overall_deduction += 15
        warnings.append("Abnormal engine vibration detected.")
    elif engine_vibration >= 2.5:
        engine_score -= 15

    engine_score = max(0, min(100, int(engine_score)))
    engine_status = "green" if engine_score >= 80 else ("yellow" if engine_score >= 60 else "red")

    # 2. Battery Component Analysis
    battery_volt = vehicle.get("battery_voltage", 12.6)
    battery_score = 100

    if battery_volt < 11.5:
        battery_score -= 45
        overall_deduction += 20
        warnings.append("Battery voltage is critically low.")
    elif battery_volt < 12.0:
        battery_score -= 25
        overall_deduction += 10
        warnings.append("Battery voltage is low.")

    battery_score = max(0, min(100, int(battery_score)))
    battery_status = "green" if battery_score >= 80 else ("yellow" if battery_score >= 60 else "red")

    # 3. Brakes Component Analysis
    brake_cond = vehicle.get("brake_condition", 95)
    brakes_score = max(0, min(100, int(brake_cond)))
    if brakes_score < 60:
        overall_deduction += 20
        warnings.append("Brake pad condition is critically degraded.")
    elif brakes_score < 75:
        overall_deduction += 10
        warnings.append("Brake pad wear detected.")

    brakes_status = "green" if brakes_score >= 80 else ("yellow" if brakes_score >= 60 else "red")

    # 4. Tyres Component Analysis
    min_tyre = _get_min_tyre_pressure(vehicle)
    tyres_score = 100

    if min_tyre < 25:
        tyres_score -= 45
        overall_deduction += 20
        warnings.append("Tyre pressure is critically low.")
    elif min_tyre < 30:
        tyres_score -= 20
        overall_deduction += 10
        warnings.append("Tyre pressure is slightly low.")

    tyres_score = max(0, min(100, int(tyres_score)))
    tyres_status = "green" if tyres_score >= 80 else ("yellow" if tyres_score >= 60 else "red")

    # Overall Health Score
    overall_score = max(0, min(100, 100 - overall_deduction))

    if overall_score >= 80:
        overall_status = "HEALTHY"
    elif overall_score >= 60:
        overall_status = "WARNING"
    else:
        overall_status = "CRITICAL"

    components = {
        "engine": {"score": engine_score, "status": engine_status},
        "battery": {"score": battery_score, "status": battery_status},
        "brakes": {"score": brakes_score, "status": brakes_status},
        "tyres": {"score": tyres_score, "status": tyres_status}
    }

    return {
        "health_score": overall_score,
        "overall_score": overall_score,
        "overall_status": overall_status,
        "components": components,
        "component_scores": components,
        "warnings": warnings
    }