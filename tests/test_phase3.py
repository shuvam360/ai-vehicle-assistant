import os
import unittest
import tempfile
from app import app
from services import db_service

class TestPhase3LowIssues(unittest.TestCase):

    def setUp(self):
        self.db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        os.environ["SQLITE_DB_PATH"] = self.temp_db_path
        db_service.init_db(self.temp_db_path)
        self.client = app.test_client()

    def tearDown(self):
        os.close(self.db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)
        os.environ.pop("API_KEY", None)

    def test_assistance_renamed_import(self):
        from services.assistance_service import detect_intent
        self.assertEqual(detect_intent("How is my car?"), "VEHICLE_HEALTH")

    def test_health_check_endpoint(self):
        # /health is always accessible without auth
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["status"], "UP")

    def test_api_key_authentication_fail_closed(self):
        # 1. When API_KEY is NOT configured in environment, fail-closed rejects /api
        os.environ.pop("API_KEY", None)
        resp_no_env = self.client.get("/api/vehicle/status")
        self.assertEqual(resp_no_env.status_code, 401)
        self.assertEqual(resp_no_env.get_json()["error"], "Unauthorized")

        # 2. When API_KEY is configured
        os.environ["API_KEY"] = "super-secret-key"

        # /health still bypasses auth
        resp_health = self.client.get("/health")
        self.assertEqual(resp_health.status_code, 200)

        # /api endpoint without key -> 401
        resp_unauth = self.client.get("/api/vehicle/status")
        self.assertEqual(resp_unauth.status_code, 401)

        # /api endpoint with wrong key -> 401
        resp_wrong = self.client.get(
            "/api/vehicle/status",
            headers={"X-API-Key": "wrong-key"}
        )
        self.assertEqual(resp_wrong.status_code, 401)

        # /api endpoint with correct key -> 200
        resp_auth = self.client.get(
            "/api/vehicle/status",
            headers={"X-API-Key": "super-secret-key"}
        )
        self.assertEqual(resp_auth.status_code, 200)

    def test_unknown_route_returns_404_json(self):
        # HTTPException handler returns structured JSON on 404
        resp = self.client.get("/api/some-nonexistent-endpoint")
        # In fail-closed, auth check happens first or 404
        os.environ["API_KEY"] = "super-secret-key"
        resp_404 = self.client.get(
            "/api/some-nonexistent-endpoint",
            headers={"X-API-Key": "super-secret-key"}
        )
        self.assertEqual(resp_404.status_code, 404)
        self.assertEqual(resp_404.get_json()["error"], "Not Found")

    def test_sqlite_persistence_and_audit(self):
        os.environ["API_KEY"] = "super-secret-key"
        resp = self.client.post(
            "/api/assistant/query",
            json={"message": "Is my car safe?"},
            headers={"X-API-Key": "super-secret-key"}
        )
        self.assertEqual(resp.status_code, 200)

        # Verify DB recorded the request
        requests = db_service.get_recent_requests(limit=5, db_path=self.temp_db_path)
        self.assertGreater(len(requests), 0)
        latest_req = requests[0]
        self.assertEqual(latest_req["endpoint"], "/api/assistant/query")
        self.assertEqual(latest_req["intent"], "SAFETY")
        self.assertIn("request_id", latest_req)

if __name__ == "__main__":
    unittest.main()
