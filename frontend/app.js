const API_URL = "http://localhost:8000";
const modal = document.querySelector("#expense-modal");
const form = document.querySelector("#expense-form");
const result = document.querySelector("#analysis-result");
const errorMessage = document.querySelector("#form-error");

function openModal() {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.querySelector("#expense-description").focus();
}
function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}
document.querySelector("#new-expense-button").addEventListener("click", openModal);
document.querySelector("#analyze-insight").addEventListener("click", openModal);
document.querySelector("#close-modal").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });

function parseMembers(value) {
  return value.split(",").map((name) => name.trim()).filter(Boolean);
}

function localClassification(text, group, payer) {
  const cleaned = text.toLowerCase();
  const categories = {
    food: ["dinner", "food", "groceries", "brunch", "lunch", "restaurant", "coffee", "pizza"],
    lodging: ["hotel", "room", "lodging", "airbnb", "stay"],
    transport: ["uber", "lyft", "train", "flight", "gas", "taxi", "transport", "bus"],
  };
  const category = Object.entries(categories).find(([, words]) => words.some((word) => cleaned.includes(word)))?.[0] || "misc";
  const excluded = group.filter((person) => new RegExp(`${person.toLowerCase()} (wasn't|was not|not) there|${person.toLowerCase()} (didn't|did not) go`).test(cleaned));
  const included = excluded.length ? group.filter((person) => !excluded.includes(person)) : [...group];
  if (!included.includes(payer)) included.unshift(payer);
  return { category, amount_confidence: category === "misc" ? "medium" : "high", participants_included: included, participants_excluded: excluded, split_hint: excluded.length ? "exclude_named" : "equal", ambiguity_flags: excluded.length ? ["participant_absence_detected"] : [] };
}

function localSplit(amount, group) {
  const perPerson = Math.round((amount / group.length) * 100) / 100;
  return { amount, total: Math.round(perPerson * group.length * 100) / 100, per_person: perPerson, breakdown: Object.fromEntries(group.map((person) => [person, perPerson])) };
}

async function requestAnalysis(text, group, payer, amount) {
  const classifyParams = new URLSearchParams({ text, payer });
  group.forEach((person) => classifyParams.append("group", person));
  try {
    const classificationResponse = await fetch(`${API_URL}/classify?${classifyParams}`, { method: "POST" });
    if (!classificationResponse.ok) throw new Error("Classification failed");
    const classification = await classificationResponse.json();
    const splitParams = new URLSearchParams({ amount, split_hint: classification.split_hint });
    classification.participants_included.forEach((person) => splitParams.append("group", person));
    const splitResponse = await fetch(`${API_URL}/split?${splitParams}`, { method: "POST" });
    if (!splitResponse.ok) throw new Error("Split failed");
    return { classification, split: await splitResponse.json(), source: "API" };
  } catch {
    const classification = localClassification(text, group, payer);
    return { classification, split: localSplit(amount, classification.participants_included), source: "Demo mode" };
  }
}

function renderResult({ classification, split, source }) {
  const categoryLabels = { food: "Food", lodging: "Lodging", transport: "Transport", misc: "Other" };
  const people = Object.entries(split.breakdown).map(([person, value]) => `<div class="result-person"><span>${person}</span><b>$${Number(value).toFixed(2)}</b></div>`).join("");
  result.innerHTML = `<h3>Suggested split <span style="color:#4f9b75;font-size:10px;font-family:'DM Sans'">${source}</span></h3><div class="result-summary"><span class="result-pill">${categoryLabels[classification.category]}</span><span class="result-pill">${classification.split_hint === "equal" ? "Split equally" : "Excluded named guest"}</span><span class="result-pill">${classification.amount_confidence} confidence</span></div><div class="result-breakdown">${people}</div>`;
  result.classList.add("show");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.textContent = "";
  result.classList.remove("show");
  const text = document.querySelector("#expense-description").value.trim();
  const amount = Number(document.querySelector("#expense-amount").value);
  const payer = document.querySelector("#expense-payer").value;
  const group = parseMembers(document.querySelector("#expense-members").value);
  if (!text || Number.isNaN(amount) || amount < 0 || group.length === 0) {
    errorMessage.textContent = "Add a description, a valid amount, and at least one member.";
    return;
  }
  const submit = form.querySelector("button[type=submit]");
  submit.disabled = true;
  submit.innerHTML = "<span>◌</span> Analyzing…";
  const analysis = await requestAnalysis(text, group, payer, amount);
  renderResult(analysis);
  submit.disabled = false;
  submit.innerHTML = "<span>✦</span> Analyze fair split";
});
