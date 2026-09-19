# Split Sense — Project Doc
Smart bill-splitting for shared households and trip groups, powered by NVIDIA Nemotron

---

## 1. The Problem
Bill-splitting apps (Splitwise, Venmo groups) are good at arithmetic and bad at judgment. They assume every expense should be split however you tell them to, but in real shared-living or group-trip situations:

- Someone pays for groceries that are 70% for one roommate's dietary restriction, 30% shared
- A "team dinner" gets logged where one person left early and didn't eat
- A recurring Netflix payment should always split evenly, but a one-off "emergency vet bill" one roommate covered should not
- People are lazy or inconsistent about tagging expenses correctly, and the ledger silently accumulates unfairness that surfaces as a fight three months later
The actual product isn't "calculate the split." It's: figure out what kind of expense this is, apply the right splitting logic, and know when to just ask the user.

## 2. Who It's For
Two personas — pick one, don't try to serve both in a weekend build:

Persona

Characteristics

Roommates / shared household

Recurring, predictable categories (rent, utilities, groceries, streaming); long time horizon

Trip group

Bursty, one-off expenses; higher ambiguity ("did everyone go to that bar?"); shorter time horizon

Recommendation: default to the trip-group persona — more dramatic for a demo, more relatable to judges, faster to generate realistic synthetic data for.

## 3. System Architecture
┌─────────────────┐

│  Expense Input   │  (raw, messy text: "Paid $84 for dinner at

│                  │   Nonna's, Sam wasn't there")

└────────┬─────────┘

         │

         ▼

┌─────────────────────────┐

│  Nemotron: Classifier    │  → category (food/transport/lodging/misc)

│  + Extractor             │  → participants mentioned/excluded

│                          │  → split-type signal (equal/weighted/exclude)

└────────┬─────────────────┘

         │

         ▼

┌─────────────────────────┐

│  Rule Engine              │  Deterministic split calculator.

│  (simple Python)          │  Given category + participants + split-type,

│                           │  computes who owes what.

└────────┬─────────────────┘

         │

         ▼

┌─────────────────────────┐

│  Nemotron: Judge/Router   │  Reviews the rule engine's output against the

│                           │  original expense description. Outcomes:

│                           │  (a) confirm → send to ledger

│                           │  (b) low confidence → ask user a clarifying Q

│                           │  (c) flag → looks like a mistake

└────────┬─────────────────┘

         │

         ▼

┌──────────────────┐

│  Ledger / Debt    │  Running balance per person; settlement suggestions

│  Graph            │  (minimize number of transactions to settle up)

└───────────────────┘

Two distinct Nemotron calls, two distinct jobs — classification/extraction, then judgment/routing. This maps directly onto "sits somewhere in a bigger pipeline" and "judges another model's output," and keeps the rule engine intentionally dumb so Nemotron's contribution is easy to measure and explain.

## 4. What Nemotron Does, in Detail

### Call 1 — Structured Extraction (Classifier)
Input: raw expense text + group roster

Output (JSON):

{

  "category": "food | transport | lodging | misc",

  "amount_confidence": "high | medium | low",

  "participants_included": ["..."],

  "participants_excluded": ["..."],

  "split_hint": "equal | weighted | exclude_named",

  "ambiguity_flags": ["..."]

}

Prompt Nemotron to return only JSON, then parse and validate against a schema before passing to the rule engine. This is real production practice — protecting against garbage-in-garbage-out — and gives you a concrete artifact to show judges: a schema, a validator, and defined failure handling when the model returns malformed output.

### Call 2 — Judgment / Arbitration
Input: rule engine's proposed split + original expense text + group context (who's been over/under-contributing lately)

Output: approve | ask-user | flag-for-review + one-sentence rationale

This is the more interesting eval story. You're not asking "did it get the math right" (trivial) — you're asking "did it catch the ambiguous case that the dumb rule engine would've gotten wrong by default."

## 5. What You Need to Build This in a Weekend

### Data

- A synthetic expense dataset: 80–150 generated entries with realistic messy text, spanning categories, with ~20–30% deliberately ambiguous or wrong-by-default. Hand-label the "correct" split for each so you have ground truth.
- A synthetic group roster (4–6 fake people, trip or household context).
- Use an LLM (Nemotron itself, or a cheaper model) to generate the messy synthetic text at volume, then hand-review a sample for realism.

### Stack

- Backend: Python (FastAPI or plain scripts) — easiest for rule engine + Nemotron API calls
- Nemotron access: via NVIDIA's API (build.nvidia.com) / NIM catalog — check what your hackathon sponsor is providing (often free credits)
- Frontend: doesn't need to be fancy — React or even Streamlit, showing the expense feed, the ledger, and (important for the demo) a "why did it split this way" panel showing Nemotron's rationale
- Storage: SQLite is plenty for a weekend

### The Eval (what separates a toy demo from a track-winning submission)

1. Baseline: rule engine alone with a naive default (always equal split among everyone tagged).
2. Nemotron-assisted: full pipeline.
3. Metric: % of ground-truth-labeled ambiguous cases where Nemotron's routing (approve/ask/flag) matches the hand-labeled "correct" action.
4. Show a confusion matrix or simple table: cases Nemotron caught that the rule engine missed, and a case where Nemotron got it wrong. Judges specifically want to see "even a failure you found" — it signals honesty over cherry-picking.
5. Optional stretch: latency/cost comparison using a smaller/cheaper model for Call 1 and reserving Nemotron for Call 2, showing you thought about where the heavier model earns its keep.

## 6. Edge Cases to Design For

- Ambiguous participant lists — "we all went out" with no explicit roster; fallback should be "ask user," not guess
- Currency / rounding drift — trip expenses often have tips/tax that don't split evenly; decide a rounding policy up front
- Repeated categories with different intent — "groceries" for the house vs. "groceries" one person bought just for themselves
- Manipulation / gaming — someone consistently mis-describing personal expenses as shared; a soft fraud-detection angle you could fold in (flag who's expenses get "flagged" most often)
- Cold start — no history yet, so the judge step has nothing to compare against; needs a sensible default behavior

---

## 7. More Ways to Use Nemotron (Beyond Split Sense)
Structural patterns worth knowing — "Nemotron doing something beyond conversation" is really about picking the right role for the model in a pipeline.

Pattern

Description

Example use

Classifier / router

Takes unstructured input, outputs a structured label that determines which downstream path a request takes

Split Sense Call 1

Judge / critic over another model's output

Reviews a candidate answer (from a rule engine, a smaller model, or another Nemotron call) and approves/rejects/revises it

Split Sense Call 2 — strongest "evidence it works" pattern since you can build a clean eval against an ungraded baseline

Extractor

Pulls structured fields out of unstructured text/documents into JSON for a downstream system

Invoice parsing, receipt/contract field extraction

Arbiter between disagreeing systems

When two deterministic/statistical components disagree (e.g. a rules engine says "fraud," an anomaly-score model says "fine"), Nemotron reads context and breaks the tie with reasoning

Fraud/chargeback triage

Function-calling / tool orchestration

Nemotron models support structured tool-calling, deciding which function/API to invoke next in a pipeline

"This expense needs a currency-conversion lookup before splitting"

Confidence-gated escalation

Triage layer deciding whether a case is simple enough to auto-resolve or needs routing to a human/another model

The "ask-user" branch in Split Sense; generalizable to support/moderation pipelines

Synthetic data generation

Use Nemotron to generate test/eval datasets, then use a separate Nemotron call to judge outputs against that generated data

Nice meta-story showing the model used at two different pipeline stages

---

Doc prepared for the Compound track submission (financial literacy / fraud / budgeting) with Nemotron integration.
