// Backend for TADREEBCOM new frontend
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
const q = (sql, params = []) => new Promise((resolve, reject) => db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
const toNum = (v) => v == null ? 0 : (typeof v === 'bigint' ? Number(v) : Number(v) || 0);

async function columnExists(table, column) {
  const rows = await q(`SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, column]);
  return toNum(rows[0]?.c) > 0;
}
async function addColumnIfMissing(table, column, definition) {
  try {
    if (!(await columnExists(table, column))) await q(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (e) {
    console.warn(`⚠️ Could not add ${table}.${column}:`, e.message);
  }
}
async function ensureSchema() {
  await addColumnIfMissing('students', 'first_name', 'VARCHAR(100) NULL');
  await addColumnIfMissing('students', 'last_name', 'VARCHAR(100) NULL');
  await addColumnIfMissing('students', 'username', 'VARCHAR(100) NULL');
  await addColumnIfMissing('students', 'phone_number', 'VARCHAR(30) NULL');
  await addColumnIfMissing('training_providers', 'status', "VARCHAR(20) NOT NULL DEFAULT 'Pending'");
  await addColumnIfMissing('training_providers', 'phone_number', 'VARCHAR(30) NULL');
  await addColumnIfMissing('training_providers', 'website', 'VARCHAR(255) NULL');
  await addColumnIfMissing('training_providers', 'description', 'TEXT NULL');
  await addColumnIfMissing('internships', 'status', "VARCHAR(20) NOT NULL DEFAULT 'Pending'");
  await addColumnIfMissing('internships', 'max_applicants', 'INT NULL');
  await addColumnIfMissing('internships', 'slug', 'VARCHAR(255) NULL');
  await addColumnIfMissing('internships', 'category', 'VARCHAR(255) NULL');
  await addColumnIfMissing('internships', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
}

db.getConnection(async (err, connection) => {
  if (err) console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
  else {
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    connection.release();
    await ensureSchema();
  }
});

function normalizeTargetMajor(major) {
  const trimmed = String(major || '').trim();
  if (trimmed === 'علم الحاسوب' || trimmed === 'أمن المعلومات والشبكات') return trimmed;
  const s = trimmed.toLowerCase();
  if (['cyber', 'security', 'network', 'أمن', 'شبكات'].some(h => s.includes(h))) return 'أمن المعلومات والشبكات';
  return trimmed || 'علم الحاسوب';
}
function makeSlug(title) {
  return String(title || '').toLowerCase().trim().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 240);
}
function adminCredentials(email, password) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@tadreeb.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  return email === adminEmail && password === adminPassword;
}

app.post('/api/signup', async (req, res) => {
  const { role, first_name, last_name, username, email, password, phone, phone_number, university, major, provider_name, location, provider_type, website } = req.body;
  if (!role || !email || !password) return res.status(400).json({ error: 'بيانات التسجيل ناقصة' });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const phoneValue = phone_number || phone || null;
    if (role === 'student') {
      if (!first_name || !last_name || !username) return res.status(400).json({ error: 'First name, last name, and username are required' });
      await q(
        'INSERT INTO students (first_name, last_name, username, university, major, email, password, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [first_name, last_name, username, university || null, major || null, email, hashedPassword, phoneValue]
      );
      return res.json({ success: true, message: 'تم تسجيل الطالب بنجاح!' });
    }
    await q('INSERT INTO training_providers (provider_name, provider_type, location, contact_email, password, phone_number, website, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [provider_name, provider_type || null, location || null, email, hashedPassword, phoneValue, website || null, 'Pending']);
    res.json({ success: true, message: 'تم تسجيل الشركة بنجاح!' });
  } catch (e) { res.status(500).json({ error: 'خطأ في التسجيل: ' + (e.sqlMessage || e.message) }); }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (adminCredentials(email, password)) return res.json({ success: true, role: 'admin', user: { id: 0, name: 'Admin' } });
    let rows = await q('SELECT * FROM students WHERE email = ?', [email]);
    if (rows.length && await bcrypt.compare(password, rows[0].password)) {
  const fullName = `${rows[0].first_name || ''} ${rows[0].last_name || ''}`.trim();

  return res.json({
    success: true,
    role: 'student',
    user: {
      id: rows[0].student_id,
      name: fullName || rows[0].username || ''
    }
  });
}
    rows = await q('SELECT * FROM training_providers WHERE contact_email = ?', [email]);
    if (rows.length && await bcrypt.compare(password, rows[0].password)) return res.json({ success: true, role: 'company', user: { id: rows[0].provider_id, name: rows[0].provider_name } });
    res.status(401).json({ success: false, error: 'الايميل أو الباسورد غير صحيح' });
  } catch (e) { res.status(500).json({ error: 'Database error' }); }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.query.role;
    const sql = role === 'student'
      ? `SELECT student_id, first_name, last_name, username, CONCAT_WS(' ', first_name, last_name) AS full_name, email, phone_number, university, major FROM students WHERE student_id = ?`
      : 'SELECT provider_id, provider_name, contact_email AS email, phone_number, website, location, provider_type, description, status FROM training_providers WHERE provider_id = ?';
    const rows = await q(sql, [id]);
    if (!rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Database error' }); }
});
app.put('/api/users/:id', async (req, res) => {
  const { role, first_name, last_name, username, phone_number, university, major } = req.body;

  try {
    if (role === 'student') {
      await q(
        `UPDATE students
         SET first_name = ?, last_name = ?, username = ?, phone_number = ?, university = ?, major = ?
         WHERE student_id = ?`,
        [first_name, last_name, username, phone_number, university, major, req.params.id]
      );

      return res.json({ success: true, message: 'Profile updated successfully' });
    }

    if (role === 'company') {
      const { provider_name, website, provider_type, location, description } = req.body;

      await q(
        `UPDATE training_providers
         SET provider_name = ?, website = ?, provider_type = ?, location = ?, description = ?
         WHERE provider_id = ?`,
        [provider_name, website, provider_type, location, description, req.params.id]
      );

      return res.json({ success: true, message: 'Company profile updated successfully' });
    }

    return res.status(400).json({ error: 'Invalid role' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/students', async (req, res) => {
  try { res.json(await q(`SELECT student_id, first_name, last_name, username, CONCAT_WS(' ', first_name, last_name) AS full_name, email, phone_number, university, major FROM students ORDER BY student_id DESC`)); }
  catch { res.status(500).json([]); }
});

app.get('/api/companies', async (req, res) => {
  try {
    const rows = await q(`SELECT tp.provider_id, tp.provider_name, tp.provider_type, tp.location, tp.contact_email AS email, tp.phone_number AS phone, tp.website, tp.description, tp.status, (SELECT COUNT(*) FROM internships i WHERE i.provider_id = tp.provider_id) AS active_internships FROM training_providers tp ORDER BY tp.provider_name ASC`);
    res.json(rows);
  } catch (e) { console.error(e.message); res.status(500).json([]); }
});

app.patch('/api/companies/:id/status', async (req, res) => {
  const status = req.body.status;
  if (!['Pending', 'Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'حالة الشركة غير صالحة' });
  try { const r = await q('UPDATE training_providers SET status = ? WHERE provider_id = ?', [status, req.params.id]); res.json({ success: true, affectedRows: r.affectedRows }); }
  catch (e) { res.status(500).json({ error: 'فشل تحديث حالة الشركة' }); }
});

const internshipSelect = `SELECT i.*, tp.provider_name, tp.provider_type, tp.location AS company_city, tp.contact_email AS company_email, tp.phone_number AS company_phone, tp.website AS company_website, tp.description AS company_description, COALESCE((SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.internship_id AND LOWER(a.status) != 'rejected'), 0) AS applicants_count FROM internships i JOIN training_providers tp ON i.provider_id = tp.provider_id`;

app.get('/api/internships', async (req, res) => {
  try {
    const params = [];
    let where = [];
    if (req.query.companyId) {
      where.push('i.provider_id = ?');
      params.push(req.query.companyId);
    } else if (req.query.admin !== "true") {
      where.push("i.status IN ('Approved', 'Full')");
    }

    if (req.query.slug) {
      where.push('i.slug = ?');
      params.push(req.query.slug);
    }
    const sql = internshipSelect + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY i.internship_id DESC';
    res.json(await q(sql, params));
  } catch (e) { console.error(e.message); res.status(500).json([]); }
});

app.get('/api/internships/:idOrSlug', async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const isNum = /^\d+$/.test(key);
    const rows = await q(internshipSelect + ` WHERE ${isNum ? 'i.internship_id = ?' : 'i.slug = ?'} LIMIT 1`, [key]);
    if (!rows.length) return res.status(404).json({ error: 'التدريب غير موجود' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/internships', async (req, res) => {
  const { companyId, title, description, major, location, duration, workType, category, maxApplicants, max_applicants } = req.body;
  if (!companyId || !title) return res.status(400).json({ error: 'بيانات التدريب ناقصة' });
  const max = Number(max_applicants || maxApplicants || 0);
  if (!Number.isInteger(max) || max < 1) return res.status(400).json({ error: 'يجب تحديد العدد الأقصى للمتقدمين' });
  const majorDb = normalizeTargetMajor(major);
  const natureParts = [];
  if (description) natureParts.push(String(description).trim());
  if (duration) natureParts.push(`المدة: ${String(duration).trim()}`);
  if (workType) natureParts.push(`نوع العمل: ${String(workType).trim()}`);
  try {
    await q('INSERT INTO internships (provider_id, title, training_nature, target_major, location, category, max_applicants, status, slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [companyId, title, natureParts.join('\n') || null, majorDb, location || null, category || workType || null, max, 'Pending', makeSlug(title)]);
    res.json({ success: true, message: 'تم نشر التدريب بنجاح وبانتظار موافقة الأدمن' });
  } catch (e) { res.status(500).json({ error: 'فشل إضافة التدريب: ' + (e.sqlMessage || e.message) }); }
});

app.put('/api/internships/:id', async (req, res) => {
  const { title, description, major, target_major, location, city, workType, category, maxApplicants, max_applicants } = req.body;

  try {
    const max = Number(max_applicants || maxApplicants || 0);
    if (!Number.isInteger(max) || max < 1) {
      return res.status(400).json({ error: 'يجب تحديد العدد الأقصى للمتقدمين' });
    }

    const majorDb = normalizeTargetMajor(target_major || major);
    const natureParts = [];

    if (description) natureParts.push(String(description).trim());
    if (workType) natureParts.push(`نوع العمل: ${String(workType).trim()}`);

    const r = await q(
      `UPDATE internships
       SET title = ?, training_nature = ?, target_major = ?, location = ?, category = ?, max_applicants = ?
       WHERE internship_id = ?`,
      [
        title,
        natureParts.join('\n') || null,
        majorDb,
        location || city || null,
        category || workType || null,
        max,
        req.params.id
      ]
    );

    res.json({ success: true, message: 'Internship updated successfully', affectedRows: r.affectedRows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update internship: ' + (e.sqlMessage || e.message) });
  }
});

app.patch('/api/internships/:id/status', async (req, res) => {
  const status = req.body.status;
  if (!['Pending', 'Approved', 'Rejected', 'Closed', 'Full'].includes(status)) return res.status(400).json({ error: 'حالة التدريب غير صالحة' });
  try { const r = await q('UPDATE internships SET status = ? WHERE internship_id = ?', [status, req.params.id]); res.json({ success: true, affectedRows: r.affectedRows }); }
  catch (e) { res.status(500).json({ error: 'فشل تحديث حالة التدريب' }); }
});
app.delete('/api/internships/:id', async (req, res) => {
  try { await q('DELETE FROM applications WHERE internship_id = ?', [req.params.id]); const r = await q('DELETE FROM internships WHERE internship_id = ?', [req.params.id]); res.json({ success: true, affectedRows: r.affectedRows }); }
  catch { res.status(500).json({ error: 'فشل حذف التدريب' }); }
});

app.post('/api/applications', async (req, res) => {
  const studentId = parseInt(req.body.studentId, 10);
  const internshipId = parseInt(req.body.internshipId, 10);
  if (!studentId || !internshipId) return res.status(400).json({ error: 'بيانات الطالب أو التدريب غير صالحة.' });
  try {
    const duplicates = await q('SELECT application_id FROM applications WHERE student_id = ? AND internship_id = ?', [studentId, internshipId]);
    if (duplicates.length) return res.status(400).json({ error: 'لقد تقدمت لهذا التدريب مسبقاً!' });
    const countRows = await q('SELECT COUNT(*) AS c FROM applications WHERE student_id = ?', [studentId]);
    if (toNum(countRows[0].c) >= 5) return res.status(400).json({ error: 'لا يمكنك التقديم على أكثر من 5 تدريبات.' });
    const capRows = await q("SELECT status, max_applicants, (SELECT COUNT(*) FROM applications a WHERE a.internship_id = internships.internship_id AND LOWER(a.status) != 'rejected') AS applicants_count FROM internships WHERE internship_id = ?", [internshipId]);
    if (!capRows.length) return res.status(404).json({ error: 'التدريب غير موجود.' });
    if (!/approved/i.test(capRows[0].status || '')) return res.status(400).json({ error: 'هذا التدريب غير متاح للتقديم حالياً.' });
    const max = toNum(capRows[0].max_applicants);
    const applicants = toNum(capRows[0].applicants_count);
    if (max > 0 && applicants >= max) { await q("UPDATE internships SET status = 'Full' WHERE internship_id = ?", [internshipId]); return res.status(400).json({ error: 'هذا التدريب وصل للعدد الأقصى من المتقدمين.' }); }
    await q("INSERT INTO applications (student_id, internship_id, status) VALUES (?, ?, 'Pending')", [studentId, internshipId]);
    if (max > 0 && applicants + 1 >= max) await q("UPDATE internships SET status = 'Full' WHERE internship_id = ?", [internshipId]);
    res.json({ success: true, message: 'تم التقديم بنجاح!' });
  } catch (e) { res.status(500).json({ error: 'فشل التقديم: ' + (e.sqlMessage || e.message) }); }
});

app.get('/api/applications', async (req, res) => {
  try {
    const params = [];
    let where = '';
    if (req.query.studentId) { where = 'WHERE a.student_id = ?'; params.push(req.query.studentId); }
    const rows = await q(`SELECT a.application_id, a.status, a.apply_date, a.student_id, a.internship_id, i.title AS internshipTitle, i.title AS internship_title, COALESCE(tp.provider_name, 'Unknown Company') AS companyName, tp.contact_email AS company_email, tp.phone_number AS company_phone FROM applications a JOIN internships i ON a.internship_id = i.internship_id LEFT JOIN training_providers tp ON i.provider_id = tp.provider_id ${where} ORDER BY a.apply_date DESC`, params);
    res.json(rows);
  } catch (e) { res.status(500).json([]); }
});

app.get('/api/applications/company', async (req, res) => {
  try {
    const rows = await q(`SELECT a.application_id, a.status, a.apply_date, a.internship_id, CONCAT_WS(' ', s.first_name, s.last_name) AS student_name, s.username AS student_username, s.email AS student_email, s.phone_number AS student_phone, s.major AS student_major, i.title AS internship_title FROM applications a JOIN students s ON a.student_id = s.student_id JOIN internships i ON a.internship_id = i.internship_id WHERE i.provider_id = ? ORDER BY a.apply_date DESC`, [req.query.companyId]);
    res.json(rows);
  } catch (e) { res.status(500).json([]); }
});

app.patch('/api/applications/:id', async (req, res) => {
  const status = req.body.status;
  if (!['Pending', 'Approved', 'Rejected', 'Accepted'].includes(status)) return res.status(400).json({ error: 'حالة الطلب غير صالحة' });
  try { const r = await q('UPDATE applications SET status = ? WHERE application_id = ?', [status === 'Accepted' ? 'Approved' : status, req.params.id]); res.json({ success: true, affectedRows: r.affectedRows }); }
  catch { res.status(500).json({ error: 'فشل تحديث الحالة' }); }
});

app.get('/api/applications/stats', async (req, res) => {
  try {
    const rows = await q(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status IN ('Approved','Accepted') THEN 1 ELSE 0 END) AS accepted FROM applications WHERE student_id = ?`, [req.query.studentId]);
    res.json(rows[0] || { total: 0, pending: 0, accepted: 0 });
  } catch { res.status(500).json({ total: 0, pending: 0, accepted: 0 }); }
});

app.get('/api/stats/home', async (req, res) => {
  try {
    const rows = await q(`SELECT (SELECT COUNT(*) FROM internships WHERE status IN ('Approved','Full')) AS internships, (SELECT COUNT(*) FROM training_providers WHERE status = 'Approved') AS companies, (SELECT COUNT(*) FROM students) AS students`);
    res.json({ internships: toNum(rows[0].internships), companies: toNum(rows[0].companies), students: toNum(rows[0].students) });
  } catch { res.json({ internships: 0, companies: 0, students: 0 }); }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const rows = await q(`SELECT (SELECT COUNT(*) FROM students) AS students, (SELECT COUNT(*) FROM training_providers) AS companies, (SELECT COUNT(*) FROM training_providers WHERE status = 'Approved') AS approvedCompanies, (SELECT COUNT(*) FROM training_providers WHERE status = 'Pending') AS pendingCompanies, (SELECT COUNT(*) FROM internships) AS internships, (SELECT COUNT(*) FROM internships WHERE status IN ('Approved','Full')) AS activeInternships, (SELECT COUNT(*) FROM applications) AS applications, (SELECT COUNT(*) FROM applications WHERE status IN ('Approved','Accepted')) AS acceptedApplications, (SELECT COUNT(*) FROM applications WHERE status = 'Pending') AS pendingApplications, (SELECT COUNT(*) FROM applications WHERE status = 'Rejected') AS rejectedApplications`);
    const r = rows[0] || {};
    res.json(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, toNum(v)])));
  } catch (e) { res.status(500).json({ error: 'stats error' }); }
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`السيرفر شغال على بورت ${PORT}`));
