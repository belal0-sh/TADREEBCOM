// Admin pages — Backend-ready version (no fake/static dataset)
applyAdminNavbar();

function adminEscHtml(value) {
  const d = document.createElement("div");
  d.textContent = value == null ? "" : String(value);
  return d.innerHTML;
}

function adminStatusClass(status) {
  const s = String(status || "Pending").toLowerCase().trim();
  if (s === "approved" || s === "active" || s === "accepted") return "accepted";
  if (s === "rejected" || s === "inactive") return "rejected";
  if (s === "closed") return "closed";
  if (s === "full") return "full";
  return "pending";
}

async function adminFetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error(`${path} failed`);
  return response.json().catch(() => null);
}

function adminSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function adminSetEmptyStats() {
  [
    "adminStudentCount", "adminApprovedCount", "adminInternshipCount", "adminApplicationCount",
    "donutTotal", "acceptedLegend", "pendingLegend", "rejectedLegend",
    "softwareEngineeringCount", "graphicDesignCount", "computerScienceCount", "dataScienceCount",
    "electricalEngineeringCount", "cybersecurityCount", "ammanCount", "irbidCount", "maanCount",
    "pendingTabCount", "approvedTabCount", "rejectedTabCount"
  ].forEach(id => adminSetText(id, 0));
  adminSetText("adminPendingSmall", "0 pending");
  adminSetText("adminActiveSmall", "0 active");
  adminSetText("adminAcceptedSmall", "0 accepted");
}

function countBy(items, getter) {
  return items.reduce((acc, item) => {
    const key = getter(item) || "";
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function loadAdminOverview() {
  const hasOverview = document.getElementById("adminStudentCount") || document.getElementById("donutTotal");
  if (!hasOverview) return;

  adminSetEmptyStats();

  try {
    const [stats, internships, companies, applications, students] = await Promise.all([
      adminFetchJson("/admin/stats").catch(() => ({})),
      adminFetchJson("/internships?admin=true").catch(() => []),
      adminFetchJson("/companies").catch(() => []),
      adminFetchJson("/applications").catch(() => []),
      adminFetchJson("/students").catch(() => []),
    ]);

    const iArr = Array.isArray(internships) ? internships : [];
    const cArr = Array.isArray(companies) ? companies : [];
    const aArr = Array.isArray(applications) ? applications : [];
    const sArr = Array.isArray(students) ? students : [];

    const approvedCompanies = cArr.filter(c =>
      String(c.status || "").toLowerCase() === "approved"
    ).length;

    const pendingCompanies = cArr.filter(c =>
      String(c.status || "").toLowerCase() === "pending"
    ).length;

    const activeInternships = iArr.filter(i =>
      ["approved", "full"].includes(String(i.status || "").toLowerCase())
    ).length;

    const accepted = aArr.filter(a =>
      ["approved", "accepted"].includes(String(a.status || "").toLowerCase())
    ).length;

    const pending = aArr.filter(a =>
      String(a.status || "").toLowerCase() === "pending"
    ).length;

    const rejected = aArr.filter(a =>
      String(a.status || "").toLowerCase() === "rejected"
    ).length;

    adminSetText("adminStudentCount", stats.students ?? sArr.length);
    adminSetText("adminApprovedCount", stats.approvedCompanies ?? approvedCompanies);
    adminSetText("adminInternshipCount", stats.internships ?? iArr.length);
    adminSetText("adminApplicationCount", stats.applications ?? aArr.length);

    adminSetText("adminPendingSmall", `${stats.pendingCompanies ?? pendingCompanies} pending`);
    adminSetText("adminActiveSmall", `${stats.activeInternships ?? activeInternships} active`);
    adminSetText("adminAcceptedSmall", `${stats.acceptedApplications ?? accepted} accepted`);

    adminSetText("donutTotal", stats.applications ?? aArr.length);
    adminSetText("acceptedLegend", stats.acceptedApplications ?? accepted);
    adminSetText("pendingLegend", stats.pendingApplications ?? pending);
    adminSetText("rejectedLegend", stats.rejectedApplications ?? rejected);

    renderAdminBreakdowns({ internships: iArr });
    renderRecentSignups([...sArr, ...cArr]);

  } catch (error) {
    console.error("admin overview fetch failed:", error);
  }
}
function renderRecentSignups(users) {
  const list = document.querySelector(".signup-list");
  if (!list) return;

  const arr = Array.isArray(users) ? users.slice(0, 5) : [];

  if (arr.length === 0) {
    list.innerHTML = `<p>No recent signups.</p>`;
    return;
  }

  list.innerHTML = arr.map(user => {
    const name =
      user.full_name ||
      user.provider_name ||
      user.username ||
      "New user";

    const type = user.provider_name ? "Company" : "Student";

    return `
      <div class="signup-item">
        <strong>${adminEscHtml(name)}</strong>
        <span>${adminEscHtml(type)}</span>
      </div>
    `;
  }).join("");
}
function renderAdminBreakdowns(stats) {
  const internships = Array.isArray(stats.internships) ? stats.internships : [];

  const majorCounts = countBy(internships, item =>
    item.target_major || item.major || "Other"
  );

  const cityCounts = countBy(internships, item =>
    item.location || item.city || "Other"
  );

  function setBar(id, count, max) {
    const numberEl = document.getElementById(id);
    if (!numberEl) return;

    numberEl.textContent = count;

    const row = numberEl.closest(".bar-row");
    const bar = row?.querySelector("i");

    if (bar) {
      const width = max > 0 ? Math.max((count / max) * 100, 4) : 0;
      bar.style.width = `${width}%`;
    }
  }

  const majorIds = {
    "Software Engineering": "softwareEngineeringCount",
    "Graphic Design": "graphicDesignCount",
    "Computer Science": "computerScienceCount",
    "Data Science": "dataScienceCount",
    "Electrical Engineering": "electricalEngineeringCount",
    "Cybersecurity": "cybersecurityCount",
    "علم الحاسوب": "computerScienceCount",
    "أمن المعلومات والشبكات": "cybersecurityCount"
  };

  const cityIds = {
    "Amman": "ammanCount",
    "amman": "ammanCount",
    "Irbid": "irbidCount",
    "irbid": "irbidCount",
    "Ma'an": "maanCount",
    "Maan": "maanCount",
    "maan": "maanCount"
  };

  const majorMax = Math.max(...Object.values(majorCounts), 0);
  const cityMax = Math.max(...Object.values(cityCounts), 0);

  Object.values(majorIds).forEach(id => setBar(id, 0, 1));
  Object.values(cityIds).forEach(id => setBar(id, 0, 1));

  Object.entries(majorCounts).forEach(([major, count]) => {
    const id = majorIds[major];
    if (id) setBar(id, count, majorMax);
  });

  Object.entries(cityCounts).forEach(([city, count]) => {
    const id = cityIds[city];
    if (id) setBar(id, count, cityMax);
  });
}

async function loadAdminCompanies(tab = "pending") {
  const list = document.getElementById("adminCompanyList");
  if (!list && !document.getElementById("pendingTabCount")) return;

  if (list) list.innerHTML = `<div class="empty-list">Loading companies...</div>`;

  try {
    const companies = await adminFetchJson("/companies");
    const arr = Array.isArray(companies) ? companies : [];
    const getStatus = c => c.status || c.provider_status || "Pending";
    const pending = arr.filter(c => /pending/i.test(getStatus(c))).length;
    const approved = arr.filter(c => /approved/i.test(getStatus(c))).length;
    const rejected = arr.filter(c => /rejected/i.test(getStatus(c))).length;

    adminSetText("pendingTabCount", pending);
    adminSetText("approvedTabCount", approved);
    adminSetText("rejectedTabCount", rejected);
    adminSetText("adminApprovedCount", approved);
    adminSetText("adminPendingSmall", `${pending} pending`);

    if (!list) return;
    const selected = arr.filter(c => getStatus(c).toLowerCase() === tab.toLowerCase());
    list.innerHTML = selected.map(company => {
      const id = company.provider_id ?? company.company_id ?? company.id;
      const name = company.provider_name || company.name || "Company";
      const industry = company.provider_type || company.industry || "—";
      const city = company.location || company.city || "—";
      const desc = company.description || company.desc || "—";
      const website = company.website || "";
      const initials = name.split(/\s+/).map(p => p[0]).join("").slice(0,2).toUpperCase() || "?";
      const status = getStatus(company);
      const isApproved = /approved/i.test(status);
      const isRejected = /rejected/i.test(status);
      const isPending = /pending/i.test(status);
      return `
        <article class="admin-company-card">
          <div class="company-avatar">${adminEscHtml(initials)}</div>
          <div>
            <h2>${adminEscHtml(name)}</h2>
            <p>${adminEscHtml(industry)} · ${adminEscHtml(city)}</p>
            <p>${adminEscHtml(desc)}</p>
            ${website ? `<a href="${adminEscHtml(website)}" target="_blank">${adminEscHtml(website)}</a>` : ""}
          </div>
          <div class="admin-actions">
            ${!isApproved ? `<button class="approve-btn" data-id="${adminEscHtml(id)}">✓ Approve</button>` : ""}
            ${!isRejected ? `<button class="reject-btn" data-id="${adminEscHtml(id)}">× Reject</button>` : ""}
            ${!isPending ? `<button class="reset-btn" data-id="${adminEscHtml(id)}">Reset</button>` : ""}
          </div>
        </article>`;
    }).join("") || `<div class="empty-list">No companies found.</div>`;

    list.querySelectorAll(".approve-btn,.reject-btn,.reset-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const status = btn.classList.contains("approve-btn") ? "Approved" : btn.classList.contains("reject-btn") ? "Rejected" : "Pending";
        await updateAdminCompanyStatus(btn.dataset.id, status, tab);
      });
    });
  } catch (error) {
    console.error("companies fetch failed:", error);
    if (list) list.innerHTML = `<div class="empty-list">Connect the backend to load companies.</div>`;
  }
}

async function updateAdminCompanyStatus(id, status, currentTab) {
  try {
    await adminFetchJson(`/companies/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    showNotification(`Company marked as ${status}`, "info");
    loadAdminCompanies(currentTab);
    loadAdminOverview();
  } catch (error) {
    alert("Could not update company status. Check the backend endpoint.");
  }
}

function setupAdminCompanyTabs() {
  const tabs = document.querySelectorAll(".admin-tabs button");
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      loadAdminCompanies(tab.dataset.tab || "pending");
    });
  });
  loadAdminCompanies("pending");
}

async function loadAdminInternships() {
  const rows = document.getElementById("adminInternshipRows");
  if (!rows && !document.getElementById("adminInternshipCount")) return;
  if (rows) rows.innerHTML = `<div class="table-row admin-intern-row"><span style="grid-column:1/-1;text-align:center;">Loading internships...</span></div>`;

  try {
    const internships = await adminFetchJson("/internships?admin=true");
    const arr = Array.isArray(internships) ? internships : [];
    adminSetText("adminInternshipCount", arr.length);
    adminSetText("adminActiveSmall", `${arr.filter(i => !/closed|inactive|rejected/i.test(i.status || "Active")).length} active`);
    if (!rows) return;

    rows.innerHTML = arr.map(item => {
      const id = item.internship_id ?? item.id;
      const title = item.title || "Internship";
      const company = item.provider_name || item.company || "—";
      const major = item.target_major || item.major || "—";
      const status = item.status || "Active";
      const applicants = item.applicants_count ?? item.applicants ?? 0;
      const createdAt = item.created_at? new Date(item.created_at).toISOString().slice(0, 10): "—";
  
      
      return `
        <div class="table-row admin-intern-row">
          
          <span>${adminEscHtml(title)}</span>
          <span>${adminEscHtml(company)}</span>
          <span>${adminEscHtml(major)}</span>
          <span><b class="status ${adminStatusClass(status)}">${adminEscHtml(status)}</b></span>
          <span>${adminEscHtml(createdAt)}</span>
          <span>${adminEscHtml(applicants)}</span>
          <span class="listing-actions">
            ${String(status).toLowerCase() !== "approved"
            ? `<button class="accept-btn admin-approve-internship" data-id="${adminEscHtml(id)}">✓ Accept</button>`
            : ""}

            ${String(status).toLowerCase() !== "rejected"
            ? `<button class="reject-btn admin-reject-internship" data-id="${adminEscHtml(id)}">× Reject</button>`
            : ""}
            
            <button class="delete-btn admin-delete-internship" data-id="${adminEscHtml(id)}">🗑 Delete</button>
          </span>
        </div>`;
    }).join("") || `<div class="table-row admin-intern-row"><span style="grid-column:1/-1;text-align:center;">No internships found.</span></div>`;

    rows.querySelectorAll(".admin-approve-internship,.admin-reject-internship").forEach(btn => {
      btn.addEventListener("click", async () => {
        const status = btn.classList.contains("admin-approve-internship") ? "Approved" : btn.classList.contains("admin-reject-internship")? "Rejected": "Pending";
        await updateAdminInternshipStatus(btn.dataset.id, status);
      });
    });

    rows.querySelectorAll(".admin-delete-internship").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete this internship?")) return;
        try {
          await adminFetchJson(`/internships/${encodeURIComponent(btn.dataset.id)}`, { method: "DELETE" });
          showNotification("Internship deleted", "info");
          loadAdminInternships();
          loadAdminOverview();
        } catch (error) {
          alert("Could not delete internship. Check the backend endpoint.");
        }
      });
    });
  } catch (error) {
    console.error("internships fetch failed:", error);
    if (rows) rows.innerHTML = `<div class="table-row admin-intern-row"><span style="grid-column:1/-1;text-align:center;">Connect the backend to load internships.</span></div>`;
  }
}

async function updateAdminInternshipStatus(id, status) {
  try {
    await adminFetchJson(`/internships/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    showNotification(`Internship marked as ${status}`, "info");
    loadAdminInternships();
    loadAdminOverview();
  } catch (error) {
    console.error("internship status update failed:", error);
    alert("Could not update internship status. Check the backend endpoint.");
  }
}

function applyAdminNavbar() {
  if (localStorage.getItem("tadreeb_user_role") !== "admin") return;
  const navActions = document.querySelector(".nav-actions");
  
  if (!navActions) return;
  const themeBtn = navActions.querySelector("#themeToggle");
  const menuBtn = navActions.querySelector("#menuBtn");
  navActions.innerHTML = "";
  if (themeBtn) navActions.appendChild(themeBtn);
  const wrap = document.createElement("div");
  wrap.className = "profile-wrap";
  wrap.innerHTML = `<button class="user-avatar">PA</button><div class="profile-menu"><strong>Platform Admin</strong><span>ADMIN</span><hr><button type="button" id="adminLogoutBtn">↪ Sign out</button></div>`;
  navActions.appendChild(wrap);
  wrap.querySelector(".user-avatar").addEventListener("click", e => { e.stopPropagation(); wrap.classList.toggle("open"); });
  wrap.querySelector("#adminLogoutBtn").addEventListener("click", () => {
    ["tadreeb_user_role", "tadreeb_user_id", "tadreeb_user_initials", "tadreeb_user_name"].forEach(k => localStorage.removeItem(k));
    notifyThenGo("Signed out", "../index.html", "info");
  });
  document.addEventListener("click", () => wrap.classList.remove("open"));
  if (menuBtn) navActions.appendChild(menuBtn);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupAdminCompanyTabs();
    loadAdminInternships();
    loadAdminOverview();
  });
} else {
  setupAdminCompanyTabs();
  loadAdminInternships();
  loadAdminOverview();
}
