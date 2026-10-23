/**
 * Phase 3.1 — Professional PDF Layout Engine with Arrow-Based Pie Callouts.
 *
 * Generates an immaculate two-page A4 portrait PDF for academic feedback reports
 * using Playwright/Chromium server-side rendering.
 *
 * Features:
 * - Direct leader-line elbow connectors with arrowheads pointing to each slice
 * - Semantic quality-based color mapping (best = blue, second = teal, third = amber, worst = red)
 * - Reverse quality ranking for Syllabus Completion (90-100% is best/blue; Below 60% is worst/red)
 * - 1D vertical spacing relaxation ensuring zero label overlaps and zero leader line crossings
 * - Multi-line wrapping for long option labels (e.g. "Yes, fully comprehensive")
 * - Single-slice 100% full circle rendering with direct callout
 * - Zero-count categories clearly displayed
 * - Repeated institutional header with embedded MET logo and bold institute red (#C00000)
 * - Repeated metadata table and truthful data origin footer
 * - Exactly 6 charts on Page 1 (Q01–Q06) and 4 charts on Page 2 (Q07–Q10)
 * - Remark by HoD: section on Page 2 with clean signature writing space
 *
 * Input: immutable ReportSnapshot (loaded from storage, never regenerated).
 * Output: Buffer containing the final PDF.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ReportSnapshot } from '@/lib/types/report';
import { getQualityColor, PALETTE_3, PALETTE_4 } from '@/lib/feedback/colors';
export { getQualityColor, PALETTE_3, PALETTE_4 };

// ---------------------------------------------------------------------------
// Asset loading
// ---------------------------------------------------------------------------

let cachedLogoBase64: string | null = null;

function getLogoBase64(): string {
  if (cachedLogoBase64 !== null) return cachedLogoBase64;
  const candidates = [
    join(process.cwd(), 'public', 'college_logo.png'),
    join(process.cwd(), '..', 'assets', 'college_logo.png'),
    join(process.cwd(), 'assets', 'college_logo.png'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      cachedLogoBase64 = readFileSync(p).toString('base64');
      return cachedLogoBase64;
    }
  }
  cachedLogoBase64 = '';
  return cachedLogoBase64;
}

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------

function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Text wrapping for callout labels
// ---------------------------------------------------------------------------

function wrapText(text: string, maxCharsPerLine: number = 15): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';

  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + ' ' + w).length <= maxCharsPerLine) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// Chart Data Types
// ---------------------------------------------------------------------------

export interface SliceData {
  label: string;
  count: number;
  pct: number;
  qualityRank: number;
  totalOptions: number;
  color: string;
}

export interface QuestionChartInput {
  number: number;
  title: string;
  slices: SliceData[];
  total: number;
}

// ---------------------------------------------------------------------------
// Arrow-Based SVG Pie Chart Renderer with 1D Spacing Solver
// ---------------------------------------------------------------------------

export function renderArrowPieChart(
  chart: QuestionChartInput,
  cardWidth: number = 340,
  cardHeight: number = 205
): string {
  const { number: qNum, title, slices, total } = chart;
  const cx = 170;
  const cy = 100;
  const r = 46;

  const activeSlices = slices.filter(s => s.count > 0);

  // Single 100% slice edge case
  if (activeSlices.length === 1) {
    const s = activeSlices[0];
    const lines = wrapText(s.label, 18);
    const arrowX = cx + r;
    const arrowY = cy;
    const labelX = cx + r + 30;
    const num = String(qNum).padStart(2, '0');
    return `<div class="chart-card">
      <div class="chart-title">${num}. ${esc(title)}</div>
      <div class="chart-body">
        <svg viewBox="0 0 ${cardWidth} ${cardHeight}" width="100%" class="chart-svg">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.color}" stroke="#fff" stroke-width="1.2"/>
          <line x1="${arrowX + 4}" y1="${arrowY}" x2="${labelX - 4}" y2="${arrowY}" stroke="${s.color}" stroke-width="1.2"/>
          <polygon points="${arrowX},${arrowY} ${arrowX + 6},${arrowY - 3} ${arrowX + 6},${arrowY + 3}" fill="${s.color}"/>
          <text x="${labelX}" y="${arrowY - 4}" text-anchor="start" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif">
            ${lines.map((l, li) => `<tspan x="${labelX}" dy="${li === 0 ? 0 : 10.5}" font-size="8" font-weight="600" fill="#1a1a1a">${esc(l)}</tspan>`).join('')}
            <tspan x="${labelX}" dy="11.5" font-size="8.5" font-weight="700" fill="${s.color}">${s.pct.toFixed(1)}% <tspan font-weight="400" fill="#666" font-size="7.5">(${s.count})</tspan></tspan>
          </text>
        </svg>
      </div>
      <div class="chart-foot">Total responses: ${total}</div>
    </div>`;
  }

  // Calculate slice geometry
  let curAngle = -90;
  const sliceGeom: Array<{
    slice: SliceData;
    start: number;
    span: number;
    mid: number;
    cosMid: number;
    sinMid: number;
    isRight: boolean;
    path: string;
  }> = [];

  for (const s of activeSlices) {
    const span = total > 0 ? (s.count / total) * 360 : 0;
    const mid = curAngle + span / 2;
    const normMid = ((mid % 360) + 360) % 360;
    const isRight = normMid < 90 || normMid > 270;

    const startRad = (curAngle * Math.PI) / 180;
    const endRad = ((curAngle + span) * Math.PI) / 180;
    const midRad = (mid * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = span > 180 ? 1 : 0;

    const path = `<path d="M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${s.color}" stroke="#fff" stroke-width="1.2"/>`;

    sliceGeom.push({
      slice: s,
      start: curAngle,
      span,
      mid,
      cosMid: Math.cos(midRad),
      sinMid: Math.sin(midRad),
      isRight,
      path,
    });

    curAngle += span;
  }

  interface CalloutItem {
    slice: SliceData;
    p0: { x: number; y: number };
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    p3: { x: number; y: number };
    labelX: number;
    labelY: number;
    lines: string[];
    blockHeight: number;
    isRight: boolean;
  }

  function layoutSide(items: typeof sliceGeom, isRight: boolean): CalloutItem[] {
    if (items.length === 0) return [];

    // Sort items vertically by slice edge y position
    items.sort((a, b) => (cy + r * a.sinMid) - (cy + r * b.sinMid));

    const callouts: CalloutItem[] = items.map(item => {
      const p0 = { x: cx + r * item.cosMid, y: cy + r * item.sinMid };
      const p1 = { x: cx + (r + 7) * item.cosMid, y: cy + (r + 7) * item.sinMid };
      const lines = wrapText(item.slice.label, 15);
      const blockHeight = lines.length * 10.5 + 11.5;

      return {
        slice: item.slice,
        p0,
        p1,
        p2: { x: 0, y: 0 },
        p3: { x: 0, y: 0 },
        labelX: isRight ? 240 : 100,
        labelY: p0.y - (blockHeight / 2) + 6,
        lines,
        blockHeight,
        isRight,
      };
    });

    // 1D spacing relaxation to prevent collisions
    const minY = 16;
    const maxY = cardHeight - 16;
    const minGap = 28;

    for (const c of callouts) {
      c.labelY = Math.max(minY, Math.min(maxY - c.blockHeight, c.labelY));
    }

    for (let iter = 0; iter < 12; iter++) {
      let moved = false;
      for (let i = 0; i < callouts.length - 1; i++) {
        const c1 = callouts[i];
        const c2 = callouts[i + 1];
        const reqGap = Math.max(minGap, c1.blockHeight + 3);
        if (c2.labelY - c1.labelY < reqGap) {
          const overlap = reqGap - (c2.labelY - c1.labelY);
          c1.labelY -= overlap / 2;
          c2.labelY += overlap / 2;
          moved = true;
        }
      }
      for (const c of callouts) {
        c.labelY = Math.max(minY, Math.min(maxY - c.blockHeight, c.labelY));
      }
      if (!moved) break;
    }

    // Enforce strict monotonicity (preserves planarity: connectors never cross)
    for (let i = 0; i < callouts.length - 1; i++) {
      const c1 = callouts[i];
      const c2 = callouts[i + 1];
      const reqGap = Math.max(minGap, c1.blockHeight + 3);
      if (c2.labelY < c1.labelY + reqGap) {
        c2.labelY = c1.labelY + reqGap;
      }
    }

    // Route elbow leader lines
    for (const c of callouts) {
      const attachY = c.labelY + 4;
      if (isRight) {
        const elbowX = Math.max(c.p1.x + 8, cx + r + 16);
        c.p2 = { x: elbowX, y: attachY };
        c.p3 = { x: c.labelX - 4, y: attachY };
      } else {
        const elbowX = Math.min(c.p1.x - 8, cx - r - 16);
        c.p2 = { x: elbowX, y: attachY };
        c.p3 = { x: c.labelX + 4, y: attachY };
      }
    }

    return callouts;
  }

  const rightCallouts = layoutSide(sliceGeom.filter(g => g.isRight), true);
  const leftCallouts = layoutSide(sliceGeom.filter(g => !g.isRight), false);
  const allCallouts = [...rightCallouts, ...leftCallouts];

  const svgPaths = sliceGeom.map(g => g.path).join('\n        ');
  let svgConnectors = '';
  let svgLabels = '';

  for (const c of allCallouts) {
    const rad = Math.atan2(c.p0.y - cy, c.p0.x - cx);
    const arrowLen = 5.0;
    const arrowWidth = 2.6;
    const udx = Math.cos(rad);
    const udy = Math.sin(rad);
    const perpX = -udy;
    const perpY = udx;

    const bx = c.p0.x + udx * arrowLen;
    const by = c.p0.y + udy * arrowLen;
    const a1x = bx + perpX * arrowWidth;
    const a1y = by + perpY * arrowWidth;
    const a2x = bx - perpX * arrowWidth;
    const a2y = by - perpY * arrowWidth;

    const arrowHead = `<polygon points="${c.p0.x.toFixed(1)},${c.p0.y.toFixed(1)} ${a1x.toFixed(1)},${a1y.toFixed(1)} ${a2x.toFixed(1)},${a2y.toFixed(1)}" fill="${c.slice.color}"/>`;
    const leaderLine = `<path d="M${bx.toFixed(1)} ${by.toFixed(1)} L${c.p1.x.toFixed(1)} ${c.p1.y.toFixed(1)} L${c.p2.x.toFixed(1)} ${c.p2.y.toFixed(1)} L${c.p3.x.toFixed(1)} ${c.p3.y.toFixed(1)}" fill="none" stroke="${c.slice.color}" stroke-width="1.1"/>`;

    svgConnectors += `${leaderLine}\n        ${arrowHead}\n        `;

    const anchor = c.isRight ? 'start' : 'end';
    const linesSvg = c.lines.map((line, li) => {
      const dy = li === 0 ? 0 : 10.5;
      return `<tspan x="${c.labelX}" dy="${dy}" font-size="8" font-weight="600" fill="#1a1a1a">${esc(line)}</tspan>`;
    }).join('');

    const pctSvg = `<tspan x="${c.labelX}" dy="11.5" font-size="8.5" font-weight="700" fill="${c.slice.color}">${c.slice.pct.toFixed(1)}% <tspan font-weight="400" fill="#666" font-size="7.5">(${c.slice.count})</tspan></tspan>`;

    svgLabels += `<text x="${c.labelX}" y="${c.labelY.toFixed(1)}" text-anchor="${anchor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif">
          ${linesSvg}
          ${pctSvg}
        </text>\n        `;
  }

  // Zero-count category footer note if any
  const zeroSlices = slices.filter(s => s.count === 0);
  let zeroText = '';
  if (zeroSlices.length > 0) {
    const zeroStr = zeroSlices.map(s => `${esc(s.label)}: 0.0% (0)`).join(' | ');
    zeroText = `<text x="${cx}" y="${cardHeight - 6}" text-anchor="middle" font-size="7" fill="#888" font-family="-apple-system, sans-serif">${zeroStr}</text>`;
  }

  const num = String(qNum).padStart(2, '0');
  return `<div class="chart-card">
    <div class="chart-title">${num}. ${esc(title)}</div>
    <div class="chart-body">
      <svg viewBox="0 0 ${cardWidth} ${cardHeight}" width="100%" class="chart-svg" xmlns="http://www.w3.org/2000/svg">
        ${svgPaths}
        ${svgConnectors}
        ${svgLabels}
        ${zeroText}
      </svg>
    </div>
    <div class="chart-foot">Total responses: ${total}</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Recurring Page Header & Metadata
// ---------------------------------------------------------------------------

function renderPageHeader(report: ReportSnapshot, logoB64: string): string {
  const periodLabel = report.period === 'MID' ? 'Mid Semester' : 'End Semester';
  const logoSrc = logoB64 ? `data:image/png;base64,${logoB64}` : '';
  const logoImg = logoSrc
    ? `<img class="logo" src="${logoSrc}" alt="MET Bhujbal Knowledge City Logo"/>`
    : '';

  return `<div class="hdr">
    <div class="hdr-top">
      ${logoImg}
      <div class="inst">
        <div class="inst-name">MET's Institute of Technology (P) B. Tech.</div>
        <div class="inst-aff">Affiliated to Dr. Babasaheb Ambedkar Technological University, Lonere.</div>
      </div>
    </div>
    <div class="hdr-dept">Department of Automation and Robotics</div>
    <div class="hdr-period">${esc(periodLabel)} Feedback &mdash; A.Y. ${esc(report.academic.academicYear)}</div>
  </div>`;
}

function renderMetadata(report: ReportSnapshot): string {
  return `<table class="meta-tbl">
    <tr>
      <td class="meta-lbl">Subject Code</td>
      <td class="meta-val">${esc(report.academic.subjectCode)}</td>
      <td class="meta-lbl">Semester</td>
      <td class="meta-val">${esc(String(report.academic.semester))}</td>
    </tr>
    <tr>
      <td class="meta-lbl">Subject Name</td>
      <td class="meta-val">${esc(report.academic.subjectName)}</td>
      <td class="meta-lbl">Faculty / Staff</td>
      <td class="meta-val">${esc(report.academic.facultyName)}</td>
    </tr>
  </table>`;
}

function renderFooter(report: ReportSnapshot, pageNum: number): string {
  return `<div class="ftr">
    <span>Internal report &nbsp;|&nbsp; ${esc(report.dataOrigin)}</span>
    <span>Page ${pageNum} of 2</span>
  </div>`;
}

// ---------------------------------------------------------------------------
// Full Document HTML
// ---------------------------------------------------------------------------

export function renderPDFDocument(report: ReportSnapshot): string {
  const logoB64 = getLogoBase64();

  const charts: QuestionChartInput[] = report.questions.map((q, i) => {
    const slices: SliceData[] = q.options.map((opt, optIdx) => {
      const qualityRank = q.bestOrder.indexOf(optIdx);
      const color = getQualityColor(qualityRank, q.options.length);
      return {
        label: opt,
        count: q.counts[optIdx],
        pct: q.percentages[optIdx],
        qualityRank,
        totalOptions: q.options.length,
        color,
      };
    });
    return {
      number: i + 1,
      title: q.title,
      slices,
      total: report.respondentCount,
    };
  });

  const page1Charts = charts.slice(0, 6).map(c => renderArrowPieChart(c)).join('\n');
  const page2Charts = charts.slice(6, 10).map(c => renderArrowPieChart(c)).join('\n');

  const header1 = renderPageHeader(report, logoB64);
  const header2 = renderPageHeader(report, logoB64);
  const meta1 = renderMetadata(report);
  const meta2 = renderMetadata(report);
  const footer1 = renderFooter(report, 1);
  const footer2 = renderFooter(report, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>A&R Feedback Report</title>
<style>
@page {
  size: A4 portrait;
  margin: 0;
}
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 210mm;
  height: 297mm;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 9pt;
  color: #1a1a1a;
  background: #ffffff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.page {
  width: 210mm;
  height: 297mm;
  max-height: 297mm;
  overflow: hidden;
  position: relative;
  padding: 8mm 10mm 12mm;
  page-break-after: always;
  page-break-inside: avoid;
  display: flex;
  flex-direction: column;
}
.page:last-child {
  page-break-after: auto;
}

/* ---- HEADER ---- */
.hdr {
  margin-bottom: 2mm;
  padding-bottom: 2mm;
  border-bottom: 2pt solid #1a1a1a;
  flex-shrink: 0;
}
.hdr-top {
  display: flex;
  align-items: center;
  gap: 4mm;
  margin-bottom: 1mm;
}
.logo {
  height: 14mm;
  width: auto;
  max-width: 38mm;
  object-fit: contain;
}
.inst {
  flex: 1;
  text-align: center;
}
.inst-name {
  font-size: 13pt;
  font-weight: 800;
  color: #C00000;
  line-height: 1.2;
  letter-spacing: -0.2px;
}
.inst-aff {
  font-size: 7.8pt;
  color: #1a1a1a;
  margin-top: 0.5mm;
}
.hdr-dept {
  text-align: center;
  font-size: 10.5pt;
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 0.8mm;
}
.hdr-period {
  text-align: center;
  font-size: 9pt;
  font-weight: 600;
  color: #333333;
  margin-top: 0.5mm;
}

/* ---- METADATA TABLE ---- */
.meta-tbl {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5mm 0 2.5mm;
  font-size: 8.5pt;
  flex-shrink: 0;
}
.meta-tbl td {
  padding: 1.2mm 2mm;
  vertical-align: top;
}
.meta-lbl {
  font-weight: 700;
  color: #555555;
  width: 17%;
  white-space: nowrap;
}
.meta-val {
  color: #1a1a1a;
  width: 33%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* ---- CHARTS GRID ---- */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.8mm;
  flex: 1;
  min-height: 0;
}
.chart-card {
  border: 0.8pt solid #d1d5db;
  border-radius: 2mm;
  padding: 2mm 2.5mm 1.5mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #ffffff;
  min-height: 0;
  overflow: hidden;
}
.chart-title {
  font-size: 8.5pt;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.25;
  margin-bottom: 1mm;
}
.chart-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chart-svg {
  width: 100%;
  height: auto;
  display: block;
}
.chart-foot {
  font-size: 6.5pt;
  color: #777777;
  text-align: center;
  margin-top: 1mm;
  padding-top: 0.8mm;
  border-top: 0.4pt solid #f0f0f0;
}

/* ---- REMARKS (page 2 only) ---- */
.remarks-box {
  margin-top: 2.5mm;
  border: 0.8pt solid #d1d5db;
  border-radius: 2mm;
  padding: 3mm 4mm;
  flex-shrink: 0;
}
.remarks-title {
  font-size: 9pt;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 2mm;
}
.remarks-line {
  font-size: 8.5pt;
  color: #1a1a1a;
  padding-bottom: 8mm;
  border-bottom: 0.5pt dashed #bbb;
  margin-bottom: 2mm;
}
.remarks-space {
  height: 14mm;
}

/* ---- FOOTER ---- */
.ftr {
  position: absolute;
  bottom: 4mm;
  left: 10mm;
  right: 10mm;
  display: flex;
  justify-content: space-between;
  font-size: 6.5pt;
  color: #777777;
  border-top: 0.5pt solid #dddddd;
  padding-top: 1.5mm;
}
</style>
</head>
<body>

<!-- ===== PAGE 1 ===== -->
<div class="page">
  ${header1}
  ${meta1}
  <div class="charts-grid">
    ${page1Charts}
  </div>
  ${footer1}
</div>

<!-- ===== PAGE 2 ===== -->
<div class="page page-break">
  ${header2}
  ${meta2}
  <div class="charts-grid">
    ${page2Charts}
  </div>
  <div class="remarks-box">
    <div class="remarks-title">REMARKS</div>
    <div class="remarks-line" data-remark="Remark HoD:">Remark by HoD:</div>
    <div class="remarks-space"></div>
  </div>
  ${footer2}
</div>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// PDF generation via Playwright
// ---------------------------------------------------------------------------

export async function generatePDF(report: ReportSnapshot): Promise<Buffer> {
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    const html = renderPDFDocument(report);

    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(200);

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// Backward compatibility alias
export { renderPDFDocument as renderTemplate };