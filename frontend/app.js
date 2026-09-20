const API_URL = window.location.protocol === "file:" ? "http://127.0.0.1:8000" : "";
const validRoutes = new Set(["overview", "expenses", "balances", "members", "settings"]);

const members = [
  { name: "Alex Thompson", email: "alex@email.com", role: "Primary account", initials: "AT", color: "avatar-indigo" },
  { name: "Sam Parker", email: "sam@email.com", role: "Checking account", initials: "SP", color: "avatar-yellow" },
  { name: "Priya Nair", email: "priya@email.com", role: "Savings account", initials: "PN", color: "avatar-coral" },
  { name: "Leo Wong", email: "leo@email.com", role: "Credit account", initials: "LW", color: "avatar-blue" }
];

const expenseData = [
  { id: 1, title: "Rent payment", dateLabel: "Yesterday", payer: "Alex Thompson", amount: 1250, status: "settled", category: "lodging" },
  { id: 2, title: "Grocery run", dateLabel: "Sep 17", payer: "Sam Parker", amount: 118.62, status: "settled", category: "food" },
  { id: 3, title: "Electric bill", dateLabel: "Sep 16", payer: "Leo Wong", amount: 86.4, status: "pending", category: "misc" },
  { id: 4, title: "Paycheck", dateLabel: "Sep 15", payer: "Alex Thompson", amount: 2980, status: "settled", category: "misc" },
  { id: 5, title: "Public transit", dateLabel: "Sep 14", payer: "Alex Thompson", amount: 54.2, status: "pending", category: "transport" },
  { id: 6, title: "Dining out", dateLabel: "Sep 12", payer: "Sam Parker", amount: 72.8, status: "review", category: "food" },
  { id: 7, title: "Internet bill", dateLabel: "Sep 11", payer: "Priya Nair", amount: 68, status: "pending", category: "misc" },
  { id: 8, title: "Pharmacy", dateLabel: "Sep 10", payer: "Leo Wong", amount: 38.45, status: "review", category: "misc" }
];

try {
  const savedExpenses = JSON.parse(localStorage.getItem("northstarTransactions") || "[]");
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

let currentExpenseFilter = "all";
let expenseSearchText = "";
let pendingExpense = null;

function dismissSmartInsight() {
  if (!smartInsight) return;
  smartInsight.hidden = true;
  smartInsight.setAttribute("aria-hidden", "true");
}

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
    settled: { label: "Cleared", className: "status-settled" },
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
  expenseData.unshift({
    id: Date.now(),
    title: analysis.classification.summary || description,
    dateLabel: "Today",
    payer: analysis.classification.payer || "Alex",
    amount: analysis.amount,
    status: "review",
    category: analysis.classification.category
  });
  localStorage.setItem("northstarTransactions", JSON.stringify(expenseData.slice(0, 50)));
  renderOverviewExpenses();
  renderExpensePage();
  renderNotifications();
  updateNotificationBadge();
}

function renderBalancesPage() {
  const summary = document.querySelector("#balances-summary");
  const list = document.querySelector("#balances-list");
  if (!summary || !list) return;

  const totalGroupSpending = expenseData.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const owed = balanceData.filter((entry) => entry.type === "available").reduce((sum, entry) => sum + Number(entry.balance), 0);
  const owes = balanceData.filter((entry) => entry.type === "committed").reduce((sum, entry) => sum + Number(entry.balance), 0);

  summary.innerHTML = `
    <article class="stat-card accent-blue">
      <div class="stat-icon">◷</div>
      <div class="stat-label">Total tracked spending</div>
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
        <strong class="${member.role === "Primary account" ? "balance-positive" : "balance-negative"}">${member.role === "Primary account" ? "$186.40" : "-$110.20"}</strong>
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

function renderSettingsPage() {
  const grid = document.querySelector("#settings-grid");
  if (!grid) return;

  const settings = readSettings();

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
  const people = Object.entries(split.breakdown).map(([person, value]) => `<div class="result-person"><span>${escapeHTML(person)}</span><b>$${Number(value).toFixed(2)}</b></div>`).join("");
  result.innerHTML = `<h3>${escapeHTML(classification.summary || "Transaction review")} <span style="color:#4f9b75;font-size:10px;font-family:'DM Sans'">${source}</span></h3><div class="result-summary"><span class="result-pill">${categoryLabels[classification.category]}</span><span class="result-pill">${classification.amount_confidence} confidence</span></div><div class="result-breakdown">${people}</div><div class="analysis-actions"><button class="secondary-button" type="button" data-cancel-expense>Cancel</button><button class="primary-button" type="button" data-confirm-expense>Confirm transaction</button></div>`;
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
renderOverviewBalances();
renderOverviewMembers();
renderExpensePage();
renderBalancesPage();
renderMembersPage();
renderSettingsPage();
renderNotifications();
updateNotificationBadge();
renderRoute();
