# Operating Lease Training

A companion learning website for operating lease accounting, covering lessor accounting under IFRS 16 and ASC 842.

**Live site:** https://kennywonglendscape.github.io/training/

## Lessons

1. **What is an Operating Lease?** - Operating vs finance lease distinction, classification criteria, lessor accounting overview
2. **Income Recognition** - Straight-line rental income (IFRS 16 S81, ASC 842-30-25-11), variable payments, modifications, collectibility
3. **Depreciation & Initial Direct Costs** - Straight-line depreciation, useful life, IDC amortisation, UK/US tax overview
4. **Revenue Table & Configuration** - Revenue table structure, operating lease columns, charge-accounting-types configuration

## Interactive Features

- **Quiz** - 13 multiple-choice questions with immediate feedback and score tracking
- **Calculator** - Straight-line lease calculator with depreciation/NBV schedule and Chart.js visualisation
- **Progress Tracking** - localStorage-based lesson completion and quiz score history

## Tech Stack

HTML + CSS + JavaScript (no build tools). Bootstrap 5 and Chart.js loaded via CDN. Deployed directly to GitHub Pages.

## Local Development

Open `index.html` directly in a browser, or run a local server:

```
python -m http.server 8000
```

Then visit http://localhost:8000
