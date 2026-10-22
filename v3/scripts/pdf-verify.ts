import { readFileSync } from 'fs';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';
// Use dynamic import for pdfjs-dist to avoid issues with worker
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure pdfjs-dist to use a local worker
// On Windows, we need to use a file:// URL
const workerPath = join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath.replace(/\\/g, '/')}`;

interface PDFVerificationResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  pageDimensions: Array<{ width: number; height: number }>;
  textContent: string[];
  hasHoDRemark: boolean;
  hasSubjectTeacherRemark: boolean;
  hasCorrectPeriod: boolean;
  period: 'MID' | 'END' | 'UNKNOWN';
  allQuestionTitlesPresent: boolean;
  questionTitlesFound: string[];
  errors: string[];
}

const EXPECTED_QUESTIONS = [
  'Communication Skills',
  'Teaching Methodology',
  'Syllabus Completion',
  'Student Understanding',
  'Class Engagement',
  'Subject Knowledge',
  'ICT Tools Usage',
  'Student Interaction',
  'Question Bank Guidance',
  'Question Bank Coverage',
];

async function extractTextFromPDF(fileBuffer: Buffer): Promise<string[]> {
  const uint8Array = new Uint8Array(fileBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDoc = await loadingTask.promise;
  
  const textContent: string[] = [];
  
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContentItems = await page.getTextContent();
    const pageText = textContentItems.items
      .map((item: any) => item.str)
      .join(' ');
    textContent.push(pageText);
  }
  
  return textContent;
}

async function verifyPDF(filePath: string): Promise<PDFVerificationResult> {
  const fileName = filePath.split(/[\\/]/).pop() || 'unknown';
  const fileBuffer = readFileSync(filePath);
  const fileSize = fileBuffer.length;
  
  const result: PDFVerificationResult = {
    filePath,
    fileName,
    fileSize,
    pageCount: 0,
    pageDimensions: [],
    textContent: [],
    hasHoDRemark: false,
    hasSubjectTeacherRemark: false,
    hasCorrectPeriod: false,
    period: 'UNKNOWN',
    allQuestionTitlesPresent: false,
    questionTitlesFound: [],
    errors: [],
  };
  
  try {
    // Use pdf-lib for page count and dimensions
    const pdfDoc = await PDFDocument.load(fileBuffer);
    result.pageCount = pdfDoc.getPageCount();
    
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();
      result.pageDimensions.push({ width, height });
      
      // Verify A4 portrait dimensions (allow small tolerance)
      const isA4Portrait = Math.abs(width - 595.28) < 2 && Math.abs(height - 841.89) < 2;
      if (!isA4Portrait) {
        result.errors.push(`Page dimensions not A4 portrait: ${width.toFixed(2)} x ${height.toFixed(2)}`);
      }
    }
    
    // Use pdfjs-dist for text extraction
    result.textContent = await extractTextFromPDF(fileBuffer);
    const fullText = result.textContent.join('\n');
    
    // Check for HoD remark
    result.hasHoDRemark = fullText.includes('Remark HoD');
    
    // Check for Subject Teacher remark (should NOT be present)
    result.hasSubjectTeacherRemark = fullText.includes('Remark Subject Teacher');
    
    // Check for period
    if (fullText.includes('Mid Semester')) {
      result.period = 'MID';
      result.hasCorrectPeriod = true;
    } else if (fullText.includes('End Semester')) {
      result.period = 'END';
      result.hasCorrectPeriod = true;
    }
    
    // Check for question titles
    for (const title of EXPECTED_QUESTIONS) {
      if (fullText.includes(title)) {
        result.questionTitlesFound.push(title);
      }
    }
    result.allQuestionTitlesPresent = result.questionTitlesFound.length === EXPECTED_QUESTIONS.length;
    
    // Check for provenance statement
    if (!fullText.includes('system-generated') || !fullText.includes('no student survey')) {
      result.errors.push('Missing or incomplete data provenance statement');
    }
    
    // Check for college name
    if (!fullText.includes("MET's Institute of Technology")) {
      result.errors.push('Missing college name');
    }
    
    // Check for department
    if (!fullText.includes('Automation and Robotics')) {
      result.errors.push('Missing department');
    }
    
  } catch (error) {
    result.errors.push(`PDF parsing error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return result;
}

async function main() {
  console.log('=== Independent PDF Structure Verification (with pdfjs-dist) ===\n');
  
  const artifactsDir = join(process.cwd(), 'test-artifacts');
  const midPath = join(artifactsDir, 'phase-1-1-mid.pdf');
  const endPath = join(artifactsDir, 'phase-1-1-end.pdf');
  
  const results = await Promise.all([
    verifyPDF(midPath),
    verifyPDF(endPath),
  ]);
  
  for (const result of results) {
    console.log(`\n--- ${result.fileName} ---`);
    console.log(`File size: ${result.fileSize} bytes`);
    console.log(`Page count: ${result.pageCount} (expected: 2)`);
    console.log(`Page dimensions: ${result.pageDimensions.map(d => `${d.width.toFixed(2)} x ${d.height.toFixed(2)}`).join(', ')}`);
    console.log(`Period: ${result.period} (correct: ${result.hasCorrectPeriod})`);
    console.log(`Has HoD remark: ${result.hasHoDRemark}`);
    console.log(`Has Subject Teacher remark: ${result.hasSubjectTeacherRemark} (should be false)`);
    console.log(`All 10 question titles present: ${result.allQuestionTitlesPresent} (found ${result.questionTitlesFound.length}/10)`);
    console.log(`Question titles found: ${result.questionTitlesFound.join(', ')}`);
    
    if (result.errors.length > 0) {
      console.log('ERRORS:');
      for (const err of result.errors) {
        console.log(`  - ${err}`);
      }
    } else {
      console.log('No structural errors detected.');
    }
    
    // Print first 500 chars of page 1 text for debugging
    if (result.textContent[0]) {
      console.log(`\nPage 1 text preview: ${result.textContent[0].substring(0, 500)}...`);
    }
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  const allPassed = results.every(r => 
    r.pageCount === 2 && 
    r.hasCorrectPeriod && 
    r.hasHoDRemark && 
    !r.hasSubjectTeacherRemark && 
    r.allQuestionTitlesPresent && 
    r.errors.length === 0
  );
  console.log(`Overall: ${allPassed ? 'PASS' : 'FAIL'}`);
  
  process.exit(allPassed ? 0 : 1);
}

main();