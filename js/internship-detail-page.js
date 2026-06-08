(function () {
  "use strict";

  const params = new URLSearchParams(location.search);
  const internshipId = params.get("id") || params.get("internshipId") || "";
  const applyBox = document.getElementById("detailApplyBox");

  function esc(value) {
    const d = document.createElement("div");
    d.textContent = value == null ? "" : String(value);
    return d.innerHTML;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function fill(item) {
    const title = item.title || "Internship title";
    const company = item.provider_name || item.company || "Company name";
    const locationText = item.location || item.company_city || "Not specified";
    const workType = item.category || item.work_type || "Not specified";
    const major = item.target_major || "Not specified";
    const applicants = Number(item.applicants_count ?? item.applicants ?? 0) || 0;
    const maxRaw = item.max_applicants ?? item.maxApplicants ?? item.capacity ?? item.applicants_limit;
    const max = Number(maxRaw);
    const hasMax = Number.isFinite(max) && max > 0;
    const isFull = hasMax && applicants >= max;
    const companyInitials = initials(company);

    document.title = `${title} | TADREEBCOM`;
    setText("detailInitials", companyInitials);
    setText("detailTitle", title);
    setText("detailCompany", company);
    setText("detailStatus", isFull ? "Full" : "Open for applications");
    setText("detailWork", workType);
    setText("detailLocation", locationText);
    setText("detailMajor", major);
    setText("detailCategory", item.category || "Not specified");
    setText("detailApplicants", `${applicants} applicants`);
    setText("detailCapacity", hasMax ? `${applicants}/${max} applicants` : "No applicant limit");

    const cleanDescription = (item.training_nature || item.description || "")
    .replace(/المدة:.*/gi, "")
    .replace(/نوع العمل:.*/gi, "")
    .trim();
    setText("detailDescription", cleanDescription || "Training details are not available right now.");
    setText("companyInfoName", company);
    setText("companyInfoType", item.provider_type || item.industry || "Not specified");
    setText("companyInfoLocation", locationText);

    const email = item.company_email || item.provider_email || item.email || "";
    const phone = item.company_phone || item.provider_phone || item.phone_number || "";
    const emailEl = document.getElementById("companyInfoEmail");
    const phoneEl = document.getElementById("companyInfoPhone");
    if (emailEl) emailEl.innerHTML = email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : "Not specified";
    if (phoneEl) phoneEl.innerHTML = phone ? `<a href="tel:${esc(phone)}">${esc(phone)}</a>` : "Not specified";

    const website = item.company_website || item.website || "";
    const websiteEl = document.getElementById("companyInfoWebsite");
    if (websiteEl) {
      if (website) websiteEl.href = website;
      else websiteEl.style.display = "none";
    }

    if (applyBox) {
      applyBox.dataset.internshipId = item.internship_id ?? item.id ?? internshipId;
      applyBox.dataset.title = title;
      applyBox.dataset.company = company;
      applyBox.dataset.initials = companyInitials;
      applyBox.dataset.maxApplicants = hasMax ? String(max) : "";
      applyBox.dataset.applicantsCount = String(applicants);
    }

    document.querySelectorAll(".save-internship-btn").forEach(btn => {
      btn.dataset.internshipId = item.internship_id ?? item.id ?? internshipId;
      btn.dataset.title = title;
      btn.dataset.company = company;
      btn.dataset.initials = companyInitials;
    });

    const applyBtn = document.getElementById("detailApplyBtn");
    if (applyBtn && isFull) {
      applyBtn.disabled = true;
      applyBtn.textContent = "Full";
    }

    const userRole = localStorage.getItem("tadreeb_user_role");
    const status = document.getElementById("detailApplicationStatus");
    if (status && userRole === "student") status.textContent = isFull ? "This internship is full." : "You can apply to this internship.";
    if (typeof window.TadreebSyncSaveButtons === "function") window.TadreebSyncSaveButtons();
  }

  async function load() {
    if (!internshipId) return;
    try {
      const response = await fetch(`${API_BASE}/internships/${encodeURIComponent(internshipId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      fill(await response.json());
    } catch (e) {
      setText("detailDescription", "تعذر تحميل تفاصيل التدريب. تأكد من تشغيل السيرفر.");
    }
  }

  applyBox?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = applyBox.dataset.internshipId || internshipId;
    if (!localStorage.getItem("tadreeb_user_id")) {
      alert("يرجى تسجيل الدخول أولاً");
      window.location.href = "../login.html";
      return;
    }
    if (typeof window.applyForInternship === "function") await window.applyForInternship(id);
    else if (typeof window.handleApply === "function") await window.handleApply(id);
    else alert("Application script is not loaded.");
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();
