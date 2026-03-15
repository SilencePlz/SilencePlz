/**
 * HA Monitor Dashboard
 * Polls the AppDaemon REST API and renders entity state, alerts, and event history.
 */

// ---------------------------------------------------------------------------
// Configuration — edit to match your AppDaemon host/port
// ---------------------------------------------------------------------------
const CONFIG = {
  // AppDaemon HTTP server URL (no trailing slash)
  apiBase: localStorage.getItem("ha_monitor_api_base") || "http://localhost:5050",
  // Refresh interval in milliseconds
  refreshInterval: 5000,
};

// ---------------------------------------------------------------------------
// Domain meta — icon and display name
// ---------------------------------------------------------------------------
const DOMAIN_META = {
  binary_sensor:  { icon: "🔍", label: "Binary Sensor" },
  climate:        { icon: "🌡️", label: "Climate" },
  cover:          { icon: "🪟", label: "Cover" },
  device_tracker: { icon: "📍", label: "Device Tracker" },
  fan:            { icon: "💨", label: "Fan" },
  light:          { icon: "💡", label: "Light" },
  lock:           { icon: "🔒", label: "Lock" },
  media_player:   { icon: "📺", label: "Media Player" },
  sensor:         { icon: "📊", label: "Sensor" },
  switch:         { icon: "🔌", label: "Switch" },
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let state = {
  summary: null,
  entities: [],
  events: [],
  alerts: [],
  selectedDomain: "all",
  searchQuery: "",
  loading: true,
  error: null,
  lastUpdated: null,
};

let refreshTimer = null;

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function apiFetch(path) {
  const res = await fetch(`${CONFIG.apiBase}/api/appdaemon/${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${path}`);
  return res.json();
}

async function fetchAll() {
  const [status, entities, events] = await Promise.all([
    apiFetch("ha_monitor"),
    apiFetch("ha_monitor_entities"),
    apiFetch("ha_monitor_events?limit=50"),
  ]);
  return { status, entities, events };
}

// ---------------------------------------------------------------------------
// Data refresh
// ---------------------------------------------------------------------------
async function refresh() {
  try {
    const { status, entities, events } = await fetchAll();
    state.summary = status.summary;
    state.alerts  = status.alerts || [];
    state.entities = entities.entities || [];
    state.events  = events.events || [];
    state.error   = null;
    state.loading = false;
    state.lastUpdated = new Date();
    setConnectionStatus("connected");
  } catch (err) {
    state.error = err.message;
    state.loading = false;
    setConnectionStatus("error");
    console.error("HA Monitor fetch error:", err);
  }
  render();
}

function startPolling() {
  refresh();
  refreshTimer = setInterval(refresh, CONFIG.refreshInterval);
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function setConnectionStatus(status) {
  const dot  = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  if (!dot || !text) return;
  dot.className = `status-dot ${status}`;
  text.textContent = status === "connected" ? "Connected" : "Error";
  if (state.lastUpdated && status === "connected") {
    text.textContent = `Updated ${state.lastUpdated.toLocaleTimeString()}`;
  }
}

function fmt(n) {
  return n === null || n === undefined ? "—" : String(n);
}

function relativeTime(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(isoString).toLocaleDateString();
}

function stateBadge(state) {
  const cls = ["on","off","unavailable","unknown"].includes(state) ? `state-${state}` : "";
  return `
    <span class="state-badge ${cls}">
      <span class="state-dot"></span>
      ${escHtml(state)}
    </span>`;
}

function batteryBar(level) {
  if (level === null || level === undefined) return "<span class='text-muted'>—</span>";
  const pct  = Math.max(0, Math.min(100, level));
  const cls  = pct <= 10 ? "critical" : pct <= 20 ? "low" : "";
  return `
    <div class="batt-bar-wrap">
      <span class="batt-value">${pct}%</span>
      <div class="batt-bar-bg">
        <div class="batt-bar-fill ${cls}" style="width:${pct}%"></div>
      </div>
    </div>`;
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Render — KPI row
// ---------------------------------------------------------------------------
function renderKPIs() {
  const s = state.summary;
  const cards = [
    {
      id: "kpi-total", cls: "kpi-blue",
      label: "Total Entities",
      value: s ? fmt(s.total_entities) : "—",
      sub: "tracked",
    },
    {
      id: "kpi-online", cls: "kpi-green",
      label: "Online",
      value: s ? fmt(s.online) : "—",
      sub: s ? `${s.total_entities - s.online} offline` : "",
    },
    {
      id: "kpi-offline", cls: s && s.offline > 0 ? "kpi-red" : "",
      label: "Offline",
      value: s ? fmt(s.offline) : "—",
      sub: "unavailable / unknown",
    },
    {
      id: "kpi-alerts", cls: s && s.total_alerts > 0 ? "kpi-yellow" : "",
      label: "Active Alerts",
      value: s ? fmt(s.total_alerts) : "—",
      sub: s ? `${s.battery_alerts || 0} battery · ${s.offline_alerts || 0} offline` : "",
    },
  ];

  cards.forEach(({ id, cls, label, value, sub }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `kpi-card ${cls}`;
    el.querySelector(".kpi-card-value").textContent = value;
    el.querySelector(".kpi-card-sub").textContent   = sub;
  });
}

// ---------------------------------------------------------------------------
// Render — sidebar domain list
// ---------------------------------------------------------------------------
function renderSidebar() {
  const container = document.getElementById("domain-list");
  if (!container) return;

  const counts = state.summary?.domain_counts || {};
  const domains = Object.keys(counts).sort();

  const allBtn = document.getElementById("domain-all");
  if (allBtn) {
    allBtn.className = `domain-btn${state.selectedDomain === "all" ? " active" : ""}`;
    const countEl = allBtn.querySelector(".domain-count");
    if (countEl) countEl.textContent = state.summary?.total_entities ?? "";
  }

  container.innerHTML = domains.map(d => {
    const meta  = DOMAIN_META[d] || { icon: "📦", label: d };
    const count = counts[d] || 0;
    const active = state.selectedDomain === d ? " active" : "";
    return `
      <button class="domain-btn${active}" data-domain="${escHtml(d)}">
        <span class="domain-icon">${meta.icon}</span>
        <span>${escHtml(meta.label)}</span>
        <span class="domain-count">${count}</span>
      </button>`;
  }).join("");

  container.querySelectorAll(".domain-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.selectedDomain = btn.dataset.domain;
      render();
    });
  });
}

// ---------------------------------------------------------------------------
// Render — alerts panel
// ---------------------------------------------------------------------------
function renderAlerts() {
  const container = document.getElementById("alerts-container");
  const badge     = document.getElementById("alerts-badge");
  if (!container) return;

  const alerts = state.alerts;
  if (badge) badge.textContent = alerts.length > 0 ? String(alerts.length) : "";

  if (!alerts.length) {
    container.innerHTML = `<div class="empty-state">✅ No active alerts</div>`;
    return;
  }

  container.innerHTML = alerts.map(a => {
    const icon = a.type === "battery" ? "🔋" : "⚠️";
    return `
      <div class="alert-item sev-${escHtml(a.severity)}">
        <span class="alert-icon">${icon}</span>
        <div class="alert-body">
          <div class="alert-msg">${escHtml(a.message)}</div>
          <div class="alert-time">${relativeTime(a.timestamp)}</div>
        </div>
      </div>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// Render — entity table
// ---------------------------------------------------------------------------
function renderEntities() {
  const tbody    = document.getElementById("entity-tbody");
  const countEl  = document.getElementById("entity-count");
  if (!tbody) return;

  let entities = state.entities;

  // Domain filter
  if (state.selectedDomain !== "all") {
    entities = entities.filter(e => e.domain === state.selectedDomain);
  }

  // Search filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    entities = entities.filter(e =>
      e.friendly_name.toLowerCase().includes(q) ||
      e.entity_id.toLowerCase().includes(q)
    );
  }

  if (countEl) countEl.textContent = `${entities.length} entities`;

  if (!entities.length) {
    tbody.innerHTML = `
      <tr><td colspan="5" class="empty-state">No entities found</td></tr>`;
    return;
  }

  tbody.innerHTML = entities.map(e => `
    <tr>
      <td>
        <div class="entity-name">${escHtml(e.friendly_name)}</div>
        <div class="entity-id">${escHtml(e.entity_id)}</div>
      </td>
      <td><span class="domain-tag">${escHtml(e.domain)}</span></td>
      <td>${stateBadge(e.state)}</td>
      <td>${batteryBar(e.battery)}</td>
      <td class="entity-id">${relativeTime(e.last_changed)}</td>
    </tr>`
  ).join("");
}

// ---------------------------------------------------------------------------
// Render — events feed
// ---------------------------------------------------------------------------
function renderEvents() {
  const container = document.getElementById("events-container");
  if (!container) return;

  const events = state.events.slice(0, 50);
  if (!events.length) {
    container.innerHTML = `<div class="empty-state">No events yet</div>`;
    return;
  }

  container.innerHTML = events.map(ev => {
    const newCls = ["on","off","unavailable","unknown"].includes(ev.new_state)
      ? ev.new_state : "";
    return `
      <div class="event-row">
        <span class="event-time">${relativeTime(ev.timestamp)}</span>
        <div class="event-name">
          <div>${escHtml(ev.friendly_name)}</div>
          <div class="event-entity">${escHtml(ev.entity_id)}</div>
        </div>
        <div class="event-transition">
          <span class="ev-old">${escHtml(ev.old_state ?? "—")}</span>
          <span class="ev-arrow">→</span>
          <span class="ev-new ${newCls}">${escHtml(ev.new_state)}</span>
        </div>
      </div>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// Master render
// ---------------------------------------------------------------------------
function render() {
  renderKPIs();
  renderSidebar();
  renderAlerts();
  renderEntities();
  renderEvents();
}

// ---------------------------------------------------------------------------
// Settings modal (API base URL)
// ---------------------------------------------------------------------------
function openSettings() {
  const current = CONFIG.apiBase;
  const input   = prompt("AppDaemon API base URL:", current);
  if (input && input !== current) {
    CONFIG.apiBase = input.replace(/\/$/, "");
    localStorage.setItem("ha_monitor_api_base", CONFIG.apiBase);
    clearInterval(refreshTimer);
    startPolling();
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Attach static event listeners
  document.getElementById("domain-all")?.addEventListener("click", () => {
    state.selectedDomain = "all";
    render();
  });

  document.getElementById("refresh-btn")?.addEventListener("click", () => {
    clearInterval(refreshTimer);
    startPolling();
  });

  document.getElementById("settings-btn")?.addEventListener("click", openSettings);

  document.getElementById("entity-search")?.addEventListener("input", e => {
    state.searchQuery = e.target.value.trim();
    renderEntities();
  });

  startPolling();
});
