/* عنوان الـ API — مرة وحدة للمشروع كله (الملفات التانية بتستخدم نفس الاسم) */
var API_BASE = "/api";

function tadreebStatusClass(status) {
  var n = String(status || "Pending").toLowerCase().trim();
  if (n === "approved" || n === "accepted" || n === "active") return "accepted";
  if (n === "rejected" || n === "inactive") return "rejected";
  if (n === "closed") return "closed";
  if (n === "full") return "full";
  return "pending";
}

// تنبيهات بسيطة تطلع فوق الصفحة
function showNotification(message, type = "success"){
  let container = document.querySelector(".notification-container");

  if(!container){
    container = document.createElement("div");
    container.className = "notification-container";
    document.body.appendChild(container);
  }

  const note = document.createElement("div");
  note.className = `notification ${type === "info" ? "info" : ""}`;
  note.textContent = message;

  container.appendChild(note);

  setTimeout(() => {
    note.style.opacity = "0";
    note.style.transform = "translateX(20px)";
    note.style.transition = ".25s ease";

    setTimeout(() => note.remove(), 250);
  }, 2500);
}

function notifyThenGo(message, url, type = "success") {
  showNotification(message, type);
  setTimeout(() => {
    window.location.href = url;
  }, 650);
}

// الوضع الفاتح / الغامق
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem("tadreeb_theme", theme);
  if (themeIcon) themeIcon.textContent = theme === "dark" ? "☀" : "☾";
}
setTheme(localStorage.getItem("tadreeb_theme") || "light");

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    setTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });
}

// إذا المستخدم مسجّل دخول، منعدّل القائمة حسب نوعه (طالب / شركة / أدمن)
function applyLoggedInNavbar() {
  const role = localStorage.getItem("tadreeb_user_role");
  const userName = localStorage.getItem("tadreeb_user_name");
  const navLinks = document.getElementById("navLinks");
  const navActions = document.querySelector(".nav-actions");

  if (!role || !userName || !navLinks || !navActions) return;

  const isInsideFolder = location.pathname.includes("/internships/") || location.pathname.includes("/companies/") || location.pathname.includes("/dashboards/");
  const prefix = isInsideFolder ? "../" : "";

  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (role === "student") {
    navLinks.innerHTML = `
      <a href="${prefix}dashboards/student-dashboard.html">Dashboard</a>
      <a href="${prefix}internships.html">Find Internships</a>
      <a href="${prefix}companies.html">Companies</a>
      <a href="${prefix}dashboards/student-applications.html">My Applications</a>
      <a href="${prefix}dashboards/student-saved.html">Saved</a>
      <a href="${prefix}dashboards/student-profile.html">Profile</a>
    `;
  } else if (role === "company") {
    navLinks.innerHTML = `
      <a href="${prefix}dashboards/company-dashboard.html">Dashboard</a>
      <a href="${prefix}dashboards/company-listings.html">My Listings</a>
      <a href="${prefix}dashboards/company-profile.html">Company Profile</a>
    `;
  } else if (role === "admin") {
    navLinks.innerHTML = `
      <a href="${prefix}dashboards/admin-dashboard.html">Overview</a>
      <a href="${prefix}dashboards/admin-companies.html">Companies</a>
      <a href="${prefix}dashboards/admin-internships.html">Internships</a>
    `;
  }

  const existingLogin = navActions.querySelector('a[href*="login.html"]');
  const existingSignup = navActions.querySelector('a[href*="signup.html"]');
  if (existingLogin) existingLogin.remove();
  if (existingSignup) existingSignup.remove();

  const profileWrap = document.createElement("div");
  profileWrap.className = "profile-wrap";

  const avatar = document.createElement("button");
  avatar.className = "user-avatar";
  avatar.textContent = initials;
  avatar.title = `${role.charAt(0).toUpperCase() + role.slice(1)} account`;

  const menu = document.createElement("div");
  menu.className = "profile-menu";

  const dashboardFile = role === "admin" ? "admin-dashboard.html" : (role === "company" ? "company-dashboard.html" : "student-dashboard.html");

  menu.innerHTML = `
    <strong>${userName}</strong>
    <span>${role.toUpperCase()}</span>
    <hr>
    <a href="${prefix}dashboards/${dashboardFile}">⊞ Dashboard</a>
    ${role === "student" ? `<a href="${prefix}dashboards/student-profile.html">👤 Profile</a>` : ""}
    ${role === "company" ? `<a href="${prefix}dashboards/company-profile.html">🏢 Company Profile</a>` : ""}
    <button type="button" id="logoutBtn">↪ Sign out</button>
  `;

  profileWrap.appendChild(avatar);
  profileWrap.appendChild(menu);
  navActions.insertBefore(profileWrap, document.getElementById("menuBtn"));

  avatar.addEventListener("click", (e) => {
    e.stopPropagation();
    profileWrap.classList.toggle("open");
  });

  menu.querySelector("#logoutBtn").addEventListener("click", () => {
    ["tadreeb_user_id", "tadreeb_user_role", "tadreeb_user_name", "tadreeb_user_initials"].forEach(
      (k) => localStorage.removeItem(k)
    );
    notifyThenGo("Signed out", `${prefix}index.html`, "info");
  });

  document.addEventListener("click", () => {
    profileWrap.classList.remove("open");
  });
}
applyLoggedInNavbar();

// قراءة وكتابة JSON بالـ localStorage
function getStoredList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function setStoredList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// نوافذ منبثقة
document.querySelectorAll("[data-open]").forEach(btn => {
  btn.addEventListener("click", () => {
    const modal = document.getElementById(btn.dataset.open);
    if (modal) modal.showModal();
  });
});

// قائمة الموبايل (الهمبرغر)
const menuBtn = document.getElementById("menuBtn");
const navLinksContainer = document.getElementById("navLinks");
if (menuBtn && navLinksContainer) {
  menuBtn.addEventListener("click", () => {
    navLinksContainer.classList.toggle("open");
  });
}
