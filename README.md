# Operating Lease Training

A companion learning website for operating lease accounting, covering lessor accounting under IFRS 16 and ASC 842.

## Lessons

1. **What is an Operating Lease?** - Operating vs finance lease distinction, classification criteria, lessor accounting overview, RIAD vs EIR comparison
2. **Income Recognition** - Straight-line rental income (IFRS 16 S81, ASC 842-30-25-11), 30/360 day count convention, RIAD processing scenarios, variable payments, modifications, collectibility
3. **Depreciation & Initial Direct Costs** - Straight-line depreciation, useful life, IDC amortisation, RIAD daily rate allocation (TrackStraightLineAmount), UK/US tax overview
4. **Revenue Table & Configuration** - Revenue table structure, ALIR/ALCR output records, operating lease columns, charge-accounting-types configuration

## Interactive Features

- **Quiz** - 20 questions (multiple-choice + calculation) in a page-by-page format grouped by lesson, with per-lesson score breakdown and personalised feedback
- **Calculator** - Straight-line lease calculator with depreciation/NBV schedule and Chart.js visualisation
- **Progress Tracking** - localStorage-based lesson completion and quiz score history

## SCORM Package (LMS Upload)

A SCORM 1.2 package is available for uploading to LMS platforms such as HowNow.

**Build the package:**
```bash
bash build-scorm.sh
```

This creates `scorm-package.zip` — upload it to your LMS as a SCORM 1.2 course. The package:
- Wraps the course in a SCORM launcher that communicates completion and quiz scores to the LMS
- Bypasses the password gate (the LMS handles authentication)
- Reports pass/fail based on quiz score (mastery threshold: 80%)

## Tech Stack

HTML + CSS + JavaScript (no build tools). Bootstrap 5 and Chart.js loaded via CDN. Deployed directly to GitHub Pages.
