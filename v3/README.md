# A&R Feedback Portal V3 — Phase 1 Foundation

**Version:** 1.0.0 (Phase 1 complete)  
**Date:** 2026-10-22  
**Status:** ✅ Builds, typechecks, tests pass, PDF feasibility validated

---

## What Phase 1 Implements

This directory contains the **Phase 1 foundation** for the V3 rewrite. It establishes:

1. **Next.js 14 + TypeScript + Tailwind CSS** application scaffold (App Router)
2. **Canonical question bank** — exactly 10 questions with locked options and quality ranking
3. **Type-safe domain model** — `ReportSnapshot`, `ReportGroup`, `FeedbackPeriod`, academic metadata
4. **Deterministic synthetic data engine** — seeded PRNG, ranked count allocation, integer consistency
5. **Mid/End period pairing** — shared group identity, independent version sequences, regeneration preserves history
6. **Input validation** — Zod schemas for academic year, semester, subject, faculty, period
7. **Storage contract** — in-memory implementation (Phase 1) with clean interface for Supabase (Phase 4)
8. **PDF renderer feasibility spike** — Playwright-based HTML→PDF with shared chart components
9. **API routes** — create report, get report, regenerate, list reports, download PDF
10. **Unit tests** — 33 tests covering question bank, random generation, distribution, report generator, validation

---

## What Remains Unfinished (Later Phases)

| Phase | Scope |
|-------|-------|
| **2 — Portal UX** | Professional form, preview, archive UI, responsive brand, keyboard accessibility, real browser screenshots |
| **3 — PDF Engine** | Production-quality 2-page A4 PDF, collision-safe labels/legends, HoD-only remarks, visual QA at 100%/200% |
| **4 — Persistence & Access** | Supabase PostgreSQL, migrations, RLS, approved access boundary (no admin login), rate limiting |
| **5 — Deploy & Verify** | GitHub repo, Vercel project, env vars, live smoke test, redeploy persistence |

---

## Directory Structure

```
AR_Feedback_Portal/
├── AGENTS.md                    # Agent instructions
├── PROJECT_SPEC.md              # Product specification
├── PHASE0_AUDIT_REPORT.md       # Phase 0 audit findings
├── app.py                       # V2 Python backend (preserved)
├── index.html                   # V2 monolithic frontend (preserved)
├── assets/college_logo.png      # Logo asset (preserved)
├── data/reports.db              # V2 SQLite database (preserved)
├── README.md                    # V2 README (preserved)
└── v3/                          # V3 APPLICATION ROOT
    ├── src/
    │   ├── app/
    │   │   ├── api/
    │   │   │   ├── report/route.ts           # POST create report
    │   │   │   ├── report/[id]/route.ts      # GET report
    │   │   │   ├── report/[id]/regenerate/route.ts  # POST regenerate
    │   │   │   ├── report/[id]/pdf/route.ts  # GET PDF download
    │   │   │   └── reports/route.ts          # GET list reports
    │   │   ├── globals.css
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── components/
    │   │   ├── Brand.tsx
    │   │   └── Toast.tsx
    │   ├── features/
    │   │   ├── report/
    │   │   │   ├── ReportForm.tsx
    │   │   │   └── ReportPreview.tsx
    │   │   └── archive/
    │   │       └── SavedReports.tsx
    │   ├── lib/
    │   │   ├── feedback/
    │   │   │   ├── questions.ts      # Canonical 10 questions (SINGLE SOURCE)
    │   │   │   ├── random.ts         # SeededRandom (Mulberry32)
    │   │   │   ├── distribution.ts   # Ranked count allocation
    │   │   │   └── generator.ts      # Report snapshot generation
    │   │   ├── pdf/
    │   │   │   ├── generator.ts      # Playwright HTML→PDF
    │   │   │   └── template.html     # 2-page A4 template
    │   │   ├── storage/
    │   │   │   └── index.ts          # In-memory ReportStorage
    │   │   ├── types/
    │   │   │   └── report.ts         # Domain types
    │   │   ├── utils/
    │   │   │   └── escape.ts
    │   │   └── validation/
    │   │       └── input.ts          # Zod schemas + normalization
    │   └── types/
    ├── tests/
    │   └── feedback.test.ts          # 33 unit tests
    ├── public/
    │   └── college_logo.png
    ├── package.json
    ├── tsconfig.json
    ├── next.config.mjs
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── vitest.config.ts
    ├── .eslintrc.js
    └── .gitignore
```

---

## Required Runtime Versions

- **Node.js:** ≥ 20.0.0
- **npm:** ≥ 11.0.0 (or use pnpm/yarn)
- **Playwright Chromium:** Auto-installed via `npx playwright install chromium`

---

## Installation

```bash
cd v3
npm install
npx playwright install chromium
```

---

## Local Development

```bash
cd v3
npm run dev
```

Opens at `http://localhost:3000` (or next available port).

---

## Test Commands

```bash
# Run all unit tests
npm run test

# Watch mode
npm run test:watch

# TypeScript type checking
npm run typecheck

# ESLint
npm run lint

# Production build
npm run build

# PDF generation test (generates test-output-mid.pdf and test-output-end.pdf)
npm run pdf:test
```

---

## Verifying Generation Determinism

The generation engine uses a seeded PRNG (Mulberry32). Same seed → same output.

```bash
# Run tests to verify deterministic behavior
npm run test
```

Key invariants tested:
- 10 exact questions with correct options and ranking
- Counts sum to respondent total for each question
- Percentages derived from counts, sum to 100%
- Best-to-worst ranking respected (including reversed Syllabus Completion)
- Fixed seed produces identical results
- Different seeds produce variation
- Mid/End share group identity, separate version sequences
- Regeneration creates new immutable snapshot
- Old snapshots never modified

---

## How V2 Was Preserved

1. **Backup created:** `C:\Volume D\ramdom\AR_Feedback_Portal_V2_Backup_20261022_184135`
   - Contains all V2 files: `app.py`, `index.html`, `assets/`, `data/reports.db`, launchers, docs
   - Verified readable and complete

2. **Git baseline established:**
   - Repository initialized at `C:\Volume D\ramdom\AR_Feedback_Portal`
   - Initial commit: `b1d0df9` — "chore: V2 baseline commit"
   - Tag: `v2-baseline` pointing to baseline commit
   - `.gitignore` excludes: `node_modules`, `.next`, `*.db`, backups, env files, build outputs

3. **No V2 files modified or deleted** — V3 lives in separate `v3/` directory

---

## Known Risks & Unresolved Decisions

### Risks
1. **Playwright on Vercel** — Bundle size (~50MB+), cold starts. May need WeasyPrint fallback or `@vercel/og` pattern.
2. **Label layout edge cases** — 4-option questions with long labels ("Somewhat effectively", "Not comprehensive") need visual QA in Phase 3.
3. **Access boundary (no admin login)** — Must be decided before Phase 4. Options: Vercel Deployment Protection, Shared Secret + localStorage, Cloudflare Access, Magic-link email.
4. **Logo approval** — Current `assets/college_logo.png` appears to be Bhujbal Knowledge City mark. Needs user confirmation.
5. **Mid/End drift bound** — 8 percentage points is provisional engineering constraint, not approved requirement.
6. **Supabase/Vercel provisioning** — Requires user approval for Hairaju Gmail Supabase org and new Vercel project.

### Unresolved Decisions (Require User Approval)
1. ✅ **Logo** — Confirm `assets/college_logo.png` is correct for production PDF
2. ✅ **Mid/End drift bound** — Accept 8pp or specify alternative
3. ✅ **Access boundary** — Choose from: Vercel Protection, Shared Secret, Cloudflare Access, Magic-link
4. ✅ **GitHub repo** — Specify name/owner for V3 code
5. ✅ **Supabase project** — Confirm Hairaju Gmail org + cost approval

---

## Quality Gate Results

| Command | Status | Evidence |
|---------|--------|----------|
| `npm run typecheck` | ✅ PASS | 0 errors |
| `npm run lint` | ✅ PASS | 0 errors (2 warnings: font, img element) |
| `npm run test` | ✅ PASS | 33/33 tests passed |
| `npm run build` | ✅ PASS | Compiled successfully, all routes typed |
| `npm run pdf:test` | ✅ PASS | Generated MID/END PDFs (60-63KB each) |

---

## Next Steps

1. **User decisions needed** on the 5 unresolved items above
2. **Phase 2 authorization** — Portal UX implementation
3. **Phase 3 planning** — PDF engine visual QA strategy

---

## Phase 1 Final Assessment

| Question | Answer |
|----------|--------|
| Is the V3 foundation ready for Phase 2? | **Yes** — Builds, types, tests, API routes, deterministic engine all working |
| Is the report-generation engine correct? | **Yes** — 33 tests verify counts, ranking, totals, determinism, Mid/End pairing |
| Is the Mid/End model sufficiently tested? | **Yes** — Tests cover group identity, independent versions, regeneration, order independence |
| Is the PDF renderer feasible on target architecture? | **Yes** — Playwright generates valid 2-page A4 PDFs for both periods |
| What risks remain? | Playwright bundle size, label layout edge cases, access boundary decision, logo approval |
| What should happen next? | **Await user decisions on 5 open items, then authorize Phase 2** |