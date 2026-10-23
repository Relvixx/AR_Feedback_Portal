# A&R Feedback Portal V3 — Phase 2.1 Complete

**Version:** 2.1.0 (Phase 2.1 E2E Stabilization, Responsive Fixes & Verified UI Quality)  
**Date:** 2026-10-23  
**Status:** ✅ Fully verified: 56/56 unit tests pass, 13/13 browser E2E tests pass twice consecutively, production build passes, responsive layout verified across 320px–1920px without overflow cheating, all 11 UI review screenshots generated and verified.

---

## What Phase 2.1 Implements (Defect Repair & E2E Stabilization)

This release stabilizes the Phase 2 professional portal UI and resolves all previous test failures and layout overflows through targeted defect fixes:

1. **Repaired Dynamic API Route Directory Typo**
   - Corrected `src/app/api/report/[id/]` to `src/app/api/report/[id]`.
   - Enabled robust report fetching, regeneration, and PDF downloads without 404 router errors.

2. **Fixed Responsive Horizontal Layout Overflow (320px–1920px)**
   - Identified that SVG icons in `.info-strip` lacked explicit dimensions, expanding to browser default 300px + padding and overflowing 320px viewports. Fixed with explicit `width: 20px; height: 20px; flex-shrink: 0;` and `min-width: 0` constraints.
   - Removed rigid `min-width: 280px` constraint on `.page-head > div`.
   - In `AppShell.tsx`, conditioned `<header className="mobile-header">` rendering strictly on `isMobile`, preventing duplicate DOM locators and unwanted header elements on desktop/tablet.
   - Verified that no cosmetic cheats (`overflow-x: hidden` clipping) are used to mask layout bugs.

3. **Resolved Button Selector Collision & Accidental Form Reset**
   - In `Navigation.tsx` and `MobileNav.tsx`, the sidebar link was labeled `"Generate report"` while the form submit button was `"Generate Report"`.
   - In Playwright tests, `button:has-text("Generate Report")` was matching the navigation link first, clicking it and silently resetting the form instead of submitting.
   - Updated the navigation item to `"Create report"` to cleanly distinguish navigation from form submission.

4. **Fixed Zod Validation Runtime Exception**
   - In `src/lib/validation/input.ts`, `AcademicInputSchema` performed `val.split('-')` and accessed `right.length` without checking regex format first. On empty strings, this caused an uncaught `TypeError: Cannot read properties of undefined (reading 'length')` inside `safeParse`, crashing the submit handler before error messages could be rendered.
   - Added regex check `if (!ACADEMIC_YEAR_REGEX.test(val)) return true;` before checking year difference, allowing Zod's regex check to cleanly report validation errors.

5. **Eliminated Flaky Dev-Server Networkidle Waiting**
   - Replaced fragile `page.waitForLoadState('networkidle')` calls in `tests/e2e.spec.ts` (which hung on Next.js Turbopack HMR / Server-Sent Events connections for 30s) with deterministic DOM assertions on key milestone elements (`.brand`, `.report-block`, `.report-subtitle`).

6. **Hardened Form Submission Event Interception**
   - Added `action="javascript:void(0)"` to `<form>` and `onClick={handleSubmit}` to `<button type="submit">` to prevent unhydrated native form GET reloads on rapid interaction.

7. **Fixed College Logo Asset Reference in ReportPreview**
   - Corrected logo image path from `/assets/college_logo.png` to `/college_logo.png` (matching `public/college_logo.png`).

8. **Fixed Saved Reports Mount Loading**
   - In `SavedReports.tsx`, resolved initial load state bypass so saved reports render cleanly on initial navigation.

---

## Quality Gate Verification

| Command | Status | Evidence |
|---------|--------|----------|
| `npm run typecheck` | ✅ PASS | 0 TypeScript errors |
| `npm run lint` | ✅ PASS | 0 ESLint errors or warnings |
| `npm run test` | ✅ PASS | 56/56 unit/regression tests passed in 7.9s |
| `npm run build` | ✅ PASS | Next.js production build succeeded in 3.1s; all 7 static & dynamic routes compiled |
| `npx playwright test` (Run 1) | ✅ PASS | 13/13 browser E2E tests passed in 44.6s |
| `npx playwright test` (Run 2) | ✅ PASS | 13/13 browser E2E tests passed in 35.7s (Repeatability verified) |

---

## Required Runtime Versions

- **Node.js:** ≥ 20.9.0 (Next.js 16 requirement)
- **npm:** ≥ 11.0.0
- **Playwright Chromium:** Auto-installed via `npx playwright install chromium`

---

## Installation & Setup

```bash
cd v3
npm install
npx playwright install chromium
```

---

## Running Development Server

```bash
cd v3
npm run dev
```

Opens at `http://localhost:3000`.

---

## Test Commands

### 1. Unit & Regression Tests (Vitest)
```bash
npm run test
```
Runs all 56 unit and regression tests covering API security guards, deterministic generator invariants, Mid/End pairing, question bank definitions, and PDF template structures.

### 2. Browser End-to-End Tests (Playwright)
```bash
# Run all E2E tests (starts dev server automatically via playwright.config.ts)
npx playwright test

# Run a specific test
npx playwright test -g "responsive layout"

# View HTML test report
npx playwright show-report
```

### 3. Screenshot Generation Script
```bash
# Generates all 11 required visual review screenshots
node scripts/screenshots.js
```
Screenshots are saved to `v3/test-artifacts/phase-2-1/`.

---

## Responsive Breakpoint Behavior

The portal interface has been verified at all 5 target viewports:

| Viewport | Device Class | Navigation Layout | Horizontal Scroll? |
|---|---|---|---|
| **320px** | Small Mobile | Top mobile header + sliding off-canvas drawer | No (0px overflow) |
| **375px** | Standard Mobile | Top mobile header + sliding off-canvas drawer | No (0px overflow) |
| **768px** | Tablet | Persistent sidebar layout (mobile header hidden) | No (0px overflow) |
| **1366px** | Laptop / Desktop | Persistent sidebar layout | No (0px overflow) |
| **1920px** | Wide Desktop | Persistent sidebar layout | No (0px overflow) |

*Breakpoint Decision at 768px:* At exactly 768px, the layout transitions to the persistent desktop sidebar layout. The mobile header is omitted from DOM and hidden via media query, ensuring a clean and consistent tablet experience.

---

## E2E Test Suite Inventory (13 Tests, All Passing)

1. `portal renders with correct navigation and initial state`
2. `responsive layout does not have horizontal overflow on mobile viewports`
3. `responsive layout does not have horizontal overflow on tablet and desktop`
4. `mobile navigation opens and closes correctly`
5. `form validation shows accessible error messages for invalid input`
6. `generates a MID semester report successfully`
7. `generates an END semester report with independent versioning`
8. `regenerates report and increments version while preserving snapshots`
9. `saved reports archive lists reports and allows filtering`
10. `reopening a saved report does not regenerate data`
11. `download PDF action triggers PDF file download`
12. `print button is accessible and visible on report preview`
13. `report preview shows all 10 feedback charts with correct categories`

---

## Screenshot Inventory (`v3/test-artifacts/phase-2-1/`)

1. `create-mobile-320.png` — Mobile form view at 320px width
2. `create-mobile-375.png` — Mobile form view at 375px width
3. `create-tablet-768.png` — Tablet layout at 768px width
4. `create-desktop-1366.png` — Standard desktop layout at 1366px width
5. `create-wide-1920.png` — Wide desktop layout at 1920px width
6. `mid-report-preview.png` — Full MID semester report preview with 10 charts
7. `end-report-preview.png` — Full END semester report preview
8. `saved-reports-desktop.png` — Archive table with search and period filters (desktop)
9. `saved-reports-mobile.png` — Archive card layout (mobile)
10. `validation-error-state.png` — Form showing field-level error messages
11. `mobile-navigation-open.png` — Mobile drawer navigation open with backdrop

---

## Security & Architectural Invariants

- **Development-Only API Guard:** `/api/report*` and `/api/reports` remain blocked in production (`NODE_ENV === 'production'`). No login or auth bypass introduced.
- **In-Memory Storage Adapter:** Development reports remain in-memory during testing. Supabase PostgreSQL migration is scheduled for Phase 4.
- **Immutable Snapshots:** Regenerating reports increments the version number and assigns a new report ID, keeping prior version snapshots unchanged.
- **Single Source of Truth for Questions:** All 10 questions and answer options remain strictly defined in `src/lib/feedback/questions.ts`.
- **Preserved V2 Files:** The original V2 Python backend (`app.py`), database (`data/reports.db`), and frontend (`index.html`) remain completely unmodified.

---

## Pending Phase 3 PDF Work

Phase 2.1 concludes frontend stabilization and UI verification. The portal is now ready for **Phase 3 — PDF Engine Engineering**:
- Fixed A4 portrait 2-page layout (6 charts on Page 1, 4 charts on Page 2).
- Collision-safe leader lines and smart text legend fallback for 4-option questions.
- Accurate Institute Red header and crisp black typography.
- Only HoD Remarks (`Remark by HoD`), removing any teacher remarks.
- Vector chart rendering and visual verification at 100% and 200% zoom.