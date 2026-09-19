from split_logic import classify_expense, compute_split


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
