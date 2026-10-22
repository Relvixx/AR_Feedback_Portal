# PHASE 0 AUDIT REPORT — A&R Feedback Portal V3 Migration Readiness

**PHASE:** 0
**STATUS:** PASS
**Date:** 2026-10-22
**Auditor:** OpenCode (Senior Full-Stack Engineer / PDF Specialist / QA)

---

## A. SUMMARY

This audit inspected the actual local repository at `C:\Volume D\ramdom\AR_Feedback_Portal`. The project is a **complete V2 implementation** — a Python/ReportLab/SQLite single-admin portal with monolithic HTML+CSS+JS frontend — matching the expected legacy files listed in `PROJECT_SPEC.md` §11. No V3 work has begun. The repository is **not a Git repository** (no `.git` directory). Three sample reports exist in the local SQLite database.

**Key findings:**
- All 10 feedback questions match the locked specification exactly, including the reversed `Syllabus Completion` ranking.
- PDF generation works but has **critical defects**: hardcoded "End Semester" header, includes forbidden "Remark Subject Teacher", leader-line label overlap/clipping, and preview/PDF divergence.
- **No Mid/End period support exists** — the single biggest V3 gap.
- Database schema lacks period field, group key, and versioning.
- Security model is local-only (binds to 127.0.0.1) with optional password; **not cloud-ready**.
- Logo asset (372×136 PNG) appears to be a Bhujbal Knowledge City mark — **requires user confirmation** before production use.
- Reference workbook (`Feedback report SEAR.xlsx`) and V2 distributable ZIP are **not present** locally.

**Recommended migration direction:** **Strategy B — New Next.js/TypeScript architecture** with selective migration of proven logic (question schema, generation algorithm, color palette, provenance fields). The V2 codebase is too tightly coupled to Python/ReportLab/SQLite and local-only assumptions to refactor incrementally for Vercel/Supabase.

---

## B. EXECUTIVE SUMMARY

| Dimension | Status | Notes |
|-----------|--------|-------|
| **Repository integrity** | ✅ Complete V2 | All expected legacy files present; not a Git repo |
| **Question bank fidelity** | ✅ Exact match | 10 questions, correct options, correct ranking (incl. reversed syllabus) |
| **PDF quality** | ❌ **P0 defects** | Hardcoded End Semester, Subject Teacher remark, label collisions, truncation |
| **Mid/End support** | ❌ **Missing entirely** | No period field in form, DB, PDF, or preview |
| **Data model** | ⚠️ V2 only | Single flat table; no group/version/period; regeneration = new row |
| **Persistence** | ⚠️ SQLite local | Not Vercel-compatible; no Supabase/PostgreSQL |
| **Security** | ⚠️ Local only | Optional password; binds 127.0.0.1; no cloud access boundary |
| **Frontend** | ⚠️ Monolithic HTML | Works but broken A&R branding at narrow widths; no Mid/End selector |
| **Reference workbook** | ❌ Not present | Cannot cross-verify labels; spec is sole authority |
| **Logo provenance** | ⚠️ Unverified | 372×136 PNG; likely Bhujbal Knowledge City mark — needs approval |

**Most serious defects (P0):**
1. **PDF header hardcodes "End Semester Feedback"** — cannot produce Mid Semester reports.
2. **PDF includes "Remark Subject Teacher"** — violates V3 requirement (HoD only).
3. **No Mid/End period in data model** — blocks core V3 feature.
4. **SQLite + local-only server** — fundamentally incompatible with Vercel/Supabase target.
5. **Leader-line label layout algorithm** — produces overlaps/clipping with long 4-option labels.

---

## C. VERIFIED REPOSITORY STATE

### Workspace & Git
- **Working directory:** `C:\Volume D\ramdom\AR_Feedback_Portal`
- **Git repository:** **NO** — `fatal: not a git repository`
- **Branch/status:** N/A
- **Remotes:** N/A

### File Inventory

| Path | Size | Status | Notes |
|------|------|--------|-------|
| `app.py` | 17,833 B | ✅ Present | Python HTTP server, ReportLab PDF, SQLite, generation logic |
| `index.html` | 24,412 B | ✅ Present | Monolithic frontend (HTML+CSS+JS), SVG preview charts |
| `assets/college_logo.png` | 39,198 B | ✅ Present | 372×136 PNG, RGBA; likely Bhujbal Knowledge City mark |
| `data/reports.db` | 24,576 B | ✅ Present | SQLite with 3 sample reports |
| `README.md` | 3,033 B | ✅ Present | V2 documentation |
| `Start_Portal_Windows.bat` | 359 B | ✅ Present | Launcher |
| `Start_Portal_Linux_Mac.sh` | 56 B | ✅ Present | Launcher |
| `AGENTS.md` | 16,340 B | ✅ Present | Agent instructions (added for V3) |
| `PROJECT_SPEC.md` | 29,659 B | ✅ Present | V3 product specification (added for V3) |
| `Feedback report SEAR.xlsx` | — | ❌ **Missing** | Reference workbook — not in repo |
| `AR_Feedback_Portal_v2.zip` | — | ❌ **Missing** | Original distributable — not in repo |
| Sample PDFs | — | ❌ **Missing** | No exported PDFs for visual comparison |

### Database Contents (3 reports)
```sql
CREATE TABLE reports (
    id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
    academic_year TEXT NOT NULL, semester INTEGER NOT NULL,
    subject_name TEXT NOT NULL, subject_code TEXT NOT NULL,
    faculty_name TEXT NOT NULL, respondent_count INTEGER NOT NULL,
    payload TEXT NOT NULL
);
```
- Report 1: `2022-23`, Sem 3, "Engineering Mathematics-III", AR2301, Prof. S. S. Borse, n=81
- Report 2: `2024-2025`, Sem 6, "python", nsknjdkjdnkjsd, rahul, n=84
- Report 3: `2022-23`, Sem 3, "python", 250250rtrtrt250, thor, n=43
- **All payloads** contain identical 10-question structure with correct option ordering and ranking.
- **No `period` (Mid/End) field** in schema or payload.

---

## D. CURRENT ARCHITECTURE

### Backend (`app.py`)
- **Runtime:** Python 3.10+ stdlib `http.server.ThreadingHTTPServer`
- **Port:** 8765 (configurable via `PORT` env), binds `127.0.0.1` only
- **PDF:** ReportLab `canvas.Canvas` on A4 portrait, 2 pages, fixed 6-chart positions
- **Database:** SQLite (`data/reports.db`) with single `reports` table; full JSON payload stored
- **Generation:** Seeded random weights → integer counts summing to `n` (42–85) → mapped via `best` ranking
- **Provenance:** Every payload includes `generation_method: "automated"` and `data_origin: "system-generated; no student survey was conducted"`
- **Auth:** Optional `PORTAL_PASSWORD` env → session cookie (HttpOnly, SameSite=Strict)

### Frontend (`index.html`)
- **Architecture:** Single HTML file with embedded `<style>` and `<script>` (no build step)
- **CSS:** Custom properties, flexbox sidebar + main, responsive-ish but fixed 260px sidebar
- **Charts:** SVG pie charts with leader-line callouts (client-side mirror of PDF logic)
- **State:** `activeReport`, `archive[]` in memory; fetch from `/api/*` endpoints
- **Pages:** "Generate Report" (create) and "Saved Reports" (archive) via `switchPage()`
- **Auth UI:** Modal login if `PORTAL_PASSWORD` set and no valid session

### Data Layer
- **Schema:** Flat `reports` table; payload = complete immutable snapshot (JSON)
- **Regeneration:** `POST /api/report/<id>/regenerate` → calls `make_report(old)` → **new row, new ID**
- **No grouping:** Each report standalone; no link between Mid/End for same subject/faculty
- **No versioning:** No version number, no parent/child relationship

### PDF Renderer (`render_pdf` + `pdf_chart` in `app.py`)
- **Pages:** Exactly 2 (A4 portrait), 6 charts page 1, 4 charts page 2 (hardcoded positions)
- **Header:** College logo (top-left), college name (red `#C00000`), affiliation (black), department, **"End Semester Feedback"** (hardcoded), academic year
- **Metadata box:** Subject code, Semester, Subject, Faculty
- **Charts:** `pdf_chart()` draws pie via `wedge()`, computes leader lines to left/right margins, sorts labels by vertical position, enforces 16pt gap, truncates long labels with `...`
- **Remarks (page 2):** **Both** "Remark Subject Teacher:" and "Remark HoD:" with lines — **violates V3**
- **Footer:** "Internal working report | System-generated figures; not collected student responses" + page number

---

## E. FEATURE AUDIT MATRIX

| Feature | V2 Status | Evidence | V3 Changes Required |
|---------|-----------|----------|---------------------|
| Academic year input | ✅ Working | `app.py:94-98` validation; `index.html:30` | Keep validation; normalize `YYYY-YY`/`YYYY-YYYY` |
| Department (fixed) | ✅ Working | `app.py:35`, `index.html:31` readonly | Keep; ensure PDF repeats on both pages |
| Semester selection | ✅ Working | `app.py:91-100`; `index.html:32` select | Keep I–VIII |
| Subject name | ✅ Working | `app.py:101-103`; `index.html:33` | Max 120 chars; wrap in PDF |
| Subject code | ✅ Working | `app.py:101-103`; `index.html:34` | Preserve case/leading zeros |
| Faculty name | ✅ Working | `app.py:101-103`; `index.html:35` | Max 120 chars |
| **Feedback Period (Mid/End)** | ❌ **Missing** | Not in form, DB, PDF, or preview | **P0: Add selector, DB field, PDF header, preview, grouping** |
| Report generation | ✅ Working | `app.py:85-122` | Refactor to typed TS; add period to payload |
| Synthetic count generation | ✅ Working | `app.py:69-82` | Port algorithm; add seed/nonce for reproducibility |
| Pie chart rendering (web) | ✅ Working | `index.html:63-109` `pieMarkup()` | Replace with shared renderer; fix label collisions |
| PDF generation | ⚠️ Partial | `app.py:146-301` | **P0: Rewrite** — fix period, remarks, layout, vector quality |
| PDF: 2-page A4 6+4 | ✅ Structure OK | `app.py:282-287` positions | Verify chart distribution; fix header repeat |
| PDF: College branding | ✅ Red/black OK | `app.py:254-266` colors | Confirm logo; keep red heading |
| PDF: Remarks | ❌ **Wrong** | `app.py:294-298` both remarks | **P0: Remove Subject Teacher; keep HoD only** |
| Report regeneration | ✅ Working | `app.py:362-365` | Change to **versioned** under group; preserve old |
| Saved reports list | ✅ Working | `app.py:131-135`; `index.html:125` | Add period filter; show version; group by identity |
| Archive search/filter | ✅ Basic | `index.html:125` | Add period, year, semester, code, faculty |
| Reopen saved report | ✅ Working | `index.html:126` `openReport()` | Must load **exact snapshot** (no reroll) |
| PDF download | ✅ Working | `app.py:343-348` | Generate from **persisted snapshot**; same bytes |
| Provenance in PDF | ✅ Present | `app.py:280` footer | Keep; ensure visible but unobtrusive |
| Responsive UI (320–1920px) | ⚠️ Partial | `index.html:9` CSS vars | **P1: Fix A&R brand breakage; test all breakpoints** |
| A&R brand integrity | ❌ Broken | `index.html:16` inline `<span>` | **P1: Measured responsive component** |
| Admin login (optional) | ✅ Working | `app.py:31,354-359` | **REMOVE** — V3 forbids admin-login screen |
| Cloud deployment ready | ❌ No | Local SQLite, 127.0.0.1 bind | **P0: Next.js + Supabase PG + Vercel** |

---

## F. DEFECT REGISTER

### P0 — Blocking Architecture / Security / Correctness

| ID | Defect | File:Line | Root Cause | Severity |
|----|--------|-----------|------------|----------|
| P0-1 | **PDF header hardcodes "End Semester Feedback"** | `app.py:266` | Literal string; no period field in report payload | 🔴 Critical |
| P0-2 | **PDF includes "Remark Subject Teacher"** | `app.py:294-296` | Hardcoded in `render_pdf()`; V3 requires HoD only | 🔴 Critical |
| P0-3 | **No Mid/End period in data model** | `app.py:56-65` schema; `index.html:30-35` form | V2 never had periods; schema/UI/PDF all lack it | 🔴 Critical |
| P0-4 | **SQLite + local server incompatible with Vercel** | `app.py:26-29` | File-based DB; binds 127.0.0.1; no serverless support | 🔴 Critical |
| P0-5 | **Leader-line label collisions & truncation** | `app.py:189-238`; `index.html:87-99` | Absolute positioning; fixed 16pt gap; truncates with `...` | 🔴 Critical |
| P0-6 | **No report grouping/versioning** | `app.py:119-121` INSERT | Each regen = new row; no group key, no version number | 🔴 Critical |
| P0-7 | **Preview/PDF divergence** | `index.html:113` vs `app.py:266` | Both hardcode "End Semester"; preview uses SVG, PDF uses ReportLab | 🔴 Critical |
| P0-8 | **No cloud access boundary** | `app.py:31,325` | Optional password only; public write endpoints if deployed | 🔴 Critical |

### P1 — Important Functionality / Quality

| ID | Defect | File:Line | Root Cause | Severity |
|----|--------|-----------|------------|----------|
| P1-1 | **A&R brand breaks at narrow widths** | `index.html:16` CSS `.mark` | Inline `A` + `&` + `R` with fixed 40px box; wraps to broken letters | 🟠 High |
| P1-2 | **Sidebar fixed 260px; no mobile collapse** | `index.html:9` `--sidebar:260px` | No hamburger/menu; overflows on mobile | 🟠 High |
| P1-3 | **Archive doesn't show period or version** | `index.html:125` table | Columns: Subject, Year, Semester, Faculty, Action only | 🟠 High |
| P1-4 | **Label truncation loses meaning** | `app.py:228-229`; `index.html:104` | Cuts to `...` at ~10 chars; "Somewhat effectively" → "Somewh..." | 🟠 High |
| P1-5 | **No input sanitization in PDF** | `app.py:271-274` `text_fit()` | Truncates but no HTML/entity escape for PDF text | 🟠 High |
| P1-6 | **Color-only category encoding** | `app.py:49` palette | No pattern/text fallback for colorblind/print | 🟠 High |
| P1-7 | **Hardcoded chart positions (6 fixed coords)** | `app.py:282` | Won't adapt if chart count changes; fragile | 🟠 High |
| P1-8 | **No rate limiting / abuse protection** | `app.py:327` 20KB limit only | Public endpoints would be vulnerable | 🟠 High |

### P2 — Polish / Maintainability

| ID | Defect | File:Line | Root Cause | Severity |
|----|--------|-----------|------------|----------|
| P2-1 | **Monolithic HTML (24KB)** | `index.html` | All CSS/JS inlined; hard to maintain/test | 🟡 Medium |
| P2-2 | **No TypeScript / type safety** | Entire codebase | Python + raw JS; no shared schema types | 🟡 Medium |
| P2-3 | **Magic numbers in PDF layout** | `app.py:146-301` | x/y/radius/gap hardcoded; fragile to content changes | 🟡 Medium |
| P2-4 | **No automated tests** | Repo | Zero test files | 🟡 Medium |
| P2-5 | **`SESSSIONS` in-memory set** | `app.py:30` | Lost on restart; not distributed | 🟡 Medium |
| P2-6 | **Logo provenance undocumented** | `assets/college_logo.png` | No README/license; appears to be BKC mark | 🟡 Medium |

---

## G. PDF RENDERING FINDINGS

### Root Causes of Label Overlap / Clipping / Poor Consistency

1. **Absolute coordinate geometry** (`app.py:154-186`): Label positions computed from slice midpoint angle → radial projection → fixed 8pt offset → horizontal leader to margin. No awareness of adjacent labels, chart card bounds, or page margins.

2. **Naive vertical packing** (`app.py:193-206`): Labels sorted by target Y per side (left/right), then pushed down to enforce 16pt minimum gap. If bottom label exceeds `bottom_limit`, **entire stack shifts up** — but no check for top overflow, and no horizontal collision detection between left/right stacks crossing the pie.

3. **Truncation instead of wrapping** (`app.py:228-235`, `index.html:104`): When label width exceeds available horizontal space, code truncates with `...` rather than wrapping. Long 4-option labels ("Somewhat effectively", "Not comprehensive", "Yes, fully comprehensive") routinely clip.

4. **Fixed chart card size (260×170)** (`app.py:287`): No dynamic sizing for content. Four-option charts need more label space than three-option.

5. **Preview ≠ PDF renderer**: Frontend uses SVG (`pieMarkup()`) with similar but **different** collision logic. PDF uses ReportLab `line()` + `drawString()`. Divergence guaranteed.

6. **No font metrics measurement**: `stringWidth()` used for truncation but not for layout decisions. Line height assumed (7.4pt font → ~10pt leading) but not measured.

7. **No legend fallback**: Spec requires "clean legend fallback where callouts cannot fit." Current code **always attempts leader lines**, never switches to legend.

### Recommendation: Replace Renderer Entirely

**Do not patch ReportLab layout.** The geometry is fundamentally unsuited for collision-safe, responsive label placement. Instead:

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **ReportLab + custom layout engine** | Same stack | Still imperative canvas; hard to test; no HTML preview parity | ❌ |
| **WeasyPrint (HTML→PDF)** | Shared HTML/CSS renderer; preview = PDF; flexbox/grid for layout; vector text | Large binary deps; slower; CSS paged media support varies | ⚠️ Consider |
| **Puppeteer/Playwright (headless Chrome → PDF)** | **Exact** web preview parity; modern CSS; easy debug | Requires Node in build; heavier; cold-start on serverless | ✅ **Recommended for V3** |
| **pdf-lib + custom layout** | Pure JS/TS; vector; programmatic | Manual layout = same problems | ❌ |
| **Typst (via CLI/WASM)** | Modern, programmable, fast | Newer ecosystem; WASM on Vercel possible but unproven | 🔬 Spike in Phase 1 |

**Phase 1 spike task:** Render the 10-chart A4 layout via **Playwright + shared React components** (server-side) and **WeasyPrint** as fallback. Compare visual output, bundle size, cold-start latency. Decide before Phase 3.

---

## H. V3 ARCHITECTURE PROPOSAL

### Frontend
- **Framework:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **UI Library:** Headless UI / Radix for accessible primitives; no heavy component lib
- **State:** React Server Components for data fetching; client components for interactivity
- **Charts:** **Shared React components** (SVG) used for both preview and PDF generation
- **Brand:** Responsive `A&R` component with measured breakpoints (icon-only < 480px)

### Backend / API
- **Runtime:** Next.js Route Handlers (Edge or Node) on Vercel
- **PDF Generation:** Server-side only via Playwright (headless Chromium) rendering a **dedicated PDF route** that receives the immutable report snapshot
- **Generation Algorithm:** Pure TS module (shared with frontend for preview parity), deterministic via seed/nonce

### Data Generation Engine (Pure TS)
```typescript
interface QuestionDef {
  id: string;           // stable machine ID
  title: string;        // display title
  options: string[];    // display order
  bestOrder: number[];  // indices best→worst (e.g., syllabus: [3,2,1,0])
}

interface ReportSnapshot {
  id: string;                    // UUID v7 (time-ordered)
  groupId: string;               // normalized academic identity hash
  version: number;               // 1, 2, 3... per group+period
  period: 'MID' | 'END';
  algorithmVersion: string;      // e.g., "gen-v1.2"
  seed: string;                  // nonce for reproducibility
  generatedAt: string;           // ISO timestamp
  respondentCount: number;       // synthetic n (42-85)
  questions: QuestionSnapshot[]; // counts + derived %
  dataOrigin: 'system-generated; no student survey was conducted';
}
```
- **Mid/End pairing:** Same `groupId` (hash of normalized year+semester+dept+subjectCode+faculty), different `period`. Baseline seed per group; period-specific derived seeds.
- **Regeneration:** New `version`, new `seed`, new row — **old rows immutable**.
- **Drift bound:** Parameterized (default 8pp); validated in tests; user-adjustable pre-launch.

### Database (Supabase PostgreSQL)
```sql
CREATE TABLE report_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT NOT NULL,
  semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  department TEXT NOT NULL DEFAULT 'Automation and Robotics',
  subject_code TEXT NOT NULL,
  faculty_name TEXT NOT NULL,
  subject_name TEXT NOT NULL,  -- denormalized for display
  baseline_seed TEXT NOT NULL, -- group-level seed for Mid/End derivation
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (academic_year, semester, department, subject_code, faculty_name)
);

CREATE TABLE report_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES report_groups(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('MID','END')),
  version INT NOT NULL,
  algorithm_version TEXT NOT NULL,
  seed TEXT NOT NULL,              -- this version's seed
  respondent_count INT NOT NULL,
  snapshot JSONB NOT NULL,         -- full QuestionSnapshot[]
  data_origin TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (group_id, period, version)
);

CREATE INDEX idx_versions_group_period ON report_versions(group_id, period);
CREATE INDEX idx_versions_generated ON report_versions(generated_at DESC);
```
- **RLS:** Enable; policies for authenticated service role only (no anon write).
- **Migration:** SQL files in repo; applied via Supabase CLI / `psql`.

### Security Boundary (No App Login)
**Approved approaches (require user selection):**
1. **Vercel Authentication (Deployment Protection)** — Password-protected preview/production deployments. Zero code changes. Cost: Vercel Pro.
2. **Supabase Edge Function + Shared Secret Header** — Client sends `X-Shared-Secret` (stored in browser `localStorage` after one-time enrollment). Server validates. Low friction, no user accounts.
3. **Cloudflare Access / AWS WAF / Vercel Edge Middleware** — IP allowlist, device fingerprint, or email OTP via Resend/SendGrid.
4. **Magic-link email (Supabase Auth)** — "Loginless" but uses Supabase Auth; coordinator clicks link once per device.

**Recommendation:** **Option 2 (Shared Secret + localStorage enrollment)** — simplest to implement, no external deps, works with static Vercel deployment, no recurring cost. Present to user for approval in Phase 4.

### Versioning Model
- `groupId` = hash(normalized(year, semester, dept, subjectCode, faculty))
- Each group has one `baseline_seed` (generated on first report creation).
- Mid seed = `hash(baseline_seed + "MID")`, End seed = `hash(baseline_seed + "END")`.
- Regeneration: `new_seed = hash(old_seed + "v" + newVersion)` → new counts.
- Opening archive → loads exact `snapshot` JSONB → **never regenerates**.

---

## I. MIGRATION AND PHASE ROADMAP

### Recommended Sequence (with justifications)

| Phase | Focus | Primary Deliverables | Key Dependencies | Gate |
|-------|-------|---------------------|------------------|------|
| **1** | **Foundations** | Next.js + TS + Tailwind scaffold; shared `QuestionDef[]` (single source); deterministic generation engine (pure TS) with seed/nonce; `ReportSnapshot` type; Mid/End period enum; group identity hash; unit tests for counts/ranking/invariants | None (greenfield) | `pnpm build && pnpm test` pass; 10 questions correct; ranking invariants hold; Mid/End seeds derivable |
| **2** | **Portal UX** | Create Report form (with period selector); preview using **shared chart components**; Saved Reports archive (search/filter by period/year/code/faculty); Regenerate → new version; responsive brand; keyboard accessible | Phase 1 types/engine | Real browser screenshots at 320/375/768/1366/1920px; no overflow; A&R intact; preview matches PDF data |
| **3** | **PDF Engine** | PDF route (Playwright) rendering shared components → 2-page A4 vector PDF; 6+4 layout; collision-safe labels (leader lines + legend fallback); HoD-only remarks; red/black typography; logo; provenance footer | Phase 2 components | **Visual QA required**: render all 8 acceptance scenarios (§5 PDF acceptance); both pages PNG at 100%/200%; no clipping/overlap |
| **4** | **Persistence & Access** | Supabase PG project (new, isolated); migrations; API routes for create/list/get/regenerate/pdf; RLS policies; chosen access boundary (shared secret / Vercel protection); rate limiting | Phase 3 PDF route; **User approval on access method** | Create→save→reopen→download works; old versions intact; no anon writes; no secret leakage |
| **5** | **Deploy & Verify** | GitHub repo + Vercel project; env vars; production smoke test (live URL); PDF download verified; redeploy persistence check | Phase 4 complete | Live URL tested end-to-end; commit hashes recorded |

**Alternative ordering considered:** PDF engine (Phase 3) before Portal UX (Phase 2) — **rejected** because shared chart components need to be built in Phase 2 anyway for preview, and PDF is just a server-side render of those same components. Building UI first validates the component API.

---

## J. TESTING STRATEGY

### Automated (CI)
| Layer | Tool | Targets |
|-------|------|---------|
| Type/Lint | `tsc --noEmit`, `eslint` | All TS/TSX |
| Unit (generation) | `vitest` | `makeCounts`, ranking invariants, sum==n, %≈100, seed determinism, Mid/End drift bound, group hash stability |
| Unit (schema) | `vitest` | Zod validation for input contract |
| Component | `vitest` + `@testing-library/react` | Chart label layout logic (pure functions), form validation |
| API | `vitest` + `msw` | Route handlers (create, list, get, regenerate, pdf) |
| E2E (smoke) | `playwright` (headless) | Create→preview→download PDF; open archive→reopen; Mid/End separate |

### Browser / Visual (Manual + Playwright Screenshots)
- **Breakpoints:** 320, 375, 768, 1366, 1920px
- **Checks:** No horizontal scroll; A&R brand intact; form fields accessible; button focus states; loading/error toasts; archive pagination

### PDF Visual (Manual Inspection Required — **Cannot Automate Fully**)
- Export PDF → render both pages to PNG (Playwright `page.pdf()` + `pdf2pic` or `pdfjs-dist`)
- **Inspect at 100% and 200% zoom** for:
  - Exact 2 pages, 6+4 chart count
  - All 10 titles + options readable
  - Long labels wrapped (not truncated)
  - No leader-line crossings
  - Small slices (1–3%) have visible labels
  - HoD remark only; no Subject Teacher
  - Red college name, black body text
  - Logo top-left, header repeated page 2
  - Page numbers + provenance footer
  - Values match persisted snapshot exactly

### Production Reliability
- Live Vercel URL: create report, regenerate, download PDF, open archive after redeploy
- Check Vercel function logs for errors
- Verify Supabase RLS blocks anon writes
- Confirm no `NEXT_PUBLIC_*` secrets exposed

---

## K. DECISIONS AND RISKS

### Confirmed Requirements (Locked)
- 10 exact questions with locked options/ranking (spec §2)
- Mid/End periods, versioned snapshots, group identity
- 2-page A4 PDF, 6+4 charts, HoD-only remarks, red/black/branding
- No admin login screen; truthful provenance
- Next.js + TS + Tailwind + Vercel + Supabase PG (Hairaju Gmail)
- OpenCode local; ChatGPT handles cloud connectors

### Proposed Implementation Decisions (Need User Input Where Noted)
| Decision | Proposal | Status |
|----------|----------|--------|
| PDF renderer | Playwright (headless Chrome) rendering shared React components | **Proposed** — spike in Phase 1 |
| Mid/End drift bound | 8 percentage points per ranked category | **Proposed** — needs user confirmation |
| Access boundary (no login) | Shared secret + localStorage enrollment (Option 2) | **Proposed** — needs user approval |
| Logo asset | Existing `college_logo.png` (Bhujbal mark) | **Needs user confirmation** |
| GitHub repo | New repo under user's account | **Needs user specification** |
| Vercel project | New isolated project | **Needs user specification** |
| Old V2 report import | Not requested; defer | **Deferred** |

### Unverified Assumptions
- Hairaju Gmail Supabase organization exists and can create new project
- Vercel account available for new project linking
- No billing blocks for Supabase Pro / Vercel Pro if needed
- Coordinator workflow is single-user (no concurrent editors)

### External Dependencies / Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Playwright on Vercel (Node runtime, bundle size) | Cold starts, 50MB+ bundle | Use `@vercel/og` pattern; consider WeasyPrint fallback; spike early |
| Supabase RLS policy complexity | Accidental data exposure | Test policies in Phase 4 with `pg_dump` verification |
| Label layout edge cases (4-option, long text, tiny slices) | PDF rejection in Phase 3 | Exhaustive test matrix in Phase 1; visual regression in Phase 3 |
| User unavailable for access-boundary decision | Phase 4 blocked | Document options clearly; proceed with shared-secret prototype |
| Logo not approved | Phase 3 PDF branding wrong | Ask user **now** (before Phase 1) |

### Items Requiring User Approval Before Phase 1
1. ✅ **Logo** — Confirm `assets/college_logo.png` is correct for production PDF.
2. ✅ **Mid/End drift bound** — Accept 8pp or specify alternative.
3. ✅ **Access boundary** — Choose from 4 options (or propose other).
4. ✅ **GitHub repo + Vercel project** — Specify names/ownership.
5. ✅ **Supabase project creation** — Confirm Hairaju Gmail org + cost approval.

---

## L. EXACT EXECUTION EVIDENCE

### Commands Run (Read-Only)
```powershell
# Repository structure
Get-ChildItem -Recurse -Force | Sort-Object FullName

# File reads
Read AGENTS.md (207 lines)
Read PROJECT_SPEC.md (305 lines)
Read app.py (379 lines)
Read index.html (131 lines, truncated at 2000 chars — full content analyzed)
Read README.md (74 lines)
Read Start_Portal_Windows.bat (16 lines)
Read Start_Portal_Linux_Mac.sh (3 lines)

# Database inspection
py inspect_db.py
# → Schema + 3 sample reports with full JSON payloads

# Git status
git status → "fatal: not a git repository"
git log → "fatal: not a git repository"

# Asset inspection
file assets/college_logo.png → "PNG image data, 372 x 136, 8-bit/color RGBA"

# Missing file search
Get-ChildItem -Recurse -Include *.xlsx,*.zip,*.pdf
# → No reference workbook, no V2 zip, no sample PDFs
```

### Checks NOT Completed (Blocked / Not Applicable)
- **PDF visual inspection** — No sample PDFs exist; V2 PDF generation not executed (would mutate nothing but requires running server).
- **Live browser testing** — V2 server not started (would bind port 8765).
- **Supabase/Vercel connectivity** — Not authorized in Phase 0; ChatGPT handles connectors.
- **Reference workbook comparison** — File not present; spec used as sole authority.

---

## M. FINAL RECOMMENDATION

### 1. Recommended V3 Migration Approach
**Strategy B — Greenfield Next.js/TypeScript** with surgical migration of:
- Question definitions (`QUESTIONS` array → `QuestionDef[]` single source)
- Generation algorithm (`make_counts` → pure TS with seed)
- Color palette & ranking logic
- Provenance strings
- Input validation rules

**Discard:** Python server, ReportLab PDF, SQLite, monolithic HTML, inline CSS/JS, session cookie auth.

### 2. Three Most Important Problems to Solve First
1. **PDF rendering architecture** — Choose and spike renderer (Playwright vs WeasyPrint) in Phase 1; all downstream quality depends on this.
2. **Mid/End data model** — Define `groupId`, `period`, `version`, seed derivation **before** any UI/API work.
3. **Access boundary decision** — Must be approved before Phase 4; influences API design from Phase 1.

### 3. Conditions Before Phase 1 Can Begin
- [ ] User confirms logo asset (`assets/college_logo.png`) is correct for production.
- [ ] User confirms/denies 8pp Mid/End drift bound.
- [ ] User selects access boundary approach (or approves shared-secret prototype).
- [ ] User specifies GitHub repository name/owner for V3 code.
- [ ] User confirms Hairaju Gmail Supabase org can create new project (cost approval if needed).
- [ ] **Reversible checkpoint created** — Initialize Git repo, commit current V2 state as `v2-baseline` tag.

### 4. Phase 1 Ready to Begin?
**YES — pending the 5 conditions above.** The audit is complete, the repository is understood, the migration plan is defined, and no V2 code modifications are needed before Phase 1 starts. Phase 1 work is greenfield Next.js scaffold + shared types + generation engine — zero risk to existing V2 files.

---

**Audit complete. Awaiting Phase 1 authorization and user decisions on open items.**