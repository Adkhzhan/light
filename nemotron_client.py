from __future__ import annotations

import json
import os
import re
import time
from copy import deepcopy
from calendar import monthrange
from datetime import date
from pathlib import Path
from typing import Any, Dict, Optional

import requests


NEMOTRON_MODEL_CANDIDATES = [
    "nvidia/nemotron-nano-3-30b-a3b",
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
]
TRIP_ANALYSIS_CACHE: dict[tuple[str, tuple[str, ...], str], Dict[str, Any]] = {}


def get_nvidia_settings() -> Dict[str, str]:
    api_key = os.getenv("NVIDIA_API_KEY", "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")
    base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    model = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3-super-120b-a12b")

    if not api_key:
        secrets_path = Path(__file__).resolve().parent / ".streamlit" / "secrets.toml"
        if secrets_path.exists():
            try:
                try:
                    import tomllib
                except ModuleNotFoundError:
                    import tomli as tomllib

                with secrets_path.open("rb") as handle:
                    raw_secrets = tomllib.load(handle)
                api_key = str(raw_secrets.get("NVIDIA_API_KEY", ""))
                base_url = str(raw_secrets.get("NVIDIA_BASE_URL", base_url))
                model = str(raw_secrets.get("NVIDIA_MODEL", model))
            except Exception:
                pass

    return {
        "api_key": api_key,
        "base_url": base_url,
        "model": model,
    }


def _extract_json_from_text(text: str) -> Dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    # Nemotron can occasionally add a short preface or trailing note despite the
    # JSON-only instruction. Decode the first complete object in that response.
    decoder = json.JSONDecoder()
    for index, character in enumerate(cleaned):
        if character != "{":
            continue
        try:
            parsed, _ = decoder.raw_decode(cleaned[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed

    raise json.JSONDecodeError("No JSON object found in model response", cleaned, 0)


def _call_nemotron_once(
    messages: list[dict[str, str]],
    model_name: str,
    api_key: str,
    base_url: str,
    max_tokens: int,
) -> Dict[str, Any]:
    messages = [dict(message) for message in messages]

    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": 0.3,
        "top_p": 0.95,
        "max_tokens": max_tokens,
        "seed": 42,
        "chat_template_kwargs": {"enable_thinking": False},
    }

    response = requests.post(url, headers=headers, json=payload, timeout=60)
    if response.status_code == 503:
        time.sleep(1)
        response = requests.post(url, headers=headers, json=payload, timeout=60)
    if not response.ok:
        print(f"NVIDIA API error for {model_name} {response.status_code}: {response.text}")
    response.raise_for_status()
    data = response.json()

    content = data["choices"][0]["message"]["content"]
    try:
        return _extract_json_from_text(content)
    except json.JSONDecodeError:
        return {"raw_response": content}


def call_nemotron(messages: list[dict[str, str]], model: Optional[str] = None, max_tokens: int = 400) -> Dict[str, Any]:
    settings = get_nvidia_settings()
    api_key = settings["api_key"]
    base_url = settings["base_url"]

    if not api_key:
        raise ValueError("Missing NVIDIA_API_KEY. Add it to .streamlit/secrets.toml")

    candidates = [model] if model else [
        candidate
        for candidate in [settings["model"], *NEMOTRON_MODEL_CANDIDATES]
        if candidate
    ]
    candidates = list(dict.fromkeys(candidates))
    last_error: Optional[requests.exceptions.HTTPError] = None

    for candidate in candidates:
        try:
            return _call_nemotron_once(messages, candidate, api_key, base_url, max_tokens)
        except requests.exceptions.HTTPError as exc:
            if exc.response is not None and exc.response.status_code in (404, 410):
                last_error = exc
                continue
            raise

    if last_error is not None:
        raise last_error
    raise RuntimeError("No Nemotron model candidates configured")


def classify_expense_with_nemotron(expense_text: str, group: list[str], payer: str) -> Dict[str, Any]:
    prompt = f"""
Classify this shared expense and decide exactly who should split it.

Group members: {', '.join(group)}
Payer: {payer}
Expense: {expense_text}

Return JSON only:
{{
    "summary": "short description of where the expense went, such as Dinner at Nonna's or Food expense",
    "payer": "exact payer name from the group",
  "category": "food | transport | lodging | misc",
  "amount_confidence": "high | medium | low",
  "participants_included": ["exact names from the group"],
  "participants_excluded": ["exact names from the group"],
  "split_hint": "equal | exclude_named",
  "ambiguity_flags": ["..."]
}}

Rules:
- Summarize the expense in 2 to 6 words.
- If a restaurant, store, hotel, or other named place is given, preserve its name in the summary.
- For food without a named place, use a clear label such as Food expense or Dinner.
- Infer the payer from the expense text when it says who paid; do not include someone explicitly absent.
- Exclude anyone explicitly absent, not there, not attending, or opting out.
- Include everyone else who benefited, and always include the payer.
- Use exact names from the group list.
- Return valid JSON with no explanation outside the object.
"""
    messages = [
        {"role": "system", "content": "You are a strict expense participant classifier."},
        {"role": "user", "content": prompt},
    ]
    return call_nemotron(messages, max_tokens=500)


def _add_months(start_date: date, months: int) -> date:
    month_index = start_date.month - 1 + months
    year = start_date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(start_date.day, monthrange(year, month)[1])
    return date(year, month, day)


def _is_trip_request(text: str) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in ("trip", "travel", "plane", "flight", "hotel", "nights"))


def _trip_route_label(trip_text: str) -> str:
    route_match = re.search(r"\bfrom\s+(.+?)\s+to\s+(.+?)(?:\s+for\b|\s+over\b|\s+with\b|[,.]|$)", trip_text, re.IGNORECASE)
    if route_match:
        return f"{route_match.group(1).strip()} to {route_match.group(2).strip()}"

    destination_match = re.search(r"\bto\s+(.+?)(?:\s+for\b|\s+over\b|\s+with\b|[,.]|$)", trip_text, re.IGNORECASE)
    if destination_match:
        return destination_match.group(1).strip()

    return "the requested destination"


def _build_trip_planning_fallback(trip_text: str, group: list[str], currency: str) -> Dict[str, Any]:
    lowered = trip_text.lower()
    route_label = _trip_route_label(trip_text)
    nights_match = re.search(r"(\d+)\s+nights?", lowered)
    nights = int(nights_match.group(1)) if nights_match else 3
    travelers = len(group)
    room_count = max(1, (travelers + 1) // 2)
    travel_days = nights + 1
    breakdown = [
        {"item": "Round-trip flights", "quantity": travelers, "unit_amount": 250, "amount": round(travelers * 250, 2), "amount_basis": "group_total", "assumption": f"Planning estimate of $250 per round-trip ticket for travel from {route_label}."},
        {"item": "Mid-range hotel", "quantity": nights * room_count, "unit_amount": 220, "amount": round(nights * room_count * 220, 2), "amount_basis": "group_total", "assumption": f"{room_count} shared room(s) for {nights} nights at about $220 per room-night."},
        {"item": "Meals", "quantity": travelers * travel_days, "unit_amount": 65, "amount": round(travelers * travel_days * 65, 2), "amount_basis": "group_total", "assumption": "$65 per traveler per day for eating out."},
        {"item": "Local transportation", "quantity": 1, "unit_amount": 250, "amount": 250, "amount_basis": "group_total", "assumption": "Shared rideshares and local transportation during the stay."},
        {"item": "Trip buffer", "quantity": 1, "unit_amount": 300, "amount": 300, "amount_basis": "group_total", "assumption": "Buffer for baggage, tips, price changes, and small activities."},
    ]
    total = round(sum(item["amount"] for item in breakdown), 2)
    per_person = round(total / travelers, 2) if travelers else 0
    return {
        "currency": currency,
        "estimated_total": total,
        "per_person": per_person,
        "confidence": "low",
        "cost_breakdown": breakdown,
        "split_method": "equal",
        "split": {person: per_person for person in group},
        "assumptions": ["This is a planning estimate, not a confirmed quote.", "All travelers share hotel, food, transport, and buffer costs equally."],
        "questions": ["Are all travelers flying round-trip, and are the dates for this year?", "Would you like activities or travel insurance included?"],
        "_source": "Planning fallback",
    }


def analyze_financial_goal_with_nemotron(goal_text: str, group: list[str], currency: str = "USD") -> Dict[str, Any]:
    today = date.today()
    months_match = re.search(r"\b(\d+)\s+months?\b", goal_text.lower())
    months_to_prepare = int(months_match.group(1)) if months_match else None
    planning_date = _add_months(today, months_to_prepare) if months_to_prepare else None
    timing_context = (
        f"Preparation horizon: {months_to_prepare} months, approximately through {planning_date.isoformat()}."
        if planning_date
        else "Preparation horizon: not specified; ask for the target timing when it affects pricing."
    )

    prompt = f"""
You are a careful financial planning advisor. Analyze the financial goal or upcoming
occasion below, estimate the money this group should set aside, and propose a practical
contribution plan. If the description is a trip or vacation, actively estimate flights,
lodging, meals, local transportation, activities, and a reasonable buffer using clearly
labeled assumptions. Do not return zero just because prices are not exact.

Goal description: {goal_text}
Group: {', '.join(group)}
Currency: {currency}
Today's date: {today.isoformat()}
{timing_context}

Return JSON only with this schema:
{{
  "currency": "{currency}",
  "estimated_total": 0,
  "per_person": 0,
  "confidence": "high | medium | low",
    "cost_breakdown": [{{"item": "initial deposit", "quantity": 1, "unit_amount": 0, "amount": 0, "amount_basis": "group_total", "assumption": "..."}}],
  "split_method": "equal | weighted | custom",
  "split": {{"Person": 0}},
  "assumptions": ["..."],
  "questions": ["..."]
}}

Rules:
- Include only costs supported by the description or clearly labeled assumptions.
- For a trip request with a destination, departure point, dates or duration, group size,
  lodging style, and food plan, return a nonzero planning estimate instead of asking only
  clarification questions.
- If flights are part of the goal or plan, estimate them using the stated destination,
    departure location, expected travel date, and time of year or season. Use today's date
    and the preparation horizon to infer the likely booking window and travel timing when
    the description gives a preparation period. Account for peak and off-peak travel and
    state the seasonal and booking-window assumptions in the breakdown.
- Every cost item must identify whether its amount is a "group_total", "per_person", or
    "per_unit" amount. For per-person or per-unit costs, set quantity, set unit_amount to
    the price for one person or unit, and set amount to unit_amount multiplied by quantity.
    Never put a single-person or single-unit price in the group-level amount.
- Flight prices are normally quoted per ticket. For shared flights, use one ticket per
    traveling contributor and include the destination and seasonal assumption.
- Apply the same basis logic to lodging, meals, local transport, activities, deposits,
    and every other line item. For costs such as a hotel room or rental car that are already
    shared prices, use amount_basis "group_total" rather than multiplying by contributors.
- Use today's date and the preparation horizon to estimate lodging availability and seasonal
    pricing too. If the destination or target travel date is missing, ask for it rather than
    presenting a precise current price.
- If flights are mentioned but the destination or timing is missing, do not invent a
    route or season. Add a question requesting the missing details and label the flight
    amount as a broad planning estimate or leave it unpriced when a responsible estimate
    is not possible.
- Never present a precise airfare as confirmed. Flight estimates should reflect destination
    and seasonality and include the assumptions used to produce them.
- Always return at least one cost_breakdown item when estimated_total is greater than zero.
    Never return an empty cost_breakdown array; use a broad item such as "Goal funding"
    with a clear assumption when a more detailed category is not possible.
- Split shared costs equally unless the description gives a different responsibility.
- estimated_total must equal the sum of cost_breakdown amounts, rounded to two decimals.
- per_person and split must account for every group member and sum to estimated_total.
- Use questions for missing details that could materially change the estimate.
- Return valid JSON and no text outside the JSON object.
"""
    messages = [
        {"role": "system", "content": "You are a careful financial-goal analyst. Never present guesses as confirmed prices or guaranteed advice."},
        {"role": "user", "content": prompt},
    ]
    result = call_nemotron(messages, max_tokens=1200)
    if "raw_response" in result:
        raise ValueError("Nemotron returned an invalid financial goal analysis")

    breakdown = result.get("cost_breakdown")
    if not isinstance(breakdown, list) or not breakdown:
        for alternate_key in ("breakdown", "costs", "items", "expenses"):
            alternate = result.get(alternate_key)
            if isinstance(alternate, (list, dict)) and alternate:
                breakdown = alternate
                break

    if isinstance(breakdown, dict):
        breakdown = [
            {"item": str(item), "amount": amount, "assumption": "Provided by the financial plan."}
            for item, amount in breakdown.items()
        ]

    if isinstance(breakdown, list):
        normalized_breakdown = []
        for item in breakdown:
            if isinstance(item, dict):
                normalized_breakdown.append({
                    "item": str(item.get("item") or item.get("name") or item.get("category") or "Planning item"),
                    "quantity": item.get("quantity", 1),
                    "unit_amount": item.get("unit_amount"),
                    "amount": item.get("amount", item.get("cost", item.get("value", 0))),
                    "amount_basis": str(item.get("amount_basis") or "group_total"),
                    "assumption": str(item.get("assumption") or "Provided by the financial plan."),
                })
            elif isinstance(item, str) and item.strip():
                normalized_breakdown.append({
                    "item": item.strip(),
                    "amount": 0,
                    "assumption": "Amount was not provided by the model.",
                })
        breakdown = normalized_breakdown

    contributor_count = len(group)
    for item in breakdown or []:
        item_name = item.get("item", "").lower()
        amount_basis = str(item.get("amount_basis", "")).lower()
        quantity = item.get("quantity")
        unit_amount = item.get("unit_amount")
        if amount_basis in {"per_person", "per_ticket", "per_unit", "unit"}:
            if isinstance(unit_amount, (int, float)):
                if amount_basis == "per_person" or "flight" in item_name:
                    item["quantity"] = contributor_count
                else:
                    item["quantity"] = quantity if isinstance(quantity, (int, float)) and quantity > 0 else contributor_count
                item["amount"] = round(unit_amount * item["quantity"], 2)
                item["amount_basis"] = "group_total"

    numeric_amounts = [
        item["amount"] for item in breakdown or []
        if isinstance(item.get("amount"), (int, float))
    ]
    if numeric_amounts:
        result["estimated_total"] = round(sum(numeric_amounts), 2)
        if result.get("split_method", "equal") == "equal" and group:
            per_person = round(result["estimated_total"] / contributor_count, 2)
            result["per_person"] = per_person
            result["split"] = {person: per_person for person in group}

    if not isinstance(breakdown, list) or not breakdown:
        estimated_total = result.get("estimated_total", 0)
        if isinstance(estimated_total, (int, float)) and estimated_total > 0:
            breakdown = [{
                "item": "Goal funding",
                "amount": estimated_total,
                "assumption": "The model returned a total without detailed categories.",
            }]

    result["cost_breakdown"] = breakdown or []
    if _is_trip_request(goal_text) and (not isinstance(result.get("estimated_total"), (int, float)) or result["estimated_total"] <= 0):
        return _build_trip_planning_fallback(goal_text, group, currency)
    return result


def analyze_trip_with_nemotron(trip_text: str, group: list[str], currency: str = "USD") -> Dict[str, Any]:
    """Backward-compatible alias for clients using the former trip API."""
    cache_key = (trip_text.strip().lower(), tuple(group), currency.upper())
    if cache_key in TRIP_ANALYSIS_CACHE:
        return deepcopy(TRIP_ANALYSIS_CACHE[cache_key])

    try:
        result = analyze_financial_goal_with_nemotron(trip_text, group, currency)
    except Exception:
        result = _build_trip_planning_fallback(trip_text, group, currency)

    TRIP_ANALYSIS_CACHE[cache_key] = deepcopy(result)
    return result
