/**
 * Phase 3 PDF test script — generates sample PDFs, verifies structure,
 * and saves artifacts for visual inspection.
 *
 * Usage: npx tsx scripts/pdf-phase3-verify.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { generatePDF, renderPDFDocument } from '../src/lib/pdf/generator';
import { QUESTIONS } from '../src/lib/feedback/questions';
import type { ReportSnapshot, QuestionSnapshot } from '../src/lib/types/report';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const workerPath = join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath.replace(/\\/g, '/')}`;

const OUT_DIR = join(__dirname, '..', 'test-artifacts', 'phase-3');

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function buildQuestionSnapshot(
  qIndex: number,
  counts: number[],
  total: number
): QuestionSnapshot {
  const q = QUESTIONS[qIndex];
  const percentages = counts.map((c) =>
    Math.round((c / total) * 1000) / 10
  );
  const pSum = percentages.reduce((a, b) => a + b, 0);
  if (Math.abs(pSum - 100) > 0.1) {
    const diff = 100 - pSum;
    const maxIdx = counts.indexOf(Math.max(...counts));
    percentages[maxIdx] = Math.round((percentages[maxIdx] + diff) * 10) / 10;
  }
  return {
    questionId: q.id,
    title: q.title,
    options: q.options,
    bestOrder: q.bestOrder,
    counts,
    percentages,
  };
}

function buildSnapshot(overrides: Partial<ReportSnapshot> & { questions: QuestionSnapshot[] }): ReportSnapshot {
  return {
    id: 'test-' + Math.random().toString(36).slice(2, 8),
    groupId: 'grp_test',
    version: 1,
    period: 'MID',
    algorithmVersion: 'gen-v1.0',
    seed: 'test-seed',
    generatedAt: new Date().toISOString(),
    respondentCount: 60,
    academic: {
      academicYear: '2022-23',
      semester: 3,
      department: 'Automation and Robotics',
      subjectCode: 'AR2301',
      subjectName: 'Engineering Mathematics-III',
      facultyName: 'Prof. S. S. Borse',
    },
    dataOrigin: 'system-generated; no student survey was conducted',
    ...overrides,
  };
}

function standardCounts3(total: number): number[] {
  const best = Math.round(total * 0.6);
  const mid = Math.round(total * 0.3);
  const worst = total - best - mid;
  return [best, mid, worst];
}

function standardCounts4(total: number): number[] {
  const a = Math.round(total * 0.5);
  const b = Math.round(total * 0.28);
  const c = Math.round(total * 0.15);
  const d = total - a - b - c;
  return [a, b, c, d];
}

function syllabusCounts(total: number): number[] {
  const worst = Math.round(total * 0.05);
  const low = Math.round(total * 0.12);
  const mid = Math.round(total * 0.25);
  const best = total - worst - low - mid;
  return [worst, low, mid, best];
}

function buildStandardSnapshot(period: 'MID' | 'END', total: number): ReportSnapshot {
  const questions: QuestionSnapshot[] = [];
  for (let i = 0; i < 10; i++) {
    const q = QUESTIONS[i];
    let counts: number[];
    if (q.id === 'syllabus_completion') {
      counts = syllabusCounts(total);
    } else if (q.options.length === 3) {
      counts = standardCounts3(total);
    } else {
      counts = standardCounts4(total);
    }
    questions.push(buildQuestionSnapshot(i, counts, total));
  }
  return buildSnapshot({ period, respondentCount: total, questions });
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

interface TestCase {
  name: string;
  dir: string;
  snapshot: ReportSnapshot;
}

function getTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  cases.push({
    name: 'CASE 01 — MID Semester Standard',
    dir: 'standard-mid',
    snapshot: buildStandardSnapshot('MID', 60),
  });

  cases.push({
    name: 'CASE 02 — END Semester Standard',
    dir: 'standard-end',
    snapshot: buildStandardSnapshot('END', 65),
  });

  {
    const snap = buildStandardSnapshot('MID', 55);
    snap.academic.subjectName =
      'Advanced Manufacturing Processes and Industrial Automation Laboratory-II';
    snap.academic.facultyName =
      'Dr. Prof. R. S. Krishnamurthy (Ph.D., M.Tech., B.E.)';
    snap.academic.subjectCode = 'AR2301-LAB-II-ADV';
    cases.push({
      name: 'CASE 03 — Long Academic Metadata',
      dir: 'long-metadata',
      snapshot: snap,
    });
  }

  cases.push({
    name: 'CASE 04 — Long Four-Option Labels',
    dir: 'long-labels',
    snapshot: buildStandardSnapshot('MID', 70),
  });

  {
    const total = 60;
    const questions: QuestionSnapshot[] = [];
    for (let i = 0; i < 10; i++) {
      const q = QUESTIONS[i];
      let counts: number[];
      if (q.options.length === 3) {
        counts = [57, 2, 1];
      } else if (q.id === 'syllabus_completion') {
        counts = [1, 2, 5, 52];
      } else {
        counts = [50, 6, 3, 1];
      }
      questions.push(buildQuestionSnapshot(i, counts, total));
    }
    cases.push({
      name: 'CASE 05 — Small Categories',
      dir: 'small-slices',
      snapshot: buildSnapshot({ respondentCount: total, questions }),
    });
  }

  cases.push({
    name: 'CASE 06 — Syllabus Completion Focus',
    dir: 'syllabus-focus',
    snapshot: buildStandardSnapshot('MID', 58),
  });

  return cases;
}

// ---------------------------------------------------------------------------
// Structural verification using pdfjs-dist
// ---------------------------------------------------------------------------

async function verifyPDFStructure(
  pdfBuffer: Buffer,
  snapshot: ReportSnapshot,
  caseName: string
): Promise<{ passed: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const data = new Uint8Array(pdfBuffer);
    const doc = await pdfjsLib.getDocument({ data }).promise;

    if (doc.numPages !== 2) {
      errors.push(`Expected 2 pages, got ${doc.numPages}`);
    }

    for (let pn = 1; pn <= Math.min(doc.numPages, 2); pn++) {
      const page = await doc.getPage(pn);
      const viewport = page.getViewport({ scale: 1 });

      const widthOk = Math.abs(viewport.width - 595.28) < 3;
      const heightOk = Math.abs(viewport.height - 841.89) < 3;
      if (!widthOk || !heightOk) {
        errors.push(
          `Page ${pn}: dimensions ${viewport.width.toFixed(1)}×${viewport.height.toFixed(1)}pt, expected ~595.3×841.9pt`
        );
      }

      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');

      if (!pageText.includes("MET") && !pageText.includes("Institute")) {
        errors.push(`Page ${pn}: Missing college name`);
      }

      const periodLabel =
        snapshot.period === 'MID' ? 'Mid Semester' : 'End Semester';
      if (!pageText.includes(periodLabel) && !pageText.includes('Semester')) {
        errors.push(`Page ${pn}: Missing period label "${periodLabel}"`);
      }

      if (!pageText.includes(snapshot.academic.academicYear)) {
        errors.push(`Page ${pn}: Missing academic year`);
      }

      const expectedQuestions =
        pn === 1
          ? snapshot.questions.slice(0, 6)
          : snapshot.questions.slice(6, 10);

      for (const q of expectedQuestions) {
        if (!pageText.includes(q.title)) {
          errors.push(`Page ${pn}: Missing question title "${q.title}"`);
        }
      }

      if (pn === 2) {
        if (!pageText.includes('Remark') && !pageText.includes('HoD')) {
          errors.push('Page 2: Missing HoD remarks section');
        }
        if (
          pageText.includes('Subject Teacher') ||
          pageText.includes('Remark Subject Teacher')
        ) {
          errors.push('Page 2: Contains unauthorized Subject Teacher remarks');
        }
      }

      if (!pageText.includes('Internal') || !pageText.includes('report')) {
        errors.push(`Page ${pn}: Missing provenance footer`);
      }

      // Check answer option labels present on correct page
      for (const q of expectedQuestions) {
        for (const opt of q.options) {
          if (!pageText.includes(opt)) {
            errors.push(`Page ${pn}: Missing option label "${opt}" for "${q.title}"`);
          }
        }
      }
    }
  } catch (err) {
    errors.push(`PDF parsing error: ${String(err)}`);
  }

  return { passed: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Main execution
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Phase 3 PDF Verification ===\n');
  ensureDir(OUT_DIR);

  const cases = getTestCases();
  const results: Array<{
    name: string;
    dir: string;
    pdfSize: number;
    pages: number;
    verification: { passed: boolean; errors: string[] };
  }> = [];

  for (const tc of cases) {
    console.log(`\n--- ${tc.name} ---`);
    const caseDir = join(OUT_DIR, tc.dir);
    ensureDir(caseDir);

    console.log('  Generating PDF...');
    const pdfBuffer = await generatePDF(tc.snapshot);
    const pdfPath = join(caseDir, 'report.pdf');
    writeFileSync(pdfPath, pdfBuffer);
    console.log(`  PDF saved: ${pdfPath} (${pdfBuffer.length} bytes)`);

    // Save HTML for debugging
    const html = renderPDFDocument(tc.snapshot);
    writeFileSync(join(caseDir, 'template.html'), html);

    // Verify structure
    console.log('  Verifying PDF structure...');
    const verification = await verifyPDFStructure(pdfBuffer, tc.snapshot, tc.name);
    if (verification.passed) {
      console.log('  ✅ Structure verification PASSED');
    } else {
      console.log('  ❌ Structure verification FAILED:');
      verification.errors.forEach((e) => console.log(`     - ${e}`));
    }

    results.push({
      name: tc.name,
      dir: tc.dir,
      pdfSize: pdfBuffer.length,
      pages: 2,
      verification,
    });
  }

  // Write verification results
  const resultsPath = join(OUT_DIR, 'verification-results.json');
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);

  // Summary
  console.log('\n=== SUMMARY ===');
  let allPassed = true;
  for (const r of results) {
    const status = r.verification.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}  ${r.name} — ${r.pdfSize} bytes`);
    if (!r.verification.passed) allPassed = false;
  }

  if (!allPassed) {
    process.exit(1);
  }

  console.log('\n✅ All PDF verification cases passed.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
