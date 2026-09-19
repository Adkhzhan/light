from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional

import requests


def get_nvidia_settings() -> Dict[str, str]:
    api_key = os.getenv("NVIDIA_API_KEY", "")
    base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    model = os.getenv("NVIDIA_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct")

    if not api_key:
        secrets_path = Path(__file__).resolve().parent / ".streamlit" / "secrets.toml"
        if secrets_path.exists():
            try:
                import tomllib

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


def call_nemotron(messages: list[dict[str, str]], model: Optional[str] = None) -> Dict[str, Any]:
    settings = get_nvidia_settings()
    api_key = settings["api_key"]
    base_url = settings["base_url"]
    model_name = model or settings["model"]

    if not api_key:
        raise ValueError("Missing NVIDIA_API_KEY. Add it to .streamlit/secrets.toml")

    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 400,
    }

    response = requests.post(url, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    data = response.json()

    content = data["choices"][0]["message"]["content"]
    try:
        return _extract_json_from_text(content)
    except json.JSONDecodeError:
        return {"raw_response": content}


def classify_expense_with_nemotron(expense_text: str, group: list[str], payer: str) -> Dict[str, Any]:
    prompt = f"""
You are classifying a shared expense for a split-bill app.

Group: {', '.join(group)}
Payer: {payer}
Expense text: {expense_text}

Return JSON only with this schema:
{
  "category": "food | transport | lodging | misc",
  "amount_confidence": "high | medium | low",
  "participants_included": ["..."],
  "participants_excluded": ["..."],
  "split_hint": "equal | weighted | exclude_named",
  "ambiguity_flags": ["..."]
}

Rules:
- If someone is explicitly not present, exclude them.
- Keep the response valid JSON and do not add explanations outside the JSON object.
"""

    messages = [
        {"role": "system", "content": "You are a strict JSON extraction assistant for shared-expense classification."},
        {"role": "user", "content": prompt},
    ]
    result = call_nemotron(messages)
    if "raw_response" in result:
        return {"category": "misc", "amount_confidence": "low", "participants_included": group, "participants_excluded": [], "split_hint": "equal", "ambiguity_flags": ["nemotron_parse_failed"]}
    return result


def judge_split_with_nemotron(expense_text: str, group: list[str], split_result: Dict[str, Any]) -> Dict[str, Any]:
    prompt = f"""
Review the following expense and proposed split.

Group: {', '.join(group)}
Expense text: {expense_text}
Proposed split: {json.dumps(split_result, default=str)}

Return JSON only with this schema:
{
  "decision": "approve | ask-user | flag-for-review",
  "rationale": "one sentence"
}
"""

    messages = [
        {"role": "system", "content": "You are a reviewer for shared-bill fairness and ambiguity."},
        {"role": "user", "content": prompt},
    ]
    result = call_nemotron(messages)
    if "raw_response" in result:
        return {"decision": "ask-user", "rationale": "Nemotron response was not parseable; the app should ask for clarification."}
    return result
