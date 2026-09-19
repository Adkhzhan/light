# api.py (new file)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from split_logic import classify_expense, compute_split

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/classify")
def classify(text: str, group: list[str], payer: str):
    """Classify an expense (would use Nemotron in production)."""
    return classify_expense(text, group, payer)

@app.post("/split")
def split(amount: float, group: list[str], split_hint: str):
    """Compute the split."""
    return compute_split(amount, group, split_hint)

@app.get("/ledger/{group_id}")
def get_ledger(group_id: str):
    """Fetch ledger state."""
    # Return running balances for the group
    pass