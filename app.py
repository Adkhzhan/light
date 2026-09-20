from __future__ import annotations

import re
from pathlib import Path

from split_logic import classify_expense, compute_split
from nemotron_client import (
    analyze_financial_goal_with_nemotron,
    analyze_trip_with_nemotron,
    classify_expense_with_nemotron,
)
    
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
DEFAULT_GROUP = ["Alex", "Sam", "Priya", "Leo"]

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")


def _read_group_values() -> list[str]:
    groups = request.args.getlist("group") + request.form.getlist("group")
    if not groups:
        return []

    parsed: list[str] = []
    for value in groups:
        parsed.extend(part.strip() for part in value.split(",") if part.strip())
    return parsed


def _infer_payer(text: str, group: list[str], default: str) -> str:
    lowered = text.lower()
    for person in group:
        name = re.escape(person.lower())
        if re.search(rf"{name}\s+(?:paid|covered|bought)", lowered) or re.search(rf"paid\s+by\s+{name}", lowered):
            return person
    return default


@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/favicon.ico")
def favicon():
    return "", 204


@app.route("/classify", methods=["GET", "POST"])
def classify_endpoint():
    text = request.args.get("text") or request.form.get("text") or ""
    payer = request.args.get("payer") or request.form.get("payer") or ""
    group = _read_group_values()

    if not group:
        return jsonify({"error": "At least one group member is required."}), 400

    payer = _infer_payer(text, group, payer or group[0])
    heuristic_classification = classify_expense(text, group, payer)
    try:
        classification = classify_expense_with_nemotron(text, group, payer)
        if "raw_response" in classification:
            raise ValueError("Nemotron returned an invalid expense classification")
    except Exception:
        classification = heuristic_classification

    excluded = set(heuristic_classification["participants_excluded"])
    excluded.update(name for name in classification.get("participants_excluded", []) if name in group)
    included = [name for name in group if name not in excluded]
    if payer not in included and payer not in excluded:
        included.insert(0, payer)
    classification["participants_excluded"] = [name for name in group if name in excluded]
    classification["participants_included"] = included
    classification["payer"] = payer
    classification["split_hint"] = "exclude_named" if excluded else classification.get("split_hint", "equal")
    classification.setdefault("summary", f"{classification.get('category', 'misc').capitalize()} expense")
    return jsonify(classification)


@app.route("/split", methods=["GET", "POST"])
def split_endpoint():
    split_hint = request.args.get("split_hint") or request.form.get("split_hint") or "equal"
    group = _read_group_values()
    amount_raw = request.args.get("amount") or request.form.get("amount") or "0"

    if not group:
        return jsonify({"error": "At least one group member is required."}), 400

    try:
        amount = float(amount_raw)
    except ValueError:
        return jsonify({"error": "Amount must be numeric."}), 400

    split = compute_split(amount=amount, group=group, split_hint=split_hint)
    return jsonify(split)


@app.route("/expense-analysis", methods=["GET", "POST"])
def expense_analysis_endpoint():
    text = request.args.get("text") or request.form.get("text") or ""
    if not text.strip():
        return jsonify({"error": "An expense description is required."}), 400

    group = DEFAULT_GROUP
    payer = _infer_payer(text, group, group[0])
    heuristic_classification = classify_expense(text, group, payer)
    source = "Nemotron"
    try:
        classification = classify_expense_with_nemotron(text, group, payer)
        if "raw_response" in classification:
            raise ValueError("Nemotron returned an invalid expense classification")
    except Exception:
        classification = heuristic_classification
        source = "Rule fallback"

    amount_match = re.search(r"(?:\$|amount\s*[:=]?\s*)?(\d+(?:\.\d{1,2})?)", text, re.IGNORECASE)
    if not amount_match:
        return jsonify({"error": "Include the expense amount in the description, for example: dinner was $84."}), 400

    amount = float(amount_match.group(1))
    excluded = set(heuristic_classification["participants_excluded"])
    excluded.update(name for name in classification.get("participants_excluded", []) if name in group)
    included = [name for name in group if name not in excluded]
    classification["participants_excluded"] = [name for name in group if name in excluded]
    classification["participants_included"] = included
    classification["payer"] = payer
    classification["split_hint"] = "exclude_named" if excluded else classification.get("split_hint", "equal")
    classification.setdefault("summary", f"{classification.get('category', 'misc').capitalize()} expense")
    split = compute_split(amount, included, classification["split_hint"])
    split["paid_by"] = payer
    split["already_paid"] = split["breakdown"].get(payer, 0)
    split["paid_total"] = amount
    return jsonify({"amount": amount, "classification": classification, "split": split, "source": source})


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})


def _goal_analysis(goal_text: str, currency: str, group: list[str], analyzer) -> tuple[dict, int] | dict:
    if not goal_text.strip() or not group:
        return jsonify({"error": "A financial goal and at least one contributor are required."}), 400

    try:
        analysis = analyzer(goal_text.strip(), group, currency.upper())
    except Exception as exc:
        error_message = str(exc)
        if "Function" in error_message and "not found for account" in error_message:
            error_message = "NVIDIA_API_KEY is loaded, but this NVIDIA account is not provisioned for chat inference. Generate a new NVIDIA API key and restart the app."
        return jsonify({"error": error_message, "source": "Nemotron unavailable"}), 503

    return {**analysis, "source": "Nemotron"}


@app.route("/goal-analysis", methods=["GET", "POST"])
def goal_analysis_endpoint():
    goal_text = request.args.get("goal") or request.form.get("goal") or ""
    currency = request.args.get("currency") or request.form.get("currency") or "USD"
    group = _read_group_values()
    return _goal_analysis(goal_text, currency, group, analyze_financial_goal_with_nemotron)


@app.route("/trip-analysis", methods=["GET", "POST"])
def trip_analysis_endpoint():
    trip_text = request.args.get("trip") or request.form.get("trip") or ""
    currency = request.args.get("currency") or request.form.get("currency") or "USD"
    group = _read_group_values()
    return _goal_analysis(trip_text, currency, group, analyze_trip_with_nemotron)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
