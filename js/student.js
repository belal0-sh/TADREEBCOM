// مفتاح المحفوظات حسب رقم الطالب (ما يختلطوا الحسابات)
function savedEntriesStorageKey() {
    const uid = localStorage.getItem("tadreeb_user_id");
    return uid ? `tadreeb_saved_internships_${uid}` : "tadreeb_saved_internships_legacy";
}

function getSavedEntries() {
    const uid = localStorage.getItem("tadreeb_user_id");
    if (!uid) return [];
    const keyed = getStoredList(savedEntriesStorageKey());
    if (keyed.length) return keyed;
    const legacy = getStoredList("tadreeb_saved_internships");
    if (legacy.length) {
        setStoredList(savedEntriesStorageKey(), legacy);
        localStorage.removeItem("tadreeb_saved_internships");
    }
    return legacy;
}

function setSavedEntries(arr) {
    if (!localStorage.getItem("tadreeb_user_id")) return;
    setStoredList(savedEntriesStorageKey(), arr);
}

function saveKeyFromButton(btn) {
    if (btn.dataset.internshipId) return "db:" + btn.dataset.internshipId;
    return (btn.dataset.id || "").trim();
}

function currentStaticInternshipsPath() {
    const parts = location.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("internships");
    if (idx >= 0 && parts[idx + 1]) {
        return "internships/" + parts[idx + 1];
    }
    return "internships.html";
}

function initialsFromCompany(name) {
    if (!name) return "?";
    const p = String(name).trim().split(/\s+/).filter(Boolean);
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function escapeHtmlStudent(t) {
    const d = document.createElement("div");
    d.textContent = t == null ? "" : String(t);
    return d.innerHTML;
}

// مزامنة أزرار الحفظ مع اللي محفوظ بالـ localStorage
function syncSaveButtonState() {
    const list = getSavedEntries();
    document.querySelectorAll(".save-internship-btn").forEach((btn) => {
        const key = saveKeyFromButton(btn);
        const on = Boolean(key && list.some((x) => x.key === key));
        btn.classList.toggle("saved", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        if (!btn.dataset.defaultLabel) btn.dataset.defaultLabel = btn.textContent.trim();
        btn.textContent = on ? "♥ Saved" : btn.dataset.defaultLabel;
    });
}

document.addEventListener("click", (e) => {
    const btn = e.target.closest(".save-internship-btn");
    if (!btn) return;
    if (!btn.dataset.defaultLabel)
        btn.dataset.defaultLabel = btn.textContent.trim();
    e.preventDefault();

    if (!localStorage.getItem("tadreeb_user_id")) {
        alert("سجّل الدخول أولاً لحفظ الفرص.");
        return;
    }

    const key = saveKeyFromButton(btn);
    if (!key) return;

    let list = getSavedEntries();
    const existing = list.some((x) => x.key === key);
    if (existing) {
        list = list.filter((x) => x.key !== key);
        setSavedEntries(list);
        showNotification("تمت الإزالة من المحفوظات", "info");
    } else {
        const entry = {
            key,
            title: btn.dataset.title || "Internship",
            company: btn.dataset.company || "",
            initials:
                btn.dataset.initials ||
                initialsFromCompany(btn.dataset.company || ""),
            href: btn.dataset.internshipId
                ? "internships.html"
                : currentStaticInternshipsPath(),
            internshipId: btn.dataset.internshipId
                ? parseInt(btn.dataset.internshipId, 10)
                : null,
        };
        list.push(entry);
        setSavedEntries(list);
        showNotification("تم الحفظ لوقت لاحق");
    }

    syncSaveButtonState();
    const sc = document.getElementById("savedCount");
    if (sc) sc.textContent = String(getSavedEntries().length);
});

window.TadreebSyncSaveButtons = syncSaveButtonState;

document.addEventListener("DOMContentLoaded", () => {
    syncSaveButtonState();

    const userId = localStorage.getItem("tadreeb_user_id");
    const userName = localStorage.getItem("tadreeb_user_name") || "Student";

    

    const nameElement = document.getElementById("student-name");
    if (nameElement && userName) {
        nameElement.textContent = userName;
    }

    const welcomeMessage = document.getElementById("welcomeMessage");
    if (welcomeMessage && userName) {
        welcomeMessage.textContent = `Welcome back, ${userName}.`;
    }

    const isDashboardPage = window.location.pathname.includes("/dashboards/");
    if (!userId && isDashboardPage) {
        window.location.href = "../login.html";
        return;
    }

    if (!userId) return;

    loadStudentStats(userId);
    loadMyApplications(userId);
    loadRecommendedInternships();
    renderSavedInternshipsPage();
    updateSavedCountDisplay();
});

function updateSavedCountDisplay() {
    const el = document.getElementById("savedCount");
    if (el) el.textContent = String(getSavedEntries().length);
}

// هل التخصص يعتبر علم حاسوب؟ (نفس قيم الداتا بيز + شوية إنجليزي)
function isComputerScienceMajor(targetMajor) {
    const raw = String(targetMajor || "").trim();
    if (!raw) return false;
    if (raw === "علم الحاسوب") return true;
    const s = raw.toLowerCase();
    return (
        s.includes("computer science") ||
        s === "cs" ||
        s.includes("computing") ||
        (s.includes("software") && s.includes("engineer"))
    );
}

function splitDashboardInternships(list) {
    const cs = [];
    const other = [];
    for (const item of list) {
        if (isComputerScienceMajor(item.target_major)) cs.push(item);
        else other.push(item);
    }
    return { cs, other };
}

let dashboardInternshipsCache = null;
let dashboardShowOtherMajors = false;

function dashboardInternshipCardHtml(item) {
    const initials = item.provider_name
        ? item.provider_name.charAt(0).toUpperCase()
        : "?";
    const title = escapeHtmlStudent(item.title);
    const company = escapeHtmlStudent(item.provider_name || "");
    const loc = escapeHtmlStudent(item.location || "Jordan");
    const major = escapeHtmlStudent(item.target_major || "");
    const cleanDescription = (item.training_nature || "")
    .replace(/المدة:.*/gi, "")
    .replace(/نوع العمل:.*/gi, "")
    .trim();

const desc = escapeHtmlStudent(
    cleanDescription.slice(0, 120) +
    (cleanDescription.length > 120 ? "..." : "")
);
    return `
            <a class="internship-card card-link" href="../internships/internship-detail.html?id=${encodeURIComponent(item.internship_id)}">
              <div class="card-head">
                <div class="avatar">${escapeHtmlStudent(initials)}</div>
                <div>
                  <h3>${title}</h3>
                  <span class="company">${company}</span>
                </div>
              </div>
              <div class="tags">
                <span class="tag">⌾ ${loc}</span>
                <span class="tag duration">${major || "—"}</span>
              </div>
              <p>${desc || "—"}</p>
              <div class="card-foot">
                <span>From database</span>
                <span class="view">View details →</span>
              </div>
            </a>`;
}

function updateDashboardRecommendBanner() {
    const titleEl = document.getElementById("dashboardRecommendTitle");
    const descEl = document.getElementById("dashboardRecommendDesc");
    if (!titleEl || !descEl) return;
    if (dashboardShowOtherMajors) {
        titleEl.textContent = "Internships for other majors";
        descEl.textContent =
            "Opportunities outside Computer Science (e.g. Cybersecurity and Networks).";
    } else {
        titleEl.textContent = "Recommended for Computer Science students";
        descEl.textContent = "Internships matched to your major.";
    }
}

function bindDashboardMajorsToggle() {
    const btn = document.getElementById("toggleDashboardMajorsBtn");
    if (!btn || btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
        dashboardShowOtherMajors = !dashboardShowOtherMajors;
        updateDashboardRecommendBanner();
        renderDashboardOpportunities();
    });
}

function renderDashboardOpportunities() {
    const grid = document.getElementById("recommendedGrid");
    const footer = document.getElementById("dashboardMajorsToggle");
    const btn = document.getElementById("toggleDashboardMajorsBtn");
    if (!grid || !dashboardInternshipsCache) return;

    const { cs, other } = splitDashboardInternships(dashboardInternshipsCache);
    const showing = dashboardShowOtherMajors ? other : cs;
    const emptyMsg = dashboardShowOtherMajors
        ? "No internships for other majors right now."
        : "No Computer Science internships right now. Try other majors below or open Find Internships.";

    if (showing.length === 0) {
        grid.innerHTML = `<p class="empty-list dashboard-opps-empty" style="text-align:center;padding:2rem;color:var(--muted);">${emptyMsg}</p>`;
    } else {
        grid.innerHTML = showing.map(dashboardInternshipCardHtml).join("");
    }

    if (footer && btn) {
        footer.hidden = false;
        btn.disabled = false;
        if (dashboardShowOtherMajors) {
            btn.textContent = "Show Computer Science internships only";
        } else {
            btn.textContent = "Show internships for other majors";
            if (other.length === 0) {
                btn.disabled = true;
            }
        }
    }
}

async function loadRecommendedInternships() {
    const grid = document.getElementById("recommendedGrid");
    if (!grid) return;

    const footer = document.getElementById("dashboardMajorsToggle");
    if (footer) footer.hidden = true;

    try {
        const response = await fetch(`${API_BASE}/internships`);
        if (!response.ok) throw new Error("bad response");
        const list = await response.json();
        if (!Array.isArray(list) || list.length === 0) {
            dashboardInternshipsCache = null;
            grid.innerHTML = `<p class="empty-list" style="text-align:center;padding:2rem;color:var(--muted);">لا توجد تدريبات في الداتابيس بعد. جرّب لاحقاً أو انشر فرصة من حساب شركة.</p>`;
            return;
        }

        dashboardInternshipsCache = list;
        dashboardShowOtherMajors = false;
        updateDashboardRecommendBanner();
        renderDashboardOpportunities();
        bindDashboardMajorsToggle();
    } catch {
        grid.innerHTML = `<p style="text-align:center;padding:2rem;color:#b42318;">تعذر تحميل التوصيات. تأكد من تشغيل السيرفر.</p>`;
    }
}

function safeSavedInternshipHref(h) {
    const s = String(h || "internships.html").trim();
    if (s === "internships.html") return s;
    if (/^internships\/[a-zA-Z0-9._-]+\.html$/.test(s)) return s;
    return "internships.html";
}

function renderSavedInternshipsPage() {
    const grid = document.getElementById("savedGrid");
    if (!grid) return;

    const list = getSavedEntries();
    if (list.length === 0) {
        grid.innerHTML = `<p class="empty-list" style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted);">لا توجد عناصر محفوظة. افتح أي تدريب واضغط «Save for later»، أو احفظ من صفحة <a href="../internships.html">Find Internships</a>.</p>`;
        return;
    }

    grid.innerHTML = list
        .map((item) => {
            const rel = safeSavedInternshipHref(item.href);
            const hrefAttr = "../internships/internship-detail.html?id=" + encodeURIComponent(item.internshipId);
            return `
      <a class="internship-card card-link" href="${hrefAttr}">
        <div class="card-head">
          <div class="avatar">${escapeHtmlStudent(item.initials)}</div>
          <div>
            <h3>${escapeHtmlStudent(item.title)}</h3>
            <span class="company">${escapeHtmlStudent(item.company)}</span>
          </div>
        </div>
        <div class="tags">
          <span class="tag">محفوظ</span>
        </div>
        <div class="card-foot">
          <span></span>
          <span class="view">Open →</span>
        </div>
      </a>`;
        })
        .join("");
}

// أرقام الداشبورد: إجمالي، معلّق، مقبول
async function loadStudentStats(userId) {
    try {
        const response = await fetch(
            `${API_BASE}/applications/stats?studentId=${userId}`
        );
        const stats = await response.json();

        const totalEl =
            document.getElementById("totalApplicationsCount") ||
            document.getElementById("total-apps");
        const pendingEl =
            document.getElementById("pendingApplicationsCount") ||
            document.getElementById("pending-apps");
        const acceptedEl =
            document.getElementById("acceptedApplicationsCount") ||
            document.getElementById("accepted-apps");

        if (totalEl) totalEl.textContent = stats.total || 0;
        if (pendingEl) pendingEl.textContent = stats.pending || 0;
        if (acceptedEl) acceptedEl.textContent = stats.accepted || 0;
        updateSavedCountDisplay();
    } catch (error) {
        console.error("stats fetch failed:", error);
    }
}

// جدول طلبات الطالب
async function loadMyApplications(userId) {
    const rowsContainer = document.getElementById("applicationsRows");
    if (!rowsContainer) return;

    try {
        const response = await fetch(
            `${API_BASE}/applications?studentId=${userId}`
        );
        const applications = await response.json();

        if (Array.isArray(applications) && applications.length > 0) {
            rowsContainer.innerHTML = applications
                .map(
                    (app) => `
                <div class="table-row applications-row">
                    <span>${app.internshipTitle || "---"}</span>
                    <span>${app.companyName || "Unknown Company"}</span>
                    <span><b class="status ${tadreebStatusClass(app.status)}">${app.status || "Pending"}</b></span>
                    <span>${app.apply_date ? new Date(app.apply_date).toLocaleDateString("ar-EG") : "---"}</span>
                    <span class="contact-cell">
                        ${app.company_email ? `<a href="mailto:${app.company_email}">${app.company_email}</a>` : "Email: ${student.email || student.student_email || company.email || company.company_email || '—'}"}<br>
                        ${app.company_phone ? `<a href="tel:${app.company_phone}">${app.company_phone}</a>` : "Phone: —"}
                    </span>
                </div>
            `
                )
                .join("");
        } else {
            rowsContainer.innerHTML = `<div class="table-row applications-row"><span style="grid-column: 1/-1; text-align:center;">لا توجد طلبات مقدمة حالياً</span></div>`;
        }
    } catch (error) {
        console.error("applications fetch failed:", error);
        rowsContainer.innerHTML = `<div class="table-row applications-row"><span style="grid-column: 1/-1; color:red;">فشل تحميل البيانات، تأكد من تشغيل السيرفر.</span></div>`;
    }
}


const MAX_STUDENT_APPLICATIONS = 5;

async function getCurrentStudentApplicationsCount(studentId) {
    const response = await fetch(`${API_BASE}/applications?studentId=${encodeURIComponent(studentId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("applications count failed");
    const applications = await response.json();
    return Array.isArray(applications) ? applications.length : Number(applications.count ?? 0) || 0;
}

async function getInternshipCapacityStatus(internshipId) {
    const response = await fetch(`${API_BASE}/internships/${encodeURIComponent(internshipId)}`, { cache: "no-store" });
    if (!response.ok) return { full: false };
    const item = await response.json();
    const applicants = Number(item.applicants_count ?? item.applicants ?? item.current_applicants ?? 0) || 0;
    const maxRaw = item.max_applicants ?? item.maxApplicants ?? item.capacity ?? item.applicants_limit;
    const max = Number(maxRaw);
    return {
        applicants,
        maxApplicants: Number.isFinite(max) && max > 0 ? max : null,
        full: Number.isFinite(max) && max > 0 && applicants >= max,
    };
}
// تقديم على فرصة (لو استدعيتها من مكان ثاني)
async function applyForInternship(internshipId) {
    const studentId = localStorage.getItem("tadreeb_user_id");

    if (!studentId) {
        alert("يرجى تسجيل الدخول أولاً");
        return;
    }

    try {
        const currentApplications = await getCurrentStudentApplicationsCount(studentId);
        if (currentApplications >= MAX_STUDENT_APPLICATIONS) {
            alert("لا يمكنك التقديم على أكثر من 5 تدريبات.");
            return;
        }

        const capacity = await getInternshipCapacityStatus(internshipId);
        if (capacity.full) {
            alert("هذا التدريب وصل للعدد الأقصى من المتقدمين.");
            return;
        }

        const response = await fetch(`${API_BASE}/applications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, internshipId }),
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message || "تم التقديم بنجاح!");
            location.reload();
        } else {
            alert(result.error || "فشل التقديم");
        }
    } catch (error) {
        console.error("apply failed:", error);
        alert("حدث خطأ في الاتصال بالسيرفر أو فشل التحقق من عدد الطلبات.");
    }
}


async function loadStudentProfile() {
    const form = document.getElementById("profileForm");
    if (!form) return;

    const userId = localStorage.getItem("tadreeb_user_id");
    if (!userId) return;

    try {
        const response = await fetch(`${API_BASE}/users/${userId}?role=student`);
        const student = await response.json();

        document.getElementById("prof_first_name").value = student.first_name || "";
        document.getElementById("prof_last_name").value = student.last_name || "";
        document.getElementById("prof_email").value = student.email || "";
        document.getElementById("prof_phone").value = student.phone_number || "";
        document.getElementById("prof_university").value = student.university || "";
        document.getElementById("prof_major").value = student.major || "";
    } catch (error) {
        alert("Failed to load profile data.");
    }
}

async function saveStudentProfile(e) {
    e.preventDefault();

    const userId = localStorage.getItem("tadreeb_user_id");
    if (!userId) return;

    const payload = {
        role: "student",
        first_name: document.getElementById("prof_first_name").value.trim(),
        last_name: document.getElementById("prof_last_name").value.trim(),
        username: localStorage.getItem("tadreeb_user_name") || "",
        phone_number: document.getElementById("prof_phone").value.trim(),
        university: document.getElementById("prof_university").value,
        major: document.getElementById("prof_major").value
    };

    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            const fullName = `${payload.first_name} ${payload.last_name}`.trim();
            localStorage.setItem("tadreeb_user_name", fullName);
            alert(result.message || "Profile updated successfully.");
        } else {
            alert(result.error || "Failed to update profile.");
        }
    } catch (error) {
        alert("Failed to connect to server.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const profileForm = document.getElementById("profileForm");
    if (!profileForm) return;

    loadStudentProfile();
    profileForm.addEventListener("submit", saveStudentProfile);
});




