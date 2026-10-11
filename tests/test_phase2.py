import os
import unittest
from services.assistance_service import detect_intent
from services.health_service import calculate_vehicle_health
from services.safety_services import analyze_safety
from services.alert_service import generate_alerts
from app import app

class TestPhase2MediumIssues(unittest.TestCase):

    def setUp(self):
        os.environ["API_KEY"] = "test-phase2-key"
        self.headers = {"X-API-Key": "test-phase2-key"}
        self.client = app.test_client()

    def tearDown(self):
        os.environ.pop("API_KEY", None)

    def test_intent_matching_and_scoring(self):
        # Crucial test specified by requirements:
        # "healthy food places nearby" should be NAVIGATION, NOT VEHICLE_HEALTH
        intent = detect_intent("healthy food places nearby")
        self.assertEqual(intent, "NAVIGATION")

        # Standard tests
        self.assertEqual(detect_intent("How is my car health?"), "VEHICLE_HEALTH")
        self.assertEqual(detect_intent("Is my vehicle safe to drive?"), "SAFETY")
        self.assertEqual(detect_intent("Are there any active warning alerts?"), "ALERTS")
        self.assertEqual(detect_intent("Take me to the airport"), "NAVIGATION")

        # Fallback / General
        self.assertEqual(detect_intent("Hello, what is the weather today?"), "GENERAL")
        self.assertEqual(detect_intent(""), "GENERAL")

    def test_services_missing_keys_resilience(self):
        # Empty dict should not raise KeyError
        health = calculate_vehicle_health({})
        self.assertIn("health_score", health)
        self.assertEqual(health["health_score"], 100)

        safety = analyze_safety({})
        self.assertIn("risk_level", safety)
        self.assertEqual(safety["risk_level"], "LOW")

        alerts = generate_alerts({}, health, safety)
        self.assertIsInstance(alerts, list)

    def test_navigation_route_malformed_requests(self):
        # Missing body / not JSON
        resp1 = self.client.post(
            "/api/navigation/route",
            data="not json",
            content_type="text/plain",
            headers=self.headers
        )
        self.assertEqual(resp1.status_code, 400)
        json1 = resp1.get_json()
        self.assertEqual(json1.get("status"), "ERROR")

        # Missing destination field
        resp2 = self.client.post(
            "/api/navigation/route",
            json={"other_field": 123},
            headers=self.headers
        )
        self.assertEqual(resp2.status_code, 400)
        json2 = resp2.get_json()
        self.assertEqual(json2.get("status"), "ERROR")

        # Empty destination string
        resp3 = self.client.post(
            "/api/navigation/route",
            json={"destination": "   "},
            headers=self.headers
        )
        self.assertEqual(resp3.status_code, 400)
        json3 = resp3.get_json()
        self.assertEqual(json3.get("status"), "ERROR")

    def test_assistant_query_malformed_requests(self):
        # Non-JSON body
        resp = self.client.post(
            "/api/assistant/query",
            data="invalid",
            content_type="text/plain",
            headers=self.headers
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("error", resp.get_json())

        # Missing message
        resp_empty = self.client.post(
            "/api/assistant/query",
            json={"message": ""},
            headers=self.headers
        )
        self.assertEqual(resp_empty.status_code, 400)
        self.assertIn("error", resp_empty.get_json())

if __name__ == "__main__":
    unittest.main()
