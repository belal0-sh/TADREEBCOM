// الصفحة الرئيسية — بعد common.js (فيها API_BASE)
function homeEscHtml(t) {
  var d = document.createElement("div");
  d.textContent = t == null ? "" : String(t);
  return d.innerHTML;
}

function homeAdjustCtas() {
  var uid = localStorage.getItem("tadreeb_user_id");
  var role = localStorage.getItem("tadreeb_user_role");
  if (!uid || !role) return;
  var dash =
    role === "company"
      ? "dashboards/company-dashboard.html"
      : role === "admin"
        ? "dashboards/admin-dashboard.html"
        : "dashboards/student-dashboard.html";
  var heroBtn = document.getElementById("heroAccountCta");
  if (heroBtn) {
    heroBtn.textContent = "Go to dashboard";
    heroBtn.href = dash;
    heroBtn.classList.remove("secondary");
    heroBtn.classList.add("primary");
  }
  var link = document.getElementById("homeCtaLink");
  var txt = document.getElementById("homeCtaText");
  if (link) {
    link.textContent = "Open dashboard →";
    link.href = dash;
  }
  if (txt) {
    txt.textContent =
      "You are signed in. Open your dashboard to continue with applications and listings.";
  }
}

function homeSetStats(elI, elC, elS, i, c, s) {
  if (elI) elI.textContent = i == null ? "—" : String(i);
  if (elC) elC.textContent = c == null ? "—" : String(c);
  if (elS) elS.textContent = s == null ? "—" : String(s);
}

async function homeLoadStats() {
  var elI = document.getElementById("statInternships");
  var elC = document.getElementById("statCompanies");
  var elS = document.getElementById("statStudents");
  try {
    var res = await fetch(API_BASE + "/stats/home", { cache: "no-store" });
    if (res.ok) {
      var data = await res.json();
      homeSetStats(
        elI,
        elC,
        elS,
        Number(data.internships) || 0,
        Number(data.companies) || 0,
        Number(data.students) || 0
      );
      return;
    }
  } catch (e) {}
  try {
    var r1 = await fetch(API_BASE + "/internships", { cache: "no-store" });
    var r2 = await fetch(API_BASE + "/companies", { cache: "no-store" });
    var ints = r1.ok ? await r1.json() : [];
    var comps = r2.ok ? await r2.json() : [];
    homeSetStats(
      elI,
      elC,
      elS,
      Array.isArray(ints) ? ints.length : 0,
      Array.isArray(comps) ? comps.length : 0,
      null
    );
  } catch (e) {
    homeSetStats(elI, elC, elS, null, null, null);
  }
}

async function homeFeatured() {
  var grid = document.getElementById("internshipGrid");
  if (!grid) return;
  try {
    var res = await fetch(API_BASE + "/internships");
    if (!res.ok) throw new Error();
    var arr = await res.json();
    if (!Array.isArray(arr) || !arr.length) {
      grid.innerHTML =
        '<p class="empty-list" style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted);">No internships in the database yet.</p>';
      return;
    }
    grid.innerHTML = arr
      .slice(0, 6)
      .map(function (item) {
        var initials = item.provider_name
          ? String(item.provider_name).charAt(0).toUpperCase()
          : "?";
        var raw = item.training_nature || "";
        var desc = raw.slice(0, 140) + (raw.length > 140 ? "…" : "");
        return (
          '<a class="internship-card card-link" href="internships/internship-detail.html?id=' + encodeURIComponent(item.internship_id) + '">' +
          '<div class="card-head"><div class="avatar">' +
          homeEscHtml(initials) +
          "</div><div><h3>" +
          homeEscHtml(item.title) +
          '</h3><span class="company">' +
          homeEscHtml(item.provider_name || "") +
          "</span></div></div>" +
          '<div class="tags"><span class="tag">⌾ ' +
          homeEscHtml(item.location || "Jordan") +
          '</span><span class="tag duration">' +
          homeEscHtml(item.target_major || "—") +
          "</span></div><p>" +
          homeEscHtml(desc || "—") +
          '</p><div class="card-foot"><span>Listed on TADREEBCOM</span><span class="view">View details →</span></div></a>'

        );
      })
      .join("");
  } catch (e) {
    grid.innerHTML =
      '<p class="empty-list" style="grid-column:1/-1;text-align:center;padding:2rem;color:#b42318;">Could not load internships. Start the server (port 3000).</p>';
  }
}

async function homeStart() {
  homeAdjustCtas();
  await Promise.all([homeFeatured(), homeLoadStats()]);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", homeStart);
} else {
  homeStart();
}

window.addEventListener("load", function () {
  var el = document.getElementById("statInternships");
  if (el && el.textContent === "—") homeLoadStats();
});
