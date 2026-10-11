import copy

DEFAULT_VEHICLE_DATA = {
    "speed": 68,
    "rpm": 2180,
    "engine_temperature": 89,
    "battery_voltage": 12.6,
    "tyre_pressure": 32,
    "fuel_level": 75
}

SCENARIOS = {
    "normal": {
        "speed": 68,
        "rpm": 2180,
        "engine_temperature": 89,
        "battery_voltage": 12.6,
        "tyre_pressure": 32,
        "fuel_level": 75
    },
    "overheating": {
        "speed": 65,
        "rpm": 2200,
        "engine_temperature": 124,
        "battery_voltage": 12.4,
        "tyre_pressure": 32,
        "fuel_level": 60
    },
    "low_tyre": {
        "speed": 55,
        "rpm": 1900,
        "engine_temperature": 90,
        "battery_voltage": 12.5,
        "tyre_pressure": 22,
        "fuel_level": 70
    },
    "low_battery": {
        "speed": 40,
        "rpm": 1500,
        "engine_temperature": 88,
        "battery_voltage": 11.2,
        "tyre_pressure": 32,
        "fuel_level": 50
    },
    "overspeeding": {
        "speed": 115,
        "rpm": 3600,
        "engine_temperature": 96,
        "battery_voltage": 12.6,
        "tyre_pressure": 32,
        "fuel_level": 65
    },
    "critical_compound": {
        "speed": 105,
        "rpm": 3400,
        "engine_temperature": 125,
        "battery_voltage": 11.1,
        "tyre_pressure": 21,
        "fuel_level": 15
    }
}

_current_vehicle_data = copy.deepcopy(DEFAULT_VEHICLE_DATA)

def get_vehicle_data():
    """Returns a copy of the current vehicle telemetry data."""
    return copy.deepcopy(_current_vehicle_data)

def set_vehicle_data(new_data):
    """Updates vehicle telemetry with provided dictionary values."""
    global _current_vehicle_data
    if isinstance(new_data, dict):
        _current_vehicle_data.update(new_data)
    return get_vehicle_data()

def set_scenario(scenario_name):
    """Switches vehicle data to a predefined telemetry scenario."""
    global _current_vehicle_data
    if scenario_name in SCENARIOS:
        _current_vehicle_data = copy.deepcopy(SCENARIOS[scenario_name])
        return True
    return False

def reset_vehicle_data():
    """Resets vehicle telemetry back to baseline default values."""
    global _current_vehicle_data
    _current_vehicle_data = copy.deepcopy(DEFAULT_VEHICLE_DATA)
    return get_vehicle_data()