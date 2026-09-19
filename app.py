from __future__ import annotations

from pathlib import Path

from split_logic import classify_expense, compute_split

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"

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

    classification = classify_expense(text, group, payer or group[0])
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


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
