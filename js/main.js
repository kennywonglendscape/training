/* ===== Operating Lease Training - Main JS ===== */

// ---------------------------------------------------------------------------
// Authentication (front-end password gate)
// ---------------------------------------------------------------------------
// SECURITY NOTE: This is front-end-only protection intended to discourage
// casual, non-technical users from accessing the site without a password.
// It is NOT strong security. The password hash is visible in source code and
// a determined developer could bypass this entirely. For real security, use
// server-side authentication or hosting-level access controls (e.g. HTTP
// Basic Auth, Cloudflare Access, Netlify Identity).
//
// HOW TO CHANGE THE PASSWORD:
//   1. Open a browser console (F12 → Console) and run:
//        crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_NEW_PASSWORD'))
//          .then(buf => console.log(Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')));
//   2. Copy the hex string printed in the console.
//   3. Replace the PASSWORD_HASH value below with the new hex string.
//
// HOW TO DISABLE LOGIN PROTECTION:
//   1. Remove the Auth-guard <script> tags from every HTML file's <head>.
//   2. On index.html, remove the #login-section div and the style="display:none"
//      from #site-content.
//   3. Optionally remove this Auth object from main.js.
// ---------------------------------------------------------------------------
const Auth = {
  STORAGE_KEY: 'ol_training_auth',

  // SHA-256 hash of the shared password (ask your administrator for the password)
  PASSWORD_HASH: 'a040597aabf7b482d9c70cec61cd9273669244ea2e8312df4bb7b6fd4d21a107',

  /** Hash a plaintext string using SHA-256 via the Web Crypto API */
  async hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /** Verify a password against the stored hash. Returns true/false. */
  async verify(password) {
    const hash = await this.hashPassword(password);
    return hash === this.PASSWORD_HASH;
  },

  /** Check if the user is currently logged in */
  isLoggedIn() {
    return localStorage.getItem(this.STORAGE_KEY) === 'true';
  },

  /** Set login state in localStorage */
  login() {
    localStorage.setItem(this.STORAGE_KEY, 'true');
  },

  /** Clear login state and redirect to the homepage/login page */
  logout() {
    localStorage.removeItem(this.STORAGE_KEY);
    const path = window.location.pathname;
    if (path.includes('/lessons/') || path.includes('/quiz/') || path.includes('/calculator/')) {
      window.location.href = '../index.html';
    } else {
      window.location.href = 'index.html';
    }
  }
};

// ---------------------------------------------------------------------------
// SCORM integration — report progress to LMS when running inside a SCORM package
// ---------------------------------------------------------------------------
function _getScorm() {
  try {
    if (window.SCORM && window.SCORM.isActive()) return window.SCORM;
    if (window.parent && window.parent.SCORM && window.parent.SCORM.isActive()) return window.parent.SCORM;
    if (window.top && window.top.SCORM && window.top.SCORM.isActive()) return window.top.SCORM;
  } catch (e) { /* cross-origin — not in SCORM context */ }
  return null;
}

// ---------------------------------------------------------------------------
// Progress Tracking (localStorage)
// ---------------------------------------------------------------------------
const Progress = {
  STORAGE_KEY: 'ol_training_progress',

  _getData() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  },

  _save(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  /** Mark a lesson as completed */
  markLesson(lessonId) {
    const data = this._getData();
    if (!data.lessons) data.lessons = {};
    data.lessons[lessonId] = { completed: true, date: new Date().toISOString() };
    this._save(data);
  },

  /** Check if a lesson is completed */
  isLessonComplete(lessonId) {
    const data = this._getData();
    return !!(data.lessons && data.lessons[lessonId] && data.lessons[lessonId].completed);
  },

  /** Save quiz score */
  saveQuizScore(score, total) {
    const data = this._getData();
    if (!data.quizScores) data.quizScores = [];
    data.quizScores.push({ score, total, date: new Date().toISOString() });
    this._save(data);

    // Report score to SCORM LMS if available
    const scorm = _getScorm();
    if (scorm) scorm.reportScore(score, total);
  },

  /** Get best quiz score */
  getBestQuizScore() {
    const data = this._getData();
    if (!data.quizScores || data.quizScores.length === 0) return null;
    return data.quizScores.reduce((best, cur) =>
      (cur.score / cur.total) > (best.score / best.total) ? cur : best
    );
  },

  /** Get overall progress percentage */
  getProgressPercent() {
    const totalItems = 5; // 4 lessons + 1 quiz
    let completed = 0;
    const data = this._getData();
    if (data.lessons) {
      completed += Object.values(data.lessons).filter(l => l.completed).length;
    }
    if (data.quizScores && data.quizScores.length > 0) {
      completed += 1;
    }
    return Math.round((completed / totalItems) * 100);
  },

  /** Reset all progress */
  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};

// ---------------------------------------------------------------------------
// Homepage helpers
// ---------------------------------------------------------------------------
function initHomepage() {
  // Update progress bar
  const pct = Progress.getProgressPercent();
  const bar = document.getElementById('progress-bar');
  const label = document.getElementById('progress-label');
  if (bar) {
    bar.style.width = pct + '%';
    bar.setAttribute('aria-valuenow', pct);
    bar.textContent = pct + '%';
  }
  if (label) {
    label.textContent = pct === 100 ? 'All modules completed!' : pct + '% complete';
  }

  // Mark completed lessons on cards
  for (let i = 1; i <= 4; i++) {
    const badge = document.getElementById('badge-lesson-' + i);
    if (badge && Progress.isLessonComplete('lesson-' + i)) {
      badge.classList.remove('d-none');
    }
  }

  // Quiz badge
  const quizBadge = document.getElementById('badge-quiz');
  if (quizBadge && Progress.getBestQuizScore()) {
    const best = Progress.getBestQuizScore();
    quizBadge.textContent = 'Best: ' + best.score + '/' + best.total;
    quizBadge.classList.remove('d-none');
  }
}

// ---------------------------------------------------------------------------
// Lesson page helpers
// ---------------------------------------------------------------------------
function initLessonPage(lessonId) {
  const btn = document.getElementById('btn-mark-complete');
  if (!btn) return;

  if (Progress.isLessonComplete(lessonId)) {
    btn.classList.add('completed');
    btn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Completed';
  }

  btn.addEventListener('click', function () {
    Progress.markLesson(lessonId);
    btn.classList.add('completed');
    btn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Completed';
  });

  initGlossary();
}

// ---------------------------------------------------------------------------
// Glossary — auto-wraps first occurrence of key terms with hover tooltips
// ---------------------------------------------------------------------------
const GLOSSARY = {
  'operating lease': 'A lease where the lessor retains substantially all risks and rewards of ownership \u2014 the asset stays on the lessor\u2019s balance sheet',
  'finance lease': 'A lease that transfers substantially all risks and rewards of ownership to the lessee \u2014 the lessor derecognises the asset',
  'lessor': 'The party that owns the asset and grants the right to use it under a lease',
  'lessee': 'The party that obtains the right to use an asset under a lease',
  'IFRS 16': 'International Financial Reporting Standard 16 \u2014 the global standard governing lease accounting (effective 2019)',
  'ASC 842': 'Accounting Standards Codification Topic 842 \u2014 the US GAAP standard for lease accounting',
  'straight-line basis': 'Recognising equal amounts in each accounting period over the term',
  'residual value': 'The estimated value of an asset at the end of its useful life or lease term',
  'useful life': 'The period over which an asset is expected to be economically usable',
  'initial direct costs': 'Incremental costs directly attributable to negotiating and arranging a lease (e.g. broker commissions, legal fees)',
  'net book value': 'The asset\u2019s original cost minus accumulated depreciation',
  'depreciation': 'The systematic allocation of an asset\u2019s depreciable amount over its useful life',
  'RIAD': 'Rental Income And Depreciation \u2014 Lendscape\u2019s revenue processing method for operating leases',
  'EIR': 'Effective Interest Rate \u2014 the method used for finance lease revenue recognition',
  '30/360': 'Day count convention treating every month as 30 days and every year as 360 days',
  'IAS 16': 'International Accounting Standard 16 \u2014 Property, Plant and Equipment',
  'IAS 38': 'International Accounting Standard 38 \u2014 Intangible Assets',
  'ASC 360': 'Accounting Standards Codification Topic 360 \u2014 Property, Plant and Equipment (US GAAP)',
  'MACRS': 'Modified Accelerated Cost Recovery System \u2014 the US tax depreciation method with prescribed recovery periods',
  'capital allowances': 'The UK tax system\u2019s equivalent of depreciation \u2014 statutory relief rates replace accounting depreciation',
  'ALIR': 'Asset Level Interest Revenue \u2014 RIAD output record covering core lease economics (rental income, depreciation, NBV)',
  'ALCR': 'Asset Level Charge Revenue \u2014 RIAD output record covering fee/charge components (e.g. IDC amortisation)',
  'IDCs': 'Initial Direct Costs \u2014 incremental costs of negotiating and arranging a lease',
  'TrackStraightLineAmount': 'A stateful component in RIAD that manages daily rate allocation, rounding, and final period true-up',
  'amortisation': 'The gradual expensing of a cost (e.g. IDCs) over a defined period',
  'deferred tax': 'A tax liability or asset arising from temporary differences between book and tax treatment'
};

function _escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function initGlossary() {
  const container = document.querySelector('.lesson-container');
  if (!container) return;

  // Sort terms longest-first to avoid partial matches (e.g. "finance lease" before "lease")
  const terms = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
  const matched = new Set();

  // Process text-containing elements (skip headings, links, code, source refs, nav)
  const elements = container.querySelectorAll('p, li, td');

  for (const el of elements) {
    if (el.closest('.source-ref, .lesson-nav, script, h1, h2, h3, h4, h5')) continue;

    let html = el.innerHTML;
    let changed = false;

    for (const term of terms) {
      if (matched.has(term.toLowerCase())) continue;

      // Match term as whole word, skipping content inside HTML tags
      const pattern = new RegExp(
        '(<[^>]*>)|(' + _escapeRegex(term) + ')(?![^<]*>)',
        term === term.toUpperCase() ? 'g' : 'gi'  // case-sensitive for acronyms
      );

      let found = false;
      const replaced = html.replace(pattern, (match, tag, word) => {
        if (tag) return tag;
        if (found) return match;
        found = true;
        return '<span class="glossary-term" data-bs-toggle="tooltip" data-bs-placement="top" title="' + GLOSSARY[term].replace(/"/g, '&quot;') + '">' + match + '</span>';
      });

      if (found) {
        html = replaced;
        matched.add(term.toLowerCase());
        changed = true;
      }
    }

    if (changed) el.innerHTML = html;
  }

  // Initialise Bootstrap tooltips
  container.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
    new bootstrap.Tooltip(el);
  });
}

// ---------------------------------------------------------------------------
// Quiz Engine — Page-by-page, grouped by lesson, with calculation questions
// ---------------------------------------------------------------------------
const QuizEngine = {
  LESSON_INFO: {
    1: { name: 'What is an Operating Lease?', url: '../lessons/01-what-is-operating-lease.html', icon: 'bi-1-circle-fill' },
    2: { name: 'Income Recognition', url: '../lessons/02-income-recognition.html', icon: 'bi-2-circle-fill' },
    3: { name: 'Depreciation & IDCs', url: '../lessons/03-depreciation-and-idcs.html', icon: 'bi-3-circle-fill' },
    4: { name: 'Revenue Table & Configuration', url: '../lessons/04-revenue-table.html', icon: 'bi-4-circle-fill' }
  },

  questions: [
    // ---- Lesson 1: What is an Operating Lease? ----
    {
      lesson: 1, type: 'choice',
      q: 'Under an operating lease, who retains ownership of the underlying asset?',
      options: ['The lessee', 'The lessor', 'A third-party custodian', 'It depends on the jurisdiction'],
      answer: 1,
      explanation: 'In an operating lease the lessor retains ownership of the asset and recognises it on their balance sheet.'
    },
    {
      lesson: 1, type: 'choice',
      q: 'Which accounting standard governs lease accounting under IFRS?',
      options: ['IAS 17', 'IFRS 16', 'IFRS 9', 'IAS 36'],
      answer: 1,
      explanation: 'IFRS 16 "Leases" replaced IAS 17 and governs lease accounting from the lessor and lessee perspective.'
    },
    {
      lesson: 1, type: 'choice',
      q: 'What is the primary distinction between an operating lease and a finance lease?',
      options: [
        'Operating leases are always shorter',
        'Finance leases transfer substantially all risks and rewards of ownership',
        'Operating leases have no rental payments',
        'Finance leases are only for real estate'
      ],
      answer: 1,
      explanation: 'A finance lease transfers substantially all the risks and rewards incidental to ownership of the underlying asset, whereas an operating lease does not.'
    },
    {
      lesson: 1, type: 'choice',
      q: 'What does RIAD stand for?',
      options: [
        'Revenue Interest And Depreciation',
        'Rental Income And Depreciation',
        'Recognised Income And Deductions',
        'Revenue In Accounting Data'
      ],
      answer: 1,
      explanation: 'RIAD stands for Rental Income And Depreciation \u2014 the revenue processing method for operating leases in Lendscape.'
    },
    {
      lesson: 1, type: 'choice',
      q: 'Which day count convention does RIAD use for straight-line allocation?',
      options: ['Actual/Actual', 'Actual/365', '30/360', 'Actual/360'],
      answer: 2,
      explanation: 'RIAD uses the 30/360 day count convention, where each month is treated as 30 days and each year as 360 days.'
    },

    // ---- Lesson 2: Income Recognition ----
    {
      lesson: 2, type: 'choice',
      q: 'How should rental income from an operating lease be recognised according to IFRS 16?',
      options: [
        'Accelerated in the early periods',
        'On a straight-line basis over the lease term',
        'Only when cash is received',
        'Deferred until lease end'
      ],
      answer: 1,
      explanation: 'IFRS 16 S81 requires lessors to recognise operating lease rental income on a straight-line basis over the lease term unless another systematic basis is more representative.'
    },
    {
      lesson: 2, type: 'choice',
      q: 'What happens to rental income recognition when collectibility is NOT probable under ASC 842?',
      options: [
        'Income is still recognised on a straight-line basis',
        'Income recognition is limited to cash received',
        'The lease is automatically reclassified as a finance lease',
        'The lessor must write off the entire receivable'
      ],
      answer: 1,
      explanation: 'When collectibility is not probable, ASC 842 limits income recognition to the lesser of straight-line income or cash collected.'
    },
    {
      lesson: 2, type: 'choice',
      q: 'When an operating lease is modified, how should the lessor account for it under ASC 842?',
      options: [
        'Always treat as a new lease from inception',
        'Treat as a new lease from the modification date if it is not accounted for as a separate contract',
        'Reverse all previously recognised income',
        'No adjustment is required'
      ],
      answer: 1,
      explanation: 'Under ASC 842-10-25-15, if a modification is not a separate contract, the lessor treats the modified lease as a new lease from the modification effective date.'
    },
    {
      lesson: 2, type: 'choice',
      q: 'What is the purpose of the TrackStraightLineAmount component in RIAD?',
      options: [
        'To calculate the effective interest rate',
        'To manage daily rate allocation with rounding and final period true-up',
        'To determine lease classification',
        'To generate tax returns'
      ],
      answer: 1,
      explanation: 'TrackStraightLineAmount is a stateful tracker that calculates daily rates, applies them to periods, manages rounding between periods, and performs a final period true-up so totals match exactly.'
    },

    // ---- Lesson 3: Depreciation & IDCs ----
    {
      lesson: 3, type: 'choice',
      q: 'Under ASC 842, how are initial direct costs (IDCs) for an operating lease treated?',
      options: [
        'Expensed immediately at inception',
        'Capitalised and amortised over the lease term on a straight-line basis',
        'Added to the residual value of the asset',
        'Deferred until the lease is terminated'
      ],
      answer: 1,
      explanation: 'ASC 842-30-25-11c requires IDCs to be deferred and recognised as expense over the lease term on the same basis as lease income (straight-line).'
    },
    {
      lesson: 3, type: 'choice',
      q: 'How is depreciation calculated for an asset under an operating lease?',
      options: [
        'Reducing balance method only',
        'Sum-of-years-digits method',
        'Straight-line from cost to residual value over useful life',
        'No depreciation is required'
      ],
      answer: 2,
      explanation: 'The lessor depreciates the underlying asset on a straight-line basis from its cost to its estimated residual value over its useful life (IFRS 16 S84, ASC 842-30-35-5).'
    },
    {
      lesson: 3, type: 'choice',
      q: 'Under UK tax rules, which type of capital allowance typically applies to leased plant and machinery?',
      options: [
        'Annual Investment Allowance (AIA)',
        'Structures and Buildings Allowance',
        'Land Remediation Relief',
        'Research & Development Allowance'
      ],
      answer: 0,
      explanation: 'The Annual Investment Allowance (AIA) provides 100% first-year relief on qualifying plant and machinery expenditure, commonly used for leased assets in the UK.'
    },
    {
      lesson: 3, type: 'calculation',
      q: 'An asset costs <strong>\u00a380,000</strong> with a residual value of <strong>\u00a320,000</strong> and a useful life of <strong>48 months</strong>.<br>What is the <strong>monthly depreciation</strong>?',
      answer: 1250,
      tolerance: 1,
      unit: '\u00a3',
      explanation: 'Monthly depreciation = (\u00a380,000 \u2212 \u00a320,000) \u00f7 48 = \u00a360,000 \u00f7 48 = \u00a31,250 per month.'
    },
    {
      lesson: 3, type: 'calculation',
      q: 'Total rental income is <strong>\u00a336,000</strong> over a <strong>24-month</strong> lease term using the 30/360 convention.<br>What is the <strong>daily rate</strong>?',
      answer: 50,
      tolerance: 1,
      unit: '\u00a3',
      explanation: 'Total days = 24 \u00d7 30 = 720 days (30/360). Daily rate = \u00a336,000 \u00f7 720 = \u00a350 per day.'
    },
    {
      lesson: 3, type: 'calculation',
      q: 'Initial Direct Costs (IDCs) total <strong>\u00a33,600</strong> on a <strong>36-month</strong> operating lease.<br>What is the <strong>monthly IDC expense</strong>?',
      answer: 100,
      tolerance: 1,
      unit: '\u00a3',
      explanation: 'Monthly IDC expense = \u00a33,600 \u00f7 36 = \u00a3100 per month.'
    },

    // ---- Lesson 4: Revenue Table & Configuration ----
    {
      lesson: 4, type: 'choice',
      q: 'In a revenue table for an operating lease, which of the following is typically NOT a column?',
      options: [
        'rental_income',
        'depreciation',
        'asset_net_book_value',
        'lessee_right_of_use_asset'
      ],
      answer: 3,
      explanation: 'The right-of-use asset is a lessee accounting concept. The lessor\'s revenue table tracks rental income, depreciation, and net book value of the owned asset.'
    },
    {
      lesson: 4, type: 'choice',
      q: 'What accounting configuration method is used for operating lease income recognition?',
      options: [
        'EFFECTIVE_INTEREST_RATE',
        'RENTAL_INCOME_AND_DEPRECIATION',
        'CASH_BASIS_ACCOUNTING',
        'FAIR_VALUE_THROUGH_PNL'
      ],
      answer: 1,
      explanation: 'The RENTAL_INCOME_AND_DEPRECIATION method is configured in accounting-agreement-types for operating leases.'
    },
    {
      lesson: 4, type: 'choice',
      q: 'Which charge-accounting-type applies to rental income in the straight-line method?',
      options: [
        'ACCRUAL_RENTAL_INCOME',
        'STRAIGHT_LINE_RENTAL_INCOME',
        'CASH_RENTAL_INCOME',
        'DEFERRED_RENTAL_INCOME'
      ],
      answer: 1,
      explanation: 'STRAIGHT_LINE_RENTAL_INCOME is the charge-accounting-type that recognises rental income evenly across the lease term.'
    },
    {
      lesson: 4, type: 'choice',
      q: 'What does the "asset_cash_flow_event" column in the revenue table represent?',
      options: [
        'The lessee\'s payment schedule',
        'Cash flows related to the leased asset (e.g. purchase, disposal)',
        'The monthly rental income amount',
        'Tax payments on the asset'
      ],
      answer: 1,
      explanation: 'The asset_cash_flow_event column records cash flow events related to the underlying asset itself, such as the initial purchase or final disposal/sale.'
    },
    {
      lesson: 4, type: 'choice',
      q: 'In RIAD, what type of output record covers IDC amortisation?',
      options: [
        'ALIR (Asset Level Interest Revenue)',
        'ALCR (Asset Level Charge Revenue)',
        'ARIR (Asset Revenue and Interest Record)',
        'AIDR (Asset Initial Direct Revenue)'
      ],
      answer: 1,
      explanation: 'ALCR (Asset Level Charge Revenue) records cover fee and charge components such as IDC amortisation. ALIR records cover the core lease economics (rental income and depreciation).'
    }
  ],

  // State
  currentIndex: 0,
  score: 0,
  lessonScores: {},
  answered: [],

  init() {
    this.currentIndex = 0;
    this.score = 0;
    this.lessonScores = {};
    for (let i = 1; i <= 4; i++) this.lessonScores[i] = { correct: 0, total: 0 };
    this.questions.forEach(q => this.lessonScores[q.lesson].total++);
    this.answered = new Array(this.questions.length).fill(false);
    this.showWelcome();
  },

  showWelcome() {
    this._showScreen('quiz-welcome');
  },

  start() {
    this.currentIndex = 0;
    this._showScreen('quiz-question-area');
    this._updateProgress();
    this.renderQuestion();
  },

  renderQuestion() {
    const q = this.questions[this.currentIndex];
    const area = document.getElementById('quiz-question-area');
    const info = this.LESSON_INFO[q.lesson];

    let html = `<div class="quiz-slide">
      <div class="quiz-lesson-label"><i class="bi ${info.icon} me-1"></i>${info.name}</div>
      <h5 class="mb-3">Question ${this.currentIndex + 1} of ${this.questions.length}</h5>
      <p class="quiz-question-text">${q.q}</p>`;

    if (q.type === 'calculation') {
      html += `<div class="quiz-calc-group">
        <div class="input-group mb-3">
          <span class="input-group-text">${q.unit || '\u00a3'}</span>
          <input type="number" class="form-control quiz-calc-input" id="calc-answer" placeholder="Your answer" step="any">
        </div>
        <button class="btn btn-primary" id="btn-check-calc"><i class="bi bi-calculator me-1"></i>Check Answer</button>
      </div>`;
    } else {
      q.options.forEach((opt, i) => {
        html += `<button class="quiz-option" data-option="${i}">${opt}</button>`;
      });
    }

    html += `<div class="quiz-feedback" id="quiz-feedback"></div>
      <button class="btn btn-primary btn-lg quiz-next-btn d-none" id="btn-next">
        ${this._isLastInLesson() && this.currentIndex < this.questions.length - 1 ? 'See Lesson Results' : this.currentIndex === this.questions.length - 1 ? 'See Final Results' : 'Next'} <i class="bi bi-arrow-right ms-1"></i>
      </button>
    </div>`;

    area.innerHTML = html;

    if (q.type === 'calculation') {
      document.getElementById('btn-check-calc').addEventListener('click', () => this.handleCalcAnswer());
      document.getElementById('calc-answer').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleCalcAnswer();
      });
      document.getElementById('calc-answer').focus();
    } else {
      area.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', (e) => this.handleChoiceAnswer(e));
      });
    }

    document.getElementById('btn-next').addEventListener('click', () => this.next());
  },

  handleChoiceAnswer(e) {
    if (this.answered[this.currentIndex]) return;
    this.answered[this.currentIndex] = true;

    const btn = e.currentTarget;
    const oIdx = parseInt(btn.dataset.option);
    const q = this.questions[this.currentIndex];
    const isCorrect = oIdx === q.answer;

    if (isCorrect) {
      this.score++;
      this.lessonScores[q.lesson].correct++;
    }

    const area = document.getElementById('quiz-question-area');
    area.querySelectorAll('.quiz-option').forEach((opt, i) => {
      opt.classList.add('disabled');
      if (i === q.answer) opt.classList.add('correct');
      if (i === oIdx && !isCorrect) opt.classList.add('incorrect');
    });

    this._showFeedback(isCorrect, q.explanation);
    document.getElementById('btn-next').classList.remove('d-none');
  },

  handleCalcAnswer() {
    if (this.answered[this.currentIndex]) return;

    const input = document.getElementById('calc-answer');
    const userAnswer = parseFloat(input.value);

    if (isNaN(userAnswer) || input.value.trim() === '') {
      input.classList.add('is-invalid');
      return;
    }

    this.answered[this.currentIndex] = true;
    const q = this.questions[this.currentIndex];
    const isCorrect = Math.abs(userAnswer - q.answer) <= (q.tolerance || 1);

    if (isCorrect) {
      this.score++;
      this.lessonScores[q.lesson].correct++;
    }

    input.disabled = true;
    document.getElementById('btn-check-calc').disabled = true;
    input.classList.remove('is-invalid');
    input.classList.add(isCorrect ? 'is-valid' : 'is-invalid');

    this._showFeedback(isCorrect, q.explanation);
    document.getElementById('btn-next').classList.remove('d-none');
  },

  next() {
    const currentLesson = this.questions[this.currentIndex].lesson;
    this.currentIndex++;

    if (this.currentIndex >= this.questions.length) {
      this.showResults();
      return;
    }

    const nextLesson = this.questions[this.currentIndex].lesson;
    if (nextLesson !== currentLesson) {
      this.showInterstitial(currentLesson);
    } else {
      this._updateProgress();
      this.renderQuestion();
    }
  },

  showInterstitial(lessonNum) {
    const info = this.LESSON_INFO[lessonNum];
    const ls = this.lessonScores[lessonNum];
    const pct = Math.round((ls.correct / ls.total) * 100);

    let emoji, message;
    if (pct === 100) { emoji = '\ud83c\udf1f'; message = 'Perfect! You\'re a lease legend!'; }
    else if (pct >= 80) { emoji = '\ud83d\udc4f'; message = 'Impressive! You really know your stuff!'; }
    else if (pct >= 50) { emoji = '\ud83d\udc4d'; message = 'Not bad! Room to grow though.'; }
    else { emoji = '\ud83d\udcaa'; message = 'Keep learning \u2014 you\'ll get there!'; }

    const nextInfo = this.LESSON_INFO[this.questions[this.currentIndex].lesson];

    const area = document.getElementById('quiz-question-area');
    area.innerHTML = `<div class="quiz-interstitial quiz-slide">
      <div class="interstitial-emoji">${emoji}</div>
      <h3>Lesson ${lessonNum} Complete!</h3>
      <p class="interstitial-title">${info.name}</p>
      <div class="interstitial-score">${ls.correct} / ${ls.total}</div>
      <div class="interstitial-bar-track"><div class="interstitial-bar-fill" style="width:${pct}%"></div></div>
      <p class="interstitial-message">${message}</p>
      <button class="btn btn-primary btn-lg" id="btn-continue">
        Continue to Lesson ${this.questions[this.currentIndex].lesson}: ${nextInfo.name} <i class="bi bi-arrow-right ms-1"></i>
      </button>
    </div>`;

    document.getElementById('btn-continue').addEventListener('click', () => {
      this._updateProgress();
      this.renderQuestion();
    });
  },

  showResults() {
    Progress.saveQuizScore(this.score, this.questions.length);

    const total = this.questions.length;
    const pct = Math.round((this.score / total) * 100);

    let message, messageClass, emoji;
    if (pct === 100) { message = 'Perfect score! You\'ve mastered operating lease accounting!'; messageClass = 'text-success'; emoji = '\ud83c\udf89'; }
    else if (pct >= 90) { message = 'Excellent! Nearly flawless \u2014 are you sure you\'re not an accountant?'; messageClass = 'text-success'; emoji = '\ud83c\udf1f'; }
    else if (pct >= 80) { message = 'Great work! Just a few gaps to fill. You\'re almost there!'; messageClass = 'text-primary'; emoji = '\ud83d\udc4f'; }
    else if (pct >= 60) { message = 'Good effort! A quick review of the highlighted lessons will get you to the top.'; messageClass = 'text-warning-emphasis'; emoji = '\ud83d\udc4d'; }
    else { message = 'Don\'t worry \u2014 even the best accountants had to start somewhere. Review and try again!'; messageClass = 'text-danger'; emoji = '\ud83d\udcaa'; }

    // Per-lesson breakdown
    let breakdownHtml = '<div class="row g-3 mt-3">';
    for (let i = 1; i <= 4; i++) {
      const ls = this.lessonScores[i];
      const lPct = ls.total > 0 ? Math.round((ls.correct / ls.total) * 100) : 0;
      const info = this.LESSON_INFO[i];

      let cardClass, statusIcon, statusText;
      if (lPct >= 80) { cardClass = 'quiz-lesson-score-good'; statusIcon = 'bi-check-circle-fill'; statusText = 'Excellent!'; }
      else if (lPct >= 50) { cardClass = 'quiz-lesson-score-ok'; statusIcon = 'bi-exclamation-circle-fill'; statusText = 'Review recommended'; }
      else { cardClass = 'quiz-lesson-score-weak'; statusIcon = 'bi-x-circle-fill'; statusText = 'Needs more study'; }

      breakdownHtml += `<div class="col-md-6"><div class="quiz-lesson-score ${cardClass}">
        <div class="d-flex justify-content-between align-items-start">
          <div><h6 class="mb-1"><i class="bi ${info.icon} me-1"></i>Lesson ${i}</h6><p class="mb-1 lesson-name">${info.name}</p></div>
          <span class="lesson-score-badge">${ls.correct}/${ls.total}</span>
        </div>
        <div class="lesson-score-bar-track"><div class="lesson-score-bar-fill ${cardClass}-bar" style="width:${lPct}%"></div></div>
        <div class="lesson-score-status"><i class="bi ${statusIcon} me-1"></i>${statusText}</div>
        ${lPct < 80 ? `<a href="${info.url}" class="btn btn-sm btn-outline-primary mt-2">Review Lesson <i class="bi bi-arrow-right ms-1"></i></a>` : ''}
      </div></div>`;
    }
    breakdownHtml += '</div>';

    this._showScreen('quiz-results');
    const results = document.getElementById('quiz-results');
    results.innerHTML = `<div class="quiz-slide">
      <div class="results-emoji">${emoji}</div>
      <div class="score-circle"><div class="score-circle-inner">
        <span class="score-value">${pct}%</span>
        <span class="score-label">${this.score} of ${total} correct</span>
      </div></div>
      <p class="lead mt-3 ${messageClass}"><strong>${message}</strong></p>
      <h4 class="mt-4 mb-2">Lesson Breakdown</h4>
      ${breakdownHtml}
      <div class="mt-4">
        <button class="btn btn-primary btn-lg me-2" onclick="QuizEngine.init()"><i class="bi bi-arrow-clockwise me-1"></i>Retake Quiz</button>
        <a href="../index.html" class="btn btn-outline-secondary btn-lg"><i class="bi bi-house me-1"></i>Back to Home</a>
      </div>
    </div>`;

    results.scrollIntoView({ behavior: 'smooth' });
  },

  _isLastInLesson() {
    if (this.currentIndex >= this.questions.length - 1) return true;
    return this.questions[this.currentIndex + 1].lesson !== this.questions[this.currentIndex].lesson;
  },

  _showScreen(screenId) {
    ['quiz-welcome', 'quiz-question-area', 'quiz-results'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('d-none', id !== screenId);
    });
    const progressEl = document.getElementById('quiz-progress-area');
    if (progressEl) progressEl.classList.toggle('d-none', screenId !== 'quiz-question-area');
  },

  _showFeedback(isCorrect, explanation) {
    const feedback = document.getElementById('quiz-feedback');
    feedback.className = 'quiz-feedback show ' + (isCorrect ? 'correct' : 'incorrect');
    feedback.innerHTML = (isCorrect ? '<strong><i class="bi bi-check-circle me-1"></i>Correct!</strong> ' : '<strong><i class="bi bi-x-circle me-1"></i>Incorrect.</strong> ') + explanation;
  },

  _updateProgress() {
    const bar = document.getElementById('quiz-progress-bar');
    const label = document.getElementById('quiz-progress-label');
    if (bar) {
      const pct = Math.round((this.currentIndex / this.questions.length) * 100);
      bar.style.width = pct + '%';
      bar.setAttribute('aria-valuenow', pct);
    }
    if (label) label.textContent = `Question ${this.currentIndex + 1} of ${this.questions.length}`;
  }
};

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------
const Calculator = {
  calculate() {
    const assetCost = parseFloat(document.getElementById('calc-asset-cost').value);
    const residualValue = parseFloat(document.getElementById('calc-residual').value);
    const leaseTerm = parseInt(document.getElementById('calc-term').value);
    const rentalAmount = parseFloat(document.getElementById('calc-rental').value);
    const idcAmount = parseFloat(document.getElementById('calc-idc').value) || 0;
    const startDate = document.getElementById('calc-start-date').value;

    // Validation
    if (!assetCost || !residualValue || !leaseTerm || !rentalAmount || !startDate) {
      alert('Please fill in all required fields.');
      return;
    }
    if (residualValue >= assetCost) {
      alert('Residual value must be less than asset cost.');
      return;
    }
    if (leaseTerm <= 0) {
      alert('Lease term must be greater than zero.');
      return;
    }

    // Calculations
    const depreciableAmount = assetCost - residualValue;
    const monthlyDepreciation = depreciableAmount / leaseTerm;
    const monthlyRentalIncome = rentalAmount; // per month
    const monthlyIDC = idcAmount / leaseTerm;
    const netMonthlyIncome = monthlyRentalIncome - monthlyDepreciation - monthlyIDC;

    // Build schedule
    const schedule = [];
    let nbv = assetCost;
    let idcRemaining = idcAmount;
    const start = new Date(startDate);

    for (let i = 0; i < leaseTerm; i++) {
      const periodStart = new Date(start);
      periodStart.setMonth(periodStart.getMonth() + i);
      const periodEnd = new Date(start);
      periodEnd.setMonth(periodEnd.getMonth() + i + 1);
      periodEnd.setDate(periodEnd.getDate() - 1);

      nbv -= monthlyDepreciation;
      idcRemaining -= monthlyIDC;

      schedule.push({
        period: i + 1,
        startDate: periodStart,
        endDate: periodEnd,
        rentalIncome: monthlyRentalIncome,
        depreciation: monthlyDepreciation,
        idcExpense: monthlyIDC,
        nbv: Math.max(nbv, residualValue),
        idcRemaining: Math.max(idcRemaining, 0)
      });
    }

    this.renderOutput(schedule, {
      assetCost, residualValue, leaseTerm, monthlyRentalIncome,
      monthlyDepreciation, monthlyIDC, netMonthlyIncome, idcAmount
    });
  },

  renderOutput(schedule, summary) {
    const output = document.getElementById('calc-output');
    if (!output) return;
    output.classList.remove('d-none');

    // Summary
    document.getElementById('summary-rental').textContent = this.fmt(summary.monthlyRentalIncome);
    document.getElementById('summary-depreciation').textContent = this.fmt(summary.monthlyDepreciation);
    document.getElementById('summary-idc').textContent = this.fmt(summary.monthlyIDC);
    document.getElementById('summary-net').textContent = this.fmt(summary.netMonthlyIncome);

    // Schedule table
    const tbody = document.getElementById('schedule-tbody');
    tbody.innerHTML = '';
    schedule.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.period}</td>
        <td>${this.fmtDate(row.startDate)}</td>
        <td>${this.fmtDate(row.endDate)}</td>
        <td class="text-end">${this.fmt(row.rentalIncome)}</td>
        <td class="text-end">${this.fmt(row.depreciation)}</td>
        <td class="text-end">${this.fmt(row.idcExpense)}</td>
        <td class="text-end">${this.fmt(row.nbv)}</td>
      `;
      tbody.appendChild(tr);
    });

    // Chart
    this.renderChart(schedule);

    output.scrollIntoView({ behavior: 'smooth' });
  },

  renderChart(schedule) {
    const ctx = document.getElementById('calc-chart');
    if (!ctx) return;

    // Destroy existing chart if present
    if (this._chart) this._chart.destroy();

    const labels = schedule.map(r => 'Period ' + r.period);
    const nbvData = schedule.map(r => r.nbv);
    const depData = schedule.map(r => r.depreciation);
    const rentalData = schedule.map(r => r.rentalIncome);

    this._chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Net Book Value',
            data: nbvData,
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13,110,253,0.1)',
            fill: true,
            tension: 0.1,
            yAxisID: 'y'
          },
          {
            label: 'Depreciation (per period)',
            data: depData,
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220,53,69,0.1)',
            borderDash: [5, 5],
            tension: 0.1,
            yAxisID: 'y1'
          },
          {
            label: 'Rental Income (per period)',
            data: rentalData,
            borderColor: '#198754',
            backgroundColor: 'rgba(25,135,84,0.1)',
            borderDash: [2, 2],
            tension: 0.1,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: { display: true, text: 'Operating Lease Schedule' }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Net Book Value' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Per Period Amount' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  },

  fmt(n) {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(n);
  },

  fmtDate(d) {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
};
