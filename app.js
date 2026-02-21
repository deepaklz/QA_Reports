/**
 * app.js — Testing Report Dashboard
 * All logic for month tabs, sub-menus, module tiles, and data table.
 * Data comes from data.js (REPORT_DATA / REPORT_HEADERS).
 */

/* ─── Configuration ─────────────────────────── */
const MONTHS = [
  { key: "Feb 2026", label: "February 2026", short: "Feb 2026" },
  { key: "Mar 2026", label: "March 2026", short: "Mar 2026" },
  { key: "Apr 2026", label: "April 2026", short: "Apr 2026" },
  { key: "May 2026", label: "May 2026", short: "May 2026" },
  { key: "Jun 2026", label: "June 2026", short: "Jun 2026" },
];

// Material icon per module (keyword match)
const MODULE_ICONS = {
  "production plan": "factory",
  "heat plan": "local_fire_department",
  "inventory": "inventory_2",
  "purchase": "shopping_cart",
  "quality": "verified",
  "default": "widgets",
};

// Colour variant per module
function getModuleClass(moduleName) {
  const m = (moduleName || "").toLowerCase();
  if (m.includes("production")) return "mod-production";
  if (m.includes("heat")) return "mod-heat";
  return "mod-default";
}

function getModuleIcon(moduleName) {
  const m = (moduleName || "").toLowerCase();
  for (const [key, icon] of Object.entries(MODULE_ICONS)) {
    if (m.includes(key.split(" ")[0])) return icon;
  }
  return MODULE_ICONS.default;
}

/* ─── State ─────────────────────────────────── */
let activeMonth = MONTHS[0].key;
let activeDateRange = null;
let activeModule = null;
let searchQuery = "";

/* ─── Helpers ─────────────────────────────────*/
function rowsForMonth(monthKey) {
  return (REPORT_DATA || []).filter(r => r._month === monthKey);
}

function dateRangesForMonth(monthKey) {
  const rows = rowsForMonth(monthKey);
  return [...new Set(rows.map(r => r["Date Range"]))].sort();
}

function rowsForDateRange(dr) {
  return (REPORT_DATA || []).filter(r => r["Date Range"] === dr);
}

function uniqueModules(rows) {
  return [...new Set(rows.map(r => r["Modules"]))].filter(Boolean);
}

/* ─── Render: Month Tabs ─────────────────────── */
function renderMonthTabs() {
  const container = document.getElementById("month-tabs");
  container.innerHTML = "";

  MONTHS.forEach(m => {
    const count = rowsForMonth(m.key).length;
    const btn = document.createElement("button");
    btn.className = "month-tab" + (m.key === activeMonth ? " active" : "");
    btn.setAttribute("data-month", m.key);
    btn.innerHTML = `
      <span class="material-icons-round">calendar_month</span>
      ${m.label}
      ${count > 0 ? `<span class="tab-count">${count}</span>` : ""}
    `;
    btn.addEventListener("click", () => {
      activeMonth = m.key;
      activeDateRange = null;
      activeModule = null;
      searchQuery = "";
      renderAll();
    });
    container.appendChild(btn);
  });
}

/* ─── Render: Sub-menu ───────────────────────── */
function renderSubmenu() {
  const wrap = document.getElementById("submenu");
  wrap.innerHTML = "";

  const ranges = dateRangesForMonth(activeMonth);

  if (ranges.length === 0) {
    wrap.innerHTML = `
      <span class="submenu-empty">
        <span class="material-icons-round">event_busy</span>
        No reports available for this period yet
      </span>`;
    return;
  }

  const label = document.createElement("span");
  label.className = "submenu-label";
  label.innerHTML = `<span class="material-icons-round" style="font-size:14px;vertical-align:middle">subdirectory_arrow_right</span> Period`;
  wrap.appendChild(label);

  ranges.forEach(dr => {
    const pill = document.createElement("button");
    pill.className = "submenu-pill" + (dr === activeDateRange ? " active" : "");
    pill.innerHTML = `<span class="material-icons-round">date_range</span>${dr}`;
    pill.addEventListener("click", () => {
      activeDateRange = dr;
      activeModule = null;
      searchQuery = "";
      renderAll();
    });
    wrap.appendChild(pill);
  });
}

/* ─── Render: Stats Bar ──────────────────────── */
function renderStats(rows) {
  const total = rows.length;
  const modules = uniqueModules(rows).length;
  const withLinks = rows.filter(r => r.Links && r.Links.trim()).length;
  const statusSet = [...new Set(rows.map(r => r.Status).filter(Boolean))].length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-modules").textContent = modules;
  document.getElementById("stat-links").textContent = withLinks;
  document.getElementById("stat-status").textContent = statusSet || "—";
}

/* ─── Render: Module Tiles ───────────────────── */
function renderTiles(rows) {
  const grid = document.getElementById("tiles-grid");
  const mods = uniqueModules(rows);

  grid.innerHTML = "";

  if (mods.length === 0) {
    grid.innerHTML = `<p style="color:var(--neutral-600);font-size:.85rem">No modules found.</p>`;
    return;
  }

  mods.forEach(mod => {
    const modRows = rows.filter(r => r["Modules"] === mod);
    const icon = getModuleIcon(mod);
    const cls = getModuleClass(mod);

    const tile = document.createElement("div");
    tile.className = "tile" + (mod === activeModule ? " active" : "");
    tile.innerHTML = `
      <div class="tile-icon">
        <span class="material-icons-round">${icon}</span>
      </div>
      <div class="tile-text">
        <div class="tile-name">${mod}</div>
        <div class="tile-count">
          <span class="material-icons-round">bug_report</span>
          ${modRows.length} observation${modRows.length !== 1 ? "s" : ""}
        </div>
      </div>`;

    tile.addEventListener("click", () => {
      activeModule = (activeModule === mod) ? null : mod;
      renderAll();
    });

    grid.appendChild(tile);
  });
}

/* ─── Render: Data Table ─────────────────────── */
function renderTable(rows) {
  const tableWrap = document.getElementById("table-body");
  const resultCount = document.getElementById("result-count");

  // Apply module filter
  let filtered = rows;
  if (activeModule) {
    filtered = filtered.filter(r => r["Modules"] === activeModule);
  }

  // Apply search
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(q))
    );
  }

  resultCount.textContent = `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    tableWrap.innerHTML = `
      <tr><td colspan="7" style="text-align:center;padding:48px;color:var(--neutral-600)">
        <span class="material-icons-round" style="font-size:40px;color:var(--neutral-400);display:block;margin-bottom:10px">search_off</span>
        No observations match your filter.
      </td></tr>`;
    return;
  }

  tableWrap.innerHTML = filtered.map((r, idx) => {
    const modCls = getModuleClass(r["Modules"]);
    const statusCls = getStatusClass(r["Status"]);
    const statusTxt = r["Status"] || "Open";
    const obs = (r["Observations"] || "").replace(/\n/g, "<br>");

    const linkHtml = r["Links"]
      ? `<a href="${r["Links"]}" target="_blank" rel="noopener noreferrer"><span class="material-icons-round">open_in_new</span>View Screenshot</a>`
      : `<span style="color:var(--neutral-400);font-size:0.78rem">—</span>`;

    return `
      <tr>
        <td class="sn-cell">${r["Sn"] || idx + 1}</td>
        <td style="white-space:nowrap;font-size:0.8rem">${r["Date Range"] || ""}</td>
        <td><span class="module-badge ${modCls}">${r["Modules"] || ""}</span></td>
        <td style="font-size:0.82rem;color:var(--neutral-700)">${r["Sub-Modules"] || ""}</td>
        <td class="obs-cell"><div class="obs-truncate">${obs}</div></td>
        <td class="link-cell">${linkHtml}</td>
        <td><span class="status-badge ${statusCls}">${statusTxt}</span></td>
      </tr>`;
  }).join("");
}

function getStatusClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "fixed" || s === "resolved" || s === "closed") return "status-fixed";
  if (s === "in review" || s === "review") return "status-review";
  if (!s || s === "open" || s === "") return "status-open";
  return "status-default";
}

/* ─── Render: Content Panel ──────────────────── */
function renderContentPanel() {
  const mainContent = document.getElementById("main-content");

  if (!activeDateRange) {
    // Show a "select a period" prompt
    mainContent.innerHTML = `
      <div class="select-prompt">
        <span class="material-icons-round">touch_app</span>
        <p>Select a <strong>date range</strong> from the bar above to view the report.</p>
      </div>`;
    return;
  }

  const rows = rowsForDateRange(activeDateRange);

  mainContent.innerHTML = `
    <!-- Modules Tiles -->
    <div class="tiles-section">
      <div class="tiles-grid" id="tiles-grid"></div>
    </div>

    <!-- Data Table -->
    <div class="table-section">
      <div class="section-heading">
        <span class="material-icons-round" style="color:var(--primary)">table_view</span>
        <h2>Observations</h2>
        ${activeModule ? `<span class="badge">${activeModule}</span>` : ""}
      </div>
      <div class="table-toolbar">
        <div class="table-search">
          <span class="material-icons-round">search</span>
          <input type="text" id="search-input" placeholder="Search observations…" value="${searchQuery}">
        </div>
        <span class="table-result-count" id="result-count"></span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date Range</th>
              <th>Module</th>
              <th>Sub-Module</th>
              <th>Observation</th>
              <th>Link</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  // Wire up search
  document.getElementById("search-input").addEventListener("input", e => {
    searchQuery = e.target.value;
    renderTable(rows);
  });

  renderTiles(rows);
  renderTable(rows);
}

/* ─── Generate Insights (Gemini via secure backend) ── */
async function generateInsights() {
  const btn = document.getElementById("btn-insights");
  const panel = document.getElementById("insights-panel");

  // Determine which rows to analyse
  const rows = activeDateRange
    ? rowsForDateRange(activeDateRange)
    : rowsForMonth(activeMonth);

  if (!rows || rows.length === 0) {
    panel.style.display = "block";
    panel.innerHTML = `<div class="insight-error"><span class="material-icons-round">info</span> Please select a date range first to generate insights.</div>`;
    return;
  }

  // Loading state
  btn.disabled = true;
  btn.innerHTML = `<span class="material-icons-round spin">progress_activity</span> Generating…`;
  panel.style.display = "block";
  panel.innerHTML = `<div class="insight-loading"><span class="material-icons-round spin">progress_activity</span> Analysing observations with Gemini AI…</div>`;

  // Build prompt
  const moduleGroups = {};
  rows.forEach(r => {
    const m = r["Modules"] || "Unknown";
    if (!moduleGroups[m]) moduleGroups[m] = [];
    moduleGroups[m].push(`- [${r["Sub-Modules"]}] ${r["Observations"]} (Status: ${r["Status"] || "Open"})`);
  });

  let promptText = `You are a senior QA analyst. Below are software testing observations grouped by module for the period "${activeDateRange || activeMonth}". For each module, write:\n1. A short summary paragraph of the issues found.\n2. Specific, actionable fix suggestions for the development team.\n\nKeep the tone professional but concise. Format clearly with module names as bold headings.\n\n`;

  for (const [mod, obs] of Object.entries(moduleGroups)) {
    promptText += `**Module: ${mod}**\n${obs.join("\n")}\n\n`;
  }

  try {
    // Call our secure backend proxy — API key never touches the browser
    const res = await fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptText })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    const text = data?.text || "No response received.";

    // Render markdown-like output
    const html = text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^## (.+)$/gm, "<h3>$1</h3>")
      .replace(/^# (.+)$/gm, "<h2>$1</h2>")
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>");

    panel.innerHTML = `
      <div class="insight-header">
        <span class="material-icons-round">auto_awesome</span>
        <strong>AI Insights</strong>
        <span style="font-size:0.75rem;color:var(--neutral-600);margin-left:auto">Powered by Gemini · ${activeDateRange || activeMonth}</span>
        <button class="insight-close" onclick="document.getElementById('insights-panel').style.display='none'">
          <span class="material-icons-round">close</span>
        </button>
      </div>
      <div class="insight-body"><p>${html}</p></div>
    `;

  } catch (e) {
    panel.innerHTML = `<div class="insight-error"><span class="material-icons-round">error_outline</span> Error: ${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-icons-round">auto_awesome</span> Generate Insights`;
  }
}

/* ─── Master Render ──────────────────────────── */
function renderAll() {
  renderMonthTabs();
  renderSubmenu();

  const monthRows = rowsForMonth(activeMonth);
  if (monthRows.length === 0) {
    document.getElementById("main-content").innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round">event_note</span>
        <h3>No Reports Yet for ${MONTHS.find(m => m.key === activeMonth)?.label}</h3>
        <p>Reports will appear here once the Excel file is updated with entries for this month and <code>convert_excel.py</code> is run.</p>
      </div>`;
    return;
  }

  renderContentPanel();
}

/* ─── Boot ───────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  if (typeof REPORT_DATA === "undefined") {
    document.getElementById("main-content").innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round">warning_amber</span>
        <h3>Data Not Loaded</h3>
        <p>Please run <code>python convert_excel.py</code> in the project folder to generate <code>data.js</code>, then refresh this page.</p>
      </div>`;
    return;
  }

  // Wire insights button
  document.getElementById("btn-insights").addEventListener("click", generateInsights);

  renderAll();
});
