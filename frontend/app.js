const API_URL = window.location.protocol === "file:" ? "http://127.0.0.1:8000" : "";
const validRoutes = new Set(["overview", "expenses", "balances", "members", "settings"]);

const members = [
  { name: "Alex Thompson", email: "alex@email.com", role: "Primary account", initials: "AT", color: "avatar-indigo" },
  { name: "Sam Parker", email: "sam@email.com", role: "Checking account", initials: "SP", color: "avatar-yellow" },
  { name: "Priya Nair", email: "priya@email.com", role: "Savings account", initials: "PN", color: "avatar-coral" },
  { name: "Leo Wong", email: "leo@email.com", role: "Credit account", initials: "LW", color: "avatar-blue" }
];
const currentUserName = "Alex Thompson";

function dateDaysAgo(days) {
  const value = new Date();
  value.setHours(12, 0, 0, 0);
  value.setDate(value.getDate() - days);
  return value;
}

function dateLabel(value) {
  const today = new Date();
  const date = new Date(value);
  const difference = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);
  if (difference === 0) return "Today";
  if (difference === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function createExampleHistory() {
  const transactions = [];
  let id = 1000;
  const add = (daysAgo, title, payer, amount, category, kind = "expense", status = "settled") => {
    const date = dateDaysAgo(daysAgo);
    transactions.push({ id: id++, title, date: date.toISOString(), dateLabel: dateLabel(date), payer, amount, status, category, kind });
  };

  for (let month = 0; month < 6; month += 1) {
    const start = month * 30;
    add(start + 1, "Rent payment", "Alex Thompson", 1425 + month * 12, "lodging");
    add(start + 2, "Paycheck", "Alex Thompson", 5960, "misc", "income");
    add(start + 3, "Paycheck", "Sam Parker", 2140 + month * 35, "misc", "income");
    add(start + 4, "Electric bill", "Leo Wong", 86.4 + month * 3.2, "misc", "expense", "pending");
    add(start + 5, "Water and sewer", "Alex Thompson", 74 + month * 2.8, "misc", "expense", "pending");
    add(start + 6, "Grocery run", "Sam Parker", 118.62 + month * 4.5, "food");
    add(start + 7, "Internet + Wi-Fi", "Priya Nair", 88 + month * 2.2, "misc", "expense", "pending");
    add(start + 8, "Dining out", "Sam Parker", 72.8 + month * 2.4, "food", "expense", "review");
    add(start + 9, "Gas bill", "Priya Nair", 38 + month * 4.75, "misc", "expense", "settled");
    add(start + 10, "Public transit", "Alex Thompson", 54.2 + month, "transport");
    add(start + 11, "Car insurance", "Leo Wong", 142 + month * 3.5, "transport", "expense", "pending");
    add(start + 12, "Pharmacy", "Leo Wong", 38.45 + month * 1.6, "misc", "expense", "review");
    add(start + 13, "Cell phone bill", "Sam Parker", 62 + month * 1.8, "misc", "expense", "settled");
    add(start + 14, "Dental copay", "Alex Thompson", month % 3 === 1 ? 145 : 42.75, "misc", "expense", "review");
    add(start + 15, "Internet bill", "Priya Nair", 68 + month * 1.6, "misc", "expense", "pending");
    add(start + 17, "Paycheck", "Priya Nair", 2460 + month * 25, "misc", "income");
    add(start + 18, "Household supplies", "Priya Nair", 64.3 + month * 3, "misc");
    add(start + 19, "Utility bundle", "Sam Parker", 210 + month * 5, "misc", "expense", "settled");
    add(start + 20, "Coffee and snacks", "Sam Parker", 31.2 + month * 1.8, "food");
    add(start + 21, "Parking garage", "Alex Thompson", month % 3 === 2 ? 240 : 22, "transport", "expense", "review");
    add(start + 22, "Rideshare", "Alex Thompson", 42.75 + month * 2, "transport");
    add(start + 23, "Birthday gift", "Priya Nair", month % 2 ? 85 : 112.4, "misc");
    add(start + 24, "Streaming subscriptions", "Priya Nair", 42.97, "misc");
    add(start + 25, "Meal delivery", "Leo Wong", month % 3 === 0 ? 61.8 : 94.3, "food", "expense", "review");
    add(start + 26, "Weekend groceries", "Sam Parker", 96.4 + month * 5, "food");
    add(start + 27, "Cleaning supplies", "Sam Parker", month % 2 ? 175 : 29.4, "lodging");
    add(start + 28, "Home supplies", "Leo Wong", 74.6 + month * 2.2, "lodging");
    add(start + 5, "Paycheck", "Leo Wong", 2320 + month * 40, "misc", "income");
    add(start + 7, month % 2 ? "Concert tickets" : "Movie night", "Leo Wong", month % 2 ? 128 : 46.5, "misc");
    add(start + 9, month % 3 === 0 ? "Water heater service" : "Gas bill", "Priya Nair", month % 3 === 0 ? 134 : 38 + month * 4.75, "misc", "expense", "pending");
    add(start + 11, month % 2 ? "Car maintenance" : "Bike repair", "Leo Wong", month % 2 ? 214.8 : 58.2, "transport");
    add(start + 13, month % 2 ? "Takeout noodles" : "Farmers market", "Priya Nair", month % 2 ? 39.6 : 67.25, "food");
    add(start + 19, month % 2 ? "Weekend hotel" : "Museum passes", "Sam Parker", month % 2 ? 186 : 54, month % 2 ? "lodging" : "misc");
    add(start + 21, month % 3 === 2 ? "Flight deposit" : "Parking", "Alex Thompson", month % 3 === 2 ? 240 : 22, "transport");
    add(start + 25, month % 3 === 0 ? "Meal delivery" : "Dinner reservation", "Leo Wong", month % 3 === 0 ? 61.8 : 94.3, "food");
  }

  return transactions.sort((left, right) => new Date(right.date) - new Date(left.date));
}

const expenseData = createExampleHistory();

try {
  const savedExpenses = JSON.parse(localStorage.getItem("splitsenseTransactions") || "[]");
  if (Array.isArray(savedExpenses)) expenseData.unshift(...savedExpenses);
} catch {
}

const balanceData = [
  { name: "Alex Thompson", initials: "AT", color: "avatar-indigo", balance: 186.4, type: "available" },
  { name: "Sam Parker", initials: "SP", color: "avatar-yellow", balance: 48.6, type: "available" },
  { name: "Priya Nair", initials: "PN", color: "avatar-coral", balance: 110.2, type: "committed" },
  { name: "Leo Wong", initials: "LW", color: "avatar-blue", balance: 124.8, type: "committed" }
];

const settlementNotifications = [
  {
    id: "settlement-sam-alex",
    type: "settlement",
    title: "Payment recorded",
    message: "Sam settled $48.60 with Alex.",
    time: "Yesterday",
    route: "balances",
    defaultUnread: false
  },
  {
    id: "settlement-leo-balance",
    type: "settlement",
    title: "Balance updated",
    message: "Leo now owes $124.80.",
    time: "Sep 17",
    route: "balances",
    defaultUnread: false
  }
];

const notificationReadStorageKey = "northstarReadNotifications";

const settingsDefaults = {
  workspaceName: "roommates",
  defaultCurrency: "USD",
  defaultSplitMethod: "Even split",
  expenseNotifications: true,
  settlementNotifications: true,
  darkMode: false,
  profileName: "Alex Thompson",
  profileEmail: "alex@email.com"
};

const modal = document.querySelector("#expense-modal");
const form = document.querySelector("#expense-form");
const result = document.querySelector("#analysis-result");
const errorMessage = document.querySelector("#form-error");
const tripModal = document.querySelector("#trip-modal");
const tripForm = document.querySelector("#trip-form");
const tripResult = document.querySelector("#trip-analysis-result");
const tripError = document.querySelector("#trip-form-error");
const workspaceSelector = document.querySelector("#workspace-selector");
const workspaceMenu = document.querySelector("#workspace-menu");
const workspaceStatus = document.querySelector("#workspace-menu-status");
const smartInsight = document.querySelector(".insight-card");
const spendingReviewModal = document.querySelector("#spending-review-modal");
const spendingReviewResult = document.querySelector("#spending-review-result");

let currentExpenseFilter = "all";
let currentTransactionType = "all";
let expenseSearchText = "";
let pendingExpense = null;
let expandedExpenseId = null;

function dismissSmartInsight() {
  if (!smartInsight) return;
  smartInsight.hidden = true;
  smartInsight.setAttribute("aria-hidden", "true");
}

function getMemberInitials(name) {
  const member = members.find((item) => item.name === name);
  return member ? member.initials : name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function sameMember(left, right) {
  return left === right || left.split(" ")[0].toLowerCase() === right.split(" ")[0].toLowerCase();
}

function getApprovalMembers(expense) {
  const participantNames = expense.participants || members.map((member) => member.name);
  return participantNames.filter((name) => !sameMember(name, expense.payer));
}

function getAccountBalances() {
  return members.map((member) => {
    const balance = expenseData.reduce((total, transaction) => {
      if (!isRealizedCashFlow(transaction) || !sameMember(transaction.payer, member.name)) return total;
      const amount = Number(transaction.amount) || 0;
      return total + (transaction.kind === "income" ? amount : -amount);
    }, 0);
    return {
      name: member.name,
      initials: member.initials,
      color: member.color,
      balance,
      type: balance >= 0 ? "available" : "committed"
    };
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}

function statusMeta(status) {
  const map = {
    settled: { label: "Cleared", className: "status-settled" },
    pending: { label: "Pending", className: "status-pending" },
    review: { label: "Review split", className: "status-review" },
    rejected: { label: "Split rejected", className: "status-rejected" }
  };
  return map[status] || map.review;
}

function transactionTypeMeta(transaction) {
  return transaction.kind === "income"
    ? { label: "Income", className: "transaction-income" }
    : { label: "Expense", className: "transaction-expense" };
}

function categoryMeta(category) {
  const map = {
    food: { icon: "⌁", className: "food" },
    transport: { icon: "↗", className: "transport" },
    lodging: { icon: "⌂", className: "lodging" },
    misc: { icon: "✦", className: "misc" }
  };
  return map[category] || map.misc;
}

function getCurrentRoute() {
  const route = window.location.hash.slice(1).toLowerCase();
  return validRoutes.has(route) ? route : "overview";
}

function renderRoute() {
  const route = getCurrentRoute();

  closeNotificationPanel();
  closeModal();
  closeSpendingReview();
  closeTripModal();

  document.querySelectorAll("[data-page]").forEach((page) => {
    page.hidden = page.dataset.page !== route;
  });

  document.querySelectorAll("[data-route]").forEach((link) => {
    const isActive = link.dataset.route === route;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  window.scrollTo(0, 0);
}

function renderOverviewExpenses() {
  const list = document.querySelector("#overview-expense-list");
  if (!list) return;

  list.innerHTML = expenseData.slice(0, 4).map((expense) => {
    const meta = categoryMeta(expense.category);
    const status = statusMeta(expense.status);
    const activityVerb = expense.kind === "income" ? "received" : "paid";
    const transactionType = transactionTypeMeta(expense);
    return `
      <div class="expense-row">
        <span class="category-icon ${meta.className}">${meta.icon}</span>
        <div class="expense-main"><strong>${escapeHTML(expense.title)}</strong><span>${escapeHTML(expense.payer)} ${activityVerb} · ${escapeHTML(expense.dateLabel)}</span><span class="transaction-type-inline ${transactionType.className}">${transactionType.label}</span></div>
        <strong class="expense-amount">${formatMoney(expense.amount)}</strong>
        <span class="expense-status ${status.className}">${status.label}</span>
      </div>
    `;
  }).join("");
}

function renderOverviewBalances() {
  const list = document.querySelector("#overview-balance-list");
  if (!list) return;

  list.innerHTML = getAccountBalances().slice(0, 4).map((entry) => `
    <div class="balance-row">
      <span class="avatar ${entry.color}">${entry.initials}</span>
      <div><strong>${escapeHTML(entry.name)}</strong><small>${entry.type}</small></div>
      <b class="${entry.type === "available" ? "balance-positive" : "balance-negative"}">${entry.type === "available" ? "+" : "−"}${formatMoney(entry.balance)}</b>
    </div>
  `).join("");
}

function renderOverviewMembers() {
  const list = document.querySelector("#overview-member-list");
  if (!list) return;

  list.innerHTML = members.map((member) => `
    <div>
      <span class="avatar ${member.color}">${member.initials}</span>
      <strong>${escapeHTML(member.name)}</strong>
      <small>${member.role}</small>
    </div>
  `).join("");
}

function renderExpensePage() {
  const list = document.querySelector("#expenses-list");
  if (!list) return;

  const filtered = expenseData.filter((expense) => {
    const matchesFilter = currentExpenseFilter === "all" || expense.status === currentExpenseFilter;
    const matchesType = currentTransactionType === "all" || (currentTransactionType === "income" ? expense.kind === "income" : expense.kind !== "income");
    const searchTerm = expenseSearchText.trim().toLowerCase();
    const matchesSearch = !searchTerm || `${expense.title} ${expense.payer}`.toLowerCase().includes(searchTerm);
    return matchesFilter && matchesType && matchesSearch;
  });

  list.innerHTML = filtered.length
    ? filtered.map((expense) => {
      const meta = categoryMeta(expense.category);
      const status = statusMeta(expense.status);
      const transactionType = transactionTypeMeta(expense);
      const participants = expense.participants || members.map((member) => member.name.split(" ")[0]);
      const breakdown = expense.breakdown || Object.fromEntries(participants.map((person) => [person, expense.amount / participants.length]));
      const owingBreakdown = Object.entries(breakdown).filter(([person]) => person !== expense.payer);
      const detailClass = expandedExpenseId === expense.id ? "expense-details show" : "expense-details";
      const activityVerb = expense.kind === "income" ? "received" : "paid";
      const actorLabel = expense.kind === "income" ? "Received by" : "Paid by";
      const approvalMembers = getApprovalMembers(expense);
      const approvals = expense.approvals || [];
      const reviewActions = expense.status === "review" ? `
                <div class="expense-review-actions">
                  <span>Every other member must approve</span>
                  <div>
                    <button class="secondary-button review-reject-button" type="button" data-review-action="reject" data-expense-id="${expense.id}">Reject split</button>
                  </div>
                </div>` : "";
      const approvalRows = expense.status === "review" ? `
                <div class="expense-approvals">
                  <span>Member approvals</span>
                  ${approvalMembers.map((member) => approvals.some((approved) => sameMember(approved, member))
                    ? `<small class="approval-complete">${escapeHTML(member)} · Approved</small>`
                    : sameMember(member, currentUserName)
                      ? `<button class="approval-button" type="button" data-approve-member="${escapeHTML(member)}" data-expense-id="${expense.id}">You · Approve split</button>`
                      : `<small class="approval-waiting">${escapeHTML(member)} · Awaiting approval</small>`).join("")}
                </div>` : "";
      return `
          <div class="expense-entry">
            <button class="expense-row page-expense-row" type="button" data-expense-id="${expense.id}" aria-expanded="${expandedExpenseId === expense.id}">
            <span class="category-icon ${meta.className}">${meta.icon}</span>
            <div class="expense-main"><strong>${escapeHTML(expense.title)}</strong><span>${escapeHTML(expense.payer)} ${activityVerb} · ${escapeHTML(expense.dateLabel)}</span><span class="transaction-type-inline ${transactionType.className}">${transactionType.label}</span></div>
            <strong class="expense-amount">${formatMoney(expense.amount)}</strong>
            <span class="expense-status ${status.className}">${status.label}</span>
            </button>
            <div class="${detailClass}">
              <div><span>${actorLabel}</span><strong>${escapeHTML(expense.payer)}</strong></div>
              <div><span>Status</span><strong>${status.label}</strong></div>
              <div class="expense-split-list"><span>${expense.kind === "income" ? "Income details" : "Fair split"}</span><small>${escapeHTML(expense.payer)} · ${expense.kind === "income" ? "Received" : "Already paid"} ${formatMoney(breakdown[expense.payer] || expense.amount / participants.length)}</small>${expense.kind === "income" ? "" : owingBreakdown.map(([person, amount]) => `<small>${escapeHTML(person)} · Owes ${formatMoney(amount)}</small>`).join("")}</div>
              ${approvalRows}
              ${reviewActions}
            </div>
          </div>
        `;
    }).join("")
    : '<div class="empty-state">No expenses match the current search and filter.</div>';
}

function buildExpenseNotifications() {
  return expenseData.map((expense, index) => {
    const titleMap = {
      review: "Expense needs review",
      pending: "Pending expense added",
      settled: "Expense added"
    };

    return {
      id: `expense-${expense.id}`,
      type: "expense",
      title: titleMap[expense.status] || "Expense added",
      message: `${expense.payer} added ${expense.title} for ${formatMoney(expense.amount)}.`,
      time: expense.dateLabel,
      route: "expenses",
      expenseId: expense.id,
      status: expense.status,
      category: expense.category,
      defaultUnread: index < 3
    };
  });
}

function getAllNotifications() {
  return [...buildExpenseNotifications(), ...settlementNotifications];
}

function addExpenseToHistory(analysis, description) {
  const now = new Date();
  expenseData.unshift({
    id: Date.now(),
    title: analysis.classification.summary || description,
    date: now.toISOString(),
    dateLabel: "Today",
    payer: analysis.classification.payer || "Alex",
    amount: analysis.amount,
    status: "review",
    category: analysis.classification.category,
    participants: analysis.classification.participants_included,
    breakdown: analysis.split.breakdown
  });
  localStorage.setItem("splitsenseTransactions", JSON.stringify(expenseData.slice(0, 50)));
  renderOverviewExpenses();
  refreshTransactionMetrics();
  renderOverviewBalances();
  renderBalancesPage();
  renderMembersPage();
  renderExpensePage();
  renderNotifications();
  updateNotificationBadge();
}

function updateExpenseReview(expenseId, decision) {
  const expense = expenseData.find((item) => item.id === expenseId);
  if (!expense || expense.status !== "review") return;

  expense.status = "rejected";
  expense.splitDecision = decision;
  localStorage.setItem("splitsenseTransactions", JSON.stringify(expenseData.slice(0, 100)));
  renderOverviewExpenses();
  refreshTransactionMetrics();
  renderOverviewBalances();
  renderBalancesPage();
  renderMembersPage();
  renderExpensePage();
  renderNotifications();
  updateNotificationBadge();
}

function approveExpenseSplit(expenseId, memberName) {
  const expense = expenseData.find((item) => item.id === expenseId);
  if (!expense || expense.status !== "review" || !sameMember(memberName, currentUserName)) return;

  const approvals = expense.approvals || [];
  if (!approvals.some((approved) => sameMember(approved, memberName))) {
    expense.approvals = [...approvals, memberName];
  }

  const requiredMembers = getApprovalMembers(expense);
  if (requiredMembers.every((member) => expense.approvals.some((approved) => sameMember(approved, member)))) {
    expense.status = "settled";
    expense.splitDecision = "approved_by_all";
  }

  localStorage.setItem("splitsenseTransactions", JSON.stringify(expenseData.slice(0, 100)));
  renderOverviewExpenses();
  refreshTransactionMetrics();
  renderOverviewBalances();
  renderBalancesPage();
  renderMembersPage();
  renderExpensePage();
  renderNotifications();
  updateNotificationBadge();
}

function getRecentTransactions(daysAgoStart, daysAgoEnd) {
  const now = Date.now();
  const start = now - daysAgoStart * 86400000;
  const end = now - daysAgoEnd * 86400000;
  return expenseData.filter((transaction) => {
    if (!transaction.date) return false;
    const timestamp = new Date(transaction.date).getTime();
    return timestamp <= start && timestamp > end;
  });
}

function getRecentSpending(daysAgoStart, daysAgoEnd) {
  return getRecentTransactions(daysAgoStart, daysAgoEnd).filter(isTrackedExpense);
}

function isRealizedCashFlow(transaction) {
  return transaction.kind === "income" || transaction.status === "settled";
}

function isTrackedExpense(transaction) {
  return transaction.kind !== "income" && transaction.status !== "rejected";
}

function getCashFlowBuckets(range) {
  const now = new Date();
  const buckets = [];
  const bucketCount = range === "day" ? 14 : range === "week" ? 8 : range === "ytd" ? now.getMonth() + 1 : 6;
  const getBucketDate = (index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === "day") date.setDate(date.getDate() - (bucketCount - 1 - index));
    if (range === "week") date.setDate(date.getDate() - (bucketCount - 1 - index) * 7);
    if (range === "month" || range === "ytd") date.setMonth(date.getMonth() - (bucketCount - 1 - index));
    return date;
  };

  for (let index = 0; index < bucketCount; index += 1) {
    const date = getBucketDate(index);
    buckets.push({ date, received: 0, paid: 0, net: 0 });
  }

  expenseData.filter((transaction) => transaction.kind === "income" || isTrackedExpense(transaction)).forEach((transaction) => {
    if (!transaction.date) return;
    const transactionDate = new Date(transaction.date);
    let bucketIndex = -1;
    if (range === "day") {
      bucketIndex = buckets.findIndex((bucket) => bucket.date.toDateString() === transactionDate.toDateString());
    } else if (range === "week") {
      const daysAgo = Math.floor((Date.now() - transactionDate.getTime()) / 86400000);
      bucketIndex = bucketCount - 1 - Math.floor(daysAgo / 7);
    } else {
      bucketIndex = buckets.findIndex((bucket) => bucket.date.getFullYear() === transactionDate.getFullYear() && bucket.date.getMonth() === transactionDate.getMonth());
    }
    if (bucketIndex < 0 || !buckets[bucketIndex]) return;
    const amount = Number(transaction.amount) || 0;
    if (transaction.kind === "income") buckets[bucketIndex].received += amount;
    else buckets[bucketIndex].paid += amount;
    buckets[bucketIndex].net = buckets[bucketIndex].received - buckets[bucketIndex].paid;
  });

  return buckets;
}

function renderCashFlowChart() {
  const chart = document.querySelector("#cash-flow-chart");
  const rangeSelect = document.querySelector("#cash-flow-range");
  const receivedTotal = document.querySelector("#chart-received-total");
  const paidTotal = document.querySelector("#chart-paid-total");
  if (!chart || !rangeSelect || !receivedTotal || !paidTotal) return;

  const buckets = getCashFlowBuckets(rangeSelect.value);
  const width = 620;
  const height = 210;
  const padding = { top: 16, right: 14, bottom: 31, left: 50 };
  const values = buckets.map((bucket) => bucket.net);
  const maxValue = Math.max(...values.map(Math.abs), 1);
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;
  const y = (value) => padding.top + ((maxValue - value) / (maxValue * 2)) * chartHeight;
  const x = (index) => padding.left + (index / Math.max(buckets.length - 1, 1)) * chartWidth;
  const points = buckets.map((bucket, index) => `${x(index)},${y(bucket.net)}`).join(" ");
  const zeroY = y(0);
  const labels = buckets.map((bucket, index) => {
    const label = rangeSelect.value === "day"
      ? new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(bucket.date)
      : rangeSelect.value === "week"
        ? `W${index + 1}`
        : new Intl.DateTimeFormat("en-US", { month: "short" }).format(bucket.date);
    return `<text x="${x(index)}" y="${height - 8}" text-anchor="middle">${label}</text>`;
  }).join("");
  const grid = [maxValue, 0, -maxValue].map((value) => `<line x1="${padding.left}" x2="${width - padding.right}" y1="${y(value)}" y2="${y(value)}" />`).join("");
  const received = buckets.reduce((sum, bucket) => sum + bucket.received, 0);
  const paid = buckets.reduce((sum, bucket) => sum + bucket.paid, 0);
  receivedTotal.textContent = formatMoney(received);
  paidTotal.textContent = formatMoney(paid);
  chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><g class="cash-flow-grid">${grid}</g><line class="cash-flow-zero" x1="${padding.left}" x2="${width - padding.right}" y1="${zeroY}" y2="${zeroY}" /><polyline class="cash-flow-line" points="${points}" />${buckets.map((bucket, index) => `<circle class="cash-flow-point" cx="${x(index)}" cy="${y(bucket.net)}" r="3"><title>${escapeHTML(formatMoney(bucket.net))}</title></circle>`).join("")}${labels}</svg>`;
}

function renderCashFlowOverview() {
  const totalElement = document.querySelector("#cash-flow-total");
  const progressElement = document.querySelector("#cash-flow-progress");
  const inflowElement = document.querySelector("#cash-flow-inflow");
  const outflowElement = document.querySelector("#cash-flow-outflow");
  if (!totalElement || !progressElement || !inflowElement || !outflowElement) return;

  const recent = getRecentTransactions(0, 30);
  const inflow = recent.filter((transaction) => transaction.kind === "income").reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const outflow = recent.filter(isTrackedExpense).reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const net = inflow - outflow;
  const retention = inflow + outflow ? Math.max(0, Math.min(100, (net / inflow) * 100)) : 0;

  totalElement.textContent = `${net >= 0 ? "+" : "−"}${formatMoney(Math.abs(net))}`;
  totalElement.classList.toggle("balance-positive", net >= 0);
  totalElement.classList.toggle("balance-negative", net < 0);
  inflowElement.textContent = `In ${formatMoney(inflow)}`;
  outflowElement.textContent = `Out ${formatMoney(outflow)}`;
  progressElement.style.width = `${retention}%`;
  renderCashFlowChart();
}

function renderFinancialSummary() {
  const availableElement = document.querySelector("#available-to-save-value");
  const availableFoot = document.querySelector("#available-to-save-foot");
  const spendingElement = document.querySelector("#monthly-spending-value");
  const spendingFoot = document.querySelector("#monthly-spending-foot");
  const upcomingBillsValue = document.querySelector("#upcoming-bills-value");
  const upcomingBillsFoot = document.querySelector("#upcoming-bills-foot");
  if (!availableElement || !availableFoot || !spendingElement || !spendingFoot) return;

  const recent = getRecentTransactions(0, 30);
  const previous = getRecentTransactions(30, 60);
  const trackedRecent = recent.filter((transaction) => transaction.kind === "income" || isTrackedExpense(transaction));
  const trackedPrevious = previous.filter((transaction) => transaction.kind === "income" || isTrackedExpense(transaction));
  const recentNet = trackedRecent.reduce((sum, transaction) => sum + (transaction.kind === "income" ? Number(transaction.amount) : -Number(transaction.amount)), 0);
  const previousNet = trackedPrevious.reduce((sum, transaction) => sum + (transaction.kind === "income" ? Number(transaction.amount) : -Number(transaction.amount)), 0);
  const currentDate = new Date();
  const currentMonth = expenseData.filter((transaction) => {
    if (!transaction.date || !isTrackedExpense(transaction)) return false;
    const date = new Date(transaction.date);
    return date.getFullYear() === currentDate.getFullYear() && date.getMonth() === currentDate.getMonth();
  });
  const monthlySpending = currentMonth.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const upcomingBills = expenseData.filter((transaction) => {
    if (!transaction.date || transaction.kind === "income" || transaction.status === "rejected") return false;
    return transaction.status === "pending" || transaction.status === "review";
  });
  const upcomingBillsTotal = upcomingBills.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const netChange = recentNet - previousNet;

  availableElement.textContent = `${recentNet >= 0 ? "+" : "−"}${formatMoney(Math.abs(recentNet))}`;
  availableElement.classList.toggle("balance-positive", recentNet >= 0);
  availableElement.classList.toggle("balance-negative", recentNet < 0);
  availableFoot.className = `stat-foot ${recentNet >= 0 ? "positive" : "negative"}`;
  availableFoot.innerHTML = `${netChange >= 0 ? "↑" : "↓"} ${formatMoney(Math.abs(netChange))} <span>vs. prior 30 days</span>`;

  spendingElement.textContent = formatMoney(monthlySpending);
  spendingFoot.textContent = `${currentMonth.length} transaction${currentMonth.length === 1 ? "" : "s"} this month`;

  if (upcomingBillsValue) {
    upcomingBillsValue.textContent = formatMoney(upcomingBillsTotal);
  }
  if (upcomingBillsFoot) {
    upcomingBillsFoot.textContent = upcomingBills.length
      ? `${upcomingBills.length} upcoming item${upcomingBills.length === 1 ? "" : "s"}`
      : "No upcoming bills";
    upcomingBillsFoot.className = `stat-foot ${upcomingBillsTotal > 0 ? "negative" : "neutral"}`;
  }
}

function renderSpendingReview() {
  if (!spendingReviewResult) return;

  const recent = getRecentSpending(0, 30);
  const previous = getRecentSpending(30, 60);
  const total = recent.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const previousTotal = previous.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const categoryTotals = recent.reduce((totals, transaction) => {
    totals[transaction.category] = (totals[transaction.category] || 0) + Number(transaction.amount);
    return totals;
  }, {});
  const categoryLabels = { food: "Dining", lodging: "Housing", transport: "Transport", misc: "Other" };
  const categoryEntries = Object.entries(categoryTotals).sort(([, left], [, right]) => right - left);
  const topCategory = categoryEntries[0];
  const topTransaction = [...recent].sort((left, right) => right.amount - left.amount)[0];
  const change = previousTotal ? ((total - previousTotal) / previousTotal) * 100 : 0;
  const changeLabel = previousTotal
    ? `${Math.abs(change).toFixed(0)}% ${change >= 0 ? "higher" : "lower"} than the prior 30 days`
    : "No earlier comparison available";
  const recommendation = topCategory
    ? `${categoryLabels[topCategory[0]]} is your largest category at ${formatMoney(topCategory[1])}. Review the ${recent.filter((transaction) => transaction.category === topCategory[0]).length} related transactions before changing your monthly plan.`
    : "Add a few transactions to your history to unlock a spending recommendation.";

  spendingReviewResult.innerHTML = recent.length
    ? `
      <div class="review-summary-grid">
        <div class="review-stat"><span>Total spending</span><strong>${formatMoney(total)}</strong><small>past 30 days</small></div>
        <div class="review-stat"><span>Average per week</span><strong>${formatMoney(total / 4.2857)}</strong><small>${changeLabel}</small></div>
        <div class="review-stat"><span>Largest category</span><strong>${escapeHTML(topCategory ? categoryLabels[topCategory[0]] : "-")}</strong><small>${topCategory ? formatMoney(topCategory[1]) : "No data"}</small></div>
      </div>
      <div class="review-section"><h3>Where it went</h3>${categoryEntries.map(([category, amount]) => `<div class="review-category"><span><i class="dot ${category}-dot"></i>${categoryLabels[category]}</span><strong>${formatMoney(amount)}</strong><small>${total ? Math.round((amount / total) * 100) : 0}%</small></div>`).join("")}</div>
      <div class="review-callout"><strong>Advisor note</strong><p>${recommendation}</p></div>
      ${topTransaction ? `<div class="review-section"><h3>Largest recent transaction</h3><div class="review-largest"><span>${escapeHTML(topTransaction.title)}<small>${escapeHTML(topTransaction.dateLabel)} · ${escapeHTML(topTransaction.payer)}</small></span><strong>${formatMoney(topTransaction.amount)}</strong></div></div>` : ""}
    `
    : '<div class="review-empty"><strong>No recent spending found.</strong><span>Your last 30 days will appear here as transactions are added.</span></div>';
}

function refreshTransactionMetrics() {
  renderCashFlowOverview();
  renderFinancialSummary();
  if (spendingReviewModal && spendingReviewModal.classList.contains("open")) {
    renderSpendingReview();
  }
}

function renderBalancesPage() {
  const summary = document.querySelector("#balances-summary");
  const list = document.querySelector("#balances-list");
  if (!summary || !list) return;

  const totalGroupSpending = expenseData.filter((expense) => expense.kind !== "income" && isRealizedCashFlow(expense)).reduce((sum, expense) => sum + Number(expense.amount), 0);
  const accountBalances = getAccountBalances();
  const available = accountBalances.filter((entry) => entry.type === "available").reduce((sum, entry) => sum + Number(entry.balance), 0);
  const committed = accountBalances.filter((entry) => entry.type === "committed").reduce((sum, entry) => sum + Math.abs(Number(entry.balance)), 0);

  summary.innerHTML = `
    <article class="stat-card accent-blue">
      <div class="stat-icon">◷</div>
      <div class="stat-label">Total tracked spending</div>
      <div class="stat-value">${formatMoney(totalGroupSpending)}</div>
    </article>
    <article class="stat-card accent-green">
      <div class="stat-icon">↗</div>
      <div class="stat-label">Available across accounts</div>
      <div class="stat-value">${formatMoney(available)}</div>
    </article>
    <article class="stat-card accent-peach">
      <div class="stat-icon">↘</div>
      <div class="stat-label">Committed across accounts</div>
      <div class="stat-value">${formatMoney(committed)}</div>
    </article>
  `;

  list.innerHTML = accountBalances.map((entry) => `
    <div class="balance-row balance-row-large">
      <span class="avatar ${entry.color}">${entry.initials}</span>
      <div class="balance-name-block"><strong>${escapeHTML(entry.name)}</strong><small>${entry.type}</small></div>
      <b class="${entry.type === "available" ? "balance-positive" : "balance-negative"}">${entry.type === "available" ? "+" : "−"}${formatMoney(entry.balance)}</b>
      <button class="secondary-button settle-inline" type="button" data-settle-up>${entry.type === "available" ? "Move to savings" : "Review"}</button>
    </div>
  `).join("");
}

function renderMembersPage() {
  const list = document.querySelector("#members-list");
  const count = document.querySelector("#member-count");
  if (!list || !count) return;

  count.textContent = String(members.length);
  list.innerHTML = members.map((member) => `
    <div class="member-card">
      <div class="member-row-top">
        <span class="avatar ${member.color}">${member.initials}</span>
        <div class="member-meta">
          <strong>${escapeHTML(member.name)}</strong>
          <small>${escapeHTML(member.email)}</small>
        </div>
      </div>
      <div class="member-meta-row">
        <span>Current balance</span>
        <strong class="${getAccountBalances().find((entry) => entry.name === member.name)?.type === "available" ? "balance-positive" : "balance-negative"}">${formatMoney(getAccountBalances().find((entry) => entry.name === member.name)?.balance || 0)}</strong>
      </div>
      <div class="member-meta-row">
        <span>Role</span>
        <strong>${escapeHTML(member.role)}</strong>
      </div>
    </div>
  `).join("");
}

function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("northstarSettings") || "null");
    return { ...settingsDefaults, ...(saved || {}) };
  } catch {
    return { ...settingsDefaults };
  }
}

function getDefaultReadNotificationIds() {
  return getAllNotifications()
    .filter((notification) => !notification.defaultUnread)
    .map((notification) => notification.id);
}

function readNotificationIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(notificationReadStorageKey) || "null");
    if (Array.isArray(saved)) {
      const normalized = saved
        .filter((value) => typeof value === "string" || typeof value === "number")
        .map((value) => String(value));
      const unique = [...new Set(normalized)];
      return unique;
    }

    const defaults = getDefaultReadNotificationIds();
    saveReadNotificationIds(defaults);
    return defaults;
  } catch {
    const defaults = getDefaultReadNotificationIds();
    saveReadNotificationIds(defaults);
    return defaults;
  }
}

function saveReadNotificationIds(ids) {
  try {
    const normalized = Array.isArray(ids)
      ? [...new Set(ids.filter((value) => value !== null && value !== undefined).map((value) => String(value)))]
      : [];
    localStorage.setItem(notificationReadStorageKey, JSON.stringify(normalized));
  } catch {
    // Ignore storage write failures.
  }
}

function getVisibleNotifications() {
  const settings = readSettings();

  return getAllNotifications().filter((notification) => {
    if (notification.type === "expense" && !settings.expenseNotifications) {
      return false;
    }

    if (notification.type === "settlement" && !settings.settlementNotifications) {
      return false;
    }

    return true;
  });
}

function getUnreadNotifications() {
  const readIds = new Set(readNotificationIds());
  return getVisibleNotifications().filter((notification) => !readIds.has(notification.id));
}

function markNotificationRead(id) {
  const readIds = readNotificationIds();
  if (readIds.includes(id)) {
    renderNotifications();
    updateNotificationBadge();
    return;
  }

  saveReadNotificationIds([...readIds, id]);
  renderNotifications();
  updateNotificationBadge();
}

function markAllNotificationsRead() {
  const visibleIds = getVisibleNotifications().map((notification) => notification.id);
  const readIds = new Set(readNotificationIds());
  const nextIds = [...new Set([...readIds, ...visibleIds])];
  saveReadNotificationIds(nextIds);
  renderNotifications();
  updateNotificationBadge();
}

function updateNotificationBadge() {
  const button = document.querySelector("#notification-button");
  const dot = document.querySelector("#notification-dot");
  const unreadNotifications = getUnreadNotifications();
  const unreadCount = unreadNotifications.length;

  if (!button || !dot) return;

  const hasUnread = unreadCount > 0;
  dot.hidden = !hasUnread;
  button.setAttribute("aria-label", hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications, no unread notifications");

  const markAllButton = document.querySelector("[data-mark-all-read]");
  if (markAllButton) {
    markAllButton.disabled = !hasUnread;
  }
}

function renderNotifications() {
  const list = document.querySelector("#notification-list");
  if (!list) return;

  const visibleNotifications = getVisibleNotifications();
  const readIds = new Set(readNotificationIds());

  if (!visibleNotifications.length) {
    list.innerHTML = `
      <div class="notification-empty">
        <strong>You’re all caught up.</strong>
        <span>New money activity will appear here.</span>
      </div>
    `;
    updateNotificationBadge();
    return;
  }

  list.innerHTML = visibleNotifications.map((notification) => {
    const isUnread = !readIds.has(notification.id);
    const typeClass = notification.type === "expense" ? "expense" : "settlement";
    const icon = notification.type === "expense" ? "↗" : "◌";

    return `
      <button
        type="button"
        class="notification-item ${isUnread ? "unread" : ""}"
        data-notification-id="${escapeHTML(notification.id)}"
        data-notification-route="${escapeHTML(notification.route)}"
      >
        <span class="notification-type-icon ${typeClass}" aria-hidden="true">${icon}</span>
        <div class="notification-copy">
          <div class="notification-head">
            <strong>${escapeHTML(notification.title)}</strong>
            ${isUnread ? '<span class="notification-unread-indicator" aria-hidden="true"></span>' : ""}
          </div>
          <p>${escapeHTML(notification.message)}</p>
          <span class="notification-time">${escapeHTML(notification.time)}</span>
        </div>
      </button>
    `;
  }).join("");

  updateNotificationBadge();
}

function toggleNotificationPanel(forceOpen) {
  const button = document.querySelector("#notification-button");
  const panel = document.querySelector("#notification-panel");

  if (!button || !panel) return;

  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : button.getAttribute("aria-expanded") !== "true";
  button.setAttribute("aria-expanded", String(shouldOpen));
  panel.hidden = !shouldOpen;

  if (shouldOpen) {
    renderNotifications();
    closeWorkspaceMenu();
  }
}

function closeNotificationPanel() {
  toggleNotificationPanel(false);
}

function applyTheme(settings) {
  const enabled = Boolean(settings.darkMode);
  document.body.classList.toggle("dark-theme", enabled);
  const metaTheme = document.querySelector("meta[name='theme-color']");
  if (metaTheme) {
    metaTheme.setAttribute("content", enabled ? "#101918" : "#f6f8f5");
  }
}

function renderSettingsPage() {
  const grid = document.querySelector("#settings-grid");
  if (!grid) return;

  const settings = readSettings();
  applyTheme(settings);

  grid.innerHTML = `
    <section class="setting-card">
      <div class="card-kicker">Financial workspace</div>
      <div class="setting-header">
        <span class="avatar avatar-indigo">${settings.workspaceName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
        <div>
          <strong>${escapeHTML(settings.workspaceName)}</strong>
          <small>Workspace</small>
        </div>
      </div>
    </section>

    <section class="setting-card">
      <div class="card-kicker">Transaction preferences</div>
      <div class="setting-row"><span>Default currency</span><strong>${escapeHTML(settings.defaultCurrency)}</strong></div>
      <div class="setting-row"><span>Default split method</span><strong>${escapeHTML(settings.defaultSplitMethod)}</strong></div>
    </section>

    <section class="setting-card">
      <div class="card-kicker">Notifications</div>
      <label class="toggle-row"><span>Expense notification</span><input type="checkbox" data-setting="expenseNotifications" ${settings.expenseNotifications ? "checked" : ""} /></label>
      <label class="toggle-row"><span>Transfer notification</span><input type="checkbox" data-setting="settlementNotifications" ${settings.settlementNotifications ? "checked" : ""} /></label>
      <label class="toggle-row"><span>Dark mode</span><input type="checkbox" data-setting="darkMode" ${settings.darkMode ? "checked" : ""} /></label>
    </section>

    <section class="setting-card">
      <div class="card-kicker">Profile</div>
      <div class="setting-header">
        <span class="avatar avatar-coral">AT</span>
        <div>
          <strong>${escapeHTML(settings.profileName)}</strong>
          <small>${escapeHTML(settings.profileEmail)}</small>
        </div>
      </div>
    </section>

    <section class="setting-card danger-zone">
      <div class="card-kicker">Danger zone</div>
      <button class="secondary-button warning-button" type="button" data-placeholder-action="leave-workspace">Leave workspace</button>
      <button class="secondary-button warning-button" type="button" data-placeholder-action="delete-workspace">Delete workspace</button>
    </section>
  `;
}

function updateSettingsStorage(changes) {
  const settings = readSettings();
  const next = { ...settings, ...changes };
  localStorage.setItem("northstarSettings", JSON.stringify(next));
  applyTheme(next);
  renderSettingsPage();
  renderNotifications();
  updateNotificationBadge();
}

function toggleWorkspaceMenu(forceOpen) {
  if (!workspaceSelector || !workspaceMenu) return;
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : workspaceSelector.getAttribute("aria-expanded") !== "true";

  if (shouldOpen) {
    closeNotificationPanel();
  }

  workspaceSelector.setAttribute("aria-expanded", String(shouldOpen));
  workspaceMenu.hidden = !shouldOpen;
  workspaceSelector.setAttribute("aria-label", shouldOpen ? "Close workspace menu" : "Open workspace menu");
}

function closeWorkspaceMenu() {
  toggleWorkspaceMenu(false);
}

function openModal() {
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  const descriptionField = document.querySelector("#expense-description");
  if (descriptionField) descriptionField.focus();
}

function closeModal() {
  if (!modal) return;
  pendingExpense = null;
  if (result) {
    result.classList.remove("show");
    result.innerHTML = "";
  }
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function openTripModal() {
  if (!tripModal) return;
  tripModal.classList.add("open");
  tripModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  const descriptionField = document.querySelector("#trip-description");
  if (descriptionField) descriptionField.focus();
}

function closeTripModal() {
  if (!tripModal) return;
  tripModal.classList.remove("open");
  tripModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function openSpendingReview() {
  if (!spendingReviewModal) return;
  renderSpendingReview();
  spendingReviewModal.classList.add("open");
  spendingReviewModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeSpendingReview() {
  if (!spendingReviewModal) return;
  spendingReviewModal.classList.remove("open");
  spendingReviewModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

document.addEventListener("click", (event) => {
  const notificationButton = event.target.closest("#notification-button");
  if (notificationButton) {
    event.stopPropagation();
    const panel = document.querySelector("#notification-panel");
    const isOpen = panel && !panel.hidden;
    toggleNotificationPanel(!isOpen);
    return;
  }

  const notificationItem = event.target.closest(".notification-item");
  if (notificationItem) {
    const { notificationId, notificationRoute } = notificationItem.dataset;
    if (notificationId) {
      markNotificationRead(notificationId);
      if (notificationRoute) {
        window.location.hash = notificationRoute;
      }
    }
    closeNotificationPanel();
    return;
  }

  const markAllReadButton = event.target.closest("[data-mark-all-read]");
  if (markAllReadButton) {
    markAllNotificationsRead();
    return;
  }

  if (event.target.closest(".close-insight")) {
    dismissSmartInsight();
    return;
  }

  const reviewSpendingButton = event.target.closest("[data-review-spending]");
  if (reviewSpendingButton) {
    closeNotificationPanel();
    openSpendingReview();
    return;
  }

  const openExpenseButton = event.target.closest("[data-open-expense]");
  if (openExpenseButton) {
    closeNotificationPanel();
    openModal();
    return;
  }

  const workspaceToggle = event.target.closest("#workspace-selector");
  if (workspaceToggle) {
    event.preventDefault();
    toggleWorkspaceMenu();
    return;
  }

  const addGroupButton = event.target.closest("[data-action='add-group']");
  if (addGroupButton) {
    const statusText = "Account connection flow coming soon";
    if (workspaceStatus) {
      workspaceStatus.textContent = statusText;
    } else {
      window.alert(statusText);
    }
    closeWorkspaceMenu();
    return;
  }

  if (workspaceMenu && workspaceSelector && !workspaceMenu.contains(event.target) && !workspaceSelector.contains(event.target)) {
    closeWorkspaceMenu();
  }

  const panel = document.querySelector("#notification-panel");
  const button = document.querySelector("#notification-button");
  if (panel && button && !panel.contains(event.target) && !button.contains(event.target)) {
    closeNotificationPanel();
  }

  const filterButton = event.target.closest("[data-filter]");
  if (filterButton) {
    currentExpenseFilter = filterButton.dataset.filter || "all";
    document.querySelectorAll(".filter-chip").forEach((buttonEl) => buttonEl.classList.toggle("active", buttonEl === filterButton));
    renderExpensePage();
    closeNotificationPanel();
    return;
  }

  const typeFilterButton = event.target.closest("[data-type-filter]");
  if (typeFilterButton) {
    currentTransactionType = typeFilterButton.dataset.typeFilter || "all";
    document.querySelectorAll("[data-type-filter]").forEach((buttonEl) => buttonEl.classList.toggle("active", buttonEl === typeFilterButton));
    renderExpensePage();
    closeNotificationPanel();
    return;
  }

  const approvalButton = event.target.closest("[data-approve-member]");
  if (approvalButton) {
    event.stopPropagation();
    approveExpenseSplit(Number(approvalButton.dataset.expenseId), approvalButton.dataset.approveMember);
    return;
  }

  const reviewAction = event.target.closest("[data-review-action]");
  if (reviewAction) {
    event.stopPropagation();
    updateExpenseReview(Number(reviewAction.dataset.expenseId), reviewAction.dataset.reviewAction);
    return;
  }

  const expenseButton = event.target.closest("[data-expense-id]");
  if (expenseButton) {
    const expenseId = Number(expenseButton.dataset.expenseId);
    expandedExpenseId = expandedExpenseId === expenseId ? null : expenseId;
    renderExpensePage();
    return;
  }

  const settleButton = event.target.closest("[data-settle-up]");
  if (settleButton) {
    window.alert("Transfer flow is not implemented yet.");
    return;
  }

  const inviteButton = event.target.closest("[data-invite-member]");
  if (inviteButton) {
    window.alert("Account connection flow is not implemented yet.");
    return;
  }

  const routeLink = event.target.closest("[data-route]");
  if (routeLink) {
    closeNotificationPanel();
  }

  const placeholderAction = event.target.closest("[data-placeholder-action]");
  if (placeholderAction) {
    window.alert(`${placeholderAction.dataset.placeholderAction.replace("-", " ")} is not implemented yet.`);
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "expense-search") {
    expenseSearchText = event.target.value;
    renderExpensePage();
  }

  if (event.target.matches("[data-setting]")) {
    const changes = { [event.target.dataset.setting]: event.target.checked };
    updateSettingsStorage(changes);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "cash-flow-range") {
    renderCashFlowChart();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeWorkspaceMenu();
    closeNotificationPanel();
    closeModal();
    closeSpendingReview();
    closeTripModal();
  }
});

if (modal) {
  modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
}
const itineraryPrompt = document.querySelector("#itinerary-prompt");
const itineraryLocation = document.querySelector("#itinerary-location");
const itineraryPeople = document.querySelector("#itinerary-people");
const itineraryDays = document.querySelector("#itinerary-days");
const generateItineraryButton = document.querySelector("#generate-itinerary-button");

function toggleGenerateItineraryButton(visible) {
  if (!generateItineraryButton) return;
  generateItineraryButton.hidden = !visible;
}

function openItineraryPrompt() {
  if (!itineraryPrompt) return;
  itineraryPrompt.hidden = false;
  toggleGenerateItineraryButton(false);
  if (itineraryLocation) itineraryLocation.focus();
}

function closeItineraryPrompt() {
  if (!itineraryPrompt) return;
  itineraryPrompt.hidden = true;
  toggleGenerateItineraryButton(true);
}

if (document.querySelector("#plan-trip-button")) {
  document.querySelector("#plan-trip-button").addEventListener("click", () => {
    closeItineraryPrompt();
    openTripModal();
  });
}
if (generateItineraryButton) {
  generateItineraryButton.addEventListener("click", () => {
    openTripModal();
    openItineraryPrompt();
  });
}
if (document.querySelector("#submit-itinerary-prompt")) {
  document.querySelector("#submit-itinerary-prompt").addEventListener("click", () => {
    const location = (itineraryLocation ? itineraryLocation.value : "").trim();
    const peopleCount = Number.parseInt(itineraryPeople ? itineraryPeople.value : "", 10);
    const daysCount = Number.parseInt(itineraryDays ? itineraryDays.value : "", 10);

    if (!location) {
      if (itineraryLocation) itineraryLocation.focus();
      return;
    }
    if (!Number.isFinite(peopleCount) || peopleCount <= 0) {
      if (itineraryPeople) itineraryPeople.focus();
      return;
    }
    if (!Number.isFinite(daysCount) || daysCount <= 0) {
      if (itineraryDays) itineraryDays.focus();
      return;
    }

    const memberNames = Array.from({ length: peopleCount }, (_, index) => {
      const seededMember = members[index % members.length];
      return seededMember ? seededMember.name : `Traveler ${index + 1}`;
    });

    const itineraryText = `Create a realistic financial plan for ${location} over ${daysCount} months with ${peopleCount} contributor${peopleCount === 1 ? "" : "s"}. Include a target budget, monthly contribution, essential costs, and assumptions. Keep the plan practical and explain the tradeoffs.`;

    const descriptionField = document.querySelector("#trip-description");
    const membersField = document.querySelector("#trip-members");
    const currencyField = document.querySelector("#trip-currency");

    if (descriptionField) descriptionField.value = itineraryText;
    if (membersField) membersField.value = memberNames.join(", ");
    if (currencyField && !currencyField.value) currencyField.value = "USD";

    closeItineraryPrompt();

    if (tripForm) {
      tripForm.requestSubmit();
    }
  });
}
if (document.querySelector("#cancel-itinerary-prompt")) {
  document.querySelector("#cancel-itinerary-prompt").addEventListener("click", () => {
    closeItineraryPrompt();
  });
}
if (document.querySelector("#close-modal")) {
  document.querySelector("#close-modal").addEventListener("click", closeModal);
}
if (document.querySelector("#close-spending-review")) {
  document.querySelector("#close-spending-review").addEventListener("click", closeSpendingReview);
}
if (document.querySelector("#close-trip-modal")) {
  document.querySelector("#close-trip-modal").addEventListener("click", closeTripModal);
}

function parseMembers(value) {
  return value.split(",").map((name) => name.trim()).filter(Boolean);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(text || "Unexpected server response");
    }
  }

  if (!response.ok) {
    throw new Error(payload.error || payload.message || text || "Request failed");
  }

  return payload;
}

async function requestAnalysis(text) {
  const analysisParams = new URLSearchParams({ text });
  return requestJson(`${API_URL}/expense-analysis?${analysisParams}`, { method: "POST" });
}

function renderResult({ classification, split, source }) {
  const categoryLabels = { food: "Dining", lodging: "Housing", transport: "Transport", misc: "Other" };
  const paidBy = split.paid_by || classification.payer;
  const paidRow = paidBy ? `<div class="result-person"><span>${escapeHTML(paidBy)} · Already paid</span><b>$${Number(split.already_paid || 0).toFixed(2)}</b></div>` : "";
  const people = Object.entries(split.breakdown).filter(([person]) => person !== paidBy).map(([person, value]) => `<div class="result-person"><span>${escapeHTML(person)} · Owes</span><b>$${Number(value).toFixed(2)}</b></div>`).join("");
  const splitRows = paidRow + people;
  result.innerHTML = `<h3>${escapeHTML(classification.summary || "Transaction review")} <span style="color:#4f9b75;font-size:10px;font-family:'Manrope'">${source}</span></h3><div class="result-summary"><span class="result-pill">${categoryLabels[classification.category]}</span><span class="result-pill">${classification.split_hint === "equal" ? "Split equally" : "Excluded named guest"}</span><span class="result-pill">${classification.amount_confidence} confidence</span></div><div class="result-breakdown">${splitRows}</div><div class="analysis-actions"><button class="secondary-button" type="button" data-cancel-expense>Cancel</button><button class="primary-button" type="button" data-confirm-expense>Confirm transaction</button></div>`;
  result.classList.add("show");
}

function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value) || 0);
}

function renderTimeAwareGreeting() {
  const greeting = document.querySelector("#welcome-greeting-text");
  const currentDate = document.querySelector("#current-date");
  const now = new Date();

  if (currentDate) {
    currentDate.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(now);
  }

  if (!greeting) return;

  const hour = now.getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  greeting.textContent = `Good ${timeOfDay}, Alex`;
}

function renderTripAnalysis(analysis) {
  const currency = analysis.currency || "USD";
  const breakdown = Object.entries(analysis.split || {}).map(([person, amount]) => `<div class="result-person"><span>${escapeHTML(person)}</span><b>${formatMoney(amount, currency)}</b></div>`).join("");
  const costs = (analysis.cost_breakdown || []).map((cost) => `<div class="trip-cost"><span>${escapeHTML(cost.item)}</span><b>${formatMoney(cost.amount, currency)}</b><small>${escapeHTML(cost.assumption)}</small></div>`).join("");
  const assumptions = (analysis.assumptions || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("");
  const questions = (analysis.questions || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("");
  tripResult.innerHTML = `<div class="trip-total"><span>Estimated goal budget</span><strong>${formatMoney(analysis.estimated_total, currency)}</strong><small>${escapeHTML(analysis.confidence || "medium")} confidence · ${escapeHTML(analysis.source || "Nemotron")}</small></div><div class="trip-per-person"><span>Suggested monthly share</span><strong>${formatMoney(analysis.per_person, currency)}</strong></div><h3>Plan breakdown</h3><div class="trip-costs">${costs || "<p>No line items returned.</p>"}</div><h3>Suggested contributions</h3><div class="result-breakdown">${breakdown}</div>${assumptions ? `<div class="trip-notes"><strong>Assumptions</strong><ul>${assumptions}</ul></div>` : ""}${questions ? `<div class="trip-notes trip-questions"><strong>Worth clarifying</strong><ul>${questions}</ul></div>` : ""}`;
  tripResult.classList.add("show");
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";
    result.classList.remove("show");
    const text = document.querySelector("#expense-description").value.trim();
    if (!text) {
      errorMessage.textContent = "Describe the transaction and include its amount.";
      return;
    }
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.innerHTML = "<span>◌</span> Analyzing…";
    try {
      const analysis = await requestAnalysis(text);
      pendingExpense = { analysis, description: text };
      renderResult(analysis);
    } catch (error) {
      errorMessage.textContent = error.message || "splitsense could not analyze this transaction.";
    } finally {
      submit.disabled = false;
      submit.innerHTML = "<span>✦</span> Analyze transaction";
    }
  });
}

if (result) {
  result.addEventListener("click", (event) => {
    if (event.target.closest("[data-cancel-expense]")) {
      closeModal();
      return;
    }

    if (event.target.closest("[data-confirm-expense]") && pendingExpense) {
      addExpenseToHistory(pendingExpense.analysis, pendingExpense.description);
      closeModal();
    }
  });
}

async function submitTripAnalysisRequest(trip, currency, group) {
  const params = new URLSearchParams({ goal: trip, currency });
  group.forEach((person) => params.append("group", person));

  const analysis = await requestJson(`${API_URL}/goal-analysis?${params}`, { method: "POST" });
  renderTripAnalysis(analysis);
}

if (tripForm) {
  tripForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    tripError.textContent = "";
    tripResult.classList.remove("show");

    const trip = document.querySelector("#trip-description").value.trim();
    const currency = document.querySelector("#trip-currency").value;
    const group = parseMembers(document.querySelector("#trip-members").value);

    if (!trip || group.length === 0) {
      tripError.textContent = "Add goal details and at least one contributor.";
      return;
    }

    const submit = tripForm.querySelector("button[type=submit]");
    if (submit) {
      submit.disabled = true;
      submit.innerHTML = "<span>◌</span> Asking Nemotron…";
    }

    try {
      await submitTripAnalysisRequest(trip, currency, group);
    } catch (error) {
      tripError.textContent = error.message || "Nemotron could not analyze this financial goal.";
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.innerHTML = "<span>✦</span> Estimate plan";
      }
    }
  });
}

if (!window.location.hash) {
  history.replaceState(null, "", "#overview");
}

window.addEventListener("hashchange", renderRoute);
renderOverviewExpenses();
refreshTransactionMetrics();
renderOverviewBalances();
renderOverviewMembers();
renderExpensePage();
renderBalancesPage();
renderMembersPage();
renderSettingsPage();
renderNotifications();
updateNotificationBadge();
renderTimeAwareGreeting();
renderRoute();
