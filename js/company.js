function companyEsc(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
}

function applicantContactHtml(app) {
    const email = app.student_email || app.email || app.student_email || "";
    const phone = app.student_phone || app.phone_number || app.studentPhone || "";
    return `<p><b>Email:</b> ${email ? `<a href="mailto:${companyEsc(email)}">${companyEsc(email)}</a>` : "—"}</p>
            <p><b>Phone:</b> ${phone ? `<a href="tel:${companyEsc(phone)}">${companyEsc(phone)}</a>` : "—"}</p>`;
}

async function loadCompanyData() {
    const userId = localStorage.getItem("tadreeb_user_id");
    if (!userId) return;

    try {
        const response = await fetch(`${API_BASE}/internships?companyId=${userId}`);
        const listings = await response.json();

        renderCompanyDashboard(listings);

        const companyName = localStorage.getItem("tadreeb_user_name");
        const titleEl = document.getElementById("companyDashboardTitle");
        if (titleEl && companyName) titleEl.textContent = `${companyName} dashboard`;

        if (typeof renderCompanyListings === "function") {
            renderCompanyListings(listings);
        }
    } catch (error) {
        console.error("company data fetch failed:", error);
    }
}

async function renderCompanyDashboard(listings) {
    const arr = Array.isArray(listings) ? listings : [];

    const totalListingsEl = document.getElementById("companyTotalListings");
    const activeCountEl = document.getElementById("companyActiveCount");
    const pendingCountEl = document.getElementById("companyPendingCount");
    const acceptedCountEl = document.getElementById("companyAcceptedCount");

    if (totalListingsEl) {
        totalListingsEl.textContent = arr.length;
    }

    const activeListings = arr.filter(item => {
        const status = String(item.status || item.approval_status || "").toLowerCase();
        return status === "approved" || status === "active";
    });

    if (activeCountEl) {
        activeCountEl.textContent = activeListings.length;
    }

    try {
        const companyId = localStorage.getItem("tadreeb_user_id");
        const response = await fetch(`${API_BASE}/applications/company?companyId=${companyId}`);
        const applicants = await response.json();

        const pendingCount = applicants.filter(app =>
            String(app.status || "Pending").toLowerCase() === "pending"
        ).length;

        const acceptedCount = applicants.filter(app => {
            const status = String(app.status || "").toLowerCase();
            return status === "approved" || status === "accepted";
        }).length;

        if (pendingCountEl) pendingCountEl.textContent = pendingCount;
        if (acceptedCountEl) acceptedCountEl.textContent = acceptedCount;
    } catch (error) {
        console.error("company stats fetch failed:", error);
    }
    renderActiveInternshipsOnDashboard(arr);
    renderRecentApplicants();
}

// قائمة المتقدمين — الداشبورد أو صفحات مفصّلة
async function renderRecentApplicants() {
    const softwareList = document.getElementById("softwareApplicantsList");
    const dataList = document.getElementById("dataApplicantsList");
    const genericList = document.getElementById("companyApplicantsList");
    const dashboardRecent = document.getElementById("companyRecentApplicants");

    if (!softwareList && !dataList && !genericList && !dashboardRecent) return;

    const companyId = localStorage.getItem("tadreeb_user_id");

    try {
        const response = await fetch(`${API_BASE}/applications/company?companyId=${companyId}`);
        const allApplicants = await response.json();

        let filteredApps = [];
        let targetContainer = null;
        let countEl = null;

        if (dashboardRecent) {
            targetContainer = dashboardRecent;
            filteredApps = allApplicants.slice(0, 5);
        } else if (genericList) {
            const params = new URLSearchParams(window.location.search);
            const internshipId = params.get("id");
            const internshipTitle = params.get("title") || "Applicants";
            const heading = document.getElementById("companyApplicantsTitle");
            if (heading) heading.textContent = internshipTitle;
            filteredApps = internshipId
    ? allApplicants.filter(app =>
        String(app.internship_id ?? app.internshipId ?? app.training_id ?? app.post_id ?? "") === String(internshipId) ||
        String(app.internship_title || "").trim().toLowerCase() === String(internshipTitle || "").trim().toLowerCase()
      )
    : allApplicants;
            targetContainer = genericList;
            countEl = document.getElementById("companyApplicantsCount");
        } else if (softwareList) {
            filteredApps = allApplicants.filter(app =>
                (app.internship_title || "").toLowerCase().includes("software"));
            targetContainer = softwareList;
            countEl = document.getElementById("softwareApplicantsPageCount");
        } else if (dataList) {
            filteredApps = allApplicants.filter(app =>
                (app.internship_title || "").toLowerCase().includes("data"));
            targetContainer = dataList;
            countEl = document.getElementById("dataApplicantsPageCount");
        }

        if (countEl) {
            countEl.textContent = `${filteredApps.length} applicants`;
        }

        const pendingCount = allApplicants.filter(a => a.status === 'Pending').length;
        if (document.getElementById("companyPendingCount")) {
            document.getElementById("companyPendingCount").textContent = pendingCount;
        }

        if (filteredApps.length === 0) {
            targetContainer.innerHTML = "<p style='padding:20px'>No applicants found for this position.</p>";
            return;
        }

        if (dashboardRecent) {
            targetContainer.innerHTML = filteredApps.map(app => `
                <div class="table-row applicants-row">
                    <span>${app.student_name || "New Student"}</span>
                    <span>${app.internship_title || "---"}</span>
                    <span><b class="status ${tadreebStatusClass(app.status)}">${app.status || "Pending"}</b></span>
                    <span>${app.student_email || app.email || "—"}</span>
                </div>
            `).join("");
            return;
        }

        targetContainer.innerHTML = filteredApps.map(app => `
          <div class="applicant-card">
              <div class="applicant-status">
                <b class="status ${tadreebStatusClass(app.status)}">${app.status}</b>
                </div>
              <h2>${app.student_name || 'New Student'}</h2>
              <p>Major: ${app.student_major || '—'}</p>
              ${applicantContactHtml(app)}
              <p><small>Applied for: ${app.internship_title}</small></p>
              <div class="applicant-actions">
                  ${String(app.status || 'Pending').toLowerCase() === 'pending' ? `
                      <button class="accept-btn" onclick="updateStatus(${app.application_id}, 'Approved')">✓ Accept</button>
                      <button class="reject-btn" onclick="updateStatus(${app.application_id}, 'Rejected')">× Reject</button>
                  ` : `<p>Status updated: <strong>${app.status}</strong></p>`}
              </div>
          </div>
        `).join("");
    } catch (error) {
        console.error("applicants fetch failed:", error);
    }
}

async function updateStatus(applicationId, newStatus) {
    try {
        const response = await fetch(`${API_BASE}/applications/${applicationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            alert(`Application ${newStatus === 'Approved' ? 'Approved' : 'Rejected'} successfully`);

            renderRecentApplicants();
            loadCompanyData();
        }
    } catch (error) {
        console.error("status update failed:", error);
    }
}

function getInternshipStatus(item) {
    const applicants = Number(item.applicants_count ?? item.applicants ?? 0);
    const maxApplicants = Number(item.max_applicants ?? item.maxApplicants ?? 0);
    const status = item.status || item.approval_status || "Pending";
    if (maxApplicants > 0 && applicants >= maxApplicants && /approved|active/i.test(status)) return "Full";
    return status;
}

function renderCompanyListings(listings) {
    const container = document.getElementById("companyListings");
    if (!container) return;

    const arr = Array.isArray(listings) ? listings : [];
    if (arr.length === 0) {
        container.innerHTML = `<div class="table-row listings-row"><span style="grid-column:1/-1;text-align:center;">No internships posted yet.</span></div>`;
        return;
    }

    container.innerHTML = arr.map(item => {
        const id = item.internship_id ?? item.id ?? "";
        const title = item.title || "Internship";
        const major = item.target_major || item.major || "—";
        const city = item.city || item.location || "—";
        const type = item.work_type || item.workType || item.type || "—";
        const applicants = Number(item.applicants_count ?? item.applicants ?? 0);
        const maxApplicants = Number(item.max_applicants ?? item.maxApplicants ?? 0);
        const status = getInternshipStatus(item);
        const applicantsText = maxApplicants > 0 ? `${applicants}/${maxApplicants}` : `${applicants}`;

        return `
            <div class="table-row listings-row" data-internship-id="${companyEsc(id)}">
                <span>${companyEsc(title)}</span>
                <span>${companyEsc(major)}</span>
                <span>${companyEsc(city)}</span>
                <span>${companyEsc(type)}</span>
                <span><b class="status ${tadreebStatusClass(status)}">${companyEsc(status)}</b></span>
                <span>${companyEsc(applicantsText)}</span>
                <span class="listing-actions">
                    <a class="secondary" href="company-applicants.html?id=${encodeURIComponent(id)}&title=${encodeURIComponent(title)}">Applicants</a>
                    <a class="secondary" href="company-edit-internship.html?id=${encodeURIComponent(id)}">Edit</a>
                    <button 
                    class="reset-btn-inline" 
                    type="button" 
                    data-toggle-internship="${companyEsc(id)}"
                    data-current-status="${companyEsc(status)}">
                    ${String(status).toLowerCase() === "closed" ? "Open" : "Close"}
                    </button>
                </span>
            </div>`;
    }).join("");

    container.querySelectorAll("[data-toggle-internship]").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-toggle-internship");
        const currentStatus = String(btn.getAttribute("data-current-status") || "").toLowerCase();

        const newStatus = currentStatus === "closed" ? "Approved" : "Closed";

        try {
            await fetch(`${API_BASE}/internships/${encodeURIComponent(id)}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            loadCompanyData();
        } catch (error) {
            alert("Could not update internship status.");
        }
    });
});
}

// نشر فرصة جديدة
const postForm = document.getElementById("postInternshipForm");
if (postForm) {
    postForm.onsubmit = async (e) => {
        e.preventDefault();

        const titleInput = document.getElementById("internshipTitle");
        const descEl = document.getElementById("internshipDesc");
        const majorEl = document.getElementById("internshipMajor");
        const cityEl = document.getElementById("internshipCity");
        const workEl = document.getElementById("internshipWork");
        
        const maxApplicantsEl = document.getElementById("maxApplicants");

        const textInputs = postForm.querySelectorAll('input[type="text"]');
        const selects = postForm.querySelectorAll("select");

        const title =
            titleInput?.value?.trim() ||
            textInputs[0]?.value?.trim() ||
            "";
        const description =
            descEl?.value?.trim() || postForm.querySelector("textarea")?.value?.trim() || "";
        const major =
            majorEl?.value ||
            selects[0]?.value ||
            "";
        const city =
            cityEl?.value ||
            selects[1]?.value ||
            "";
        const workType =
            workEl?.value ||
            selects[2]?.value ||
            "";
        

        if (!title) {
            alert("Please enter a title.");
            return;
        }
        if (!major || major === "Select major") {
            alert("Please select a major.");
            return;
        }

        const maxApplicants = Number(maxApplicantsEl?.value || 0);
        if (!Number.isInteger(maxApplicants) || maxApplicants < 1) {
            alert("Please enter the maximum number of applicants.");
            return;
        }

        const data = {
            companyId: localStorage.getItem("tadreeb_user_id"),
            title,
            description,
            target_major: major.slice(0, 20),
            location: city && city !== "Select city" ? city : "Amman",
            workType,
            category: workType || null,
            maxApplicants,
            max_applicants: maxApplicants,
            status: "Pending",
            approval_status: "Pending",
        };

        try {
            const response = await fetch(`${API_BASE}/internships`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json().catch(() => ({}));

            if (response.ok) {
                alert("Internship posted successfully! 🚀");
                setTimeout(() => location.href = "company-listings.html", 1500);
            } else {
                alert(result.error || "Failed to post internship");
            }
        } catch (error) {
            alert("Failed to post internship");
        }
    };
}

function setupLogout() {
    const logoutBtn = document.getElementById("companyLogoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            ["tadreeb_user_id", "tadreeb_user_role", "tadreeb_user_name", "tadreeb_user_initials"].forEach((k) =>
                localStorage.removeItem(k)
            );
            window.location.href = "../index.html";
        };
    }
}

async function loadEditInternshipForm() {
    const form = document.getElementById("editInternshipForm");
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        alert("No internship ID found.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/internships/${encodeURIComponent(id)}`);
        const item = await response.json();

        const titleInput = document.getElementById("editTitle");
        const descInput = document.getElementById("editDesc");
        const majorInput = document.getElementById("editMajor");
        const cityInput = document.getElementById("editCity");
        const workInput = document.getElementById("editWork");
        const maxInput = document.getElementById("editMaxApplicants");

        const cleanDescription = String(item.training_nature || "")
            .replace(/نوع العمل:.*/g, "")
            .trim();

        titleInput.value = item.title || "";
        descInput.value = cleanDescription;
        majorInput.value = item.target_major || "";
        cityInput.value = item.location || item.company_city || "";
        workInput.value = item.category || "";
        maxInput.value = item.max_applicants || "";

        form.onsubmit = async (e) => {
            e.preventDefault();

            const payload = {
                title: titleInput.value.trim(),
                description: descInput.value.trim(),
                target_major: majorInput.value,
                location: cityInput.value,
                workType: workInput.value,
                category: workInput.value,
                max_applicants: Number(maxInput.value)
            };

            const saveResponse = await fetch(`${API_BASE}/internships/${encodeURIComponent(id)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await saveResponse.json().catch(() => ({}));

            if (saveResponse.ok) {
                alert("Internship updated successfully.");
                window.location.href = "company-listings.html";
            } else {
                alert(result.error || "Failed to update internship.");
            }
        };
    } catch (error) {
        alert("Failed to load internship.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadCompanyData();
    setupLogout();
    loadEditInternshipForm();
});


async function loadCompanyProfile() {
    const form = document.getElementById("companyProfileForm");
    if (!form) return;

    const companyId = localStorage.getItem("tadreeb_user_id");
    if (!companyId) return;

    try {
        const response = await fetch(`${API_BASE}/users/${companyId}?role=company`);
        const company = await response.json();


        const inputs = form.querySelectorAll("input, select, textarea");

        if (inputs[0]) inputs[0].value = company.provider_name || "";
        if (inputs[1]) inputs[1].value = company.website || "";
        if (inputs[2]) inputs[2].value = company.provider_type || "";
        if (inputs[3]) inputs[3].value = company.location || "";
        if (inputs[4]) inputs[4].value = company.description || "";
    } catch (error) {
        alert("Failed to load company profile.");
    }
}

async function saveCompanyProfile(e) {
    e.preventDefault();

    const form = document.getElementById("companyProfileForm");
    const companyId = localStorage.getItem("tadreeb_user_id");
    if (!form || !companyId) return;

    const inputs = form.querySelectorAll("input, select, textarea");

    const payload = {
        role: "company",
        provider_name: inputs[0]?.value.trim() || "",
        website: inputs[1]?.value.trim() || "",
        provider_type: inputs[2]?.value || "",
        location: inputs[3]?.value || "",
        description: inputs[4]?.value.trim() || ""
    };

    try {
        const response = await fetch(`${API_BASE}/users/${companyId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem("tadreeb_user_name", payload.provider_name);
            alert(result.message || "Company profile updated successfully.");
        } else {
            alert(result.error || "Failed to update company profile.");
        }
    } catch (error) {
        alert("Failed to connect to server.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const companyProfileForm = document.getElementById("companyProfileForm");
    if (!companyProfileForm) return;

    loadCompanyProfile();
    companyProfileForm.addEventListener("submit", saveCompanyProfile);
});


function renderActiveInternshipsOnDashboard(listings) {
    const container = document.querySelector(".company-active-grid");
    if (!container) return;

    const arr = Array.isArray(listings) ? listings : [];

    const activeListings = arr.filter(item => {
        const status = String(item.status || item.approval_status || "").toLowerCase();
        return status === "approved" || status === "active";
    });

    if (activeListings.length === 0) {
        container.innerHTML = `<p>No active internships yet.</p>`;
        return;
    }

    container.innerHTML = activeListings.map(item => {
        const id = item.internship_id ?? item.id ?? "";
        const title = item.title || "Internship";
        const major = item.target_major || item.major || "—";
        const city = item.city || item.location || "—";
        const applicants = item.applicants_count ?? item.applicants ?? 0;

        return `
            <article class="internship-card company-active-card">
                <h3>${companyEsc(title)}</h3>
                <p><b>Major:</b> ${companyEsc(major)}</p>
                <p><b>Location:</b> ${companyEsc(city)}</p>
                <p><b>Applicants:</b> ${companyEsc(applicants)}</p>
                <a class="secondary" href="company-applicants.html?id=${encodeURIComponent(id)}&title=${encodeURIComponent(title)}">
                    View applicants
                </a>
            </article>
        `;
    }).join("");
}