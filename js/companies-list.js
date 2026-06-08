(function () {
  "use strict";

  const grid = document.getElementById("companiesGrid");
  function companyDetailHref(providerName, providerId) {
    return `internships.html?companyId=${encodeURIComponent(providerId)}`;
  }

  function initialsFromName(name) {
    if (!name || !String(name).trim()) return "?";
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  async function loadCompanies() {
    if (!grid) return;

    try {
      const response = await fetch(`${API_BASE}/companies`);
      if (!response.ok) throw new Error("bad status");

      const companies = await response.json();
      if (!Array.isArray(companies)) throw new Error("invalid payload");

      if (companies.length === 0) {
        grid.innerHTML =
          '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted);">' +
          "لا توجد شركات في قاعدة البيانات حتى الآن." +
          "</p>";
        return;
      }

      grid.innerHTML = companies
        .map((c) => {
          const name = escapeHtml(c.provider_name);
          const industry = escapeHtml(c.provider_type || "—");
          const city = escapeHtml(c.location || "Jordan");
          const open =
            typeof c.active_internships === "number"
              ? c.active_internships
              : parseInt(c.active_internships, 10) || 0;
          const href = companyDetailHref(c.provider_name, c.provider_id);
          const av = initialsFromName(c.provider_name);

          const ratingHtml =
            open > 0
              ? `<div class="rating">★★★★★ <small>—</small></div>`
              : `<div class="no-rating">No open listings</div>`;

          return `
            <a class="company-card company-card-link" href="${escapeHtml(href)}">
              <div class="company-avatar">${escapeHtml(av)}</div>
              <h3>${name}</h3>
              <span>${industry}</span>
              ${ratingHtml}
              <div class="company-tags">
                <span class="tag">⌾ ${city}</span>
                <span class="tag work">${open} open</span>
              </div>
            </a>`;
        })
        .join("");
    } catch (e) {
      grid.innerHTML =
        '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:#b42318;">' +
        "تعذر تحميل الشركات. تأكد من تشغيل السيرفر." +
        "</p>";
    }
  }

  loadCompanies();
})();
