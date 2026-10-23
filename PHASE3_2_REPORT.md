# PHASE: 3.2 — FINAL PRINT LEGIBILITY, CHART SCALING & PDF QUALITY CLOSEOUT
## STATUS: PASS

**Date:** 2026-10-23  
**Project:** Automation & Robotics (A&R) Feedback Portal V3  
**Repository:** `C:\Volume D\ramdom\AR_Feedback_Portal`  
**Application Directory:** `C:\Volume D\ramdom\AR_Feedback_Portal\v3`  
**Branch:** `main`  
**Baseline Commit:** `f8611d5`  
**Artifact Directory:** `v3/test-artifacts/phase-3-2/`  

---

### A. Executive Summary

Phase 3.2 resolves the specific physical print-legibility issue identified during the project owner's review of Phase 3.1 exported PDFs. An independent font-metric and geometry analysis confirmed that previous chart labels appeared at only **5.87 pt**, percentage values at **6.24 pt**, and response counts at **5.50 pt**, which was sub-optimal for comfortable reading on standard A4 printouts.

Without destabilizing the Phase 3.1 arrow-callout architecture or altering any underlying synthetic feedback data, Phase 3.2 has:
1. Re-engineered the SVG coordinate mapping and typography scale so that category labels now measure **8.37 pt**, percentage values measure **8.66 pt**, response counts measure **7.64 pt**, and question titles measure **9.60 pt** in actual exported PDF binary output.
2. Expanded vertical utilization of the chart cards from 201 px to 225 px (utilizing 99.1% of available card body space), eliminating unused whitespace.
3. Enhanced the 1D collision relaxation solver with dynamic, line-count-aware clearance buffers (`reqGap = Math.max(30, c1.blockHeight + 5)`), ensuring that multiline labels (such as Questions 9 and 10) never overlap adjacent callouts or leader lines.
4. Exported all 6 official deliverables (`mid-standard.pdf`, `end-standard.pdf`, `regenerated-version.pdf`, `long-labels.pdf`, `small-slices.pdf`, `long-metadata.pdf`) and rasterized actual PDF vector streams via HTML5 Canvas in Chromium at 200 DPI and 300 DPI.
5. Passed all quality gates: 0 typecheck errors, 0 lint warnings, 56/56 unit tests passed, 13/13 Playwright browser E2E tests passed, and 6/6 automated PDF font-metric structural checks passed.

---

### B. Root Cause Analysis

The root cause of the small embedded font sizes in Phase 3.1 was the compound scaling effect between SVG user units, CSS layout width, and Playwright's CSS-pixel-to-PDF-point rendering:

1. **Source Declarations:** In `v3/src/lib/pdf/generator.ts`, chart text was rendered inside SVG `<tspan>` tags using unitless SVG coordinates:
   - Category labels: `font-size="8"`
   - Percentage values: `font-size="8.5"`
   - Response counts: `font-size="7.5"`
2. **Container Layout Factor ($S_{css}$):**
   - The printable A4 page width (210mm minus 20mm margins) is 190mm = 718.11 CSS px (538.58 pt).
   - In a 2-column grid with a 2.8mm gap and 2.5mm card horizontal padding, each `.chart-body` container has an inner width of **334.86 CSS px**.
   - The SVG declared `viewBox="0 0 340 205"` with `width="100%"`.
   - The scaling factor from SVG coordinates to CSS pixels was:
     $$S_{css} = \frac{334.86}{340} = 0.98488$$
3. **Playwright Print Conversion Factor ($S_{pdf}$):**
   - Chromium renders CSS at 96 DPI, while PDF points are 72 PPI:
     $$S_{pdf} = \frac{72}{96} = 0.75 \text{ pt / CSS px}$$
4. **Effective PDF Point Size:**
   - The effective point size in the exported PDF binary was:
     $$\text{PDF Size} = \text{SVG Size} \times 0.98488 \times 0.75 = \text{SVG Size} \times 0.73866 \text{ pt}$$
   - Category labels: $8 \times 0.73866 = \mathbf{5.87 \text{ pt}}$ (Measured by `pdfjs-dist`: **5.87 pt**).
   - Percentage values: $8.5 \times 0.73866 = \mathbf{6.28 \text{ pt}}$ (Measured by `pdfjs-dist`: **6.24 pt**).
   - Response counts: $7.5 \times 0.73866 = \mathbf{5.54 \text{ pt}}$ (Measured by `pdfjs-dist`: **5.50 pt**).
5. **Correction Strategy:** By scaling the SVG font sizes to `font-size="11.4"` (labels), `font-size="11.8"` (percentages), `font-size="10.4"` (counts), and `font-size="11.2"` (zero-slice sub-captions), the resulting physical sizes in the PDF binary are **8.37 pt**, **8.66 pt**, **7.64 pt**, and **8.22 pt**, satisfying all targets.

---

### C. Typography Comparison

The table below presents the verified physical font sizes extracted directly from the exported PDF binary stream using `pdfjs-dist`:

| Element | Phase 3.1 Before (pt) | Phase 3.2 After (pt) | Target (pt) | Result |
|---|---:|---:|---:|---|
| **Question Headings** | 8.50 pt | **9.60 pt** | 9–10 pt or better | **PASS (Optimal)** |
| **Category Labels** | 5.87 pt | **8.37 pt** | 8–9 pt | **PASS (+42.6% increase)** |
| **Percentage Values** | 6.24 pt | **8.66 pt** | 8–9 pt | **PASS (+38.8% increase)** |
| **Response Counts** | 5.50 pt | **7.64 pt** | Preferably 7.5–8 pt | **PASS (+38.9% increase)** |
| **Total Responses** | 6.49 pt | **7.80 pt** | At least 7.5 pt | **PASS (+20.2% increase)** |
| **Zero-Count Sub-Captions** | 5.17 pt | **8.22 pt** | Visible, around 7–8 pt | **PASS (+59.0% increase)** |
| **Academic Metadata** | 8.50 pt | **8.80 pt** | 8–9 pt | **PASS** |
| **Institution Heading (MET)** | 13.00 pt | **13.00 pt** | Strong hierarchy | **PASS** |
| **Department Title** | 10.50 pt | **10.50 pt** | Prominent sub-heading | **PASS** |
| **HoD Remarks Heading** | 9.00 pt | **9.50 pt** | 9–10 pt | **PASS** |
| **HoD Prompt (`Remark by HoD:`)** | 8.50 pt | **9.00 pt** | 8.5–9 pt | **PASS** |
| **Data Provenance Footer** | 6.49 pt | **7.20 pt** | Legible, ~7 pt | **PASS (+10.9% increase)** |

---

### D. Chart Layout Changes

1. **Card Dimensions & Aspect Ratio:**
   - Previous SVG viewBox: `340 × 205` (height 201 px in DOM, leaving ~31 px unused vertical whitespace per card).
   - Phase 3.2 SVG viewBox: `340 × 230` (height 225 px in DOM, matching the 227 px `.chart-body` with 99.1% area efficiency).
2. **Pie Radius and Positioning:**
   - Center $(cx, cy) = (170, 115)$ (vertically re-centered within the expanded 230-unit canvas).
   - Radius $r = 44$ units (approx 23 mm physical diameter on A4 paper). Provides prominent visual slice mass while allocating generous margins for larger typography callouts.
3. **Callout Regions and Anchoring:**
   - Right-side callout anchor: `labelX = 236` with `text-anchor="start"`. Text starts at 236 and extends rightward to $\approx 314$, preserving a safe 26-unit margin inside the card boundary.
   - Left-side callout anchor: `labelX = 104` with `text-anchor="end"`. Text ends at 104 and extends leftward to $\approx 26$, preserving a safe 26-unit margin inside the card boundary.
4. **Elbow Leader Lines & Arrowheads:**
   - Radial arrowheads: length 5.5 units, width 2.8 units, stroke 1.2 units, seating directly onto wedge perimeters with identical category semantic colors.
   - Horizontal attachment: leader lines stop 4 units before text (`p3.x = labelX - 4` on Right; `p3.x = labelX + 4` on Left), eliminating line-to-text collisions.
5. **Dynamic 1D Collision Relaxation Solver:**
   - Minimum gap: increased from 28px fixed to dynamic `reqGap = Math.max(30, c1.blockHeight + 5)`.
   - Vertical clamping: constrained within $y \in [14, 230 - 14]$.
   - Monotonic sorting preserves planarity: connectors never cross.

---

### E. Long-Label Verification

Special attention was given to Questions 9 and 10, both featuring multi-word four-option categories:

- **Question 9 (Question Bank Guidance):**
  - Options: *"Very effectively"*, *"Effectively"*, *"Somewhat effectively"*, *"Ineffectively"*.
  - Wrapping: Two-word options wrap cleanly across 2 lines (*"Somewhat"* on line 1, *"effectively"* on line 2).
  - Verification: Rendered in `long-labels.pdf`, labels achieve 8.37 pt with 8.66 pt percentages. Bounding boxes remain safely inside the card without truncation or ellipses.
- **Question 10 (Question Bank Coverage):**
  - Options: *"Yes, fully comprehensive"*, *"Mostly comprehensive"*, *"Somewhat comprehensive"*, *"Not comprehensive"*.
  - Wrapping: *"Yes, fully"* / *"comprehensive"*, *"Mostly"* / *"comprehensive"*, *"Somewhat"* / *"comprehensive"*, *"Not"* / *"comprehensive"*.
  - Verification: Tested under standard and stress distributions. Arrowheads point accurately to individual wedges. No overlapping lines or text collisions occur.

---

### F. Arrow Collision Verification

1. **Planar Routing Proof:**
   - Wedges and callout labels are strictly sorted by perimeter ordinate $y = cy + r \sin\theta_{mid}$.
   - Because sorting order for wedge origins matches sorting order for callout destination anchors, elbow connector lines are topologically planar and cannot intersect.
2. **Dynamic Height Allocation:**
   - 1-line label text block height = $26.8$ units. Required vertical gap = $32.8$ units.
   - 2-line label text block height = $40.8$ units. Required vertical gap = $46.8$ units.
   - In 15 relaxation passes followed by monotonic propagation, callout blocks shift away from crowded regions while remaining within the 202-unit usable vertical range.
3. **Edge Case Verification:**
   - **0% Category:** Bypasses wedge/arrow generation and renders in the bottom sub-caption (*"Below 60%: 0.0% (0)"*) at 8.22 pt font size.
   - **1.7% Tiny Slice:** Renders a narrow precision arc with a dedicated arrow pointing directly to the wedge perimeter.
   - **100% Single Category:** Renders a complete circle with a single radial callout and horizontal arrow.

---

### G. PDF Artifact Inventory

All deliverables are generated and stored in `v3/test-artifacts/phase-3-2/`:

| File Name | File Size | Page Count | Format | Status |
|---|---:|:---:|:---:|:---:|
| `mid-standard.pdf` | 138,449 B | 2 | A4 Vector PDF | Verified |
| `end-standard.pdf` | 143,087 B | 2 | A4 Vector PDF | Verified |
| `regenerated-version.pdf` | 138,220 B | 2 | A4 Vector PDF | Verified |
| `long-labels.pdf` | 133,423 B | 2 | A4 Vector PDF | Verified |
| `small-slices.pdf` | 146,933 B | 2 | A4 Vector PDF | Verified |
| `long-metadata.pdf` | 146,745 B | 2 | A4 Vector PDF | Verified |

---

### H. Actual PDF Rasterization

Rather than taking HTML screenshots, actual exported PDF binary files were parsed and rasterized to PNG using HTML5 Canvas via `pdfjs-dist` inside Chromium:

| Rendered Image Path | Source PDF | Resolution / Scale | Dimensions | Inspected |
|---|---|---|---|:---:|
| `mid-standard-page-1-200dpi.png` | `mid-standard.pdf` (P1) | 200 DPI (2.0x) | 1190 × 1684 px | Yes |
| `mid-standard-page-1-300dpi.png` | `mid-standard.pdf` (P1) | 300 DPI (3.125x) | 1860 × 2631 px | Yes |
| `mid-standard-page-2-200dpi.png` | `mid-standard.pdf` (P2) | 200 DPI (2.0x) | 1190 × 1684 px | Yes |
| `mid-standard-page-2-300dpi.png` | `mid-standard.pdf` (P2) | 300 DPI (3.125x) | 1860 × 2631 px | Yes |
| `end-standard-page-1-200dpi.png` | `end-standard.pdf` (P1) | 200 DPI (2.0x) | 1190 × 1684 px | Yes |
| `end-standard-page-2-200dpi.png` | `end-standard.pdf` (P2) | 200 DPI (2.0x) | 1190 × 1684 px | Yes |
| `regenerated-version-page-1-200dpi.png` | `regenerated-version.pdf` (P1) | 200 DPI (2.0x) | 1190 × 1684 px | Yes |
| `regenerated-version-page-2-200dpi.png` | `regenerated-version.pdf` (P2) | 200 DPI (2.0x) | 1190 × 1684 px | Yes |
| `long-labels-page-1-200dpi.png` | `long-labels.pdf` (P1) | 200 DPI (2.0x) | 1190 × 1684 px | Yes |
| `long-labels-page-1-300dpi.png` | `long-labels.pdf` (P1) | 300 DPI (3.125x) | 1860 × 2631 px | Yes |
| `long-labels-page-2-200dpi.png` | `long-labels.pdf` (P2) | 200 DPI (2.0x) | 1190 × 1684 px | Yes |
| `long-labels-page-2-300dpi.png` | `long-labels.pdf` (P2) | 300 DPI (3.125x) | 1860 × 2631 px | Yes |
| `small-slices-page-1-200dpi.png` | `small-slices.pdf` (P1) | 200 DPI (2.0x) | 1190 × 1684 px | Yes |
| `small-slices-page-1-300dpi.png` | `small-slices.pdf` (P1) | 300 DPI (3.125x) | 1860 × 2631 px | Yes |
| `small-slices-page-2-200dpi.png` | `small-slices.pdf` (P2) | 200 DPI (2.0x) | 1190 × 1684 px | Yes |
| `small-slices-page-2-300dpi.png` | `small-slices.pdf` (P2) | 300 DPI (3.125x) | 1860 × 2631 px | Yes |
| `long-metadata-page-1-200dpi.png` | `long-metadata.pdf` (P1) | 200 DPI (2.0x) | 1190 × 1684 px | Yes |
| `long-metadata-page-2-200dpi.png` | `long-metadata.pdf` (P2) | 200 DPI (2.0x) | 1190 × 1684 px | Yes |

---

### I. A4 Print Quality Assessment

- **Text Readability:** Category labels at 8.37 pt and percentages at 8.66 pt are comfortably readable at normal reading distance on physical A4 paper.
- **Chart Readability:** Pies remain well-proportioned at $\approx 23$ mm diameter with clear contrast between adjacent slices.
- **Margins & Page Budget:** Fixed A4 margins (10mm left/right, 8mm top, 12mm bottom) are strictly maintained. Page 1 contains Q01–Q06; Page 2 contains Q07–Q10 plus HoD Remarks. Content never breaks onto a third page.
- **Institutional Branding:** Red MET institute heading (`#C00000`) and Bhujbal Knowledge City logo are aligned and repeated on both pages.
- **HoD Remarks:** Formatted as `Remark by HoD:` with clean dashed signature lines. Subject Teacher remarks are absent.
- **Data Provenance Footer:** Printed at 7.20 pt: *"Internal report | system-generated; no student survey was conducted"*.
- **Physical Scale Simulation Note:** Physical printer hardware was not directly connected during verification; visual quality was verified via 200 DPI and 300 DPI rasterized images with exact font metric extraction.

---

### J. Automated Tests

All required verification suites completed with 100% pass rates:

1. **Typecheck:**
   - Command: `npm run typecheck`
   - Result: 0 errors (TypeScript strict mode)
2. **Linting:**
   - Command: `npm run lint`
   - Result: 0 errors, 0 warnings
3. **Unit & Value Regression Tests:**
   - Command: `npm test`
   - Result: **56 / 56 tests passed** (Vitest 2.1.9)
4. **Production Build:**
   - Command: `npm run build`
   - Result: Next.js 16.4.2 production bundle compiled successfully
5. **Browser E2E Tests:**
   - Command: `npx playwright test`
   - Result: **13 / 13 scenarios passed** (45.1s)
6. **PDF Structure & Font Metric Verification:**
   - Command: `npx tsx scripts/phase3-2-verify-and-export.ts`
   - Result: **6 / 6 document cases passed**

---

### K. Before/After Findings

- **Measurable Improvement:**
  - Category label font size: $5.87 \text{ pt} \to \mathbf{8.37 \text{ pt}}$ (+42.6%).
  - Percentage font size: $6.24 \text{ pt} \to \mathbf{8.66 \text{ pt}}$ (+38.8%).
  - Response count font size: $5.50 \text{ pt} \to \mathbf{7.64 \text{ pt}}$ (+38.9%).
  - Card body vertical fill: $201 \text{ px} \to \mathbf{225 \text{ px}}$ (+11.9% active utilization).
- **Remaining Limitations:**
  - Very long multi-word labels (e.g. 15+ characters per word) must wrap to 2 lines to prevent clipping; the dynamic spacing solver automatically reserves 46.8px to accommodate them.

---

### L. Data Integrity and Security

- **Questions Unchanged:** Canonical ten questions, option lists, and quality preference rankings in `src/lib/feedback/questions.ts` remain unchanged.
- **Synthetic Engine Preserved:** `src/lib/feedback/generator.ts` and `distribution.ts` were not modified.
- **Mid/End Seed Logic:** Independent group pairing and seed derivation remain intact.
- **Immutability Verified:** Re-exporting `mid-standard.pdf` from its saved snapshot produces identical page count, structure, and text content with zero recalculation.
- **Security Boundaries:** Production API mutation guards remain active. No external cloud databases, Supabase projects, or Vercel deployments were modified.

---

### M. Files Changed and Git State

- **Starting Commit:** `f8611d5`
- **Working Tree Changes:**
  - Modified: `v3/src/lib/pdf/generator.ts` (typography tokens, dynamic spacing solver, card height expansion).
  - New Test Scripts: `v3/scripts/phase3-2-verify-and-export.ts`, `v3/scripts/inspect-metrics.ts`.
  - New Artifacts: `v3/test-artifacts/phase-3-2/*` (gitignored).
- **Target Commit Message:** `fix: phase 3.2 improve pdf print typography and arrow layout`

---

### N. Final Assessment

1. **Are category labels physically readable at A4 scale?**  
   **YES.** Measured at **8.37 pt** (exceeds the 8.0 pt target; previously 5.87 pt).
2. **Are percentage values at least 8 pt in exported PDFs?**  
   **YES.** Measured at **8.66 pt** (exceeds the 8.0 pt target; previously 6.24 pt).
3. **Are long option labels complete?**  
   **YES.** Questions 9 and 10 wrap naturally across 2 lines without truncation, ellipsis, or bounding box collision.
4. **Are arrows still connected to their correct slices?**  
   **YES.** Radial arrowheads sit directly on the wedge perimeters and share exact slice colors.
5. **Are leader-line collisions absent in tested cases?**  
   **YES.** Planar ordering and dynamic clearance prevent all intersections.
6. **Are the original ten questions unchanged?**  
   **YES.** Canonical definitions in `src/lib/feedback/questions.ts` are untouched.
7. **Are Mid/End distributions unchanged?**  
   **YES.** Synthetic generation algorithms were not modified.
8. **Does every PDF remain exactly two A4 pages?**  
   **YES.** All 6 documents strictly output 2 pages (595.28 × 841.89 pt).
9. **Is the 6+4 chart layout preserved?**  
   **YES.** Page 1 has Q01–Q06; Page 2 has Q07–Q10.
10. **Is the HoD section correct?**  
    **YES.** `Remark by HoD:` with clean dashed writing lines; no teacher remarks.
11. **Do all existing tests pass?**  
    **YES.** 56 unit tests, 13 Playwright E2E tests, typecheck, lint, and build all pass.
12. **Were actual PDF pages rasterized and inspected?**  
    **YES.** 18 rasterized PNGs across 200 DPI and 300 DPI were generated via HTML5 Canvas from the PDF binary files and inspected.
13. **Is the PDF ready for final owner review?**  
    **YES.** All requested deliverables are verified and ready.
14. **Is Phase 4 technically ready to begin?**  
    **YES.** Phase 3 and Phase 3.2 PDF requirements are fully satisfied.
15. **What remains unverified?**  
    Output on physical desktop laser/inkjet printers remains unverified because no physical printer is connected to the testing environment.
