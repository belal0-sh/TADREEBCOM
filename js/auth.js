// اختيار نوع الحساب: طالب أو شركة
let selectedRole = 'student';

const roleCards = document.querySelectorAll('.role-card');
const studentFields = document.getElementById('studentFields');
const companyFields = document.getElementById('companyFields');

function setFieldsEnabled(wrapper, enabled) {
  if (!wrapper) return;
  wrapper.querySelectorAll('input, select, textarea').forEach(field => {
    field.disabled = !enabled;
  });
}

function updateRoleFields() {
  const isCompany = selectedRole === 'company';

  if (isCompany) {
    studentFields?.classList.add('hidden');
    companyFields?.classList.remove('hidden');
  } else {
    companyFields?.classList.add('hidden');
    studentFields?.classList.remove('hidden');
  }

  // مهم: الحقول المخفية إذا بقيت required تمنع إرسال الفورم بدون ما يبين شيء
  setFieldsEnabled(studentFields, !isCompany);
  setFieldsEnabled(companyFields, isCompany);
}

if (roleCards.length) {
  roleCards.forEach(card => {
    card.addEventListener('click', () => {
      roleCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedRole = card.dataset.role || 'student';
      updateRoleFields();
    });
  });

  updateRoleFields();
}

// إنشاء حساب
const signupForm = document.getElementById('signupForm');

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      role: selectedRole,
      email: '',
      password: '',
      phone: ''
    };

    if (selectedRole === 'student') {
      const firstName = document.getElementById('firstName')?.value.trim() || '';
      const lastName = document.getElementById('lastName')?.value.trim() || '';

      payload.first_name = firstName;
      payload.last_name = lastName;
      payload.username = document.getElementById('username')?.value.trim() || '';
      payload.email = document.getElementById('email')?.value.trim() || '';
      payload.password = document.getElementById('password')?.value || '';
      payload.phone_number = document.getElementById('phone')?.value.trim() || '';
      payload.university = document.getElementById('university')?.value || '';
      payload.major = document.getElementById('major')?.value || '';
    } else {
      payload.provider_name = document.getElementById('companyName')?.value.trim() || '';
      payload.email = document.getElementById('companyEmail')?.value.trim() || '';
      payload.password = document.getElementById('companyPassword')?.value || '';
      payload.phone_number = document.getElementById('companyPhone')?.value.trim() || '';
      payload.provider_type = document.getElementById('industry')?.value || '';
      payload.location = document.getElementById('city')?.value || '';
      payload.website = document.getElementById('website')?.value.trim() || '';
    }

    if (!payload.email || !payload.password) {
      alert('Please enter email and password.');
      return;
    }

    try {
      const response = await fetch(API_BASE + '/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        alert('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
        window.location.href = 'login.html';
      } else {
        alert('خطأ في التسجيل: ' + (data.error || 'تأكد من البيانات'));
      }
    } catch (error) {
      alert('فشل الاتصال بالسيرفر. تأكد من تشغيل Node.js');
    }
  });
}

// تسجيل دخول
const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email')?.value.trim() || '';
    const password = document.getElementById('password')?.value || '';

    try {
      const response = await fetch(API_BASE + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      

      if (response.ok) {
        localStorage.setItem('tadreeb_user_id', data.user.id);
        localStorage.setItem('tadreeb_user_role', data.role);
        localStorage.setItem('tadreeb_user_name', data.user.name || '');

        if (data.role === 'student') {
          window.location.href = 'dashboards/student-dashboard.html';
        } else if (data.role === 'company') {
          window.location.href = 'dashboards/company-dashboard.html';
        } else if (data.role === 'admin') {
          window.location.href = 'dashboards/admin-dashboard.html';
        }
      } else {
        alert(data.error || 'الايميل أو الباسورد غير صحيح');
      }
    } catch (error) {
      alert('حدث خطأ. تأكد من تشغيل السيرفر.');
    }
  });
}

const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

if (passwordInput && togglePassword) {
    togglePassword.addEventListener("click", () => {
        const isHidden = passwordInput.type === "password";

        passwordInput.type = isHidden ? "text" : "password";
        togglePassword.textContent = isHidden ? "🙈" : "👁";
    });
}