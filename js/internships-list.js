(function () {
    "use strict";

    let list = [];
    const filterCompanyId = new URLSearchParams(window.location.search).get("companyId");

    function escHtml(s) {
        const d = document.createElement("div");
        d.textContent = s == null ? "" : String(s);
        return d.innerHTML;
    }

    function escAttr(s) {
        return String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;");
    }

    const internshipList = document.getElementById("internshipList");
    const resultCount = document.getElementById("resultCount");
    const listSearch = document.getElementById("listSearch");
    const listMajor = document.getElementById("listMajor");
    const listCity = document.getElementById("listCity");
    const listWork = document.getElementById("listWork");
    const applyFilters = document.getElementById("applyFilters");
    const resetFilters = document.getElementById("resetFilters");

    async function fetchInternships() {
        try {
            const response = await fetch(`${API_BASE}/internships`);
            if (!response.ok) throw new Error('Network response was not ok');

            list = await response.json();
            renderInternshipList();
        } catch (error) {
            console.error("fetch internships:", error);
            if (internshipList) {
                internshipList.innerHTML = `<div class="error" style="text-align:center; padding:20px;">فشل تحميل البيانات. تأكد من تشغيل السيرفر.</div>`;
            }
        }
    }

    // عرض القائمة + فلترة حسب البحث والتخصص والمدينة
    const MAX_STUDENT_APPLICATIONS = 5;

    function getApplicantCount(item) {
        return Number(item.applicants_count ?? item.applicants ?? item.current_applicants ?? 0) || 0;
    }

    function getMaxApplicants(item) {
        const raw = item.max_applicants ?? item.maxApplicants ?? item.capacity ?? item.applicants_limit;
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    function isInternshipFull(item) {
        const max = getMaxApplicants(item);
        return max !== null && getApplicantCount(item) >= max;
    }

    async function getStudentApplicationsCount(studentId) {
        const response = await fetch(`${API_BASE}/applications?studentId=${encodeURIComponent(studentId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("applications count failed");
        const applications = await response.json();
        return Array.isArray(applications) ? applications.length : Number(applications.count ?? 0) || 0;
    }

    function renderInternshipList() {
        if (!internshipList || !resultCount) return;

        const search = (listSearch?.value || "").toLowerCase().trim();
        const major = listMajor?.value || "all";
        const city = listCity?.value || "all";
        const work = listWork?.value || "all";

        const filtered = list.filter(item => {
            const title = (item.title || "").toLowerCase();
            const company = (item.provider_name || "").toLowerCase();
            const itemMajor = (item.target_major || "");
            const itemLocation = (item.location || "");

            const matchesSearch = title.includes(search) || company.includes(search);
            const matchesMajor = (major === "all" || itemMajor === major);
            const matchesCity = (city === "all" || itemLocation === city);
            const workBlob = `${item.category || ""} ${item.training_nature || ""}`.toLowerCase().replace(/\s+/g, "");
            const matchesWork =
                work === "all" ||
                (work === "Hybrid" && workBlob.includes("hybrid")) ||
                (work === "Remote" && workBlob.includes("remote")) ||
                (work === "Onsite" &&
                    (workBlob.includes("onsite") || workBlob.includes("on-site")));
            const matchesCompany =
                !filterCompanyId || String(item.provider_id) === String(filterCompanyId);

            return matchesSearch && matchesMajor && matchesCity && matchesWork && matchesCompany;
        });

        resultCount.textContent = `Showing ${filtered.length} results`;

        if (filtered.length === 0) {
            internshipList.innerHTML = `<div class="empty-list" style="grid-column: 1/-1; text-align:center; padding:40px;">No internships found matching your criteria.</div>`;
            return;
        }

        internshipList.innerHTML = filtered.map(item => {
            const initials = item.provider_name ? item.provider_name.charAt(0).toUpperCase() : '?';
            const applicants = getApplicantCount(item);
            const maxApplicants = getMaxApplicants(item);
            const full = isInternshipFull(item);
            const capacityText = maxApplicants ? `${applicants}/${maxApplicants} applicants` : `${applicants} applicants`;
            const cleanDescription = (item.training_nature || "")
            .replace(/المدة:.*/gi, "")
            .replace(/نوع العمل:.*/gi, "")
            .trim();

            return `
            <div class="list-card">
              <div class="avatar">${escHtml(initials)}</div>
              <div style="flex:1">
                <h3>${escHtml(item.title)}</h3>
                <span class="company">${escHtml(item.provider_name)}</span>
                <div class="tags" style="margin: 10px 0;">
                  <span class="tag">⌾ ${escHtml(item.location || 'Jordan')}</span>
                  <span class="tag duration" style="background:#e0f2fe; color:#0369a1;">${escHtml(item.target_major)}</span>
                </div>
                <p style="font-size:0.9rem; color:#666;">${escHtml(cleanDescription || 'No description available.')}</p>
                <div class="card-foot card-foot-actions" style="margin-top:15px;">
                  <span style="font-size:0.8rem; color:#999;">${escHtml(capacityText)}${full ? " • Full" : ""}</span>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                  <a href="internships/internship-detail.html?id=${encodeURIComponent(item.internship_id)}" class="secondary small" style="padding:8px 16px;">View details</a>
                  <button type="button"
                    class="save-internship-btn list-save-btn"
                    data-id="db-${item.internship_id}"
                    data-internship-id="${item.internship_id}"
                    data-title="${escAttr(item.title)}"
                    data-company="${escAttr(item.provider_name)}"
                    data-initials="${escAttr(initials)}">♡ Save</button>
                  <button type="button" onclick="handleApply(${item.internship_id})" class="primary small" ${full ? "disabled" : ""} style="padding:8px 16px; cursor:pointer;">${full ? "Full" : "Apply Now →"}</button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join("");

        if (typeof window.TadreebSyncSaveButtons === "function") window.TadreebSyncSaveButtons();
    }

    // الزر Apply بالـ HTML بيستدعي هاي الدالة
    window.handleApply = async function (internshipId) {
        const studentId = localStorage.getItem("tadreeb_user_id");

        if (!studentId) {
            alert("يرجى تسجيل الدخول أولاً");
            window.location.href = 'login.html';
            return;
        }

        const selected = list.find(item => String(item.internship_id) === String(internshipId));
        if (selected && isInternshipFull(selected)) {
            alert("هذا التدريب وصل للعدد الأقصى من المتقدمين.");
            return;
        }

        try {
            const currentApplications = await getStudentApplicationsCount(studentId);
            if (currentApplications >= MAX_STUDENT_APPLICATIONS) {
                alert("لا يمكنك التقديم على أكثر من 5 تدريبات.");
                return;
            }

            const response = await fetch(`${API_BASE}/applications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: studentId,
                    internshipId: internshipId
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert("✅ " + result.message);
            } else {
                alert("⚠️ " + (result.error || "حدث خطأ أثناء التقديم"));
            }
        } catch (error) {
            console.error("apply request:", error);
            alert("❌ تعذر الاتصال بالسيرفر، تأكد من تشغيله.");
        }
    };

    if (internshipList) {
        fetchInternships();

        applyFilters?.addEventListener("click", renderInternshipList);

        [listSearch, listMajor, listCity, listWork].forEach(el => {
            if (el) el.addEventListener("input", renderInternshipList);
        });

        resetFilters?.addEventListener("click", () => {
            if (listSearch) listSearch.value = "";
            if (listMajor) listMajor.value = "all";
            if (listCity) listCity.value = "all";
            if (listWork) listWork.value = "all";
            renderInternshipList();
        });
    }
})();
