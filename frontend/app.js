const API_URL = "";
const modal = document.querySelector("#expense-modal");
const form = document.querySelector("#expense-form");
const result = document.querySelector("#analysis-result");
const errorMessage = document.querySelector("#form-error");
const tripModal = document.querySelector("#trip-modal");
const tripForm = document.querySelector("#trip-form");
const tripResult = document.querySelector("#trip-analysis-result");
const tripError = document.querySelector("#trip-form-error");

function openModal() {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.querySelector("#expense-description").focus();
}
function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}
function openTripModal() {
  tripModal.classList.add("open");
  tripModal.setAttribute("aria-hidden", "false");
  document.querySelector("#trip-description").focus();
}
function closeTripModal() {
  tripModal.classList.remove("open");
  tripModal.setAttribute("aria-hidden", "true");
}
document.querySelector("#new-expense-button").addEventListener("click", openModal);
document.querySelector("#analyze-insight").addEventListener("click", openModal);
document.querySelector("#plan-trip-button").addEventListener("click", openTripModal);
document.querySelector("#close-modal").addEventListener("click", closeModal);
document.querySelector("#close-trip-modal").addEventListener("click", closeTripModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
tripModal.addEventListener("click", (event) => { if (event.target === tripModal) closeTripModal(); });
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

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function formatMoney(value, currency) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value) || 0);
}

function renderTripAnalysis(analysis) {
  const currency = analysis.currency || "USD";
  const breakdown = Object.entries(analysis.split || {}).map(([person, amount]) => `<div class="result-person"><span>${escapeHTML(person)}</span><b>${formatMoney(amount, currency)}</b></div>`).join("");
  const costs = (analysis.cost_breakdown || []).map((cost) => `<div class="trip-cost"><span>${escapeHTML(cost.item)}</span><b>${formatMoney(cost.amount, currency)}</b><small>${escapeHTML(cost.assumption)}</small></div>`).join("");
  const assumptions = (analysis.assumptions || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("");
  const questions = (analysis.questions || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("");
  tripResult.innerHTML = `<div class="trip-total"><span>Estimated trip budget</span><strong>${formatMoney(analysis.estimated_total, currency)}</strong><small>${escapeHTML(analysis.confidence || "medium")} confidence · ${escapeHTML(analysis.source || "Nemotron")}</small></div><div class="trip-per-person"><span>Fair share per person</span><strong>${formatMoney(analysis.per_person, currency)}</strong></div><h3>Cost breakdown</h3><div class="trip-costs">${costs || "<p>No line items returned.</p>"}</div><h3>Suggested split</h3><div class="result-breakdown">${breakdown}</div>${assumptions ? `<div class="trip-notes"><strong>Assumptions</strong><ul>${assumptions}</ul></div>` : ""}${questions ? `<div class="trip-notes trip-questions"><strong>Worth clarifying</strong><ul>${questions}</ul></div>` : ""}`;
  tripResult.classList.add("show");
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

tripForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  tripError.textContent = "";
  tripResult.classList.remove("show");
  const trip = document.querySelector("#trip-description").value.trim();
  const currency = document.querySelector("#trip-currency").value;
  const group = parseMembers(document.querySelector("#trip-members").value);
  if (!trip || group.length === 0) {
    tripError.textContent = "Add trip details and at least one group member.";
    return;
  }
  const submit = tripForm.querySelector("button[type=submit]");
  submit.disabled = true;
  submit.innerHTML = "<span>◌</span> Asking Nemotron…";
  const params = new URLSearchParams({ trip, currency });
  group.forEach((person) => params.append("group", person));
  try {
    const response = await fetch(`${API_URL}/trip-analysis?${params}`, { method: "POST" });
    const analysis = await response.json();
    if (!response.ok) throw new Error(analysis.error || "Trip analysis failed");
    renderTripAnalysis(analysis);
  } catch (error) {
    tripError.textContent = error.message || "Nemotron could not analyze this trip.";
  } finally {
    submit.disabled = false;
    submit.innerHTML = "<span>✦</span> Estimate trip budget";
  }
});
