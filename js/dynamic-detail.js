// Internship details — Backend-ready. It clears old static demo text and loads real data from API.
(function () {
  "use strict";

  const page = document.querySelector(".detail-page");
  const applyBox = document.querySelector(".apply-interaction");
  if (!page || !applyBox) return;

  const slug = (applyBox.dataset.id || location.pathname.split("/").pop().replace(/\.html$/, "")).trim();

  function esc(value) {
    const d = document.createElement("div");
    d.textContent = value == null ? "" : String(value);
    return d.innerHTML;
  }

  function setLoadingState() {
    const title = document.querySelector(".role-detail-card h1");
    const company = document.querySelector(".role-detail-card .company");
    const desc = document.querySelector(".role-detail-card h2 + p");
    const avatar = document.querySelector(".big-avatar");
    const tags = document.querySelector(".detail-tags");
    const side = document.querySelector("aside .side-card");

    if (title) title.textContent = "Loading internship...";
    if (company) company.textContent = "Loading company...";
    if (desc) desc.textContent = "This internship will be loaded from the backend.";
    if (avatar) avatar.textContent = "—";
    if (tags) tags.innerHTML = `<span class="tag">⌾ —</span><span class="tag">◷ —</span><span class="tag duration">—</span><span class="tag" id="detailApplicantsCount">0 applicants</span>`;
    if (side) side.innerHTML = `<h2>About company</h2><p>Company information will be loaded from the backend.</p>`;
  }

  function fillDetails(item) {
    const title = item.title || "Internship";
    const companyName = item.provider_name || item.company || "Company";
    const initials = companyName.split(/\s+/).map(p => p[0]).join("").slice(0,2).toUpperCase() || "?";
    const locationText = item.location || item.city || "Jordan";
    const duration = item.duration || item.training_duration || "—";
    const major = item.target_major || item.major || "—";
    const work = item.work_type || item.category || "—";
    const description = item.training_nature || item.description || "—";
    const applicants = Number(item.applicants_count ?? item.applicants ?? item.current_applicants ?? 0) || 0;
    const maxRaw = item.max_applicants ?? item.maxApplicants ?? item.capacity ?? item.applicants_limit;
    const maxApplicants = Number(maxRaw);
    const hasMaxApplicants = Number.isFinite(maxApplicants) && maxApplicants > 0;
    const isFull = hasMaxApplicants && applicants >= maxApplicants;
    const capacityText = hasMaxApplicants ? `${applicants}/${maxApplicants} applicants` : `${applicants} applicants`;

    document.title = `${title} | TADREEBCOM`;
    const h1 = document.querySelector(".role-detail-card h1");
    const company = document.querySelector(".role-detail-card .company");
    const avatar = document.querySelector(".big-avatar");
    const workTag = document.querySelector(".role-detail-card .tag.work");
    const desc = document.querySelector(".role-detail-card h2 + p");
    const tags = document.querySelector(".detail-tags");

    if (h1) h1.textContent = title;
    if (company) company.textContent = companyName;
    if (avatar) avatar.textContent = initials;
    if (workTag) workTag.textContent = work;
    if (desc) desc.textContent = description;
    if (tags) tags.innerHTML = `<span class="tag">⌾ ${esc(locationText)}</span><span class="tag">◷ ${esc(duration)}</span><span class="tag duration">${esc(major)}</span><span class="tag" id="detailApplicantsCount">${esc(capacityText)}${isFull ? " • Full" : ""}</span>`;

    applyBox.dataset.internshipId = item.internship_id ?? item.id ?? "";
    applyBox.dataset.title = title;
    applyBox.dataset.company = companyName;
    applyBox.dataset.initials = initials;
    applyBox.dataset.maxApplicants = hasMaxApplicants ? String(maxApplicants) : "";
    applyBox.dataset.applicantsCount = String(applicants);

    const submitBtn = applyBox.querySelector('.apply-form button[type="submit"]');
    if (submitBtn && isFull) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Full";
    }

    document.querySelectorAll(".save-internship-btn").forEach(btn => {
      btn.dataset.internshipId = item.internship_id ?? item.id ?? "";
      btn.dataset.title = title;
      btn.dataset.company = companyName;
      btn.dataset.initials = initials;
    });

    const side = document.querySelector("aside .side-card");
    if (side) {
      const website = item.website || item.company_website || "";
      const email = item.company_email || item.provider_email || item.email || "";
      const phone = item.company_phone || item.provider_phone || item.phone_number || "";
      side.innerHTML = `<h2>About ${esc(companyName)}</h2>
        <p>${esc(item.company_description || item.provider_description || "No company description yet.")}</p>
        <p><b>Industry:</b> ${esc(item.provider_type || item.industry || "—")}</p>
        <p><b>City:</b> ${esc(locationText)}</p>
        <p><b>Email:</b> ${email ? `<a id="companyContactEmail" href="mailto:${esc(email)}">${esc(email)}</a>` : `<span id="companyContactEmail">—</span>`}</p>
        <p><b>Phone:</b> ${phone ? `<a id="companyContactPhone" href="tel:${esc(phone)}">${esc(phone)}</a>` : `<span id="companyContactPhone">—</span>`}</p>
        ${website ? `<a class="secondary full website-btn" href="${esc(website)}" target="_blank" rel="noopener">Visit website</a>` : ""}`;
    }
  }



  applyBox.addEventListener("submit", async (event) => {
    const form = event.target.closest(".apply-form");
    if (!form) return;
    event.preventDefault();

    const internshipId = applyBox.dataset.internshipId;
    if (!internshipId) {
      alert("Internship data is not loaded yet.");
      return;
    }

    if (typeof window.applyForInternship === "function") {
      await window.applyForInternship(internshipId);
    } else {
      alert("Application script is not loaded.");
    }
  });

  async function loadDetails() {
    setLoadingState();
    try {
      let response = await fetch(`${API_BASE}/internships/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!response.ok) response = await fetch(`${API_BASE}/internships?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("details fetch failed");
      const data = await response.json();
      const item = Array.isArray(data) ? data[0] : data;
      if (!item) throw new Error("empty details");
      fillDetails(item);
    } catch (error) {
      const desc = document.querySelector(".role-detail-card h2 + p");
      if (desc) desc.textContent = "Connect the backend to load this internship details.";
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadDetails);
  else loadDetails();
})();
