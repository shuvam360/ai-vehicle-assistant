import copy
import random
import threading
import time
from services.db_service import record_vehicle_event

DEFAULT_VEHICLE_DATA = {
    "speed": 65.0,
    "rpm": 2100,
    "engine_temp": 89.0,
    "engine_temperature": 89.0,
    "battery_voltage": 12.6,
    "fuel_level": 75.0,
    "tyre_pressure": {
        "front_left": 32.0,
        "front_right": 32.0,
        "rear_left": 32.0,
        "rear_right": 32.0
    },
    "brake_condition": 95.0,
    "engine_vibration": 1.2,
    "collision_detected": False
}

SCENARIOS = {
    "normal": {
        "speed": 65.0,
        "rpm": 2100,
        "engine_temp": 89.0,
        "engine_temperature": 89.0,
        "battery_voltage": 12.6,
        "fuel_level": 75.0,
        "tyre_pressure": {
            "front_left": 32.0,
            "front_right": 32.0,
            "rear_left": 32.0,
            "rear_right": 32.0
        },
        "brake_condition": 95.0,
        "engine_vibration": 1.2,
        "collision_detected": False
    },
    "overheating": {
        "speed": 60.0,
        "rpm": 2200,
        "engine_temp": 124.0,
        "engine_temperature": 124.0,
        "battery_voltage": 12.4,
        "fuel_level": 60.0,
        "tyre_pressure": {
            "front_left": 32.0,
            "front_right": 32.0,
            "rear_left": 32.0,
            "rear_right": 32.0
        },
        "brake_condition": 90.0,
        "engine_vibration": 4.8,
        "collision_detected": False
    },
    "low_tyre": {
        "speed": 55.0,
        "rpm": 1900,
        "engine_temp": 90.0,
        "engine_temperature": 90.0,
        "battery_voltage": 12.5,
        "fuel_level": 70.0,
        "tyre_pressure": {
            "front_left": 21.0,
            "front_right": 32.0,
            "rear_left": 32.0,
            "rear_right": 32.0
        },
        "brake_condition": 92.0,
        "engine_vibration": 2.2,
        "collision_detected": False
    },
    "low_battery": {
        "speed": 40.0,
        "rpm": 1500,
        "engine_temp": 88.0,
        "engine_temperature": 88.0,
        "battery_voltage": 11.2,
        "fuel_level": 50.0,
        "tyre_pressure": {
            "front_left": 32.0,
            "front_right": 32.0,
            "rear_left": 32.0,
            "rear_right": 32.0
        },
        "brake_condition": 90.0,
        "engine_vibration": 1.2,
        "collision_detected": False
    },
    "overspeeding": {
        "speed": 118.0,
        "rpm": 3800,
        "engine_temp": 98.0,
        "engine_temperature": 98.0,
        "battery_voltage": 12.6,
        "fuel_level": 65.0,
        "tyre_pressure": {
            "front_left": 32.0,
            "front_right": 32.0,
            "rear_left": 32.0,
            "rear_right": 32.0
        },
        "brake_condition": 90.0,
        "engine_vibration": 2.8,
        "collision_detected": False
    },
    "collision": {
        "speed": 0.0,
        "rpm": 0,
        "engine_temp": 92.0,
        "engine_temperature": 92.0,
        "battery_voltage": 12.1,
        "fuel_level": 55.0,
        "tyre_pressure": {
            "front_left": 18.0,
            "front_right": 30.0,
            "rear_left": 32.0,
            "rear_right": 32.0
        },
        "brake_condition": 40.0,
        "engine_vibration": 8.5,
        "collision_detected": True
    },
    "critical_compound": {
        "speed": 105.0,
        "rpm": 3400,
        "engine_temp": 125.0,
        "engine_temperature": 125.0,
        "battery_voltage": 11.1,
        "fuel_level": 15.0,
        "tyre_pressure": {
            "front_left": 21.0,
            "front_right": 21.0,
            "rear_left": 21.0,
            "rear_right": 21.0
        },
        "brake_condition": 50.0,
        "engine_vibration": 5.2,
        "collision_detected": False
    }
}

_data_lock = threading.Lock()
_current_vehicle_data = copy.deepcopy(DEFAULT_VEHICLE_DATA)
_current_scenario = "normal"
_last_event_timestamps = {}
_simulator_thread = None
_simulator_running = False

def get_min_tyre_pressure(vehicle):
    """Helper returning minimum tyre pressure across all tyres or scalar value."""
    tp = vehicle.get("tyre_pressure", 32.0)
    if isinstance(tp, dict):
        return min(tp.values()) if tp else 32.0
    if isinstance(tp, (int, float)):
        return float(tp)
    return 32.0

def get_vehicle_data():
    """Returns a copy of the current vehicle telemetry data."""
    with _data_lock:
        data = copy.deepcopy(_current_vehicle_data)
        # Ensure both alias fields are kept synchronized
        if "engine_temp" in data:
            data["engine_temperature"] = data["engine_temp"]
        elif "engine_temperature" in data:
            data["engine_temp"] = data["engine_temperature"]
        return data

def set_vehicle_data(new_data):
    """Updates vehicle telemetry with provided dictionary values."""
    global _current_vehicle_data
    with _data_lock:
        if isinstance(new_data, dict):
            _current_vehicle_data.update(copy.deepcopy(new_data))
            if "engine_temp" in _current_vehicle_data:
                _current_vehicle_data["engine_temperature"] = _current_vehicle_data["engine_temp"]
            elif "engine_temperature" in _current_vehicle_data:
                _current_vehicle_data["engine_temp"] = _current_vehicle_data["engine_temperature"]
    return get_vehicle_data()

def set_scenario(scenario_name):
    """Switches vehicle data to a predefined telemetry scenario and records events."""
    global _current_vehicle_data, _current_scenario
    with _data_lock:
        if scenario_name in SCENARIOS:
            _current_scenario = scenario_name
            _current_vehicle_data = copy.deepcopy(SCENARIOS[scenario_name])

            # Trigger immediate event recording for scenarios
            if scenario_name == "collision":
                record_vehicle_event("collision", "Collision detected: sudden deceleration with impact.")
            elif scenario_name == "overspeeding":
                record_vehicle_event("overspeeding", "Vehicle overspeeding: speed 118 km/h.")
            elif scenario_name == "hard_braking":
                record_vehicle_event("hard_braking", "Hard braking event detected.")
            return True
        return False

def reset_vehicle_data():
    """Resets vehicle telemetry back to baseline default values."""
    global _current_vehicle_data, _current_scenario
    with _data_lock:
        _current_scenario = "normal"
        _current_vehicle_data = copy.deepcopy(DEFAULT_VEHICLE_DATA)
    return get_vehicle_data()

def step_simulator():
    """Applies a single simulation tick with small random-walk drift and event detection."""
    global _current_vehicle_data
    with _data_lock:
        prev_speed = _current_vehicle_data.get("speed", 65.0)

        # Apply small drift only when in normal operating scenario
        if _current_scenario == "normal":
            # Speed drift ±1.5 km/h
            speed = max(0.0, min(120.0, prev_speed + random.uniform(-1.0, 1.0)))
            _current_vehicle_data["speed"] = round(speed, 1)

            # RPM tracked with speed
            rpm = max(800, int(speed * 32.0 + random.uniform(-20, 20)))
            _current_vehicle_data["rpm"] = rpm

            # Engine temperature drift ±0.2 °C
            temp = max(80.0, min(95.0, _current_vehicle_data.get("engine_temp", 89.0) + random.uniform(-0.15, 0.15)))
            _current_vehicle_data["engine_temp"] = round(temp, 1)
            _current_vehicle_data["engine_temperature"] = round(temp, 1)

            # Battery voltage drift ±0.01 V
            battery = max(12.3, min(12.8, _current_vehicle_data.get("battery_voltage", 12.6) + random.uniform(-0.01, 0.01)))
            _current_vehicle_data["battery_voltage"] = round(battery, 2)

            # Fuel level small drain
            fuel = max(0.0, _current_vehicle_data.get("fuel_level", 75.0) - 0.005)
            _current_vehicle_data["fuel_level"] = round(fuel, 2)

            # Tyre pressures drift
            tp = _current_vehicle_data.get("tyre_pressure")
            if isinstance(tp, dict):
                for k in tp:
                    tp[k] = round(max(28.0, min(35.0, tp[k] + random.uniform(-0.05, 0.05))), 1)

            # Engine vibration drift
            vib = max(0.8, min(2.0, _current_vehicle_data.get("engine_vibration", 1.2) + random.uniform(-0.05, 0.05)))
            _current_vehicle_data["engine_vibration"] = round(vib, 2)

        # Event Detection with Debounce
        now = time.time()
        cur_speed = _current_vehicle_data.get("speed", 0.0)

        # Hard braking: deceleration >= 20 km/h
        if prev_speed - cur_speed >= 20.0:
            if now - _last_event_timestamps.get("hard_braking", 0) > 10.0:
                record_vehicle_event("hard_braking", f"Hard braking detected: dropped from {prev_speed} to {cur_speed} km/h.")
                _last_event_timestamps["hard_braking"] = now

        # Overspeeding: speed > 100 km/h
        if cur_speed > 100.0:
            if now - _last_event_timestamps.get("overspeeding", 0) > 15.0:
                record_vehicle_event("overspeeding", f"Overspeeding warning: speed reached {cur_speed} km/h.")
                _last_event_timestamps["overspeeding"] = now

        # Collision detected
        if _current_vehicle_data.get("collision_detected", False):
            if now - _last_event_timestamps.get("collision", 0) > 15.0:
                record_vehicle_event("collision", "Collision event detected by onboard sensors.")
                _last_event_timestamps["collision"] = now

def _simulator_loop():
    """Background loop ticking every 1.5 seconds."""
    while _simulator_running:
        try:
            step_simulator()
        except Exception:
            pass
        time.sleep(1.5)

def start_simulator():
    """Starts background simulator thread if not already running."""
    global _simulator_thread, _simulator_running
    if _simulator_running:
        return
    _simulator_running = True
    _simulator_thread = threading.Thread(target=_simulator_loop, daemon=True)
    _simulator_thread.start()

def stop_simulator():
    """Stops background simulator thread."""
    global _simulator_running
    _simulator_running = False

# Automatically start simulator on module load
start_simulator()