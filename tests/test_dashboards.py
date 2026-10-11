import os
import unittest
import tempfile
from app import app
from services import db_service, vehicle_service, alert_service
from services.assistance_service import detect_intent

class TestDashboardsAndExtensions(unittest.TestCase):

    def setUp(self):
        self.db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        os.environ["SQLITE_DB_PATH"] = self.temp_db_path
        os.environ["API_KEY"] = "test-dashboard-key"
        self.headers = {"X-API-Key": "test-dashboard-key"}
        db_service.init_db(self.temp_db_path)
        vehicle_service.reset_vehicle_data()
        alert_service.clear_all_alerts()
        self.client = app.test_client()

    def tearDown(self):
        os.close(self.db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)
        os.environ.pop("API_KEY", None)
        os.environ.pop("DEMO_MODE", None)
        vehicle_service.reset_vehicle_data()
        alert_service.clear_all_alerts()

    def test_simulator_scenarios_and_demo_mode_guard(self):
        # 1. When DEMO_MODE is not 1, POST /api/demo/scenario returns 403 Forbidden
        os.environ.pop("DEMO_MODE", None)
        resp_blocked = self.client.post(
            "/api/demo/scenario",
            json={"scenario": "overheating"},
            headers=self.headers
        )
        self.assertEqual(resp_blocked.status_code, 403)
        self.assertEqual(resp_blocked.get_json()["error"], "Forbidden")

        # 2. When DEMO_MODE=1, POST /api/demo/scenario succeeds
        os.environ["DEMO_MODE"] = "1"
        resp_ok = self.client.post(
            "/api/demo/scenario",
            json={"scenario": "overheating"},
            headers=self.headers
        )
        self.assertEqual(resp_ok.status_code, 200)
        self.assertEqual(resp_ok.get_json()["scenario"], "overheating")
        self.assertGreaterEqual(resp_ok.get_json()["vehicle"]["engine_temp"], 120)

        # 3. Collision scenario triggers collision event and updates telemetry
        resp_coll = self.client.post(
            "/api/demo/scenario",
            json={"scenario": "collision"},
            headers=self.headers
        )
        self.assertEqual(resp_coll.status_code, 200)
        v_data = resp_coll.get_json()["vehicle"]
        self.assertTrue(v_data["collision_detected"])

        # Verify event was recorded in DB
        events = db_service.get_recent_vehicle_events(limit=5, db_path=self.temp_db_path)
        self.assertGreater(len(events), 0)
        event_types = [e["event_type"] for e in events]
        self.assertIn("collision", event_types)

    def test_vehicle_health_endpoint_components_and_metrics(self):
        resp = self.client.get("/api/vehicle/health", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()

        # Check overall score
        self.assertIn("overall_score", data)
        self.assertIsInstance(data["overall_score"], (int, float))

        # Check component scores (engine, battery, brakes, tyres)
        components = data.get("components", {})
        self.assertIn("engine", components)
        self.assertIn("battery", components)
        self.assertIn("brakes", components)
        self.assertIn("tyres", components)

        for comp_name in ["engine", "battery", "brakes", "tyres"]:
            comp = components[comp_name]
            self.assertIn("score", comp)
            self.assertIn("status", comp)
            self.assertIn(comp["status"], ["green", "yellow", "red"])

        # Check raw metrics
        metrics = data.get("metrics", {})
        self.assertIn("engine_temp", metrics)
        self.assertIn("rpm", metrics)
        self.assertIn("battery_voltage", metrics)
        self.assertIn("speed", metrics)
        self.assertIn("fuel_level", metrics)
        self.assertIn("tyre_pressure", metrics)
        self.assertIn("brake_condition", metrics)
        self.assertIn("engine_vibration", metrics)

        # 4 tyres present
        tyres = metrics["tyre_pressure"]
        self.assertIsInstance(tyres, dict)
        self.assertIn("front_left", tyres)
        self.assertIn("front_right", tyres)
        self.assertIn("rear_left", tyres)
        self.assertIn("rear_right", tyres)

    def test_safety_endpoint_flags_and_events(self):
        # Insert test event with past timestamp
        db_service.record_vehicle_event("overspeeding", "Vehicle clocked at 115 km/h", db_path=self.temp_db_path)

        resp = self.client.get("/api/safety", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()

        # Risk level
        self.assertIn("risk_level", data)
        self.assertIn(data["risk_level"], ["LOW", "MEDIUM", "HIGH", "CRITICAL"])

        # Flags list with positive checks when normal
        flags = data.get("flags", [])
        self.assertIsInstance(flags, list)
        self.assertIn("No collision detected", flags)
        self.assertIn("Driver behaviour normal", flags)

        # Events list with seconds_ago
        events = data.get("events", [])
        self.assertIsInstance(events, list)
        self.assertGreater(len(events), 0)
        self.assertIn("seconds_ago", events[0])
        self.assertGreaterEqual(events[0]["seconds_ago"], 0.0)

    def test_alerts_lifecycle_deduplication_and_clearing(self):
        os.environ["DEMO_MODE"] = "1"

        # 1. Trigger low tyre scenario
        self.client.post("/api/demo/scenario", json={"scenario": "low_tyre"}, headers=self.headers)
        resp1 = self.client.get("/api/alerts", headers=self.headers)
        self.assertEqual(resp1.status_code, 200)
        alerts1 = resp1.get_json().get("alerts", [])
        self.assertGreater(len(alerts1), 0)

        tyre_alert = next((a for a in alerts1 if "TYRE" in a["id"]), None)
        self.assertIsNotNone(tyre_alert)
        self.assertIn("Tyre pressure", tyre_alert["message"])
        self.assertIn("severity", tyre_alert)
        self.assertIn("created_at", tyre_alert)

        # 2. Trigger overheating scenario (engine temp critically high)
        self.client.post("/api/demo/scenario", json={"scenario": "overheating"}, headers=self.headers)
        resp2 = self.client.get("/api/alerts", headers=self.headers)
        alerts2 = resp2.get_json().get("alerts", [])
        engine_alert = next((a for a in alerts2 if "ENGINE" in a["id"]), None)
        self.assertIsNotNone(engine_alert)
        self.assertEqual(engine_alert["severity"], "CRITICAL")
        self.assertIn("Please stop safely", engine_alert["message"])

        # 3. Collision scenario (possible collision emergency alert)
        self.client.post("/api/demo/scenario", json={"scenario": "collision"}, headers=self.headers)
        resp3 = self.client.get("/api/alerts", headers=self.headers)
        alerts3 = resp3.get_json().get("alerts", [])
        collision_alert = next((a for a in alerts3 if "COLLISION" in a["id"]), None)
        self.assertIsNotNone(collision_alert)
        self.assertEqual(collision_alert["severity"], "EMERGENCY")
        self.assertEqual(collision_alert["message"], "Possible collision detected. Are you okay?")

        # 4. Return to normal scenario -> alerts must clear!
        self.client.post("/api/demo/scenario", json={"scenario": "normal"}, headers=self.headers)
        resp_cleared = self.client.get("/api/alerts", headers=self.headers)
        cleared_alerts = resp_cleared.get_json().get("alerts", [])
        self.assertEqual(len(cleared_alerts), 0)

    def test_navigation_route_with_primary_and_alternatives(self):
        # 1. Place-type search for nearest hospital
        resp = self.client.post(
            "/api/navigation/route",
            json={"destination": "nearest hospital"},
            headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()

        self.assertEqual(data["status"], "SUCCESS")
        self.assertIn("primary", data)
        self.assertIn("alternatives", data)
        self.assertIn("traffic", data)
        self.assertIn("start_coordinates", data)
        self.assertIn("end_coordinates", data)

        # Check Kolkata start coordinates
        start = data["start_coordinates"]
        self.assertEqual(round(start[0], 2), 88.36)
        self.assertEqual(round(start[1], 2), 22.57)

        # Check primary route details
        primary = data["primary"]
        self.assertIn("distance_km", primary)
        self.assertIn("duration_min", primary)
        self.assertIn("geometry", primary)
        self.assertIsInstance(primary["geometry"], list)
        self.assertGreater(len(primary["geometry"]), 1)

        # Check alternatives
        alts = data["alternatives"]
        self.assertIsInstance(alts, list)

    def test_assistant_risk_analysis_intent_and_tts_response(self):
        # Intent detection checks
        intent1 = detect_intent("is it safe to drive?")
        self.assertEqual(intent1, "RISK_ANALYSIS")

        intent2 = detect_intent("any risks?")
        self.assertEqual(intent2, "RISK_ANALYSIS")

        intent3 = detect_intent("what are the risks right now?")
        self.assertEqual(intent3, "RISK_ANALYSIS")

        # POST /api/assistant/query endpoint verification
        resp = self.client.post(
            "/api/assistant/query",
            json={"message": "is it safe to drive?"},
            headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        res_data = resp.get_json()

        self.assertEqual(res_data["intent"], "RISK_ANALYSIS")
        self.assertIsInstance(res_data["response"], str)
        # Verify response text is suitable for text-to-speech (fluent prose without code/JSON)
        self.assertIn("risk level is low", res_data["response"].lower())
        self.assertIn("safe to drive", res_data["response"].lower())

if __name__ == "__main__":
    unittest.main()
