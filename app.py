from __future__ import annotations

import streamlit as st

from split_logic import classify_expense, compute_split


st.title("Split Sense")
st.caption("Smart bill splitting for trips and shared living")

with st.form("expense_form"):
    group_input = st.text_input("Group members (comma separated)", value="Alex, Sam, Priya, Leo")
    payer_input = st.text_input("Who paid?", value="Alex")
    expense_text = st.text_area(
        "Expense description",
        value="Paid $84 for dinner at Nonna's, Sam wasn't there",
        height=120,
    )
    amount = st.number_input("Amount", min_value=0.0, value=84.0, step=1.0)
    submitted = st.form_submit_button("Analyze expense")

if submitted:
    group = [person.strip() for person in group_input.split(",") if person.strip()]
    if not group:
        st.error("Please provide at least one group member.")
        st.stop()

    classification = classify_expense(expense_text, group, payer_input.strip() or group[0])
    split = compute_split(
        amount=amount,
        group=classification["participants_included"],
        split_hint=classification["split_hint"],
    )

    category_labels = {
        "food": "🍽️ Food",
        "transport": "🚗 Transport",
        "lodging": "🏨 Lodging",
        "misc": "📦 Misc",
    }

    st.subheader("Classification")
    st.markdown(
        f"### Category: {category_labels.get(classification['category'], classification['category'])}"
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Split rule", classification["split_hint"])
    with col2:
        st.metric("Confidence", classification["amount_confidence"])
    with col3:
        st.metric("Included", len(classification["participants_included"]))

    left_col, right_col = st.columns(2)
    with left_col:
        st.write("**Included people**")
        st.write(", ".join(classification["participants_included"]) or "None")

    with right_col:
        st.write("**Excluded people**")
        st.write(", ".join(classification["participants_excluded"]) or "None")

    st.write("**Ambiguity flags**")
    st.write(", ".join(classification["ambiguity_flags"]) if classification["ambiguity_flags"] else "No major ambiguity detected")

    st.info(
        "Nemotron role in production: this app currently uses a rule-based heuristic, but the real architecture would use Nemotron for structured extraction (category + participants + split hint) and a second model pass to judge/approve the split before it reaches the ledger."
    )

    st.subheader("Suggested split")
    st.json(split)
