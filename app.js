/**
 * app.js — QA Testing Report Dashboard
 * Full-width layout · Accordion sidebar · Content tabs · No API
 */

/* ─── Configuration ──────────────────────────────────────────── */
const MONTHS = [
  { key: "all", label: "Overall Review" },
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

const ALL_CATEGORIES = ["UI", "UX", "Functionality", "Logical", "Performance"];

const ALL_IMPACTS = [
  { key: "S1", label: "S1 – Critical" },
  { key: "S2", label: "S2 – Major" },
  { key: "S3", label: "S3 – Minor" },
  { key: "S4", label: "S4 – Low" },
];

/* ─── State ──────────────────────────────────────────────────── */
let activeMonth = "all";
let activeDateRange = null;
let activeModuleFilter = null;
let activeCategoryFilter = null;
let activeImpactFilter = null;
let searchQuery = "";
let activeContentTab = "overall-all"; // "observations" | "overall-month" | "overall-all"
let expandedSections = { dates: true, modules: true, categories: true, impacts: true };

/* ─── Pure Helpers ───────────────────────────────────────────── */
function allRows() { return REPORT_DATA || []; }

function rowsForMonth(key) {
  if (key === "all") return allRows();
  return allRows().filter(r => r._month === key);
}
function dateRangesForMonth(key) {
  return [...new Set(rowsForMonth(key).map(r => r["Date Range"]))].filter(Boolean).sort();
}
function rowsForDateRange(dr) {
  return allRows().filter(r => r["Date Range"] === dr);
}
function uniqueModules(rows) {
  return [...new Set(rows.map(r => r["Modules"]))].filter(Boolean);
}

function getModuleClass(n) {
  const s = (n || "").toLowerCase();
  if (s.includes("production")) return "mod-production";
  if (s.includes("heat")) return "mod-heat";
  return "mod-default";
}
function getModuleIcon(n) {
  const s = (n || "").toLowerCase();
  for (const [k, v] of Object.entries(MODULE_ICONS)) if (s.includes(k)) return v;
  return MODULE_ICONS.default;
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

/* ─── Filter Pipeline ────────────────────────────────────────── */
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

/* ─── Selection Handlers ─────────────────────────────────────── */
function selectMonth(key) {
  activeMonth = key;
  activeDateRange = null;
  activeModuleFilter = null;
  activeCategoryFilter = null;
  activeImpactFilter = null;
  searchQuery = "";
  activeContentTab = key === "all" ? "overall-all" : "observations";
  renderAll();
}
function selectDateRange(dr) {
  activeDateRange = (activeDateRange === dr) ? null : dr;
  activeModuleFilter = null;
  searchQuery = "";
  renderAll();
}
function selectModule(m) { activeModuleFilter = m; renderAll(); }
function selectCategory(c) { activeCategoryFilter = c; renderAll(); }
function selectImpact(i) { activeImpactFilter = i; renderAll(); }

function toggleSection(key) {
  expandedSections[key] = !expandedSections[key];
  renderSidebar();
}
function switchContentTab(tab) {
  activeContentTab = tab;
  renderContentPanel();
}

/* ─── Month Tabs ─────────────────────────────────────────────── */
function renderMonthTabs() {
  const container = document.getElementById("month-tabs");
  container.innerHTML = "";
  MONTHS.forEach(m => {
    const count = rowsForMonth(m.key).length;
    const btn = document.createElement("button");
    btn.className = "month-tab" + (m.key === activeMonth ? " active" : "");
    if (m.key === "all") btn.classList.add("tab-overall");
    btn.innerHTML = `
      <span class="material-icons-round">${m.key === "all" ? "layers" : "calendar_month"}</span>
      ${m.label}
      ${count > 0 ? `<span class="tab-count">${count}</span>` : ""}
    `;
    btn.addEventListener("click", () => selectMonth(m.key));
    container.appendChild(btn);
  });
}

/* ─── Sidebar Accordion ──────────────────────────────────────── */
function renderSidebar() {
  const isAll = activeMonth === "all";

  /* Date Range */
  const dateRanges = !isAll ? dateRangesForMonth(activeMonth) : [];
  const drItems = dateRanges.map(dr => ({
    id: dr, label: dr,
    active: activeDateRange === dr,
    onClick: `selectDateRange('${dr.replace(/'/g, "\\'")}')`,
  }));
  renderSbSection("dates", "date_range", "sb-icon-dates", "Date Range",
    drItems, { hidden: isAll });

  /* Modules */
  const baseRows = activeDateRange ? rowsForDateRange(activeDateRange) : rowsForMonth(activeMonth);
  const mods = uniqueModules(baseRows);
  const modItems = [
    { id: null, label: "All Modules", active: !activeModuleFilter, onClick: "selectModule(null)", icon: "grid_view" },
    ...mods.map(m => ({
      id: m, label: m, active: activeModuleFilter === m,
      onClick: `selectModule('${m.replace(/'/g, "\\'")}')`,
      icon: getModuleIcon(m), colorCls: getModuleClass(m),
    })),
  ];
  renderSbSection("modules", "widgets", "sb-icon-modules", "Modules", modItems, { count: mods.length });

  /* Category */
  const catItems = [
    { id: null, label: "All", active: !activeCategoryFilter, onClick: "selectCategory(null)" },
    ...ALL_CATEGORIES.map(c => ({
      id: c, label: c, active: activeCategoryFilter === c,
      onClick: `selectCategory('${c}')`, colorCls: getCategoryClass(c),
    })),
  ];
  renderSbSection("categories", "label", "sb-icon-category", "Category", catItems, { count: ALL_CATEGORIES.length });

  /* Impact */
  const impItems = [
    { id: null, label: "All", active: !activeImpactFilter, onClick: "selectImpact(null)" },
    ...ALL_IMPACTS.map(({ key, label }) => ({
      id: key, label, active: activeImpactFilter === key,
      onClick: `selectImpact('${key}')`, colorCls: getImpactClass(key + " "),
    })),
  ];
  renderSbSection("impacts", "bolt", "sb-icon-impact", "Impact", impItems, { count: ALL_IMPACTS.length });
}

function renderSbSection(key, icon, iconClass, label, items, opts = {}) {
  const el = document.getElementById(`sb-sect-${key}`);
  if (!el) return;
  if (opts.hidden) { el.style.display = "none"; return; }
  el.style.display = "";

  const expanded = expandedSections[key];
  const activeItem = items.find(i => i.active && i.id !== null);
  const count = opts.count ?? Math.max(0, items.length - 1);

  el.innerHTML = `
    <div class="sb-hdr" onclick="toggleSection('${key}')">
      <div class="sb-icon ${iconClass}">
        <span class="material-icons-round">${icon}</span>
      </div>
      <span class="sb-label">${label}</span>
      ${activeItem
      ? `<span class="sb-active-dot"></span>`
      : `<span class="sb-count">${count}</span>`}
      <span class="material-icons-round sb-chevron ${expanded ? "open" : ""}">expand_more</span>
    </div>
    ${expanded ? `
      <div class="sb-body">
        ${items.map(item => `
          <div class="sb-item ${item.active ? "active" : ""}" onclick="${item.onClick}">
            ${item.icon
          ? `<span class="material-icons-round sb-item-icon">${item.icon}</span>`
          : `<span class="sb-dot "></span>`}
            <span class="sb-item-txt">${item.label}</span>
            <span class="material-icons-round sb-arr">chevron_right</span>
          </div>
        `).join("")}
      </div>
    ` : ""}
  `;
}

/* ─── Table Builder ──────────────────────────────────────────── */
function buildTableHTML(rows) {
  if (!rows.length) {
    return `<tr><td colspan="8" class="empty-cell">
      <span class="material-icons-round">search_off</span>
      No observations match the current filters.
    </td></tr>`;
  }
  return rows.map((r, i) => {
    const linkHtml = r["Links"]
      ? `<a href="${r["Links"]}" target="_blank" rel="noopener">
           <span class="material-icons-round">open_in_new</span>View
         </a>`
      : `<span class="no-val">—</span>`;
    return `
      <tr>
        <td class="sn-cell">${r["Sn"] || i + 1}</td>
        <td class="nowrap">${r["Date Range"] || ""}</td>
        <td><span class="module-badge ${getModuleClass(r["Modules"])}">${r["Modules"] || ""}</span></td>
        <td>${r["Sub-Modules"] || ""}</td>
        <td class="obs-cell"><div class="obs-truncate">${(r["Observations"] || "").replace(/\n/g, "<br>")}</div></td>
        <td><span class="cat-badge ${getCategoryClass(r["Error Category"])}">${r["Error Category"] || "—"}</span></td>
        <td><span class="imp-badge ${getImpactClass(r["Error Impact"])}">${r["Error Impact"] || "—"}</span></td>
        <td class="link-cell">${linkHtml}</td>
      </tr>`;
  }).join("");
}

function renderTable(rows) {
  const tbody = document.getElementById("table-body");
  if (!tbody) return;
  let filtered = rows;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
  }
  const countEl = document.getElementById("result-count");
  if (countEl) countEl.textContent = `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`;
  tbody.innerHTML = buildTableHTML(filtered);
}

/* ─── Overall Review Builder ─────────────────────────────────── */
function buildOverallHTML(rows) {
  if (!rows.length) return `<div class="review-error">No data available for the current filters.</div>`;

  const groups = {};
  rows.forEach(r => {
    const key = `${r["Modules"] || "Unknown"}::${r["Sub-Modules"] || "General"}`;
    if (!groups[key]) groups[key] = { mod: r["Modules"] || "Unknown", subMod: r["Sub-Modules"] || "General", items: [] };
    groups[key].items.push(r);
  });

  const sorted = Object.values(groups).sort((a, b) => {
    const aS = new Set(a.items.map(r => r["Date Range"])).size;
    const bS = new Set(b.items.map(r => r["Date Range"])).size;
    return bS !== aS ? bS - aS : b.items.length - a.items.length;
  });

  const recurring = sorted.filter(g => new Set(g.items.map(r => r["Date Range"])).size > 1).length;

  return `
    <div class="review-summary-bar">
      <span><strong>${sorted.length}</strong> sub-modules</span>
      <span class="rv-sep">·</span>
      <span><strong>${rows.length}</strong> observations</span>
      <span class="rv-sep">·</span>
      <span class="rv-recurring"><span class="material-icons-round">loop</span><strong>${recurring}</strong> recurring</span>
    </div>
    <div class="review-body">
      ${sorted.map(g => {
    const periods = [...new Set(g.items.map(r => r["Date Range"]))];
    const isRecurring = periods.length > 1;
    return `
          <div class="review-group ${isRecurring ? "review-recurring" : ""}">
            <div class="review-group-hdr">
              <span class="module-badge ${getModuleClass(g.mod)}">${g.mod}</span>
              <span class="review-submod">${g.subMod}</span>
              ${isRecurring ? `<span class="recurring-badge"><span class="material-icons-round">loop</span>${periods.length} periods</span>` : ""}
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
                  </div>
                </div>
              `).join("")}
            </div>
          </div>`;
  }).join("")}
    </div>`;
}

/* ─── Content Panel ──────────────────────────────────────────── */
function renderContentPanel() {
  const main = document.getElementById("main-content");

  /* ── Overall Review (all months) ── */
  if (activeMonth === "all") {
    const rows = applyFilters(allRows());
    main.innerHTML = `
      <div class="section-heading">
        <span class="material-icons-round" style="color:#4f46e5">layers</span>
        <h2>Overall Review — All Months</h2>
        <span class="badge">${rows.length} observations</span>
      </div>
      ${buildOverallHTML(rows)}`;
    return;
  }

  /* ── Prompt: no date range yet ── */
  if (!activeDateRange) {
    main.innerHTML = `
      <div class="select-prompt">
        <span class="material-icons-round">touch_app</span>
        <p>Select a <strong>date range</strong> from the left panel to view observations.</p>
      </div>`;
    return;
  }

  /* ── Month view with tabs ── */
  const drRows = rowsForDateRange(activeDateRange);
  const filtered = applyFilters(drRows);
  const monthLabel = MONTHS.find(m => m.key === activeMonth)?.label ?? activeMonth;
  const filterBadge = [
    activeModuleFilter ? activeModuleFilter : null,
    activeCategoryFilter ? activeCategoryFilter : null,
    activeImpactFilter ? activeImpactFilter : null,
  ].filter(Boolean).join(" · ");

  const isObs = activeContentTab === "observations";
  const isOverall = activeContentTab === "overall-month";

  main.innerHTML = `
    <div class="content-tabs">
      <button class="content-tab ${isObs ? "active" : ""}" onclick="switchContentTab('observations')">
        <span class="material-icons-round">table_view</span>Observations
      </button>
      <button class="content-tab ${isOverall ? "active" : ""}" onclick="switchContentTab('overall-month')">
        <span class="material-icons-round">summarize</span>Overall – ${monthLabel}
      </button>
    </div>

    <!-- Observations panel -->
    <div id="panel-obs" ${isObs ? "" : 'style="display:none"'}>
      <div class="table-toolbar">
        <div class="table-search">
          <span class="material-icons-round">search</span>
          <input type="text" id="search-input" placeholder="Search observations…" value="${searchQuery}">
        </div>
        ${filterBadge ? `<span class="filter-badge">${filterBadge}</span>` : ""}
        <span class="table-result-count" id="result-count"></span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Date Range</th><th>Module</th><th>Sub-Module</th>
              <th>Observation</th><th>Category</th><th>Impact</th><th>Link</th>
            </tr>
          </thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    </div>

    <!-- Overall month panel -->
    <div id="panel-overall" ${isOverall ? "" : 'style="display:none"'}>
      ${buildOverallHTML(applyFilters(drRows))}
    </div>
  `;

  if (isObs) {
    document.getElementById("search-input").addEventListener("input", e => {
      searchQuery = e.target.value.trim();
      renderTable(filtered);
    });
    renderTable(filtered);
  }
}

/* ─── Master Render ──────────────────────────────────────────── */
function renderAll() {
  renderMonthTabs();
  renderSidebar();
  renderContentPanel();
}

/* ─── Boot ───────────────────────────────────────────────────── */
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
  renderAll();
});
