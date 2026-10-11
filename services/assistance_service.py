import re

INTENT_RULES = {
    "NAVIGATION": {
        "phrases": [
            r"\bnearest hospital\b",
            r"\btake me to\b",
            r"\bgo to\b",
            r"\bget me to\b",
            r"\bdrive me to\b",
            r"\broute to\b",
            r"\bdirection to\b",
            r"\bdirections to\b",
            r"\bnavigate to\b",
            r"\bfood places nearby\b",
            r"\bplaces nearby\b",
            r"\bhealthy food\b",
            r"\bnearest gas station\b",
            r"\bnearest station\b"
        ],
        "words": [
            r"\bnavigate\b",
            r"\bnavigation\b",
            r"\broute\b",
            r"\broutes\b",
            r"\bdirection\b",
            r"\bdirections\b",
            r"\bdestination\b",
            r"\bnearby\b",
            r"\bmap\b",
            r"\bwhere is\b"
        ]
    },
    "SAFETY": {
        "phrases": [
            r"\bis my (?:car|vehicle) safe\b",
            r"\bis it safe to drive\b",
            r"\bsafety status\b",
            r"\bsafety risk\b",
            r"\brisk level\b"
        ],
        "words": [
            r"\bsafe\b",
            r"\bsafety\b",
            r"\brisk\b",
            r"\brisks\b",
            r"\bdanger\b",
            r"\bdangerous\b",
            r"\bhazard\b"
        ]
    },
    "ALERTS": {
        "phrases": [
            r"\bany alerts\b",
            r"\bactive alerts\b",
            r"\bany warnings\b",
            r"\bshow alerts\b",
            r"\bwhat are the alerts\b"
        ],
        "words": [
            r"\balert\b",
            r"\balerts\b",
            r"\bwarning\b",
            r"\bwarnings\b",
            r"\bproblem\b",
            r"\bproblems\b",
            r"\bmalfunction\b",
            r"\bissue\b",
            r"\bissues\b"
        ]
    },
    "VEHICLE_HEALTH": {
        "phrases": [
            r"\bvehicle health\b",
            r"\bcar health\b",
            r"\bhow is my vehicle\b",
            r"\bhow is my car\b",
            r"\bvehicle status\b",
            r"\bcar status\b",
            r"\bengine status\b",
            r"\bbattery status\b",
            r"\btyre status\b",
            r"\btire status\b"
        ],
        "words": [
            r"\bhealth\b",
            r"\bcondition\b",
            r"\bstatus\b",
            r"\bdiagnostics\b",
            r"\btelemetry\b",
            r"\bengine\b",
            r"\bbattery\b",
            r"\btyre\b",
            r"\btire\b",
            r"\bmileage\b",
            r"\brpm\b"
        ]
    }
}

def detect_intent(message):
    """
    Detects user intent by computing weighted scores across intents.
    Uses whole-word and phrase matching rather than substrings.
    """
    if not isinstance(message, str):
        return "GENERAL"

    text = message.lower().strip()
    if not text:
        return "GENERAL"

    scores = {}

    for intent, patterns in INTENT_RULES.items():
        score = 0
        for phrase_pat in patterns.get("phrases", []):
            matches = len(re.findall(phrase_pat, text))
            score += matches * 3  # Higher weight for specific phrases

        for word_pat in patterns.get("words", []):
            matches = len(re.findall(word_pat, text))
            score += matches * 1  # Base weight for individual keywords

        scores[intent] = score

    max_score = max(scores.values()) if scores else 0
    if max_score <= 0:
        return "GENERAL"

    top_intents = [intent for intent, sc in scores.items() if sc == max_score]

    if len(top_intents) > 1:
        return "CLARIFICATION"

    return top_intents[0]

def extract_destination(message):
    """Extracts target destination from navigation query text."""
    if not isinstance(message, str):
        return ""

    message = message.strip()
    prefixes = [
        "take me to ",
        "go to ",
        "get me to ",
        "drive me to ",
        "navigate to ",
        "route to ",
        "directions to ",
        "direction to "
    ]

    message_lower = message.lower()
    for prefix in prefixes:
        if message_lower.startswith(prefix):
            return message[len(prefix):].strip(" ?.!;")

    cleaned = re.sub(
        r"(?i)\b(take me|go to|get me to|drive me|navigate to|route to|directions to|direction to)\b",
        "",
        message
    ).strip(" ?.!;")

    return cleaned or message

def generate_response(
    intent,
    health=None,
    safety=None,
    alerts=None,
    navigation=None
):
    health = health or {"health_score": 100, "overall_status": "HEALTHY", "warnings": []}
    safety = safety or {"risk_level": "LOW", "risks": []}
    alerts = alerts or []

    if intent == "VEHICLE_HEALTH":
        score = health.get("health_score", 100)
        status = health.get("overall_status", "HEALTHY")
        warnings = health.get("warnings", [])

        if warnings:
            warn_str = ", ".join(warnings)
            return (
                f"Your vehicle health is {status.lower()} "
                f"with a score of {score}%. {warn_str}"
            )

        return (
            f"Your vehicle is {status.lower()} "
            f"with a health score of {score}%."
        )

    if intent == "SAFETY":
        risks = safety.get("risks", [])
        risk_level = safety.get("risk_level", "LOW")
        if risks:
            risk_str = ", ".join(risks)
            return (
                f"Current safety risk is "
                f"{risk_level.lower()}. {risk_str}"
            )

        return "Your vehicle is currently operating safely."

    if intent == "ALERTS":
        if alerts:
            messages = ", ".join(
                alert.get("message", "") for alert in alerts
            )
            return (
                f"There are {len(alerts)} active alerts. "
                f"{messages}"
            )

        return "There are currently no active alerts."

    if intent == "NAVIGATION":
        if navigation:
            if navigation.get("status") == "ERROR":
                return navigation.get("message", "Unable to calculate route.")
            return (
                f"Route to {navigation.get('destination', 'destination')} "
                f"is {navigation.get('distance_km', 0)} km "
                f"and will take approximately "
                f"{navigation.get('estimated_time_minutes', 0)} minutes."
            )

        return "Please provide a destination."

    if intent == "CLARIFICATION":
        return (
            "I could not determine your specific request with certainty. "
            "Could you clarify if you want navigation, vehicle health, safety status, or alerts?"
        )

    return (
        "I can help with vehicle health, safety, "
        "alerts, and navigation."
    )
