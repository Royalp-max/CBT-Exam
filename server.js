const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.SCHOOL_CBT_DATA_FILE || path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'db.json');
const SESSION_COOKIE = 'schoolCbtSession';
const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-session-secret');
const authRequestBuckets = new Map();
if (process.env.NODE_ENV === 'production' && !SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be configured in production.');
}

const defaultData = {
  users: [
    { id: 'admin-1', role: 'admin', username: 'admin', email: 'admin@school.edu', password: 'admin123', name: 'School Administrator', isPlatformAdmin: true },
    { id: 'teacher-1', role: 'teacher', username: 'teacher1', email: 'teacher1@school.edu', password: 'teacher123', name: 'Mr. Johnson' },
    { id: 'teacher-2', role: 'teacher', username: 'teacher2', email: 'teacher2@school.edu', password: 'teacher123', name: 'Mrs. Adeyemi' },
    { id: 'teacher-test', role: 'teacher', username: 'teacher.test', email: 'teacher.test@school.edu', password: 'teacher123', name: 'Adebayo' },
    { id: 'student-1', role: 'student', username: 'student1', password: 'student123', name: 'Alice Okafor', className: 'SS2A', studentId: 'ST-001' },
    { id: 'student-2', role: 'student', username: 'student2', password: 'student123', name: 'Daniel Smith', className: 'SS2A', studentId: 'ST-002' },
    { id: 'student-3', role: 'student', username: 'student3', password: 'student123', name: 'Grace Mensah', className: 'SS2B', studentId: 'ST-003' },
    { id: 'student-4', role: 'student', username: 'student4', password: 'student123', name: 'Samuel Adebayo', className: 'SS3A', studentId: 'ST-004' },
    { id: 'student-5', role: 'student', username: 'student5', password: 'student123', name: 'Chinelo Umeh', className: 'SS3A', studentId: 'ST-005' }
  ],
  schools: [
    { id: 'demo-school', name: 'Demo School', type: 'College', contactPerson: 'School Administrator', email: 'admin@school.edu', phone: '', address: '', createdAt: '2026-09-01T08:00:00.000Z' }
  ],
  questions: [
    {
      id: 'q-101',
      teacherId: 'teacher-1',
      teacherName: 'Mr. Johnson',
      subject: 'Mathematics',
      question: 'What is the value of 7 + 9?',
      options: ['12', '14', '16', '18'],
      correctIndex: 2,
      status: 'approved',
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      id: 'q-102',
      teacherId: 'teacher-1',
      teacherName: 'Mr. Johnson',
      subject: 'English',
      question: 'Choose the correct pronoun: "The teacher called ___ to the board."',
      options: ['he', 'him', 'his', 'hers'],
      correctIndex: 1,
      status: 'approved',
      createdAt: '2026-09-01T09:00:00.000Z'
    },
    {
      id: 'q-103',
      teacherId: 'teacher-2',
      teacherName: 'Mrs. Adeyemi',
      subject: 'Biology',
      question: 'Which part of the plant conducts photosynthesis?',
      options: ['Root', 'Leaf', 'Stem', 'Flower'],
      correctIndex: 1,
      status: 'approved',
      createdAt: '2026-09-05T10:00:00.000Z'
    },
    {
      id: 'q-104',
      teacherId: 'teacher-2',
      teacherName: 'Mrs. Adeyemi',
      subject: 'Chemistry',
      question: 'Which gas is released during photosynthesis?',
      options: ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Hydrogen'],
      correctIndex: 1,
      status: 'pending',
      createdAt: '2026-09-06T11:00:00.000Z'
    }
  ],
  results: [
    { id: 'result-1', studentId: 'ST-001', studentName: 'Alice Okafor', className: 'SS2A', score: 8, total: 10, submittedAt: '2026-09-12T09:00:00.000Z' },
    { id: 'result-2', studentId: 'ST-002', studentName: 'Daniel Smith', className: 'SS2A', score: 7, total: 10, submittedAt: '2026-09-12T11:20:00.000Z' },
    { id: 'result-3', studentId: 'ST-003', studentName: 'Grace Mensah', className: 'SS2B', score: 9, total: 10, submittedAt: '2026-09-13T08:15:00.000Z' },
    { id: 'result-4', studentId: 'ST-004', studentName: 'Samuel Adebayo', className: 'SS3A', score: 6, total: 10, submittedAt: '2026-09-14T10:30:00.000Z' }
  ]
};

const initialData = process.env.NODE_ENV === 'production'
  ? { users: [], schools: [], questions: [], results: [] }
  : defaultData;

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }

  const currentData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  currentData.users = Array.isArray(currentData.users) ? currentData.users : [];
  currentData.schools = Array.isArray(currentData.schools) ? currentData.schools : [];
  currentData.questions = Array.isArray(currentData.questions) ? currentData.questions : [];
  currentData.results = Array.isArray(currentData.results) ? currentData.results : [];

  const hasTestTeacher = currentData.users.some((user) => normalizeIdentifier(user.email || user.username) === 'teacher.test@school.edu');

  if (process.env.NODE_ENV !== 'production' && !hasTestTeacher) {
    currentData.users.push({
      id: 'teacher-test',
      role: 'teacher',
      username: 'teacher.test',
      email: 'teacher.test@school.edu',
      password: 'teacher123',
      name: 'Adebayo'
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
  }

  if (process.env.PLATFORM_ADMIN_EMAIL && process.env.PLATFORM_ADMIN_PASSWORD) {
    const adminEmail = normalizeIdentifier(process.env.PLATFORM_ADMIN_EMAIL);
    const platformAdmin = currentData.users.find((user) => normalizeIdentifier(user.email || user.username) === adminEmail);
    if (!platformAdmin) {
      currentData.users.push({
        id: `platform-admin-${Date.now()}`,
        role: 'admin',
        username: adminEmail,
        email: adminEmail,
        password: hashPassword(process.env.PLATFORM_ADMIN_PASSWORD),
        name: 'Platform Administrator',
        isPlatformAdmin: true
      });
    }
  }

  currentData.users = currentData.users.map((user) => {
    if (process.env.NODE_ENV !== 'production' && user.role === 'admin' && user.username === 'admin') {
      return { ...user, isPlatformAdmin: true };
    }
    if (user.role === 'teacher' && !user.email && user.username) {
      return {
        ...user,
        email: user.username
      };
    }
    return user;
  });

  if (process.env.NODE_ENV !== 'production') {
    currentData.schools = currentData.schools.some((school) => school.id === 'demo-school')
      ? currentData.schools
      : [...currentData.schools, { id: 'demo-school', name: 'Demo School', type: 'College', contactPerson: 'School Administrator', email: 'admin@school.edu', phone: '', address: '', createdAt: new Date().toISOString() }];
    currentData.users = currentData.users.map((user) => user.role !== 'admin' && !user.schoolId
      ? { ...user, schoolId: 'demo-school' }
      : user);
    currentData.questions = currentData.questions.map((question) => question.schoolId ? question : { ...question, schoolId: 'demo-school' });
    currentData.results = currentData.results.map((result) => result.schoolId ? result : { ...result, schoolId: 'demo-school' });
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
}

function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  const temporaryFile = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2));
  fs.renameSync(temporaryFile, DATA_FILE);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  const [scheme, salt, storedHash] = String(storedPassword || '').split(':');
  if (scheme !== 'scrypt' || !salt || !storedHash) {
    return process.env.NODE_ENV !== 'production' && String(password) === String(storedPassword || '');
  }

  const actualHash = crypto.scryptSync(String(password), salt, 64);
  const expectedHash = Buffer.from(storedHash, 'hex');
  return actualHash.length === expectedHash.length && crypto.timingSafeEqual(actualHash, expectedHash);
}

function createSessionToken(user) {
  const payload = Buffer.from(JSON.stringify({
    userId: user.id,
    expiresAt: Date.now() + 12 * 60 * 60 * 1000
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function getSessionUser(req) {
  if (!SESSION_SECRET) return null;
  const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map((cookie) => {
    const separator = cookie.indexOf('=');
    return separator < 0 ? ['', ''] : [cookie.slice(0, separator).trim(), cookie.slice(separator + 1).trim()];
  }));
  const [payload, signature] = String(cookies[SESSION_COOKIE] || '').split('.');
  if (!payload || !signature) return null;

  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch (error) {
    return null;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (session.expiresAt < Date.now()) return null;
    return readData().users.find((user) => user.id === session.userId) || null;
  } catch (error) {
    return null;
  }
}

function requireAuth(req, res, next) {
  req.user = getSessionUser(req);
  if (!req.user) return res.status(401).json({ message: 'Please sign in to continue.' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource.' });
    }
    next();
  };
}

function safeUser(user) {
  if (!user) return null;
  const { password, ...publicUser } = user;
  return publicUser;
}

function canAccessSchool(user, schoolId) {
  return Boolean(user?.isPlatformAdmin || (user?.schoolId && user.schoolId === schoolId));
}

function belongsToSchool(user, record) {
  return Boolean(user?.isPlatformAdmin || (record?.schoolId && user?.schoolId === record.schoolId));
}

function createRateLimiter(maxRequests, windowMs) {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let bucket = authRequestBuckets.get(key);
    if (!bucket || bucket.expiresAt <= now) {
      bucket = { count: 0, expiresAt: now + windowMs };
      authRequestBuckets.set(key, bucket);
    }
    if (bucket.count >= maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.expiresAt - now) / 1000)));
      return res.status(429).json({ message: 'Too many attempts. Please try again later.' });
    }
    bucket.count += 1;
    next();
  };
}

const limitLoginAttempts = createRateLimiter(10, 15 * 60 * 1000);
const limitSchoolRegistrations = createRateLimiter(5, 60 * 60 * 1000);

app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'School CBT API is running.' });
});

app.get('/api/auth/session', requireAuth, (req, res) => {
  res.json({ user: safeUser(req.user) });
});

app.post('/api/auth/logout', (req, res) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
  res.json({ success: true });
});

app.post('/api/auth/login', limitLoginAttempts, (req, res) => {
  const { username, email, password, role } = req.body || {};
  const data = readData();
  const loginIdentifier = normalizeIdentifier(email || username);

  const user = data.users.find((entry) => {
    const matchesRole = !role || entry.role === role;
    const entryIdentifier = normalizeIdentifier(entry.email || entry.username);
    const matchesIdentifier = entryIdentifier === loginIdentifier;
    return matchesIdentifier && verifyPassword(password, entry.password) && matchesRole;
  });

  if (!user) {
    return res.status(401).json({ message: 'Invalid email/username, password, or role.' });
  }

  const safeUserData = safeUser(user);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${createSessionToken(user)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secure}`);

  res.json({ user: safeUserData });
});

app.post('/api/schools/register', limitSchoolRegistrations, (req, res) => {
  const {
    schoolName,
    schoolType,
    contactPerson,
    schoolEmail,
    schoolPhone,
    schoolAddress,
    password
  } = req.body || {};

  if (!schoolName || !schoolType || !contactPerson || !schoolEmail || !schoolPhone || !schoolAddress || !password) {
    return res.status(400).json({ message: 'All school details and an account password are required.' });
  }
  if (String(password).length < 12) {
    return res.status(400).json({ message: 'Choose a password with at least 12 characters.' });
  }
  if (!['College', 'University'].includes(String(schoolType))) {
    return res.status(400).json({ message: 'Choose College or University as the school type.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(schoolEmail).trim())) {
    return res.status(400).json({ message: 'Enter a valid school email address.' });
  }

  const data = readData();
  const email = normalizeIdentifier(schoolEmail);
  if (data.users.some((user) => normalizeIdentifier(user.email || user.username) === email)) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }
  const schoolId = `school-${crypto.randomUUID()}`;
  const school = {
    id: schoolId,
    name: String(schoolName).trim(),
    type: String(schoolType).trim(),
    contactPerson: String(contactPerson).trim(),
    email,
    phone: String(schoolPhone).trim(),
    address: String(schoolAddress).trim(),
    createdAt: new Date().toISOString()
  };

  data.schools = Array.isArray(data.schools) ? data.schools : [];
  data.schools.push(school);
  data.users.push({
    id: `admin-${crypto.randomUUID()}`,
    role: 'admin',
    username: email,
    email,
    password: hashPassword(password),
    name: school.contactPerson,
    schoolId
  });
  writeData(data);

  res.status(201).json({
    success: true,
    message: 'School registered successfully.',
    school
  });
});

app.post('/api/auth/register-student', requireAuth, requireRole('admin'), (req, res) => {
  const { name, username, password, className, studentId } = req.body || {};

  if (!name || !className || !studentId) {
    return res.status(400).json({ message: 'Student name, class, and ID are required.' });
  }

  const generatedUsername = username || `student.${name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')}`;
  const generatedPassword = password || crypto.randomBytes(12).toString('base64url');
  if (String(generatedPassword).length < 12) {
    return res.status(400).json({ message: 'Temporary passwords must contain at least 12 characters.' });
  }

  const data = readData();
  const exists = data.users.some((user) => belongsToSchool(req.user, user) && (user.username === generatedUsername || user.studentId === studentId));
  if (exists) {
    return res.status(409).json({ message: 'A student with that username or ID already exists.' });
  }

  const newStudent = {
    id: `student-${crypto.randomUUID()}`,
    role: 'student',
    username: generatedUsername,
    password: hashPassword(generatedPassword),
    name,
    className,
    studentId,
    schoolId: req.user.schoolId
  };

  data.users.push(newStudent);
  writeData(data);

  res.status(201).json({
    message: 'Student login created successfully.',
    user: {
      ...safeUser(newStudent)
    },
    temporaryPassword: generatedPassword
  });
});

app.post('/api/auth/register-teacher', requireAuth, requireRole('admin'), (req, res) => {
  const { name, email, username, password } = req.body || {};
  const teacherEmail = normalizeIdentifier(email || username);

  if (!name || !teacherEmail || !password || String(password).length < 12) {
    return res.status(400).json({ message: 'Teacher name, email, and password are required.' });
  }

  const data = readData();
  const exists = data.users.some((user) => normalizeIdentifier(user.email || user.username) === teacherEmail);
  if (exists) {
    return res.status(409).json({ message: 'A teacher with that email already exists.' });
  }

  const teacher = {
    id: `teacher-${crypto.randomUUID()}`,
    role: 'teacher',
    username: teacherEmail,
    email: teacherEmail,
    password: hashPassword(password),
    name,
    schoolId: req.user.schoolId
  };

  data.users.push(teacher);
  writeData(data);

  res.status(201).json({
    message: 'Teacher account created successfully.',
    user: {
      id: teacher.id,
      name: teacher.name,
      username: teacher.username,
      email: teacher.email,
      role: teacher.role
    }
  });
});

app.get('/api/schools', requireAuth, requireRole('admin'), (req, res) => {
  const data = readData();
  const schools = (Array.isArray(data.schools) ? data.schools : [])
    .filter((school) => canAccessSchool(req.user, school.id));

  res.json({
    success: true,
    schools: schools.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  });
});

app.get('/api/dashboard/admin', requireAuth, requireRole('admin'), (req, res) => {
  const data = readData();
  const inScope = (record) => belongsToSchool(req.user, record);
  const students = data.users.filter((user) => user.role === 'student' && inScope(user));
  const teachers = data.users.filter((user) => user.role === 'teacher' && inScope(user));
  const questions = data.questions.filter(inScope);
  const results = data.results.filter(inScope);
  const pendingQuestions = questions.filter((question) => question.status === 'pending');
  const approvedQuestions = questions.filter((question) => question.status === 'approved');
  const schools = (Array.isArray(data.schools) ? data.schools : []).filter((school) => canAccessSchool(req.user, school.id));

  const studentSummaries = students.map((student, index) => {
    const studentResults = results.filter((result) => result.studentId === student.studentId);
    const totalScores = studentResults.reduce((sum, result) => sum + result.score, 0);
    const averageScore = studentResults.length ? Math.round((totalScores / studentResults.length) / (studentResults[0]?.total || 1) * 100) : 0;
    const latestScore = studentResults.length ? studentResults[studentResults.length - 1].score : 0;

    return {
      ...safeUser(student),
      attendance: 82 + ((index + 1) * 3) % 12,
      averageScore,
      latestScore,
      resultCount: studentResults.length,
      grade: averageScore >= 80 ? 'A' : averageScore >= 70 ? 'B' : averageScore >= 60 ? 'C' : averageScore >= 50 ? 'D' : 'F'
    };
  });

  res.json({
    stats: {
      students: students.length,
      teachers: teachers.length,
      pendingQuestions: pendingQuestions.length,
      approvedQuestions: approvedQuestions.length,
      schools: schools.length
    },
    students: studentSummaries,
    pendingQuestions,
    recentResults: results.slice(0, 5).reverse(),
    questions,
    schools: schools.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  });
});

app.get('/api/dashboard/teacher/:teacherId', requireAuth, requireRole('teacher', 'admin'), (req, res) => {
  const { teacherId } = req.params;
  const data = readData();
  if (req.user.role === 'teacher' && req.user.id !== teacherId) {
    return res.status(403).json({ message: 'You can only access your own teacher dashboard.' });
  }
  const teacher = data.users.find((user) => user.id === teacherId && user.role === 'teacher');
  if (!teacher || !belongsToSchool(req.user, teacher)) {
    return res.status(404).json({ message: 'Teacher record not found.' });
  }
  const teacherQuestions = data.questions.filter((question) => question.teacherId === teacherId && belongsToSchool(req.user, question));

  res.json({
    teacher: safeUser(teacher),
    questions: teacherQuestions
  });
});

app.get('/api/dashboard/student/:studentId', requireAuth, requireRole('student', 'admin'), (req, res) => {
  const { studentId } = req.params;
  const data = readData();
  const student = data.users.find((user) => user.role === 'student' && user.studentId === studentId);

  if (!student || (req.user.role === 'student' && req.user.studentId !== studentId) || !belongsToSchool(req.user, student)) {
    return res.status(404).json({ message: 'Student record not found.' });
  }

  const examResults = data.results.filter((result) => result.studentId === studentId && belongsToSchool(req.user, result));

  res.json({
    student: safeUser(student),
    examResults,
    totalAttempts: examResults.length,
    bestScore: examResults.reduce((best, result) => Math.max(best, result.score), 0)
  });
});

app.get('/api/questions', requireAuth, requireRole('admin', 'teacher'), (req, res) => {
  const data = readData();
  res.json({ questions: data.questions.filter((question) => belongsToSchool(req.user, question)) });
});

app.post('/api/questions', requireAuth, requireRole('teacher'), (req, res) => {
  const { teacherId, teacherName, subject, question, options, correctIndex } = req.body || {};

  if (!teacherId || !subject || !question || !Array.isArray(options) || options.length < 2 || correctIndex === undefined) {
    return res.status(400).json({ message: 'Incomplete question data.' });
  }

  const data = readData();
  const newQuestion = {
    id: `q-${Date.now()}`,
    teacherId: req.user.id,
    teacherName: req.user.name || 'Teacher',
    schoolId: req.user.schoolId,
    subject,
    question,
    options,
    correctIndex: Number(correctIndex),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  data.questions.push(newQuestion);
  writeData(data);

  res.status(201).json({ message: 'Question submitted successfully and linked for admin review.', question: newQuestion });
});

app.post('/api/questions/:id/review', requireAuth, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { action } = req.body || {};
  const data = readData();

  const question = data.questions.find((item) => item.id === id && belongsToSchool(req.user, item));
  if (!question) {
    return res.status(404).json({ message: 'Question not found.' });
  }

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Choose approve or reject.' });
  }
  question.status = action === 'reject' ? 'rejected' : 'approved';
  writeData(data);

  res.json({ message: `Question ${question.status}.`, question });
});

app.get('/api/exam/:studentId', requireAuth, requireRole('student'), (req, res) => {
  const { studentId } = req.params;
  const data = readData();
  if (req.user.studentId !== studentId) {
    return res.status(403).json({ message: 'You can only access your own exam.' });
  }
  const student = data.users.find((user) => user.role === 'student' && user.studentId === studentId);

  if (!student) {
    return res.status(404).json({ message: 'Student record not found.' });
  }

  const approvedQuestions = data.questions.filter((question) => question.status === 'approved' && belongsToSchool(req.user, question));

  if (!approvedQuestions.length) {
    return res.status(404).json({ message: 'No approved questions available for this exam yet.' });
  }

  res.json({
    student: safeUser(student),
    durationMinutes: 30,
    questions: approvedQuestions.map((question) => ({
      id: question.id,
      subject: question.subject,
      question: question.question,
      options: question.options
    }))
  });
});

app.post('/api/exam/:studentId/submit', requireAuth, requireRole('student'), (req, res) => {
  const { studentId } = req.params;
  const { answers = [] } = req.body || {};
  if (!Array.isArray(answers)) {
    return res.status(400).json({ message: 'Answers must be submitted as a list.' });
  }
  const data = readData();
  if (req.user.studentId !== studentId) {
    return res.status(403).json({ message: 'You can only submit your own exam.' });
  }

  const student = data.users.find((user) => user.role === 'student' && user.studentId === studentId);
  if (!student) {
    return res.status(404).json({ message: 'Student record not found.' });
  }

  const approvedQuestions = data.questions.filter((question) => question.status === 'approved' && belongsToSchool(req.user, question));
  let score = 0;

  approvedQuestions.forEach((question) => {
    const selectedAnswer = answers.find((answer) => answer.questionId === question.id)?.selectedIndex;
    if (selectedAnswer === question.correctIndex) {
      score += 1;
    }
  });

  const result = {
    id: `result-${Date.now()}`,
    studentId,
    studentName: student.name,
    className: student.className,
    schoolId: student.schoolId,
    score,
    total: approvedQuestions.length,
    submittedAt: new Date().toISOString()
  };

  data.results.push(result);
  writeData(data);

  res.json({
    message: 'Exam submitted successfully.',
    result
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`School CBT app is running on http://localhost:${PORT}`);
  });
}

module.exports = { app };
