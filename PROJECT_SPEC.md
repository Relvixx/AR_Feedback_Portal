# A&R Feedback Portal V3 — Product and Engineering Specification

**Document ID:** AR-FP-V3-SPEC  
**Version:** 1.0.0 (baseline for Phase 0)  
**Date:** 2026-10-21  
**Status:** Approved direction; implementation pending repository audit  
**Companion instructions:** [`AGENTS.md`](./AGENTS.md)

> **Read this entire file before changing code.** This is the durable, in-repository definition of *what* the product must do. `AGENTS.md` defines *how* the OpenCode agent must work. Do not invent requirements, silently alter the ten questions, or claim a deployment exists before verifying it.

## 0. Product definition

Build a **professional, fast, single-coordinator Automation & Robotics feedback *report generator***, hosted on Vercel. The coordinator enters academic/subject information, chooses **Mid Semester** or **End Semester**, and generates a **versioned, saved, two-page A4 PDF** containing the ten fixed question charts from the reference workbook.

No students use this application. It is **not** a data-collection survey, learning-management system, faculty evaluation portal, or multi-user admin system. It automatically produces **system-generated illustrative figures**, not measured student answers. Persist truthful provenance in records and show an unobtrusive, legible provenance statement wherever figures could be mistaken for collected feedback. **Never describe generated figures as actual collected student responses, invent real class sizes, or use them as evidence that a survey occurred.**

### Primary user flow (locked)

1. Open the hosted portal (no application admin-login screen).
2. Enter **Academic Year** (`2022-23`, etc.), select **Semester** (`I`–`VIII`), view fixed **Department** (`Automation and Robotics`), enter **Subject Name**, **Subject Code**, **Faculty Name**.
3. Select **Feedback Period: Mid Semester or End Semester**.
4. Click **Generate Report**. The application generates category counts internally; the coordinator never types individual student responses or feedback counts.
5. Preview all **10** question charts with accurate percentages/labels.
6. **Download PDF / Print**, or **Regenerate** (which creates a *new* version, retaining the old one).
7. Open **Saved Reports**, search/filter and reopen an identical saved snapshot later.

### In scope

- Accurate reproduction of fixed reference questions and categories.
- Positive-skewed *illustrative* category generation, integer consistency, and reasonable related Mid/End variations (see §4).
- Professional university/department branding; highly readable portal and printed PDF.
- Two distinct period types, saved report version history, search, preview and export.
- Reliable cloud persistence, safe secrets, hosted Vercel URL.
- Strict automated and visual quality gates; no unsupported completion claims.

### Explicitly out of scope

- Student/teacher accounts, online survey submissions, invitations, attendance, grading, individual response records, CSV imports, manual feedback-count entry.
- Admin-login page or multi-role permissions UI.
- Analytics dashboards, scoring/ranking teachers, automated HoD conclusions, signatures, or fabricated HoD remarks.
- Preset real student/class counts or presenting simulated data as a genuine survey.
- Changes to unrelated Supabase/Vercel/GitHub projects.

## 1. Input contract and metadata

| Field | Type | Required | Rules |
|---|---|---|---|
| Academic year | text/select | yes | Accept `YYYY-YY` (e.g., `2022-23`); verify consecutive years, including `2099-00`. Optionally accept `YYYY-YYYY` if normalized consistently. |
| Department | fixed | automatic | `Automation and Robotics`; do not ask for every report. |
| Semester | select | yes | `I`, `II`, `III`, `IV`, `V`, `VI`, `VII`, `VIII` (internally 1–8). |
| Subject name | text | yes | Trim; support normal punctuation/unicode; display full name in PDF using wrapping. |
| Subject code | text | yes | Trim; preserve letters, leading zeros and punctuation as permitted; never infer name from an arbitrary code. |
| Faculty name | text | yes | Trim; allow initials, spaces, periods, honorifics; show completely in export. |
| Feedback period | select/segmented | yes | Exact enum `MID` / `END`; visible `Mid Semester` / `End Semester`. |

**Missing from V2:** Feedback period selection is mandatory. **Existing V2 fields should not disappear.** There is no requirement for date of feedback collection: do not invent one. Store **report generation timestamp**, not a fictional collection date.

Input errors must be accessible, specific, and non-destructive. Prevent whitespace-only fields, extremely long names or XSS/HTML injection; escape untrusted content in both HTML and generated PDFs. Use a reasonable documented max length (e.g., 120 characters) rather than truncating text silently in output.

### Logical subject/report identity

- Define canonical **group key** from normalized academic year + semester + department + subject code + faculty identity; do not identify a report by subject name alone.
- Normalize only where safe: case/whitespace conventions and Unicode; preserve original displayed values.
- A subject-code change can indicate a *different* subject; do not mimic V2 by silently changing unrelated report data.
- **Mid and End are separate periods under the same group**, with independently saved versions.
- An explicit regeneration creates a new immutable snapshot; do **not** silently replace previously downloaded PDF contents.
- Decide collision handling (duplicate group/period in different sessions, similar subject codes, renamed faculty) transparently at implementation time and test it. No silent merge of distinct courses.

## 2. Exact fixed question bank — source of truth

Preserve **all ten** titles, answer options, and ordering from the reference Excel/V2 baseline. Store canonical machine IDs separately from display strings and from quality-ranking order. **Original display order is *not* always best-to-worst.**

| # | Stable ID | Title | Options in DISPLAY order | Best-to-worst OPTION INDEXES (0-based) |
|---|---|---|---|---|
| 1 | `communication_skills` | Communication Skills | Excellent · Good · Average | `0,1,2` |
| 2 | `teaching_methodology` | Teaching Methodology | Excellent · Good · Average | `0,1,2` |
| 3 | `syllabus_completion` | Syllabus Completion | Below 60% · 60% - 75% · 75% - 90% · 90% - 100% | `3,2,1,0` |
| 4 | `student_understanding` | Student Understanding | Excellent · Good · Average | `0,1,2` |
| 5 | `class_engagement` | Class Engagement | Regularly on time · Sometime on time · Sometime late · Always late | `0,1,2,3` |
| 6 | `subject_knowledge` | Subject Knowledge | Excellent · Good · Average | `0,1,2` |
| 7 | `ict_tools_usage` | ICT Tools Usage | Always · Sometimes · Rarely · Never | `0,1,2,3` |
| 8 | `student_interaction` | Student Interaction | Always · Sometimes · Rarely · Never | `0,1,2,3` |
| 9 | `question_bank_guidance` | Question Bank Guidance | Very effectively · Effectively · Somewhat effectively · Ineffectively | `0,1,2,3` |
| 10 | `question_bank_coverage` | Question Bank Coverage | Yes, fully comprehensive · Mostly comprehensive · Somewhat comprehensive · Not comprehensive | `0,1,2,3` |

**Important:** `Class Engagement` is the workbook's label, although its response options describe punctuality. Preserve it until the user authorizes renaming. The Excel is a *structural reference*, **not** evidence of collected feedback. The workbook's `RANDBETWEEN()` cells are volatile and must **not** be copied into immutable report records or treated as verified counts.

If Phase 0 comparison discovers that an exact label differs between the actual local source workbook and this table, document the discrepancy and **ask before silently substituting** labels. Do not make up an extra question or missing option.

## 3. Brand and portal visual specification

### University identity

- Header college name: **`MET's Institute of Technology (P) B. Tech.`** — saturated, legible RED (baseline used `#C00000`).
- Affiliation: **`Affiliated to Dr. Babasaheb Ambedkar Technological University, Lonere.`** — true BLACK.
- Department: **`Department of Automation and Robotics`** — BLACK.
- Report heading: **`Mid Semester Feedback`** or **`End Semester Feedback`**, followed by academic year — BLACK.
- The subject code, semester, subject, faculty, question names, data labels, remarks and footer are black/dark enough for sharp grayscale printing; do not use very faint blue/gray for primary information.
- College logo **upper left**. The old project's `assets/college_logo.png` is the initial reference; the supplied asset looks like a Bhujbal Knowledge City mark. **Logo appropriateness awaits explicit confirmation.** Do not invent, replace with unrelated graphics or fetch a random logo.

### Website design (rebuild thoughtfully rather than patching V2 cosmetics)

- Professional university-office SaaS appearance: restrained navy/white palette, red only where college branding requires it, clean typography, spacing, uncluttered panels.
- Sidebar or top navigation: `Create Report`, `Saved Reports`; no unused navigation options or analytics placeholders.
- Top-left A&R brand must **never stack into broken letters** at desktop/tablet/mobile widths. Use a measured, responsive brand component; if the narrow sidebar cannot fit it, render a tested compact icon.
- Form has clear labels, sensible desktop grid and single-column mobile behavior; avoid excessive empty space and cramped fields.
- Distinct, obvious Mid/End control; helpful validation/loading/error/success states; keyboard navigation and visible focus.
- Preview reflects *the actual PDF layout*: preferably generate a server-approved PDF and embed/view it, or use a rigorously shared renderer; do not maintain visually divergent, hand-coded web and PDF charts.
- Mobile breakpoints must be tested at **320, 375, 768, 1366 and 1920 CSS pixels**; no horizontal scroll, overlapping content, overflowing button rows or clipped brand.
- Use actual assets and legitimate placeholder text only where appropriate. No made-up institute address, accreditation badges, seals, faculty titles or endorsements.

## 4. Internally generated illustrative figures — integrity and algorithm

### Data truth (hard boundary)

There are **no collected student responses in this workflow**. Generated counts are illustrative, and should never be passed off as proof that students answered a survey. Persist **origin type**, algorithm version, seed/nonce, generated timestamp, and report/group linkage. Export a small **readable** footer such as `Internal report | System-generated figures; not collected student responses`. Do not use an enormous diagonal watermark, but do not hide or strip truthful provenance.

### Core constraints

1. Create a plausible synthetic `response_total` (internal, not an actual class strength claim) for the report, or define another coherent count-based model; document its derivation.
2. **Generate integer counts first.** Each question's option-count array is length 3 or 4 as specified, all entries are nonnegative integers, and `sum(counts) === response_total` for each question.
3. Percentages always derive from saved counts; no independent random percentages. Totals must equal 100% in exact math; UI display may use consistent rounding (either largest-remainder displayed tenths or a documented tolerance).
4. Respect the ranked preference: `best >= next >= ... >= worst` for every question. Prefer visibly decreasing counts when numeric resolution permits; **do not reorder labels to force the inequality**. Especially test reversed syllabus option ordering.
5. Use a seeded, versioned generation function so a *saved report* can be reproduced from its snapshot, while clicking `Regenerate` intentionally creates a **new immutable** snapshot. Never regenerate simply by opening/downloading.
6. Do not hardcode the same percentages for all ten questions or subjects. Avoid values that exceed 100%, zero-sized pie math errors, and implausible dramatic shifts caused solely by regeneration.
7. All percentages and totals match **the same saved version** across the web UI, API response and PDF.

### Mid/End relationship

- A group may have both periods; each has its own independent report versions and PDF.
- Use one stable, synthetic per-group baseline, with controlled period-specific variations. This is only for *visual consistency of simulated figures*; never assert an observed improvement or quality outcome.
- **Works regardless of creation order** (`END` may be created before `MID`). Never require first creating Mid.
- **Regeneration must not change other already-saved versions.** If Mid is regenerated, saved End PDFs remain identical. Explicitly decide how newly generated Mid and End versions relate to the persistent group baseline and version seeds.
- Implement/test a documented bound on the distribution change, e.g., *proposed* maximum 8 percentage points per ranked category between period baselines. **8pp is an engineering proposal, not a verified requirement**; confirm/adjust before calling the algorithm final.
- The wording “balanced” **does not** authorize manipulating real feedback to manufacture a desired sentiment; this is applied only to internally generated illustrative figures.

### Security-aware generation

All random data generation and storage mutation must be governed server-side, not by anonymously writable Supabase tables or privileged keys exposed to browsers. Apply input normalization, request size limits, rate limits or equivalent abuse controls and instrumentation. **Do not interpret 'no admin login screen' as permission to expose an unrestricted cloud database.** See §7.

## 5. PDF — primary quality-critical deliverable

The PDF is more important than decorative UI polish. **Never label Phase 3 PASS until the actual exported file has been rendered and visually inspected.**

### Fixed page architecture

- Format: **A4 portrait**, exactly **2 pages** for all 10 questions, repeat logo/college header/subject details on both pages.
- **Page 1**: questions **1–6** in **2 columns × 3 rows**.
- **Page 2**: questions **7–10** in **2 columns × 2 rows**; below them **`Remark by HoD` only** with sufficient blank writing space. No `Remark Subject Teacher`, `Remark by Subject Teacher` or subject-teacher remark anywhere.
- Academic Year, Semester, Subject Code, Subject Name, Faculty Name, Department, and selected Mid/End period must be correct on **both** pages.
- High-resolution/vector visual output, selectable/readable PDF text where practical, no blurry screenshots of the site as the PDF.
- Consistent chart numbering, sizes, titles, slice colors and percentage formatting. Include clearly legible page numbers and unobtrusive, truthful data-origin note.

### Charts and callout rules

- Use the original option labels exactly, including lengthy `Yes, fully comprehensive`, `Somewhat effectively`, `Not comprehensive` etc.
- **Prefer neat leader-line / arrow callouts pointing to their own slice** (as requested in reference screenshot) *only when they can be laid out safely.*
- Layout engine must account for real font metrics, wrapping, label heights, positions and available box bounds; avoid arbitrary absolute coordinates and overlapping side text.
- Prevent: lines crossing labels, two labels overlapping, line ending at the wrong slice, text truncated mid-word, labels or percentages outside card/page, arrows intruding on adjacent charts, collisions with titles/footer.
- In crowded 4-option cards where arrows cannot be both correct and readable, use a deliberate **clean legend fallback** instead. Do **not** force messy arrows to satisfy a cosmetic preference.
- Question categories cannot disappear because percentages are small. Test 1–3% slices and extreme ranking distributions.
- Color alone must never be the only key to categories; textual options and percentages/counts must be shown clearly.
- PDF engine must support both length-3 and length-4 option lists without layout forks that silently alter data.
- Use page-boundary and typography assertions where practical (e.g., bounding boxes in tests); visually examine the exported A4 page renders at **100% and 200%**.

### PDF acceptance scenarios (must include image evidence)

1. Mid Semester, `2022-23`, semester III, Engineering Mathematics-III.
2. End Semester for same subject/group: preview/output contains `End Semester`, with coherent separate snapshot.
3. Long subject name, long faculty initials/name and long subject code: wraps without replacing meaning with `...`.
4. `Syllabus Completion`: highest simulated count belongs to **90% - 100%**, while shown options remain in original order.
5. Four-option Question Bank Coverage/Guidance: no callout intersections or clipped labels; clean fallback allowed.
6. Very small categories and mixed 3/4-option question samples.
7. Page 1 has precisely 6 charts; page 2 has precisely 4; both have header; only HoD remarks on page 2.
8. No open file corruptions; PDF reader opens it; text extraction/page inspection confirms expected titles and required metadata.

## 6. Application screens and interactions

### A. Create Report

- Clear page title and sectioned academic-details form.
- Validation before generation with no loss of entered data.
- Mid/End selector, relevant explanatory microcopy about internal generated figures.
- Generate → server creates saved version → immediately display the saved report ID/version, preview and actions.
- `Download PDF`, `Print`, `Regenerate` actions. Make `Regenerate` intention obvious and preserve old versions.
- The same generated numerical data feeds preview and PDF.
- No admin-login UI; no fake login button, admin users page, student link or unsupported role selector.

### B. Saved Reports

- List newest first; search/filter by academic year, semester, subject name/code, faculty and `MID`/`END`.
- Show sufficient disambiguation: creation timestamp, version/ID, period and subject metadata.
- Open existing exact snapshot. Re-download *identical* PDF content semantically (and ideally byte-for-byte if metadata fixed), without rerolling numbers.
- Archive survives page reload, application restart, new deployment and movement to another approved device.
- Never silently delete or overwrite history. Search/filter must not mutate saved records.

### Loading, errors, empty states

- Loading indicator during requests, disabled duplicate submissions, user-friendly network errors and retry controls.
- Empty Saved Reports state invites creation; errors must not expose internal database details or secret values.
- No counterfeit API responses or sample records silently displayed as previously generated real records.

## 7. Architecture, persistence, permissions and deployment

### Proposed technical architecture (approved direction, confirm after audit)

- **Frontend / server:** Next.js + TypeScript + Tailwind CSS on Vercel. Keep question/data schema shared and typed. Use server-side functionality for sensitive persistence and PDF generation as appropriate.
- **Database:** a **new isolated Supabase Postgres project in the user's chosen `Hairaju Gmail` Supabase account**. Existing `tedxmet`, `Euphoria_Night`, and all unrelated projects must remain untouched. Use migrations committed to repo; protect schema with appropriate RLS/grants.
- **PDF:** use a reliable vector/text-aware renderer with a *measured* layout strategy. The exact library is a Phase 0/1 engineering decision; choose based on real A4 rendering tests, not preference alone.
- **Hosting:** new isolated Vercel project with final URL; GitHub-linked deployments preferred if exact repository/permissions are available. Secrets only in secure server environment.
- **No application admin-login screen**. This is a UI requirement, **not** a waiver of backend authorization/privacy. A public URL with write endpoints and no authentication is unsafe even for one coordinator. **Production write capability cannot go live before an acceptable restricted-access approach is explicitly selected and tested** (such as approved access-gateway protection, one-time device enrollment, or equivalent). Do not ship public unrestricted mutation APIs and do not pretend an obscured URL is secure. Choose a solution with the user; do not secretly add a traditional login page.
- ChatGPT can operate **connected Vercel and Supabase tools** when specifically appropriate, while OpenCode operates **on the user's local repository**. Do not assume OpenCode has ChatGPT's connector credentials. User prefers no manual dashboard configuration. If a connector action is unavailable or requires approval/cost confirmation, report the minimal unavoidable action.
- Any billable resource requires explicit cost review/approval. A Supabase account was chosen, **not** an organization or a specific database project; discover/confirm destination at provisioning time.

### DB concepts (suggested, not an already deployed schema)

- `report_groups`: normalized academic identity and stable group seed/baseline.
- `report_versions`: immutable report ID, group ID, period, version number, generation algorithm version, seed/nonce, respondent count, snapshot JSON with exact 10 questions/counts, data origin, generated timestamp.
- Optional `artifacts` metadata for generated PDF references if actually necessary; exporting from immutable snapshots is sufficient otherwise.
- Uniqueness/index design should allow one group to have multiple Mid and End versions without races or accidental overwrites.
- Migration can evolve these tables during implementation after Phase 0. Never retrofit unrelated tables in existing projects.

### Reliability and security requirements

- Save only after validation and atomic commit; prefer transactionally unique versions.
- Use appropriately scoped server keys and safe query permissions. Never put Supabase service-role/secret keys in `NEXT_PUBLIC_*`, git history, browser JS or logs.
- API endpoints must validate strings, enums, inputs and length; no SQL injection, XSS or uncontrolled file access.
- Put safeguards on public traffic: rate limits, no secret leakage, protect save/regenerate/list/download endpoints as user-approved.
- Do not rely on the V2 local SQLite database for Vercel persistence. Provide migration plan for legacy local records if user ever requests it; **do not assume sample records from V2 should be uploaded to production**.
- PDF download is generated from persisted report version data, not independently regenerated on request.

## 8. Delivery phases and hard gates

| Phase | Purpose | Deliverable | Must PASS before moving on |
|---|---|---|---|
| **0 — Audit** | Inspect local source and assets; reconcile actual code/docs; inventory problems | Factual audit + phased change map + safe checkpoint | Correct repository verified, no blind changes, blockers named |
| **1 — Foundations** | Vercel-compatible architecture, types, 10-question schema, immutable generation and Mid/End pairing | Tested foundation and algorithm + PDF layout feasibility spike | Builds/tests run, data invariants and identity cases pass |
| **2 — Portal UX** | Polish brand, inputs, period selector, report preview/archive/regeneration | Working responsive core UI | Real screenshots, keyboard/mobile checks, preview uses saved data |
| **3 — PDF Engine** | Professional two-page vector PDF with 6+4 charts and safe callouts/fallback | Visually verified PDFs and automated QA | Every acceptance sample passes with evidence, no clipping |
| **4 — Persistence & access** | Isolated Supabase, migrations, report persistence and approved security | Working protected hosted-data integration | No unauthorized writes, stable history, no exposed credentials |
| **5 — Deploy & verify** | GitHub/Vercel setup, env vars, production test | Live shareable URL + documented checks | Tested production create/open/regenerate/PDF and surviving redeploy |

**Phase numbers are a planning sequence**, not permission to start them all in one coding prompt. Phase 0 is audit-first. Changes in implementation sequencing require a written reason; no unilateral change to locked product requirements.

## 9. Non-negotiable acceptance checklist

- [ ] Actual local source tree and original workbook reconciled before migration; no wrong repository overwritten.
- [ ] All six metadata fields plus period (including fixed department) visible/correct; report creation validates inputs.
- [ ] Mid and End separately selectable and listed; creation order independent; older versions preserved.
- [ ] Exact 10 titles and original options/quality-rank mapping verified against baseline.
- [ ] For every saved version: positive-ranking invariant, nonnegative integer counts, consistent totals, derived percentages.
- [ ] “Regenerate” makes a new version; old PDF/download shows old counts; no rerolls on refresh or export.
- [ ] Brand legible and aligned at 320/375/768/1366/1920px; no layout overflow or broken A&R mark.
- [ ] PDF exports **exactly two A4 pages**; page 1 has 6 charts, page 2 has 4; header/metadata repeated.
- [ ] College name red; all subordinate body/header information readable black; authorized logo correctly placed.
- [ ] Chart labels/percentages fully visible, no overlapping callouts, four-option fallback works; vectors/text sharp.
- [ ] Only `Remark by HoD` is present; Subject Teacher remark absent.
- [ ] Generated-data origin truthfully recorded and visible, never represented as actual feedback collection.
- [ ] Archive/search/regenerate work after reload, restart and new deployment.
- [ ] No login screen; **no anonymous unrestricted database writes**; access approach approved and verified.
- [ ] Dedicated Hairaju Supabase project and Vercel deployment; unrelated projects untouched; billing approval when needed.
- [ ] Production website URL manually smoke-tested (incl. real PDF download) before marked complete.
- [ ] Command/test outputs, UI screenshots, PDF page renders, failures and commit hashes documented truthfully.

## 10. Status, open decisions and change log

### Locked user decisions

- OpenCode CLI (not Antigravity), no application admin-login page.
- Hairaju Gmail Supabase account; ChatGPT to handle setup/deployment via permitted connected tools, no unnecessary manual dashboard work.
- Original question set, Mid/End choices, automated internally generated figures, professional PDFs, 6+4 layout, HoD-only remarks.

### Open decisions — **do not pretend these are resolved**

1. **Protection without an app login** for a publicly reachable Vercel portal that can create and retrieve cloud records. Phase 4 release blocker; propose concrete low-friction options and get approval.
2. **Logo authority** — confirm old Bhujbal Knowledge City asset is the correct permitted institutional logo for final PDF.
3. **Exact acceptable Mid/End drift bound** — proposed 8 percentage points until user confirms/changes.
4. **Supabase organization/project provisioning** — Hairaju account known, organization and costs confirmed only during setup; create a *new* project, never reuse unrelated databases by assumption.
5. **GitHub destination repo** — not specified; discover/confirm before pushes or Vercel linking.
6. **Old report migration** — not requested; don't silently import V2 sample records.
7. **Final PDF typography/library** — choose based on sample rendering and measurable quality, not speculative claims.

### Change control

- Any new request receives dated entry in this file (old decision → new decision → justification → impacted phases/tests), with corresponding update to `AGENTS.md` if agent behavior changes.
- User's newest explicit requirement supersedes the previous version; OpenCode must identify mismatches rather than silently choose.
- Do not silently extend scope or add role management, fabricated approvals or fake data provenance.
- Keep this document and `AGENTS.md` self-contained in the repository root. Use them as the project source of truth even when the chat is lost.

## 11. Source inventory for Phase 0

**Files user may have locally:**

- `Feedback report SEAR.xlsx` — source reference, not necessarily copied into repo.
- `AR_Feedback_Portal_v2.zip` — original V2 distributable, may be extracted into working folder.
- `app.py`, `index.html`, `assets/college_logo.png`, `data/reports.db`, Windows/Linux launcher scripts.
- `AR_V3_MASTER_CONTEXT_LOCK.md` — separate planning checkpoint; **not required** in repo once this spec is present.

**Observed baseline (ChatGPT-side, not guaranteed in the user's local folder):** V2 uses Python `http.server`, ReportLab, SQLite, monolithic HTML+CSS+JS; the user supplied PDF and UI screenshots documenting poor label leader lines and broken top-left branding. Some mounted copies expose only part of the V2 tree; *verify the actual OpenCode workspace contents first*.

## 12. Developer handoff and release criteria

OpenCode must read `AGENTS.md` and this spec at the beginning of each phase. Phase 0 only audits; do not rewrite the app or deploy while conducting the audit. The local agent cannot assume it can directly use ChatGPT's Supabase/Vercel connectors. Use honest status reports and never mark a phase complete without executed checks.

**Release gate:** Product is ready for the coordinator only after (a) UI review, (b) visually inspected two-page PDF tests, (c) verified persistent saved versions, (d) protected production write access with no admin-login screen, and (e) live Vercel URL smoke-test.
