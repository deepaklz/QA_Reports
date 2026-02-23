/**
 * app.js — QA Testing Report Dashboard
 * Sidebar layout: Modules, Category, Impact filters.
 * Overall Review: client-side recurring-bug grouping, no API.
 */

/* ─── Configuration ──────────────────────────────────────── */
const MONTHS = [
  { key: "Feb 2026", label: "February 2026" },
  { key: "Mar 2026", label: "March 2026" },
  { key: "Apr 2026", label: "April 2026" },
  { key: "May 2026", label: "May 2026" },
  { key: "Jun 2026", label: "June 2026" },
];

const MODULE_ICONS = {
  "production": "factory",
  "heat": "local_fire_department",
  "inventory": "inventory_2",
  "purchase": "shopping_cart",
  "quality": "verified",
  "default": "widgets",
};

const ALL_CATEGORIES = ["UI", "UX", "Functionality", "Logical/Business Logic", "Performance"];

const ALL_IMPACTS = [
  { key: "S1", label: "S1 – Critical" },
  { key: "S2", label: "S2 – Major" },
  { key: "S3", label: "S3 – Minor" },
  { key: "S4", label: "S4 – Cosmetic" },
];

/* ─── State ──────────────────────────────────────────────── */
let activeMonth = MONTHS[0].key;
let activeDateRange = null;
let activeModuleFilter = null;
let activeCategoryFilter = null;
let activeImpactFilter = null;
let searchQuery = "";

/* ─── Pure Helpers ───────────────────────────────────────── */
function rowsForMonth(monthKey) {
  return (REPORT_DATA || []).filter(r => r._month === monthKey);
}
function dateRangesForMonth(monthKey) {
  return [...new Set(rowsForMonth(monthKey).map(r => r["Date Range"]))].filter(Boolean).sort();
}
function rowsForDateRange(dr) {
  return (REPORT_DATA || []).filter(r => r["Date Range"] === dr);
}
function uniqueModules(rows) {
  return [...new Set(rows.map(r => r["Modules"]))].filter(Boolean);
}

function getModuleClass(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("production")) return "mod-production";
  if (n.includes("heat")) return "mod-heat";
  return "mod-default";
}
function getModuleIcon(name) {
  const n = (name || "").toLowerCase();
  for (const [k, icon] of Object.entries(MODULE_ICONS)) {
    if (n.includes(k)) return icon;
  }
  return MODULE_ICONS.default;
}
function getStatusClass(s) {
  const v = (s || "").toLowerCase();
  if (v === "fixed" || v === "resolved" || v === "closed") return "status-fixed";
  if (v === "in review" || v === "review") return "status-review";
  return "status-open";
}
function getCategoryClass(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("ux")) return "cat-ux";
  if (c.includes("ui")) return "cat-ui";
  if (c.includes("logical") || c.includes("business")) return "cat-logic";
  if (c.includes("performance")) return "cat-perf";
  return "cat-func";
}
function getImpactClass(imp) {
  const i = (imp || "").toLowerCase();
  if (i.startsWith("s1")) return "imp-s1";
  if (i.startsWith("s2")) return "imp-s2";
  if (i.startsWith("s3")) return "imp-s3";
  return "imp-s4";
}

/* ─── Filter Pipeline ───────────────────────────────────── */
function applyFilters(rows) {
  return rows.filter(r => {
    if (activeModuleFilter && r["Modules"] !== activeModuleFilter) return false;
    if (activeCategoryFilter && r["Error Category"] !== activeCategoryFilter) return false;
    if (activeImpactFilter && !(r["Error Impact"] || "").startsWith(activeImpactFilter)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return Object.values(r).some(v => String(v).toLowerCase().includes(q));
    }
    return true;
  });
}

/* ─── Selection Handlers ────────────────────────────────── */
function selectDateRange(dr) {
  activeDateRange = (activeDateRange === dr) ? null : dr;
  activeModuleFilter = null;
  searchQuery = "";
  renderAll();
}
function selectModule(m) {
  activeModuleFilter = m;
  renderAll();
}
function selectCategory(c) {
  activeCategoryFilter = c;
  renderAll();
}
function selectImpact(i) {
  activeImpactFilter = i;
  renderAll();
}

/* ─── Render: Month Tabs ────────────────────────────────── */
function renderMonthTabs() {
  const container = document.getElementById("month-tabs");
  container.innerHTML = "";
  MONTHS.forEach(m => {
    const count = rowsForMonth(m.key).length;
    const btn = document.createElement("button");
    btn.className = "month-tab" + (m.key === activeMonth ? " active" : "");
    btn.innerHTML = `
      <span class="material-icons-round">calendar_month</span>
      ${m.label}
      ${count > 0 ? `<span class="tab-count">${count}</span>` : ""}
    `;
    btn.addEventListener("click", () => {
      activeMonth = m.key;
      activeDateRange = null;
      activeModuleFilter = null;
      activeCategoryFilter = null;
      activeImpactFilter = null;
      searchQuery = "";
      document.getElementById("review-panel").style.display = "none";
      renderAll();
    });
    container.appendChild(btn);
  });
}

/* ─── Render: Sidebar ───────────────────────────────────── */
function renderSidebar() {
  renderSidebarDates();
  renderSidebarModules();
  renderSidebarCategories();
  renderSidebarImpacts();
}

function renderSidebarDates() {
  const el = document.getElementById("sidebar-dates");
  const ranges = dateRangesForMonth(activeMonth);
  if (!ranges.length) {
    el.innerHTML = `<div class="sidebar-empty">No data for this month yet</div>`;
    return;
  }
  el.innerHTML = ranges.map(dr => `
    <button class="sidebar-pill date-pill ${activeDateRange === dr ? "active" : ""}"
            onclick="selectDateRange('${dr.replace(/'/g, "\\'")}')">
      <span class="material-icons-round">schedule</span>
      ${dr}
    </button>
  `).join("");
}

function renderSidebarModules() {
  const el = document.getElementById("sidebar-modules");
  const base = activeDateRange ? rowsForDateRange(activeDateRange) : rowsForMonth(activeMonth);
  const mods = uniqueModules(base);
  if (!mods.length) {
    el.innerHTML = `<div class="sidebar-empty">—</div>`;
    return;
  }
  const html = [`<button class="sidebar-pill ${!activeModuleFilter ? "active" : ""}" onclick="selectModule(null)">All</button>`];
  mods.forEach(m => {
    html.push(`
      <button class="sidebar-pill ${getModuleClass(m)} ${activeModuleFilter === m ? "active" : ""}"
              onclick="selectModule('${m.replace(/'/g, "\\'")}')">
        <span class="material-icons-round">${getModuleIcon(m)}</span>
        ${m}
      </button>
    `);
  });
  el.innerHTML = html.join("");
}

function renderSidebarCategories() {
  const el = document.getElementById("sidebar-categories");
  const html = [`<button class="sidebar-pill ${!activeCategoryFilter ? "active" : ""}" onclick="selectCategory(null)">All</button>`];
  ALL_CATEGORIES.forEach(c => {
    html.push(`
      <button class="sidebar-pill ${getCategoryClass(c)} ${activeCategoryFilter === c ? "active" : ""}"
              onclick="selectCategory('${c}')">
        ${c}
      </button>
    `);
  });
  el.innerHTML = html.join("");
}

function renderSidebarImpacts() {
  const el = document.getElementById("sidebar-impacts");
  const html = [`<button class="sidebar-pill ${!activeImpactFilter ? "active" : ""}" onclick="selectImpact(null)">All</button>`];
  ALL_IMPACTS.forEach(({ key, label }) => {
    html.push(`
      <button class="sidebar-pill ${getImpactClass(key + " ")} ${activeImpactFilter === key ? "active" : ""}"
              onclick="selectImpact('${key}')">
        ${label}
      </button>
    `);
  });
  el.innerHTML = html.join("");
}

/* ─── Render: Table ─────────────────────────────────────── */
function renderTable(rows) {
  const content = document.getElementById("main-content");
  const tableWrap = document.getElementById("table-body");
  const resultCount = document.getElementById("result-count");

  let filtered = rows;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
  }

  resultCount.textContent = `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    tableWrap.innerHTML = `
      <tr><td colspan="9" style="text-align:center;padding:48px;color:var(--neutral-600)">
        <span class="material-icons-round" style="font-size:40px;color:var(--neutral-400);display:block;margin-bottom:10px">search_off</span>
        No observations match your filter.
      </td></tr>`;
    return;
  }

  tableWrap.innerHTML = filtered.map((r, idx) => {
    const linkHtml = r["Links"]
      ? `<a href="${r["Links"]}" target="_blank" rel="noopener noreferrer">
           <span class="material-icons-round">open_in_new</span>Screenshot
         </a>`
      : `<span class="no-val">—</span>`;
    return `
      <tr>
        <td class="sn-cell">${r["Sn"] || idx + 1}</td>
        <td class="nowrap">${r["Date Range"] || ""}</td>
        <td><span class="module-badge ${getModuleClass(r["Modules"])}">${r["Modules"] || ""}</span></td>
        <td>${r["Sub-Modules"] || ""}</td>
        <td class="obs-cell"><div class="obs-truncate">${(r["Observations"] || "").replace(/\n/g, "<br>")}</div></td>
        <td><span class="cat-badge ${getCategoryClass(r["Error Category"])}">${r["Error Category"] || "—"}</span></td>
        <td><span class="imp-badge ${getImpactClass(r["Error Impact"])}">${r["Error Impact"] || "—"}</span></td>
        <td class="link-cell">${linkHtml}</td>
        <td><span class="status-badge ${getStatusClass(r["Status"])}">${r["Status"] || "Open"}</span></td>
      </tr>`;
  }).join("");
}

/* ─── Render: Content Panel ─────────────────────────────── */
function renderContentPanel() {
  const main = document.getElementById("main-content");

  if (!activeDateRange) {
    main.innerHTML = `
      <div class="select-prompt">
        <span class="material-icons-round">touch_app</span>
        <p>Select a <strong>date range</strong> from the left panel to view the report.</p>
      </div>`;
    return;
  }

  let rows = applyFilters(rowsForDateRange(activeDateRange));

  const activeMonthLabel = MONTHS.find(m => m.key === activeMonth)?.label ?? activeMonth;
  const filterDesc = [
    activeModuleFilter ? `Module: ${activeModuleFilter}` : null,
    activeCategoryFilter ? `Category: ${activeCategoryFilter}` : null,
    activeImpactFilter ? `Impact: ${activeImpactFilter}` : null,
  ].filter(Boolean).join(" · ");

  main.innerHTML = `
    <!-- Table section -->
    <div class="table-section">
      <div class="section-heading">
        <span class="material-icons-round" style="color:var(--primary)">table_view</span>
        <h2>Observations</h2>
        ${filterDesc ? `<span class="badge">${filterDesc}</span>` : ""}
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
              <th>Category</th>
              <th>Impact</th>
              <th>Link</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  // Wire search
  document.getElementById("search-input").addEventListener("input", e => {
    searchQuery = e.target.value.trim();
    renderTable(applyFilters(rowsForDateRange(activeDateRange)));
  });

  renderTable(rows);
}

/* ─── Render: Overall Review ────────────────────────────── */
function renderOverallReview() {
  const panel = document.getElementById("review-panel");

  // Toggle
  if (panel.style.display !== "none") {
    panel.style.display = "none";
    return;
  }

  const rows = rowsForMonth(activeMonth);
  if (!rows.length) {
    panel.innerHTML = `<div class="review-error">No data for ${activeMonth} yet.</div>`;
    panel.style.display = "block";
    return;
  }

  // Group by Module + Sub-Module
  const groups = {};
  rows.forEach(r => {
    const mod = r["Modules"] || "Unknown";
    const subMod = r["Sub-Modules"] || "General";
    const key = `${mod}::${subMod}`;
    if (!groups[key]) groups[key] = { mod, subMod, items: [] };
    groups[key].items.push(r);
  });

  // Sort: recurring first, then by count desc
  const sorted = Object.values(groups).sort((a, b) => {
    const aSpans = new Set(a.items.map(r => r["Date Range"])).size;
    const bSpans = new Set(b.items.map(r => r["Date Range"])).size;
    if (bSpans !== aSpans) return bSpans - aSpans;
    return b.items.length - a.items.length;
  });

  const total = rows.length;
  const recurring = sorted.filter(g => new Set(g.items.map(r => r["Date Range"])).size > 1).length;

  panel.innerHTML = `
    <div class="review-header">
      <span class="material-icons-round">summarize</span>
      <strong>Overall Review — ${activeMonth}</strong>
      <span class="review-meta">${sorted.length} sub-modules · ${total} observations · ${recurring} recurring</span>
      <button class="insight-close" onclick="document.getElementById('review-panel').style.display='none'">
        <span class="material-icons-round">close</span>
      </button>
    </div>
    <div class="review-body">
      ${sorted.map(g => {
    const periods = [...new Set(g.items.map(r => r["Date Range"]))];
    const recurring = periods.length > 1;
    return `
          <div class="review-group ${recurring ? "review-recurring" : ""}">
            <div class="review-group-hdr">
              <span class="module-badge ${getModuleClass(g.mod)}">${g.mod}</span>
              <span class="review-submod">${g.subMod}</span>
              ${recurring
        ? `<span class="recurring-badge"><span class="material-icons-round">loop</span>${periods.length} periods</span>`
        : ""}
              <span class="review-cnt">${g.items.length} obs</span>
            </div>
            <div class="review-items">
              ${g.items.map(r => `
                <div class="review-item">
                  <span class="review-period-tag">${r["Date Range"] || ""}</span>
                  <span class="review-obs-text">${r["Observations"] || ""}</span>
                  <div class="review-item-badges">
                    <span class="cat-badge ${getCategoryClass(r["Error Category"])}">${r["Error Category"] || "—"}</span>
                    <span class="imp-badge ${getImpactClass(r["Error Impact"])}">${r["Error Impact"] || "—"}</span>
                    <span class="status-badge ${getStatusClass(r["Status"])}">${r["Status"] || "Open"}</span>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        `;
  }).join("")}
    </div>
  `;

  panel.style.display = "block";
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ─── Master Render ─────────────────────────────────────── */
function renderAll() {
  renderMonthTabs();
  renderSidebar();

  const monthRows = rowsForMonth(activeMonth);
  if (monthRows.length === 0) {
    document.getElementById("main-content").innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round">event_note</span>
        <h3>No Reports Yet for ${MONTHS.find(m => m.key === activeMonth)?.label}</h3>
        <p>Update reports.xlsx and run <code>python convert_excel.py</code> to populate this month.</p>
      </div>`;
    return;
  }

  renderContentPanel();
}

/* ─── Boot ──────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  if (typeof REPORT_DATA === "undefined") {
    document.getElementById("main-content").innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round">warning_amber</span>
        <h3>Data Not Loaded</h3>
        <p>Run <code>python convert_excel.py</code> to generate <code>data.js</code>, then refresh.</p>
      </div>`;
    return;
  }

  document.getElementById("btn-overall-review").addEventListener("click", renderOverallReview);

  renderAll();
});
