import unittest
from services.safety_services import analyze_safety, escalate_risk
from services.vehicle_service import (
    get_vehicle_data,
    set_vehicle_data,
    set_scenario,
    reset_vehicle_data
)
from services.health_service import calculate_vehicle_health
from services.alert_service import generate_alerts
from services.navigate_service import calculate_route

class TestPhase1CriticalBugs(unittest.TestCase):

    def setUp(self):
        reset_vehicle_data()

    def test_escalate_risk_order(self):
        self.assertEqual(escalate_risk("LOW", "MEDIUM"), "MEDIUM")
        self.assertEqual(escalate_risk("CRITICAL", "HIGH"), "CRITICAL")
        self.assertEqual(escalate_risk("CRITICAL", "LOW"), "CRITICAL")
        self.assertEqual(escalate_risk("HIGH", "CRITICAL"), "CRITICAL")

    def test_safety_critical_engine_and_low_tyre(self):
        # Engine critical (>=120) + low tyre (<25)
        # Should stay CRITICAL regardless of check order
        vehicle = {
            "speed": 60,
            "rpm": 2000,
            "engine_temperature": 125,
            "tyre_pressure": 20,
            "battery_voltage": 12.6
        }
        res = analyze_safety(vehicle)
        self.assertEqual(res["risk_level"], "CRITICAL")
        self.assertTrue(any("Engine" in r for r in res["risks"]))
        self.assertTrue(any("Tyre" in r for r in res["risks"]))

    def test_safety_single_fault_cases(self):
        # No faults = LOW
        res_normal = analyze_safety({
            "speed": 60, "engine_temperature": 90, "tyre_pressure": 32, "battery_voltage": 12.6
        })
        self.assertEqual(res_normal["risk_level"], "LOW")
        self.assertEqual(len(res_normal["risks"]), 0)

        # Single fault: overspeeding (>100) = HIGH
        res_speed = analyze_safety({
            "speed": 105, "engine_temperature": 90, "tyre_pressure": 32, "battery_voltage": 12.6
        })
        self.assertEqual(res_speed["risk_level"], "HIGH")

        # Single fault: low battery (<11.5) = HIGH
        res_battery = analyze_safety({
            "speed": 50, "engine_temperature": 90, "tyre_pressure": 32, "battery_voltage": 11.2
        })
        self.assertEqual(res_battery["risk_level"], "HIGH")

        # Single fault: engine temp >= 120 = CRITICAL
        res_temp = analyze_safety({
            "speed": 50, "engine_temperature": 122, "tyre_pressure": 32, "battery_voltage": 12.6
        })
        self.assertEqual(res_temp["risk_level"], "CRITICAL")

    def test_dynamic_telemetry_scenarios(self):
        # Baseline normal
        normal_data = get_vehicle_data()
        normal_health = calculate_vehicle_health(normal_data)
        normal_safety = analyze_safety(normal_data)
        normal_alerts = generate_alerts(normal_data, normal_health, normal_safety)

        self.assertEqual(normal_health["health_score"], 100)
        self.assertEqual(normal_health["overall_status"], "HEALTHY")
        self.assertEqual(normal_safety["risk_level"], "LOW")
        self.assertEqual(len(normal_alerts), 0)

        # Switch to overheating scenario
        set_scenario("overheating")
        overheat_data = get_vehicle_data()
        overheat_health = calculate_vehicle_health(overheat_data)
        overheat_safety = analyze_safety(overheat_data)
        overheat_alerts = generate_alerts(overheat_data, overheat_health, overheat_safety)

        self.assertLess(overheat_health["health_score"], 100)
        self.assertEqual(overheat_safety["risk_level"], "CRITICAL")
        self.assertGreater(len(overheat_alerts), 0)

        # Switch to low_tyre scenario
        set_scenario("low_tyre")
        tyre_data = get_vehicle_data()
        tyre_health = calculate_vehicle_health(tyre_data)
        tyre_safety = analyze_safety(tyre_data)
        tyre_alerts = generate_alerts(tyre_data, tyre_health, tyre_safety)

        self.assertLess(tyre_health["health_score"], 100)
        self.assertEqual(tyre_safety["risk_level"], "HIGH")
        self.assertGreater(len(tyre_alerts), 0)

    def test_navigation_varying_mock_and_unresolvable(self):
        # Varying destinations produce varying distances
        route_hosp = calculate_route("nearest hospital")
        self.assertEqual(route_hosp["status"], "SUCCESS")
        self.assertTrue(route_hosp.get("mock"))

        route_airport = calculate_route("international airport")
        self.assertEqual(route_airport["status"], "SUCCESS")
        self.assertNotEqual(route_hosp["distance_km"], route_airport["distance_km"])

        # Unresolvable destination returns destination not found error
        route_moon = calculate_route("the moon")
        self.assertEqual(route_moon["status"], "ERROR")
        self.assertIn("not found", route_moon["message"].lower())

        route_mars = calculate_route("navigate to mars")
        self.assertEqual(route_mars["status"], "ERROR")
        self.assertIn("not found", route_mars["message"].lower())

if __name__ == "__main__":
    unittest.main()
