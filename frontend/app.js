const API_URL = "";
const validRoutes = new Set(["overview", "expenses", "balances", "members", "settings"]);

const members = [
  { name: "Alex Thompson", email: "alex@email.com", role: "Trip owner", initials: "AT", color: "avatar-indigo" },
  { name: "Sam Parker", email: "sam@email.com", role: "Traveler", initials: "SP", color: "avatar-yellow" },
  { name: "Priya Nair", email: "priya@email.com", role: "Traveler", initials: "PN", color: "avatar-coral" },
  { name: "Leo Wong", email: "leo@email.com", role: "Traveler", initials: "LW", color: "avatar-blue" }
];

const expenseData = [
  { id: 1, title: "Dinner at Nonna's", dateLabel: "Yesterday", payer: "Alex Thompson", amount: 84, status: "review", category: "food" },
  { id: 2, title: "Airport transfer", dateLabel: "Sep 17", payer: "Priya Nair", amount: 62.5, status: "settled", category: "transport" },
  { id: 3, title: "Cabin · Night 2", dateLabel: "Sep 16", payer: "Leo Wong", amount: 420, status: "pending", category: "lodging" },
  { id: 4, title: "Groceries", dateLabel: "Sep 15", payer: "Sam Parker", amount: 118.62, status: "settled", category: "misc" },
  { id: 5, title: "Train to alpine trail", dateLabel: "Sep 14", payer: "Alex Thompson", amount: 54.2, status: "pending", category: "transport" },
  { id: 6, title: "Breakfast pastries", dateLabel: "Sep 12", payer: "Sam Parker", amount: 32.8, status: "settled", category: "food" },
  { id: 7, title: "Lodging deposit", dateLabel: "Sep 11", payer: "Priya Nair", amount: 310, status: "pending", category: "lodging" },
  { id: 8, title: "Day trip tickets", dateLabel: "Sep 10", payer: "Leo Wong", amount: 88.45, status: "review", category: "misc" }
];

const balanceData = [
  { name: "Alex Thompson", initials: "AT", color: "avatar-indigo", balance: 186.4, type: "gets back" },
  { name: "Sam Parker", initials: "SP", color: "avatar-yellow", balance: 48.6, type: "gets back" },
  { name: "Priya Nair", initials: "PN", color: "avatar-coral", balance: 110.2, type: "owes" },
  { name: "Leo Wong", initials: "LW", color: "avatar-blue", balance: 124.8, type: "owes" }
];

const notificationData = [
  {
    id: "expense-airport-transfer",
    type: "expense",
    title: "New expense added",
    message: "Priya added Airport transfer for $62.50.",
    time: "2 hours ago",
    route: "expenses"
  },
  {
    id: "settlement-sam-alex",
    type: "settlement",
    title: "Payment recorded",
    message: "Sam settled $48.60 with Alex.",
    time: "Yesterday",
    route: "balances"
  },
  {
    id: "expense-dinner-review",
    type: "expense",
    title: "Expense needs review",
    message: "Dinner at Nonna's still needs its split reviewed.",
    time: "Yesterday",
    route: "expenses"
  },
  {
    id: "settlement-leo-balance",
    type: "settlement",
    title: "Balance updated",
    message: "Leo now owes $124.80.",
    time: "Sep 17",
    route: "balances"
  }
];

const notificationReadStorageKey = "splitSenseReadNotifications";

const settingsDefaults = {
  workspaceName: "Alpine trip",
  defaultCurrency: "USD",
  defaultSplitMethod: "Even split",
  expenseNotifications: true,
  settlementNotifications: true,
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

let currentExpenseFilter = "all";
let expenseSearchText = "";

function getMemberInitials(name) {
  const member = members.find((item) => item.name === name);
  return member ? member.initials : name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}

function statusMeta(status) {
  const map = {
    settled: { label: "Settled", className: "status-settled" },
    pending: { label: "Pending", className: "status-pending" },
    review: { label: "Review split", className: "status-review" }
  };
  return map[status] || map.review;
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
    return `
      <div class="expense-row">
        <span class="category-icon ${meta.className}">${meta.icon}</span>
        <div class="expense-main"><strong>${escapeHTML(expense.title)}</strong><span>${escapeHTML(expense.payer)} paid · ${escapeHTML(expense.dateLabel)}</span></div>
        <strong class="expense-amount">${formatMoney(expense.amount)}</strong>
        <span class="expense-status ${status.className}">${status.label}</span>
      </div>
    `;
  }).join("");
}

function renderOverviewBalances() {
  const list = document.querySelector("#overview-balance-list");
  if (!list) return;

  list.innerHTML = balanceData.slice(0, 4).map((entry) => `
    <div class="balance-row">
      <span class="avatar ${entry.color}">${entry.initials}</span>
      <div><strong>${escapeHTML(entry.name)}</strong><small>${entry.type}</small></div>
      <b class="${entry.type === "gets back" ? "balance-positive" : "balance-negative"}">${entry.type === "gets back" ? "+" : "−"}${formatMoney(entry.balance)}</b>
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
    const searchTerm = expenseSearchText.trim().toLowerCase();
    const matchesSearch = !searchTerm || `${expense.title} ${expense.payer}`.toLowerCase().includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  list.innerHTML = filtered.length
    ? filtered.map((expense) => {
      const meta = categoryMeta(expense.category);
      const status = statusMeta(expense.status);
      return `
          <div class="expense-row page-expense-row">
            <span class="category-icon ${meta.className}">${meta.icon}</span>
            <div class="expense-main"><strong>${escapeHTML(expense.title)}</strong><span>${escapeHTML(expense.payer)} paid · ${escapeHTML(expense.dateLabel)}</span></div>
            <strong class="expense-amount">${formatMoney(expense.amount)}</strong>
            <span class="expense-status ${status.className}">${status.label}</span>
          </div>
        `;
    }).join("")
    : '<div class="empty-state">No expenses match the current search and filter.</div>';
}

function renderBalancesPage() {
  const summary = document.querySelector("#balances-summary");
  const list = document.querySelector("#balances-list");
  if (!summary || !list) return;

  const totalGroupSpending = expenseData.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const owed = balanceData.filter((entry) => entry.type === "gets back").reduce((sum, entry) => sum + Number(entry.balance), 0);
  const owes = balanceData.filter((entry) => entry.type === "owes").reduce((sum, entry) => sum + Number(entry.balance), 0);

  summary.innerHTML = `
    <article class="stat-card accent-blue">
      <div class="stat-icon">◷</div>
      <div class="stat-label">Total group spending</div>
      <div class="stat-value">${formatMoney(totalGroupSpending)}</div>
    </article>
    <article class="stat-card accent-green">
      <div class="stat-icon">↗</div>
      <div class="stat-label">You are owed</div>
      <div class="stat-value">${formatMoney(owed)}</div>
    </article>
    <article class="stat-card accent-peach">
      <div class="stat-icon">↘</div>
      <div class="stat-label">You owe</div>
      <div class="stat-value">${formatMoney(owes)}</div>
    </article>
  `;

  list.innerHTML = balanceData.map((entry) => `
    <div class="balance-row balance-row-large">
      <span class="avatar ${entry.color}">${entry.initials}</span>
      <div class="balance-name-block"><strong>${escapeHTML(entry.name)}</strong><small>${entry.type}</small></div>
      <b class="${entry.type === "gets back" ? "balance-positive" : "balance-negative"}">${entry.type === "gets back" ? "+" : "−"}${formatMoney(entry.balance)}</b>
      <button class="secondary-button settle-inline" type="button" data-settle-up>${entry.type === "gets back" ? "Settle" : "Settle up"}</button>
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
        <strong class="${member.role === "Trip owner" ? "balance-positive" : "balance-negative"}">${member.role === "Trip owner" ? "$186.40" : "-$110.20"}</strong>
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
    const saved = JSON.parse(localStorage.getItem("splitSenseSettings") || "null");
    return { ...settingsDefaults, ...(saved || {}) };
  } catch {
    return { ...settingsDefaults };
  }
}

function getDefaultReadNotificationIds() {
  return notificationData.filter((_, index) => index >= 2).map((notification) => notification.id);
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

  return notificationData.filter((notification) => {
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
        <span>New group activity will appear here.</span>
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

function renderSettingsPage() {
  const grid = document.querySelector("#settings-grid");
  if (!grid) return;

  const settings = readSettings();

  grid.innerHTML = `
    <section class="setting-card">
      <div class="card-kicker">Workspace</div>
      <div class="setting-header">
        <span class="avatar avatar-indigo">${settings.workspaceName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
        <div>
          <strong>${escapeHTML(settings.workspaceName)}</strong>
          <small>Workspace</small>
        </div>
      </div>
    </section>

    <section class="setting-card">
      <div class="card-kicker">Expense preferences</div>
      <div class="setting-row"><span>Default currency</span><strong>${escapeHTML(settings.defaultCurrency)}</strong></div>
      <div class="setting-row"><span>Default split method</span><strong>${escapeHTML(settings.defaultSplitMethod)}</strong></div>
    </section>

    <section class="setting-card">
      <div class="card-kicker">Notifications</div>
      <label class="toggle-row"><span>Expense notification</span><input type="checkbox" data-setting="expenseNotifications" ${settings.expenseNotifications ? "checked" : ""} /></label>
      <label class="toggle-row"><span>Settlement notification</span><input type="checkbox" data-setting="settlementNotifications" ${settings.settlementNotifications ? "checked" : ""} /></label>
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
  localStorage.setItem("splitSenseSettings", JSON.stringify(next));
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
    const statusText = "Add group flow coming soon";
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

  const settleButton = event.target.closest("[data-settle-up]");
  if (settleButton) {
    window.alert("Settlement flow is not implemented yet.");
    return;
  }

  const inviteButton = event.target.closest("[data-invite-member]");
  if (inviteButton) {
    window.alert("Invitation flow is not implemented yet.");
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeWorkspaceMenu();
    closeNotificationPanel();
    closeModal();
    closeTripModal();
  }
});

if (modal) {
  modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
}
if (tripModal) {
  tripModal.addEventListener("click", (event) => { if (event.target === tripModal) closeTripModal(); });
}

if (document.querySelector("#plan-trip-button")) {
  document.querySelector("#plan-trip-button").addEventListener("click", openTripModal);
}
if (document.querySelector("#close-modal")) {
  document.querySelector("#close-modal").addEventListener("click", closeModal);
}
if (document.querySelector("#close-trip-modal")) {
  document.querySelector("#close-trip-modal").addEventListener("click", closeTripModal);
}

function parseMembers(value) {
  return value.split(",").map((name) => name.trim()).filter(Boolean);
}

async function requestAnalysis(text) {
  const analysisParams = new URLSearchParams({ text });
  const response = await fetch(`${API_URL}/expense-analysis?${analysisParams}`, { method: "POST" });
  const analysis = await response.json();
  if (!response.ok) throw new Error(analysis.error || "Expense analysis failed");
  return analysis;
}

function renderResult({ classification, split, source }) {
  const categoryLabels = { food: "Food", lodging: "Lodging", transport: "Transport", misc: "Other" };
  const people = Object.entries(split.breakdown).map(([person, value]) => `<div class="result-person"><span>${escapeHTML(person)}</span><b>$${Number(value).toFixed(2)}</b></div>`).join("");
  result.innerHTML = `<h3>Suggested split <span style="color:#4f9b75;font-size:10px;font-family:'DM Sans'">${source}</span></h3><div class="result-summary"><span class="result-pill">${categoryLabels[classification.category]}</span><span class="result-pill">${classification.split_hint === "equal" ? "Split equally" : "Excluded named guest"}</span><span class="result-pill">${classification.amount_confidence} confidence</span></div><div class="result-breakdown">${people}</div>`;
  result.classList.add("show");
}

function formatMoney(value, currency = "USD") {
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

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";
    result.classList.remove("show");
    const text = document.querySelector("#expense-description").value.trim();
    if (!text) {
      errorMessage.textContent = "Describe the expense, including its amount and who was there.";
      return;
    }
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.innerHTML = "<span>◌</span> Analyzing…";
    try {
      const analysis = await requestAnalysis(text);
      renderResult(analysis);
    } catch (error) {
      errorMessage.textContent = error.message || "Nemotron could not analyze this expense.";
    } finally {
      submit.disabled = false;
      submit.innerHTML = "<span>✦</span> Analyze fair split";
    }
  });
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
}

if (!window.location.hash) {
  history.replaceState(null, "", "#overview");
}

window.addEventListener("hashchange", renderRoute);
renderOverviewExpenses();
renderOverviewBalances();
renderOverviewMembers();
renderExpensePage();
renderBalancesPage();
renderMembersPage();
renderSettingsPage();
renderNotifications();
updateNotificationBadge();
renderRoute();
