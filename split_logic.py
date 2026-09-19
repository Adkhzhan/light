from __future__ import annotations

import re
from typing import Any, Dict, List


def classify_expense(text: str, group: List[str], payer: str) -> Dict[str, Any]:
    """Simple heuristic classifier for a hackathon MVP.

    This intentionally avoids pretending to be a full LLM. It extracts a few signals from
    the raw text and returns a structured result used by the rule engine.
    """
    cleaned = text.lower()
    group_set = set(group)
    included = [name for name in group if name != payer or "not" not in cleaned]

    if any(word in cleaned for word in ["dinner", "food", "groceries", "brunch", "lunch", "restaurant", "coffee", "pizza"]):
        category = "food"
    elif any(word in cleaned for word in ["hotel", "room", "lodging", "airbnb", "stay"]):
        category = "lodging"
    elif any(word in cleaned for word in ["uber", "lyft", "train", "flight", "gas", "taxi", "transport", "bus"]):
        category = "transport"
    else:
        category = "misc"

    excluded: List[str] = []
    absence_phrases = ["wasn't there", "was not there", "not there", "didn't go", "did not go"]
    absence_detected = any(phrase in cleaned for phrase in absence_phrases)

    if absence_detected:
        for person in group:
            person_patterns = [
                f"{person.lower()} wasn't there",
                f"{person.lower()} was not there",
                f"{person.lower()} not there",
                f"{person.lower()} didn't go",
                f"{person.lower()} did not go",
            ]
            if any(pattern in cleaned for pattern in person_patterns):
                excluded.append(person)

    if absence_detected:
        split_hint = "exclude_named"
        included_names = [name for name in group if name not in excluded]
    else:
        split_hint = "equal"
        included_names = list(group)

    if payer not in included_names:
        included_names = [payer] + [name for name in included_names if name != payer]

    if not included_names:
        included_names = list(group)

    # Add explicit participants mentioned in text when they are in the group
    for person in group:
        name_lower = person.lower()
        if name_lower in cleaned and person not in included_names:
            included_names.append(person)

    # Remove duplicates while preserving order
    ordered_names = []
    for name in included_names:
        if name not in ordered_names:
            ordered_names.append(name)

    for person in group:
        if person not in ordered_names:
            ordered_names.append(person)

    # Keep the explicitly excluded names as the authoritative list.
    if split_hint == "exclude_named":
        excluded = [person for person in group if person in excluded]

    return {
        "category": category,
        "amount_confidence": "high" if category in {"food", "lodging", "transport"} else "medium",
        "participants_included": ordered_names,
        "participants_excluded": excluded,
        "split_hint": split_hint,
        "ambiguity_flags": ["participant_absence_detected"] if split_hint == "exclude_named" else [],
    }


def compute_split(amount: float, group: List[str], split_hint: str, weights: Dict[str, float] | None = None) -> Dict[str, Any]:
    """Compute the amount each person owes."""
    if amount < 0:
        raise ValueError("Amount must be non-negative")

    if split_hint == "weighted":
        if not weights:
            raise ValueError("Weights required for weighted split")
        total_weight = sum(weights.get(person, 0) for person in group)
        if total_weight <= 0:
            raise ValueError("Total weight must be greater than zero")
        breakdown = {
            person: round(amount * (weights.get(person, 0) / total_weight), 2)
            for person in group
        }
    else:
        per_person = round(amount / len(group), 2)
        breakdown = {person: per_person for person in group}

    total = round(sum(breakdown.values()), 2)
    return {
        "amount": round(amount, 2),
        "total": total,
        "per_person": round(amount / len(group), 2) if split_hint == "equal" else None,
        "breakdown": breakdown,
    }
