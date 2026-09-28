const electronBridge = (() => {
  try {
    return require('electron');
  } catch (error) {
    return null;
  }
})();

const state = {
  user: null,
  exam: null,
  selectedAnswers: {},
  timer: null,
  timeRemaining: 1800,
  adminData: null,
  currentQuestionIndex: 0,
  teacherQuestionDrafts: [],
  teacherQuestionDraftIndex: 0
};

const elements = {
  landingPage: document.getElementById('landingPage'),
  adminSection: document.getElementById('adminSection'),
  teacherSection: document.getElementById('teacherSection'),
  studentSection: document.getElementById('studentSection'),
  loginForm: document.getElementById('loginForm'),
  schoolLoginForm: document.getElementById('schoolLoginForm'),
  schoolLoginMessage: document.getElementById('schoolLoginMessage'),
  schoolLoginRole: document.getElementById('schoolLoginRole'),
  schoolLoginIdentifier: document.getElementById('schoolLoginIdentifier'),
  schoolLoginIdentifierLabel: document.getElementById('schoolLoginIdentifierLabel'),
  authModeButtons: document.querySelectorAll('.auth-mode-btn'),
  authFormPanels: document.querySelectorAll('.auth-form-panel'),
  logoutBtn: document.getElementById('logoutBtn'),
  roleSelect: document.getElementById('roleSelect'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  loginMessage: document.getElementById('loginMessage'),
  adminStats: document.getElementById('adminStats'),
  adminAnalytics: document.getElementById('adminAnalytics'),
  pendingQuestions: document.getElementById('pendingQuestions'),
  pendingQuestionsPage: document.getElementById('pendingQuestionsPage'),
  recentResults: document.getElementById('recentResults'),
  studentCreateForm: document.getElementById('studentCreateForm'),
  studentCreateMessage: document.getElementById('studentCreateMessage'),
  questionForm: document.getElementById('questionForm'),
  questionMessage: document.getElementById('questionMessage'),
  teacherRegisterForm: document.getElementById('teacherRegisterForm'),
  teacherRegisterMessage: document.getElementById('teacherRegisterMessage'),
  teacherQuestions: document.getElementById('teacherQuestions'),
  teacherSubmittedExams: document.getElementById('teacherSubmittedExams'),
  teacherApprovedQuestions: document.getElementById('teacherApprovedQuestions'),
  teacherToolbarActions: document.getElementById('teacherToolbarActions'),
  teacherWelcomeName: document.getElementById('teacherWelcomeName'),
  teacherQuestionBankPage: document.getElementById('teacherQuestionBankPage'),
  teacherApprovedQuestionBankPage: document.getElementById('teacherApprovedQuestionBankPage'),
  teacherSubmittedExamsPage: document.getElementById('teacherSubmittedExamsPage'),
  teacherResultsPage: document.getElementById('teacherResultsPage'),
  studentDetails: document.getElementById('studentDetails'),
  studentProfilePage: document.getElementById('studentProfilePage'),
  studentExamPage: document.getElementById('studentExamPage'),
  studentAttemptPage: document.getElementById('studentAttemptPage'),
  examContainer: document.getElementById('examContainer'),
  examStatus: document.getElementById('examStatus'),
  examQuestions: document.getElementById('examQuestions'),
  timerDisplay: document.getElementById('timerDisplay'),
  submitExamBtn: document.getElementById('submitExamBtn')
};

async function initApp() {
  document.body.classList.remove('theme-dark');
  document.body.classList.add('theme-light');
  bindEvents();
  try {
    const response = await fetch('/api/auth/session');
    if (!response.ok) throw new Error('No active session');
    const data = await response.json();
    state.user = data.user;
    localStorage.setItem('schoolCbtUser', JSON.stringify(state.user));
    renderDashboard();
  } catch (error) {
    localStorage.removeItem('schoolCbtUser');
    renderLanding();
  }
}

function updateLoginIdentifierField() {
  if (!elements.roleSelect || !elements.username) return;

  const isTeacherLogin = elements.roleSelect.value === 'teacher';
  const usernameLabel = document.querySelector('label[for="username"]');
  if (usernameLabel) {
    usernameLabel.textContent = isTeacherLogin ? 'Email' : 'Username';
  }
  elements.username.type = isTeacherLogin ? 'email' : 'text';
  elements.username.placeholder = isTeacherLogin ? 'Enter email' : 'Enter username';
}

function toggleAuthMode(mode) {
  const nextMode = mode === 'login' ? 'login' : 'signup';

  elements.authModeButtons?.forEach((button) => {
    const isActive = button.dataset.authMode === nextMode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  elements.authFormPanels?.forEach((panel) => {
    const isActive = panel.dataset.authForm === nextMode;
    panel.classList.toggle('hidden', !isActive);
  });
}

function updateSchoolLoginIdentifier() {
  if (!elements.schoolLoginRole || !elements.schoolLoginIdentifier || !elements.schoolLoginIdentifierLabel) return;

  const role = elements.schoolLoginRole.value;
  const isStudent = role === 'student';
  elements.schoolLoginIdentifierLabel.textContent = isStudent ? 'Student Username' : role === 'teacher' ? 'Teacher Email' : 'School Email';
  elements.schoolLoginIdentifier.type = isStudent ? 'text' : 'email';
  elements.schoolLoginIdentifier.placeholder = isStudent ? 'Enter student username' : `Enter ${role === 'teacher' ? 'teacher' : 'school'} email`;
}

function bindEvents() {
  elements.loginForm?.addEventListener('submit', handleLogin);
  elements.schoolLoginForm?.addEventListener('submit', handleSchoolLogin);
  elements.schoolLoginRole?.addEventListener('change', updateSchoolLoginIdentifier);
  updateSchoolLoginIdentifier();
  elements.authModeButtons?.forEach((button) => {
    button.addEventListener('click', () => toggleAuthMode(button.dataset.authMode));
  });
  elements.roleSelect?.addEventListener('change', updateLoginIdentifierField);
  updateLoginIdentifierField();
  elements.logoutBtn?.addEventListener('click', logout);
  document.getElementById('studentAppMinimize')?.addEventListener('click', () => {
    if (electronBridge?.remote?.getCurrentWindow) {
      electronBridge.remote.getCurrentWindow().minimize();
    }
  });
  document.getElementById('studentAppClose')?.addEventListener('click', () => {
    if (electronBridge?.remote?.getCurrentWindow) {
      electronBridge.remote.getCurrentWindow().close();
    }
  });
  document.getElementById('printAdminReport')?.addEventListener('click', () => window.print());
  document.getElementById('printTeacherReport')?.addEventListener('click', printTeacherQuestionBank);
  document.getElementById('exportAdminExcel')?.addEventListener('click', exportAdminExcel);
  document.getElementById('exportAdminPdf')?.addEventListener('click', () => window.print());
  document.getElementById('exportTeacherExcel')?.addEventListener('click', exportTeacherQuestionBankExcel);
  document.getElementById('exportTeacherPdf')?.addEventListener('click', printTeacherQuestionBank);
  document.getElementById('prevQuestionBtn')?.addEventListener('click', navigateTeacherQuestion.bind(null, -1));
  document.getElementById('nextQuestionBtn')?.addEventListener('click', navigateTeacherQuestion.bind(null, 1));
  elements.studentCreateForm?.addEventListener('submit', handleStudentAccountCreation);
  document.getElementById('studentCreateFormPage')?.addEventListener('submit', handleStudentAccountCreation);
  elements.questionForm?.addEventListener('submit', handleQuestionSubmission);
  elements.teacherRegisterForm?.addEventListener('submit', handleTeacherAccountCreation);
  document.getElementById('teacherRegisterFormPage')?.addEventListener('submit', handleTeacherAccountCreation);
  elements.submitExamBtn.addEventListener('click', submitExam);
  document.getElementById('startExamBtn')?.addEventListener('click', startExam);

  document.querySelectorAll('.role-card').forEach((card) => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      if (!elements.roleSelect || !elements.username || !elements.password) return;

      elements.roleSelect.value = role;
      updateLoginIdentifierField();
      const defaults = {
        admin: ['admin', 'admin123'],
        teacher: ['teacher.test@school.edu', 'teacher123'],
        student: ['student1', 'student123']
      };
      const [username, password] = defaults[role];
      elements.username.value = username;
      elements.password.value = password;
    });
  });

  document.querySelectorAll('.sidebar-menu-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const targetId = toggle.getAttribute('aria-controls');
      const navGroup = document.getElementById(targetId);
      if (!navGroup) return;

      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      navGroup.classList.toggle('is-open', !expanded);
    });
  });

  document.querySelectorAll('.nav-item').forEach((navButton) => {
    navButton.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((item) => {
        item.classList.toggle('active', item === navButton);
      });

      const section = navButton.dataset.section;
      const isAdminNav = navButton.closest('#adminNavGroup');

      if (isAdminNav) {
        document.querySelectorAll('.admin-page').forEach((page) => {
          const pageMatches = page.dataset.adminPage === section;
          page.classList.toggle('hidden', !pageMatches);
          page.classList.toggle('active', pageMatches);
        });

        if (section === 'dashboard') {
          renderAdminTab('overview', state.adminData);
        }
        if (section === 'students') {
          renderAdminTab('attendance', state.adminData);
        }
        if (section === 'pending-questions') {
          renderPendingQuestionsPage();
        }
        if (section === 'schools') {
          renderRegisteredSchools();
        }
        return;
      }

      if (section === 'overview') {
        renderAdminTab('overview', state.adminData);
        document.getElementById('adminTabContent')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      if (section === 'attendance') {
        renderAdminTab('attendance', state.adminData);
        document.getElementById('adminTabContent')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      if (section === 'create-question') {
        showTeacherPage('create-question');
        document.getElementById('questionForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (section === 'question-bank') {
        showTeacherPage('question-bank');
        document.getElementById('teacherApprovedQuestions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (section === 'submitted-exams') {
        showTeacherPage('submitted-exams');
        document.getElementById('teacherSubmittedExams')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (section === 'teacher-results') {
        showTeacherPage('teacher-results');
        document.getElementById('teacherAnalytics')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (section === 'profile') {
        showStudentPage('profile');
      }
      if (section === 'exam') {
        showStudentPage('exam');
      }
    });
  });

  document.querySelectorAll('.tab-button[data-account-view]').forEach((tabButton) => {
    tabButton.addEventListener('click', () => {
      const view = tabButton.dataset.accountView;
      document.querySelectorAll('.tab-button[data-account-view]').forEach((button) => {
        button.classList.toggle('active', button === tabButton);
      });
      document.querySelectorAll('.account-login-panel').forEach((panel) => {
        const matches = panel.dataset.accountPanel === view;
        panel.classList.toggle('hidden', !matches);
      });
    });
  });
}

function showStudentPage(page) {
  const profilePage = document.getElementById('studentProfilePage');
  const examPage = document.getElementById('studentExamPage');
  const attemptPage = document.getElementById('studentAttemptPage');
  if (!profilePage || !examPage || !attemptPage) return;

  const showProfile = page === 'profile';
  const showExam = page === 'exam';
  const showAttempt = page === 'attempt';

  profilePage.classList.toggle('hidden', !showProfile);
  examPage.classList.toggle('hidden', !showExam);
  attemptPage.classList.toggle('hidden', !showAttempt);

  if (!showAttempt) {
    elements.examContainer?.classList.add('hidden');
  }
}

function getQuestionDraftFromForm() {
  return {
    subject: document.getElementById('subject').value.trim(),
    question: document.getElementById('questionText').value.trim(),
    options: [
      document.getElementById('optionA').value.trim(),
      document.getElementById('optionB').value.trim(),
      document.getElementById('optionC').value.trim(),
      document.getElementById('optionD').value.trim()
    ],
    correctIndex: Number(document.getElementById('correctIndex').value)
  };
}

function populateQuestionDraftForm(question = {}) {
  document.getElementById('subject').value = question.subject || '';
  document.getElementById('questionText').value = question.question || '';
  document.getElementById('optionA').value = question.options?.[0] || '';
  document.getElementById('optionB').value = question.options?.[1] || '';
  document.getElementById('optionC').value = question.options?.[2] || '';
  document.getElementById('optionD').value = question.options?.[3] || '';
  document.getElementById('correctIndex').value = String(question.correctIndex ?? 0);
}

function saveCurrentQuestionDraft() {
  const currentQuestion = getQuestionDraftFromForm();
  const subject = currentQuestion.subject;

  if (!subject || !currentQuestion.question || currentQuestion.options.some((option) => !option)) {
    return false;
  }

  if (!state.teacherQuestionDrafts[state.teacherQuestionDraftIndex]) {
    state.teacherQuestionDrafts[state.teacherQuestionDraftIndex] = currentQuestion;
  } else {
    state.teacherQuestionDrafts[state.teacherQuestionDraftIndex] = currentQuestion;
  }

  return true;
}

function navigateTeacherQuestion(direction) {
  const valid = saveCurrentQuestionDraft();
  if (!valid && direction > 0) {
    elements.questionMessage.textContent = 'Please complete the current question before moving on.';
    return;
  }

  const nextIndex = state.teacherQuestionDraftIndex + direction;
  if (nextIndex < 0) return;

  state.teacherQuestionDraftIndex = nextIndex;

  const draft = state.teacherQuestionDrafts[nextIndex] || {
    subject: document.getElementById('subject').value.trim() || '',
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0
  };

  populateQuestionDraftForm(draft);
  elements.questionMessage.textContent = `Question ${state.teacherQuestionDraftIndex + 1} of ${Math.max(state.teacherQuestionDrafts.length, 1)}`;
}

function showTeacherPage(page) {
  const pages = {
    'create-question': elements.teacherQuestionBankPage,
    'question-bank': elements.teacherApprovedQuestionBankPage,
    'submitted-exams': elements.teacherSubmittedExamsPage,
    'teacher-results': elements.teacherResultsPage
  };

  Object.entries(pages).forEach(([key, element]) => {
    if (!element) return;
    element.classList.toggle('hidden', key !== page);
  });

  if (elements.teacherToolbarActions) {
    const showToolbar = page === 'question-bank';
    elements.teacherToolbarActions.classList.toggle('hidden', !showToolbar);
  }
}

async function handleSchoolLogin(event) {
  event.preventDefault();

  const identifier = elements.schoolLoginIdentifier?.value?.trim();
  const password = document.getElementById('schoolLoginPassword')?.value;
  const role = elements.schoolLoginRole?.value || 'admin';

  if (!identifier || !password) {
    elements.schoolLoginMessage.textContent = 'Please enter your account identifier and password.';
    return;
  }

  elements.schoolLoginMessage.textContent = 'Signing in...';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(role === 'student' ? { username: identifier } : { email: identifier }), password, role })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'School login failed.');
    }

    state.user = data.user;
    localStorage.setItem('schoolCbtUser', JSON.stringify(state.user));
    renderDashboard();
  } catch (error) {
    elements.schoolLoginMessage.textContent = error.message;
  }
}

async function handleLogin(event) {
  event.preventDefault();

  if (elements.loginForm?.dataset.mode === 'school-registration') {
    const schoolPayload = {
      schoolName: document.getElementById('schoolName')?.value?.trim(),
      schoolType: document.getElementById('schoolType')?.value,
      contactPerson: document.getElementById('contactPerson')?.value?.trim(),
      schoolEmail: document.getElementById('schoolEmail')?.value?.trim(),
      password: document.getElementById('schoolPassword')?.value,
      schoolPhone: document.getElementById('schoolPhone')?.value?.trim(),
      schoolAddress: document.getElementById('schoolAddress')?.value?.trim()
    };

    try {
      const response = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schoolPayload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'School registration failed.');
      }

      elements.loginMessage.textContent = data.message || 'School registered successfully.';
      elements.loginForm.reset();
      toggleAuthMode('login');
      elements.schoolLoginMessage.textContent = data.message || 'School registered successfully. You can now sign in.';
      return;
    } catch (error) {
      elements.loginMessage.textContent = error.message;
      return;
    }
  }

  elements.loginMessage.textContent = 'Signing in...';

  if (!elements.roleSelect || !elements.username || !elements.password) {
    elements.loginMessage.textContent = 'Login details are not available on this screen.';
    return;
  }

  const role = elements.roleSelect.value;
  const credentialValue = elements.username.value.trim();
  const payload = {
    ...(role === 'teacher' ? { email: credentialValue } : { username: credentialValue }),
    password: elements.password.value.trim(),
    role
  };

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    state.user = data.user;
    localStorage.setItem('schoolCbtUser', JSON.stringify(state.user));
    elements.loginMessage.textContent = 'Login successful.';
    renderDashboard();
  } catch (error) {
    elements.loginMessage.textContent = error.message;
  }
}

function logout() {
  fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  state.user = null;
  state.exam = null;
  state.selectedAnswers = {};
  state.timeRemaining = 1800;
  localStorage.removeItem('schoolCbtUser');
  clearInterval(state.timer);
  elements.loginMessage.textContent = '';
  renderLanding();
}

function renderLanding() {
  elements.landingPage.classList.remove('hidden');
  elements.adminSection.classList.add('hidden');
  elements.teacherSection.classList.add('hidden');
  elements.studentSection.classList.add('hidden');
  elements.logoutBtn.classList.remove('hidden');
  elements.logoutBtn.disabled = true;
  elements.logoutBtn.textContent = 'Logout';
}

function renderDashboard() {
  const { role } = state.user;
  elements.landingPage.classList.add('hidden');
  elements.logoutBtn.classList.remove('hidden');
  elements.logoutBtn.disabled = false;

  elements.adminSection.classList.toggle('hidden', role !== 'admin');
  elements.teacherSection.classList.toggle('hidden', role !== 'teacher');
  elements.studentSection.classList.toggle('hidden', role !== 'student');

  if (role === 'admin') {
    loadAdminDashboard();
  }

  if (role === 'teacher') {
    showTeacherPage('question-bank');
    loadTeacherDashboard();
  }

  if (role === 'student') {
    loadStudentDashboard();
  }
}

async function loadAdminDashboard() {
  try {
    const response = await fetch('/api/dashboard/admin');
    const data = await response.json();
    state.adminData = data;

    const stats = [
      { label: 'Students', value: data.stats.students },
      { label: 'Teachers', value: data.stats.teachers },
      { label: 'Pending Questions', value: data.stats.pendingQuestions },
      { label: 'Approved Questions', value: data.stats.approvedQuestions }
    ];

    elements.adminStats.innerHTML = stats.map((item) => `
      <div class="stat-card">
        <p>${item.label}</p>
        <h3>${item.value}</h3>
      </div>
    `).join('');

    const subjectBreakdown = (data.questions || []).reduce((acc, question) => {
      const subject = question.subject || 'General';
      acc[subject] = (acc[subject] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(subjectBreakdown).slice(0, 5).map(([label, count]) => ({
      label,
      value: Math.min(100, Math.max(25, count * 35))
    }));

    if (!chartData.length) {
      chartData.push({ label: 'No data', value: 18 });
    }

    elements.adminAnalytics.innerHTML = `
      <div class="analytics-header">
        <div>
          <p class="eyebrow small">Analytics</p>
          <h3>Subject mix</h3>
        </div>
        <span class="pill success">+12.4%</span>
      </div>
      <div class="chart-wrapper">
        ${chartData.map((item) => `
          <div class="chart-item">
            <span class="chart-bar" style="height: ${Math.max(item.value, 18)}%"></span>
            <small>${item.label}</small>
          </div>
        `).join('')}
      </div>
    `;

    elements.pendingQuestions.innerHTML = data.pendingQuestions.length
      ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Question</th>
              <th>Teacher</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${data.pendingQuestions.map((question) => `
              <tr>
                <td>${question.subject}</td>
                <td>${question.question}</td>
                <td>${question.teacherName}</td>
                <td>
                  <div class="action-row">
                    <button class="approve" data-action="approve" data-id="${question.id}">Approve</button>
                    <button class="reject" data-action="reject" data-id="${question.id}">Reject</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      : '<div class="empty-state"><p>No pending submissions.</p></div>';

    elements.pendingQuestions.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', handleQuestionReview);
    });

    elements.recentResults.innerHTML = data.recentResults.length
      ? `
        <table class="data-table compact-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.recentResults.map((result) => `
              <tr>
                <td>${result.studentName}</td>
                <td>${result.className || 'N/A'}</td>
                <td>${result.score}/${result.total}</td>
                <td><span class="badge approved">Submitted</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      : '<div class="empty-state"><p>No recent exam results.</p></div>';

    renderAdminTab('overview', data);
    renderRegisteredSchools();
    bindAdminTabs();
  } catch (error) {
    elements.adminStats.innerHTML = '<div class="list-item"><p>Unable to load dashboard.</p></div>';
  }
}

function renderPendingQuestionsPage() {
  const pendingTable = document.getElementById('pendingQuestionsPage');
  if (!pendingTable || !state.adminData) return;

  pendingTable.innerHTML = state.adminData.pendingQuestions.length
    ? `
      <table class="data-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Question</th>
            <th>Teacher</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${state.adminData.pendingQuestions.map((question) => `
            <tr>
              <td>${question.subject}</td>
              <td>${question.question}</td>
              <td>${question.teacherName}</td>
              <td>
                <div class="action-row">
                  <button class="approve" data-action="approve" data-id="${question.id}">Approve</button>
                  <button class="reject" data-action="reject" data-id="${question.id}">Reject</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '<div class="empty-state"><p>No pending submissions.</p></div>';

  pendingTable.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', handleQuestionReview);
  });
}

function renderRegisteredSchools() {
  const schoolsTable = document.getElementById('registeredSchoolsTable');
  const schools = Array.isArray(state.adminData?.schools) ? state.adminData.schools : [];
  if (!schoolsTable) return;

  schoolsTable.innerHTML = schools.length
    ? `
      <table class="data-table">
        <thead>
          <tr>
            <th>School Name</th>
            <th>Type</th>
            <th>Contact Person</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Address</th>
            <th>Registered</th>
          </tr>
        </thead>
        <tbody>
          ${schools.map((school) => `
            <tr>
              <td>${school.name || 'N/A'}</td>
              <td>${school.type || 'N/A'}</td>
              <td>${school.contactPerson || 'N/A'}</td>
              <td>${school.email || 'N/A'}</td>
              <td>${school.phone || 'N/A'}</td>
              <td>${school.address || 'N/A'}</td>
              <td>${school.createdAt ? new Date(school.createdAt).toLocaleDateString() : 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '<div class="empty-state"><p>No registered schools yet.</p></div>';
}

function bindAdminTabs() {
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-admin-tab]').forEach((item) => item.classList.toggle('active', item === button));
      renderAdminTab(button.dataset.adminTab, state.adminData);
    });
  });
}

function renderAdminTab(tab, data) {
  const adminTabContent = document.getElementById('adminTabContent');
  if (!adminTabContent || !data) return;

  if (tab === 'attendance') {
    const rows = (data.students || []).map((student) => `
      <tr>
        <td>${student.name}</td>
        <td>${student.className || 'N/A'}</td>
        <td>${student.studentId}</td>
        <td>${student.attendance}%</td>
        <td>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${Math.min(student.attendance, 100)}%"></div>
          </div>
        </td>
      </tr>
    `).join('');

    adminTabContent.innerHTML = `
      <div class="data-panel">
        <div class="filter-row">
          <input id="studentSearch" type="text" placeholder="Search student" />
          <select id="classFilter">
            <option value="all">All classes</option>
            ${(data.students || []).map((student) => `<option value="${student.className}">${student.className}</option>`).filter((option, index, arr) => arr.indexOf(option) === index).join('')}
          </select>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>ID</th>
              <th>Attendance</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody id="studentRows">
            ${rows}
          </tbody>
        </table>
      </div>
    `;

    const studentSearch = document.getElementById('studentSearch');
    const classFilter = document.getElementById('classFilter');
    const updateStudentTable = () => {
      const term = (studentSearch?.value || '').toLowerCase();
      const selectedClass = classFilter?.value || 'all';
      const rowsList = (data.students || []).filter((student) => {
        const matchesSearch = !term || student.name.toLowerCase().includes(term) || student.studentId.toLowerCase().includes(term);
        const matchesClass = selectedClass === 'all' || student.className === selectedClass;
        return matchesSearch && matchesClass;
      });

      const studentTableBody = document.getElementById('studentRows');
      if (studentTableBody) {
        studentTableBody.innerHTML = rowsList.map((student) => `
          <tr>
            <td>${student.name}</td>
            <td>${student.className || 'N/A'}</td>
            <td>${student.studentId}</td>
            <td>${student.attendance}%</td>
            <td>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${Math.min(student.attendance, 100)}%"></div>
              </div>
            </td>
          </tr>
        `).join('');
      }
    };

    studentSearch?.addEventListener('input', updateStudentTable);
    classFilter?.addEventListener('change', updateStudentTable);
    return;
  }

  adminTabContent.innerHTML = `
    <div class="data-panel">
      <div class="summary-grid">
        <div class="summary-chip"><span>Attendance</span><strong>${Math.round((data.students || []).reduce((sum, item) => sum + item.attendance, 0) / Math.max((data.students || []).length, 1))}%</strong></div>
        <div class="summary-chip"><span>Result rate</span><strong>${Math.round((data.recentResults || []).length ? ((data.recentResults.length / Math.max((data.students || []).length, 1)) * 100) : 0)}%</strong></div>
        <div class="summary-chip"><span>Questions</span><strong>${(data.questions || []).length}</strong></div>
      </div>
    </div>
  `;
}

function exportAdminExcel() {
  if (!state.adminData) return;

  const rows = [
    ['Student Name', 'Class', 'Student ID', 'Attendance', 'Average Score', 'Grade'],
    ...((state.adminData.students || []).map((student) => [
      student.name,
      student.className || 'N/A',
      student.studentId,
      `${student.attendance}%`,
      `${student.averageScore}%`,
      student.grade
    ]))
  ];

  exportCsvFile('school_admin_student_report.csv', rows);
}

function printTeacherQuestionBank() {
  const bankTable = document.getElementById('teacherApprovedQuestions');
  if (!bankTable) return;

  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) return;

  const tableHtml = bankTable.innerHTML;
  printWindow.document.write(`
    <html>
      <head>
        <title>Approved Question Bank</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border: 1px solid #d0d7de; padding: 10px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #e8f5e9; color: #1f6f3d; font-weight: 700; }
        </style>
      </head>
      <body>
        <h2>Approved Question Bank</h2>
        ${tableHtml}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

function exportTeacherQuestionBankExcel() {
  const teacherQuestions = document.getElementById('teacherApprovedQuestions');
  if (!teacherQuestions) return;

  const rows = [['Subject', 'Question', 'Options', 'Status']];
  const questionRows = Array.from(teacherQuestions.querySelectorAll('tbody tr'));
  questionRows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.innerText.trim());
    rows.push([cells[0], cells[1], cells[2] || '', cells[3] || 'Approved']);
  });

  exportCsvFile('teacher_approved_question_bank.csv', rows);
}

function exportCsvFile(fileName, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleQuestionReview(event) {
  const { action, id } = event.currentTarget.dataset;
  try {
    const response = await fetch(`/api/questions/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Review failed');
    await loadAdminDashboard();
  } catch (error) {
    elements.loginMessage.textContent = error.message;
  }
}

async function loadTeacherDashboard() {
  try {
    const teacherName = state.user?.name || 'Teacher';
    const firstName = teacherName.split(' ')[0] || teacherName;
    if (elements.teacherWelcomeName) {
      elements.teacherWelcomeName.textContent = `Teacher: ${firstName}`;
    }

    const teacherId = state.user.id;
    const response = await fetch(`/api/dashboard/teacher/${teacherId}`);
    const data = await response.json();

    elements.teacherQuestions.innerHTML = data.questions.length
      ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Question</th>
              <th>Options</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.questions.map((question) => `
              <tr>
                <td>${question.subject}</td>
                <td>${question.question}</td>
                <td>${question.options.join(' / ')}</td>
                <td><span class="badge ${question.status}">${question.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      : '<div class="empty-state"><p>No questions submitted yet.</p></div>';

    const approvedQuestions = data.questions.filter((question) => question.status === 'approved');

    elements.teacherApprovedQuestions.innerHTML = approvedQuestions.length
      ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Question</th>
              <th>Options</th>
              <th>Approved</th>
            </tr>
          </thead>
          <tbody>
            ${approvedQuestions.map((question) => `
              <tr>
                <td>${question.subject}</td>
                <td>${question.question}</td>
                <td>${question.options.join(' / ')}</td>
                <td><span class="badge approved">Approved</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      : '<div class="empty-state"><p>No approved questions yet. Questions become available here after admin approval.</p></div>';

    const subjectGroups = data.questions.reduce((acc, question) => {
      const subject = question.subject || 'General';
      if (!acc[subject]) {
        acc[subject] = { total: 0, approved: 0 };
      }
      acc[subject].total += 1;
      if (question.status === 'approved') acc[subject].approved += 1;
      return acc;
    }, {});

    const subjectCards = Object.entries(subjectGroups).map(([subject, stats]) => {
      const percentage = stats.total ? Math.round((stats.approved / stats.total) * 100) : 0;
      return `
        <div class="subject-card">
          <h4>${subject}</h4>
          <p>${stats.approved}/${stats.total} approved</p>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    });

    const teacherAnalytics = document.getElementById('teacherAnalytics');
    if (teacherAnalytics) {
      teacherAnalytics.innerHTML = `
        <div class="data-panel">
          <div class="panel-head">
            <h3>Subject analytics</h3>
            <span class="pill success">Live</span>
          </div>
          <div class="subject-analytics">
            ${subjectCards.length ? subjectCards.join('') : '<div class="empty-state"><p>No subject data yet.</p></div>'}
          </div>
        </div>
      `;
    }

    const submittedExams = data.questions.length
      ? data.questions.map((question, index) => ({
          id: question.id || `exam-${index + 1}`,
          subject: question.subject || 'General',
          student: `Student ${index + 1}`,
          status: question.status || 'pending',
          score: question.status === 'approved' ? '92%' : question.status === 'pending' ? 'Waiting' : 'Review'
        }))
      : [];

    elements.teacherSubmittedExams.innerHTML = submittedExams.length
      ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Subject</th>
              <th>Student</th>
              <th>Status</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            ${submittedExams.map((exam) => `
              <tr>
                <td>${exam.id}</td>
                <td>${exam.subject}</td>
                <td>${exam.student}</td>
                <td><span class="badge ${exam.status}">${exam.status}</span></td>
                <td>${exam.score}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      : '<div class="empty-state"><p>No submitted exams yet.</p></div>';
  } catch (error) {
    elements.teacherQuestions.innerHTML = '<div class="list-item"><p>Unable to load teacher questions.</p></div>';
    elements.teacherSubmittedExams.innerHTML = '<div class="list-item"><p>Unable to load submitted exams.</p></div>';
  }
}

async function handleStudentAccountCreation(event) {
  event.preventDefault();
  const form = document.getElementById('studentCreateFormPage') || document.getElementById('studentCreateForm');
  const studentNameInput = document.getElementById('studentFullNamePage') || document.getElementById('studentFullName');
  const classNameInput = document.getElementById('studentClassNamePage') || document.getElementById('studentClassName');
  const studentIdInput = document.getElementById('studentIdNumberPage') || document.getElementById('studentIdNumber');
  const statusElement = document.getElementById('studentCreateMessagePage') || elements.studentCreateMessage;

  statusElement.textContent = 'Creating student account...';

  const studentName = studentNameInput.value.trim();
  const className = classNameInput.value.trim();
  const studentId = studentIdInput.value.trim();

  const generatedUsername = `student.${studentName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')}`;
  const passwordBytes = new Uint8Array(12);
  window.crypto.getRandomValues(passwordBytes);
  const generatedPassword = Array.from(passwordBytes, (value) => value.toString(36).padStart(2, '0')).join('').slice(0, 16);

  const payload = {
    name: studentName,
    username: generatedUsername,
    password: generatedPassword,
    className,
    studentId
  };

  try {
    const response = await fetch('/api/auth/register-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unable to create student account');
    }

    form.reset();
    statusElement.textContent = `${data.message} Username: ${data.user.username}. Temporary password: ${generatedPassword}`;
    await loadAdminDashboard();
  } catch (error) {
    statusElement.textContent = error.message;
  }
}

async function handleTeacherAccountCreation(event) {
  event.preventDefault();
  const form = document.getElementById('teacherRegisterFormPage') || document.getElementById('teacherRegisterForm');
  const nameInput = document.getElementById('teacherNamePage') || document.getElementById('teacherName');
  const emailInput = document.getElementById('teacherEmailPage') || document.getElementById('teacherEmail') || document.getElementById('teacherUsername');
  const passwordInput = document.getElementById('teacherPasswordPage') || document.getElementById('teacherPassword');
  const statusElement = document.getElementById('teacherRegisterMessagePage') || elements.teacherRegisterMessage;

  statusElement.textContent = 'Creating teacher account...';

  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    password: passwordInput.value.trim()
  };

  try {
    const response = await fetch('/api/auth/register-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unable to create teacher account');
    }

    form.reset();
    statusElement.textContent = data.message;
    await loadTeacherDashboard();
  } catch (error) {
    statusElement.textContent = error.message;
  }
}

async function handleQuestionSubmission(event) {
  event.preventDefault();
  elements.questionMessage.textContent = 'Submitting...';

  const payload = {
    teacherId: state.user.id,
    teacherName: state.user.name,
    subject: document.getElementById('subject').value.trim(),
    question: document.getElementById('questionText').value.trim(),
    options: [
      document.getElementById('optionA').value.trim(),
      document.getElementById('optionB').value.trim(),
      document.getElementById('optionC').value.trim(),
      document.getElementById('optionD').value.trim()
    ],
    correctIndex: Number(document.getElementById('correctIndex').value)
  };

  try {
    const response = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unable to create question');
    }

    elements.questionForm.reset();
    state.teacherQuestionDrafts = [];
    state.teacherQuestionDraftIndex = 0;
    elements.questionMessage.textContent = data.message;
    await loadTeacherDashboard();
  } catch (error) {
    elements.questionMessage.textContent = error.message;
  }
}

async function loadStudentDashboard() {
  try {
    const studentId = state.user.studentId;
    const response = await fetch(`/api/dashboard/student/${studentId}`);
    const data = await response.json();

    elements.studentDetails.innerHTML = `
      <div class="student-meta">
        <strong>${data.student.name}</strong>
        <span>Student ID: ${data.student.studentId}</span>
        <span>Class: ${data.student.className}</span>
        <span>Role: ${data.student.role}</span>
      </div>
    `;

    const chartEntries = data.examResults.length
      ? data.examResults.slice(-5).map((result) => {
          const percentage = result.total ? Math.round((result.score / result.total) * 100) : 0;
          return { label: `A${result.id.slice(-1) || 1}`, percentage };
        })
      : [{ label: 'N/A', percentage: 0 }];

    const latestPercentage = data.examResults.length
      ? Math.round((data.examResults[data.examResults.length - 1].score / data.examResults[data.examResults.length - 1].total) * 100)
      : 0;

    const gradeBand = latestPercentage >= 80 ? 'A' : latestPercentage >= 70 ? 'B' : latestPercentage >= 60 ? 'C' : latestPercentage >= 50 ? 'D' : 'F';

    elements.studentDetails.innerHTML = `
      <div class="student-meta">
        <strong>${data.student.name}</strong>
        <span>Student ID: ${data.student.studentId}</span>
        <span>Class: ${data.student.className}</span>
        <span>Role: ${data.student.role}</span>
        <span>Exam Time: ${data.examTime || '30 minutes'}</span>
      </div>
    `;

    showStudentPage('profile');
  } catch (error) {
    elements.studentDetails.innerHTML = '<p>Unable to load student profile.</p>';
  }
}

async function startExam() {
  try {
    const response = await fetch(`/api/exam/${state.user.studentId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not load exam');

    state.exam = data;
    state.selectedAnswers = {};
    state.currentQuestionIndex = 0;
    state.timeRemaining = data.durationMinutes * 60;
    elements.examStatus.textContent = '';
    showStudentPage('attempt');
    elements.examContainer.classList.remove('hidden');
    renderExamQuestions();
    startTimer();
  } catch (error) {
    elements.examStatus.textContent = error.message;
  }
}

function renderExamQuestions() {
  if (!state.exam) return;

  const currentIndex = state.currentQuestionIndex || 0;
  const question = state.exam.questions[currentIndex];
  if (!question) return;

  elements.examQuestions.innerHTML = `
    <div class="exam-question">
      <h4>${currentIndex + 1}. ${question.question}</h4>
      <div class="option-list">
        ${question.options.map((option, optionIndex) => `
          <label class="option-item ${state.selectedAnswers[question.id] === optionIndex ? 'active' : ''}">
            <input type="radio" name="question-${question.id}" value="${optionIndex}" ${state.selectedAnswers[question.id] === optionIndex ? 'checked' : ''} />
            <span>${option}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="submit-row">
      <button type="button" class="secondary exam-nav-btn" id="prevQuestionBtn" ${currentIndex === 0 ? 'disabled' : ''}>Previous</button>
      <button type="button" class="primary exam-nav-btn" id="nextQuestionBtn">Next</button>
    </div>
  `;

  const prevButton = document.getElementById('prevQuestionBtn');
  const nextButton = document.getElementById('nextQuestionBtn');

  prevButton?.addEventListener('click', () => {
    if (state.currentQuestionIndex > 0) {
      state.currentQuestionIndex -= 1;
      renderExamQuestions();
    }
  });

  nextButton?.addEventListener('click', () => {
    if (state.currentQuestionIndex < state.exam.questions.length - 1) {
      state.currentQuestionIndex += 1;
      renderExamQuestions();
    }
  });

  elements.examQuestions.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const questionId = event.target.name.replace('question-', '');
      state.selectedAnswers[questionId] = Number(event.target.value);
      renderExamQuestions();
    });
  });
}

function startTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.timeRemaining -= 1;
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;
    elements.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (state.timeRemaining <= 0) {
      clearInterval(state.timer);
      submitExam();
    }
  }, 1000);
}

async function submitExam() {
  if (!state.exam) return;

  try {
    const answers = state.exam.questions.map((question) => ({
      questionId: question.id,
      selectedIndex: state.selectedAnswers[question.id] ?? null
    }));

    const response = await fetch(`/api/exam/${state.user.studentId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Submission failed');

    clearInterval(state.timer);
    elements.examContainer.classList.add('hidden');
    const percentage = data.result.total ? Math.round((data.result.score / data.result.total) * 100) : 0;
    const gradeBand = percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F';
    elements.studentDetails.insertAdjacentHTML('beforeend', `
      <div class="result-panel">
        <div class="result-score">${percentage}%</div>
        <div class="result-grade">Grade ${gradeBand}</div>
        <div class="student-meta">
          <strong>Result Submitted</strong>
          <span>Score: ${data.result.score}/${data.result.total}</span>
          <span>Submitted at: ${new Date(data.result.submittedAt).toLocaleString()}</span>
        </div>
      </div>
    `);
    state.exam = null;
    state.selectedAnswers = {};
    await loadStudentDashboard();
  } catch (error) {
    elements.studentDetails.insertAdjacentHTML('beforeend', `<p class="status-text">${error.message}</p>`);
  }
}

initApp();
