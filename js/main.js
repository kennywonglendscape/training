/* ===== Operating Lease Training - Main JS ===== */

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
}

// ---------------------------------------------------------------------------
// Quiz Engine
// ---------------------------------------------------------------------------
const QuizEngine = {
  questions: [
    {
      q: 'Under an operating lease, who retains ownership of the underlying asset?',
      options: ['The lessee', 'The lessor', 'A third-party custodian', 'It depends on the jurisdiction'],
      answer: 1,
      explanation: 'In an operating lease the lessor retains ownership of the asset and recognises it on their balance sheet.'
    },
    {
      q: 'Which accounting standard governs lease accounting under IFRS?',
      options: ['IAS 17', 'IFRS 16', 'IFRS 9', 'IAS 36'],
      answer: 1,
      explanation: 'IFRS 16 "Leases" replaced IAS 17 and governs lease accounting from the lessor and lessee perspective.'
    },
    {
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
      q: 'What does RIAD stand for?',
      options: [
        'Revenue Interest And Depreciation',
        'Rental Income And Depreciation',
        'Recognised Income And Deductions',
        'Revenue In Accounting Data'
      ],
      answer: 1,
      explanation: 'RIAD stands for Rental Income And Depreciation — the revenue processing method for operating leases in Lendscape.'
    },
    {
      q: 'Which day count convention does RIAD use for straight-line allocation?',
      options: [
        'Actual/Actual',
        'Actual/365',
        '30/360',
        'Actual/360'
      ],
      answer: 2,
      explanation: 'RIAD uses the 30/360 day count convention, where each month is treated as 30 days and each year as 360 days.'
    },
    {
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
    {
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

  currentIndex: 0,
  score: 0,
  answered: [],

  init() {
    this.currentIndex = 0;
    this.score = 0;
    this.answered = new Array(this.questions.length).fill(false);
    this.render();
  },

  render() {
    const container = document.getElementById('quiz-questions');
    if (!container) return;

    container.innerHTML = '';
    this.questions.forEach((q, idx) => {
      const div = document.createElement('div');
      div.className = 'quiz-question';
      div.id = 'question-' + idx;

      let optionsHtml = '';
      q.options.forEach((opt, oi) => {
        optionsHtml += `<button class="quiz-option" data-question="${idx}" data-option="${oi}">${opt}</button>`;
      });

      div.innerHTML = `
        <h5>Question ${idx + 1} of ${this.questions.length}</h5>
        <p class="mb-3">${q.q}</p>
        ${optionsHtml}
        <div class="quiz-feedback" id="feedback-${idx}"></div>
      `;
      container.appendChild(div);
    });

    // Attach listeners
    document.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleAnswer(e));
    });

    // Hide results
    const results = document.getElementById('quiz-results');
    if (results) results.classList.add('d-none');

    // Show submit button
    const submitBtn = document.getElementById('btn-submit-quiz');
    if (submitBtn) {
      submitBtn.classList.add('d-none');
      submitBtn.addEventListener('click', () => this.showResults());
    }
  },

  handleAnswer(e) {
    const btn = e.currentTarget;
    const qIdx = parseInt(btn.dataset.question);
    const oIdx = parseInt(btn.dataset.option);

    if (this.answered[qIdx]) return;
    this.answered[qIdx] = true;

    const question = this.questions[qIdx];
    const isCorrect = oIdx === question.answer;

    if (isCorrect) this.score++;

    // Highlight options
    const questionDiv = document.getElementById('question-' + qIdx);
    questionDiv.querySelectorAll('.quiz-option').forEach((opt, i) => {
      opt.classList.add('disabled');
      if (i === question.answer) opt.classList.add('correct');
      if (i === oIdx && !isCorrect) opt.classList.add('incorrect');
    });

    // Show feedback
    const feedback = document.getElementById('feedback-' + qIdx);
    feedback.className = 'quiz-feedback show ' + (isCorrect ? 'correct' : 'incorrect');
    feedback.innerHTML = (isCorrect ? '<strong>Correct!</strong> ' : '<strong>Incorrect.</strong> ') + question.explanation;

    // Check if all answered
    if (this.answered.every(a => a)) {
      const submitBtn = document.getElementById('btn-submit-quiz');
      if (submitBtn) submitBtn.classList.remove('d-none');
    }
  },

  showResults() {
    Progress.saveQuizScore(this.score, this.questions.length);

    const results = document.getElementById('quiz-results');
    if (!results) return;
    results.classList.remove('d-none');

    const pct = Math.round((this.score / this.questions.length) * 100);
    let message = '';
    if (pct === 100) message = 'Perfect score! Outstanding!';
    else if (pct >= 80) message = 'Great job! You have a solid understanding.';
    else if (pct >= 60) message = 'Good effort! Review the lessons for topics you missed.';
    else message = 'Keep studying! Review the lessons and try again.';

    results.innerHTML = `
      <div class="score">${this.score} / ${this.questions.length}</div>
      <p class="lead mt-2">${pct}%</p>
      <p class="text-muted">${message}</p>
      <button class="btn btn-primary mt-3" onclick="QuizEngine.init()">Retake Quiz</button>
      <a href="../index.html" class="btn btn-outline-secondary mt-3 ms-2">Back to Home</a>
    `;

    results.scrollIntoView({ behavior: 'smooth' });
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
