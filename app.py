import os
import uuid
import logging
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from services.safety_services import analyze_safety
from services.alert_service import generate_alerts
from services.assistance_service import (
    detect_intent,
    generate_response,
    extract_destination
)
from services.navigate_service import calculate_route
from services.vehicle_service import get_vehicle_data
from services.health_service import calculate_vehicle_health
from services.db_service import init_db, record_request, record_alerts

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [ReqID: %(request_id)s] %(message)s"
)
logger = logging.getLogger("vehicle_assistant")

app = Flask(__name__)

# Initialize SQLite persistence
init_db()

# Configure CORS with allowed origins from environment variable
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "")
if allowed_origins_env.strip():
    allowed_origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]
else:
    # Default restricted origins for development
    allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

CORS(app, resources={r"/*": {"origins": allowed_origins}})

# Context filter to automatically inject request_id into log records
class RequestIdLogFilter(logging.Filter):
    def filter(self, record):
        record.request_id = getattr(g, "request_id", "SYSTEM")
        return True

logger.addFilter(RequestIdLogFilter())

@app.before_request
def before_request_hook():
    """Generates request_id, sets up tracing, and handles API Key authentication."""
    g.request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]

    # Preflight OPTIONS requests don't require API key
    if request.method == "OPTIONS":
        return

    # Public unauthenticated routes (health check & root status)
    if request.path in ["/", "/health", "/api/health"]:
        return

    # Authenticate /api routes (fail-closed: require API_KEY in env and valid header)
    if request.path.startswith("/api"):
        expected_api_key = os.environ.get("API_KEY")
        provided_key = request.headers.get("X-API-Key")
        if not expected_api_key or not provided_key or provided_key != expected_api_key:
            logger.warning(f"Unauthorized access attempt to {request.path}")
            return jsonify({
                "error": "Unauthorized",
                "message": "Invalid or missing X-API-Key header."
            }), 401

@app.route("/")
def home():
    return jsonify({
        "message": "AI Vehicle Assistant Backend is running"
    })

@app.route("/health")
@app.route("/api/health")
def health_status():
    """Unauthenticated health endpoint."""
    return jsonify({
        "status": "UP",
        "message": "AI Vehicle Assistant is healthy and operational."
    })

@app.route("/api/safety/status")
def safety_status():
    vehicle = get_vehicle_data()
    safety = analyze_safety(vehicle)

    record_request(
        g.request_id,
        "/api/safety/status",
        request.method,
        risk_level=safety.get("risk_level")
    )

    return jsonify({
        "vehicle": vehicle,
        "safety": safety
    })

@app.route("/api/alerts")
def alerts():
    vehicle = get_vehicle_data()
    health = calculate_vehicle_health(vehicle)
    safety = analyze_safety(vehicle)

    alerts_list = generate_alerts(vehicle, health, safety)

    record_request(
        g.request_id,
        "/api/alerts",
        request.method,
        risk_level=safety.get("risk_level")
    )
    record_alerts(g.request_id, alerts_list)

    return jsonify({
        "alerts": alerts_list
    })

@app.route("/api/vehicle/status")
def vehicle_status():
    vehicle = get_vehicle_data()

    record_request(g.request_id, "/api/vehicle/status", request.method)

    return jsonify(vehicle)

@app.route("/api/vehicle/health")
def vehicle_health():
    vehicle = get_vehicle_data()
    health = calculate_vehicle_health(vehicle)

    record_request(g.request_id, "/api/vehicle/health", request.method)

    return jsonify({
        "vehicle": vehicle,
        "health": health
    })

@app.route("/api/assistant/query", methods=["POST"])
def assistant_query():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({
            "error": "Invalid or missing JSON body"
        }), 400

    message = data.get("message", "")
    if not message or not isinstance(message, str) or not message.strip():
        return jsonify({
            "error": "Message is required"
        }), 400

    intent = detect_intent(message)

    vehicle = get_vehicle_data()
    health = calculate_vehicle_health(vehicle)
    safety = analyze_safety(vehicle)
    alerts_list = generate_alerts(vehicle, health, safety)

    navigation = None
    if intent == "NAVIGATION":
        destination = extract_destination(message)
        navigation = calculate_route(destination)

    response = generate_response(
        intent,
        health,
        safety,
        alerts_list,
        navigation
    )

    logger.info(
        f"Query='{message}' | Intent={intent} | Risk={safety.get('risk_level')} | Alerts={len(alerts_list)}"
    )

    record_request(
        g.request_id,
        "/api/assistant/query",
        request.method,
        intent=intent,
        risk_level=safety.get("risk_level"),
        message=message
    )
    record_alerts(g.request_id, alerts_list)

    return jsonify({
        "intent": intent,
        "response": response
    })

@app.route("/api/navigation/route", methods=["POST"])
def navigation_route():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({
            "status": "ERROR",
            "error": "Invalid or missing JSON body"
        }), 400

    destination = data.get("destination")
    if not destination or not isinstance(destination, str) or not destination.strip():
        return jsonify({
            "status": "ERROR",
            "error": "Field 'destination' is required and cannot be empty"
        }), 400

    result = calculate_route(destination)

    record_request(
        g.request_id,
        "/api/navigation/route",
        request.method,
        intent="NAVIGATION",
        message=destination
    )

    if result.get("status") == "ERROR":
        return jsonify(result), 400

    return jsonify(result)

@app.errorhandler(HTTPException)
def handle_http_exception(e):
    return jsonify({
        "error": e.name,
        "message": e.description
    }), e.code

@app.errorhandler(Exception)
def unhandled_exception(e):
    logger.exception(f"Unhandled Exception: {e}")
    return jsonify({
        "error": "Internal Server Error",
        "message": "An unexpected server error occurred."
    }), 500

if __name__ == "__main__":
    flask_debug = os.environ.get("FLASK_DEBUG", "false").lower() in ("true", "1", "yes")
    app.run(debug=flask_debug)