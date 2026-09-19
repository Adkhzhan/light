from split_logic import classify_expense, compute_split
import app as app_module
from app import app


def test_classify_route_matches_frontend_contract(monkeypatch):
    monkeypatch.setattr(app_module, "classify_expense_with_nemotron", lambda expense_text, group, payer: {
        "category": "food",
        "amount_confidence": "high",
        "participants_included": ["Alex", "Priya", "Leo"],
        "participants_excluded": ["Sam"],
        "split_hint": "exclude_named",
        "ambiguity_flags": [],
    })
    client = app.test_client()
    response = client.post(
        "/classify?text=Paid%20%2484%20for%20dinner%20at%20Nonna's,%20Sam%20wasn't%20there&payer=Alex&group=Alex&group=Sam&group=Priya&group=Leo"
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["category"] == "food"
    assert data["split_hint"] == "exclude_named"
    assert "Sam" in data["participants_excluded"]
    assert data["participants_included"] == ["Alex", "Priya", "Leo"]


def test_split_route_matches_frontend_contract():
    client = app.test_client()
    response = client.post(
        "/split?amount=84&split_hint=exclude_named&group=Alex&group=Priya&group=Leo"
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["amount"] == 84.0
    assert data["total"] == 84.0
    assert data["breakdown"]["Alex"] == 28.0
    assert data["breakdown"]["Priya"] == 28.0
    assert data["breakdown"]["Leo"] == 28.0


def test_expense_analysis_route_splits_only_present_members(monkeypatch):
    monkeypatch.setattr(
        app_module,
        "classify_expense_with_nemotron",
        lambda expense_text, group, payer: {
            "category": "food",
            "amount_confidence": "high",
            "participants_included": ["Alex", "Priya", "Leo"],
            "participants_excluded": ["Sam"],
            "split_hint": "exclude_named",
            "ambiguity_flags": [],
        },
    )

    response = app.test_client().post(
        "/expense-analysis?text=Dinner%20was%20%2484.%20Sam%20wasn%27t%20there."
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["classification"]["participants_excluded"] == ["Sam"]
    assert data["split"]["breakdown"] == {"Alex": 28.0, "Leo": 28.0, "Priya": 28.0}


def test_classify_food_expense_excludes_missing_person():
    result = classify_expense(
        text="Paid $84 for dinner at Nonna's, Sam wasn't there",
        group=["Alex", "Sam", "Priya", "Leo"],
        payer="Alex",
    )

    assert result["category"] == "food"
    assert result["split_hint"] == "exclude_named"
    assert "Sam" in result["participants_excluded"]
    assert "Alex" in result["participants_included"]
    assert "Priya" in result["participants_included"]


def test_classify_lodging_as_equal_split():
    result = classify_expense(
        text="Hotel for the whole trip, everyone stayed there",
        group=["Alex", "Sam", "Priya", "Leo"],
        payer="Sam",
    )

    assert result["category"] == "lodging"
    assert result["split_hint"] == "equal"
    assert set(result["participants_included"]) == {"Alex", "Sam", "Priya", "Leo"}


def test_compute_split_uses_equal_split_for_group():
    result = compute_split(
        amount=120.0,
        group=["Alex", "Sam", "Priya"],
        split_hint="equal",
    )

    assert result["per_person"] == 40.0
    assert result["total"] == 120.0
    assert result["breakdown"]["Alex"] == 40.0
    assert result["breakdown"]["Sam"] == 40.0
    assert result["breakdown"]["Priya"] == 40.0


def test_trip_analysis_route_returns_nemotron_budget(monkeypatch):
    monkeypatch.setattr(
        app_module,
        "analyze_trip_with_nemotron",
        lambda trip_text, group, currency: {
            "currency": currency,
            "estimated_total": 1200,
            "per_person": 400,
            "confidence": "medium",
            "cost_breakdown": [{"item": "lodging", "amount": 1200, "assumption": "Three nights"}],
            "split_method": "equal",
            "split": {person: 400 for person in group},
            "assumptions": ["Shared apartment"],
            "questions": [],
        },
    )

    client = app.test_client()
    response = client.post(
        "/trip-analysis?trip=Three%20nights%20in%20Lisbon&currency=EUR&group=Alex&group=Sam&group=Priya"
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["source"] == "Nemotron"
    assert data["estimated_total"] == 1200
    assert data["split"]["Sam"] == 400
