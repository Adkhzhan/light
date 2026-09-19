from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, Optional

import requests


NEMOTRON_MODEL_CANDIDATES = [
    "nvidia/nemotron-nano-3-30b-a3b",
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
]


def get_nvidia_settings() -> Dict[str, str]:
    api_key = os.getenv("NVIDIA_API_KEY", "")
    base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    model = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-nano-3-30b-a3b")

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
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


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
  "category": "food | transport | lodging | misc",
  "amount_confidence": "high | medium | low",
  "participants_included": ["exact names from the group"],
  "participants_excluded": ["exact names from the group"],
  "split_hint": "equal | exclude_named",
  "ambiguity_flags": ["..."]
}}

Rules:
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


def analyze_trip_with_nemotron(trip_text: str, group: list[str], currency: str = "USD") -> Dict[str, Any]:
    prompt = f"""
You are planning a shared trip budget. Estimate the money this group should set aside
from the itinerary description, and propose a fair split.

Trip description: {trip_text}
Group: {', '.join(group)}
Currency: {currency}

Return JSON only with this schema:
{{
  "currency": "{currency}",
  "estimated_total": 0,
  "per_person": 0,
  "confidence": "high | medium | low",
  "cost_breakdown": [{{"item": "lodging", "amount": 0, "assumption": "..."}}],
  "split_method": "equal | weighted | custom",
  "split": {{"Person": 0}},
  "assumptions": ["..."],
  "questions": ["..."]
}}

Rules:
- Include only costs supported by the description or clearly labeled assumptions.
- Split shared costs equally unless the description gives a different responsibility.
- estimated_total must equal the sum of cost_breakdown amounts, rounded to two decimals.
- per_person and split must account for every group member and sum to estimated_total.
- Use questions for missing details that could materially change the estimate.
- Return valid JSON and no text outside the JSON object.
"""
    messages = [
        {"role": "system", "content": "You are a careful trip-budget analyst. Never present guesses as confirmed prices."},
        {"role": "user", "content": prompt},
    ]
    result = call_nemotron(messages, max_tokens=1200)
    if "raw_response" in result:
        raise ValueError("Nemotron returned an invalid trip analysis")
    return result
