import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { generateFirstReport } from '../src/lib/feedback/generator';
import { generatePDF, renderPDFDocument } from '../src/lib/pdf/generator';

const workerPath = join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath.replace(/\\/g, '/')}`;

async function run() {
  console.log('=== GENERATING FRESH PDF WITH PHASE 3.2 ENGINE ===');
  const snap = generateFirstReport({
    academic: {
      academicYear: '2022-23',
      semester: 3,
      department: 'Automation and Robotics',
      subjectName: 'Engineering Mathematics-III',
      subjectCode: 'AR2301',
      facultyName: 'Prof. S. S. Borse'
    },
    period: 'MID'
  }).snapshot;

  const pdfBuffer = await generatePDF(snap);
  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;

  console.log(`Document pages: ${doc.numPages}`);

  for (let pn = 1; pn <= doc.numPages; pn++) {
    const page = await doc.getPage(pn);
    const content = await page.getTextContent();
    const items = content.items as Array<any>;
    console.log(`\nPage ${pn}: total text items = ${items.length}`);
    
    for (const it of items) {
      const str = (it.str || '').trim();
      const fontSize = it.transform ? Math.round(it.transform[0] * 100) / 100 : 0;
      if (!str) continue;
      
      // Question title
      if (/^\d{2}\.\s/.test(str)) {
        console.log(`  [Heading] "${str}": font-size = ${fontSize} pt`);
      }
      // Options
      else if (['Excellent', 'Good', 'Average', '90% - 100%', 'Yes, fully comprehensive', 'Somewhat effectively'].includes(str)) {
        console.log(`  [Category] "${str}": font-size = ${fontSize} pt`);
      }
      // Percentages
      else if (/^\d+\.\d+%$/.test(str)) {
        console.log(`  [Percentage] "${str}": font-size = ${fontSize} pt`);
      }
      // Counts
      else if (/^\(\d+\)$/.test(str)) {
        console.log(`  [Count] "${str}": font-size = ${fontSize} pt`);
      }
      // Total responses
      else if (str.includes('Total responses')) {
        console.log(`  [Total Responses] "${str}": font-size = ${fontSize} pt`);
      }
      // Metadata
      else if (['Subject Code', 'Engineering Mathematics-III', 'Department of Automation and Robotics'].includes(str)) {
        console.log(`  [Meta/Header] "${str}": font-size = ${fontSize} pt`);
      }
      // Remarks
      else if (str.includes('Remark')) {
        console.log(`  [Remark] "${str}": font-size = ${fontSize} pt`);
      }
      // Footer
      else if (str.includes('Internal report')) {
        console.log(`  [Footer] "${str}": font-size = ${fontSize} pt`);
      }
    }
  }

  console.log('\n=== MEASURING PLAYWRIGHT DOM BOUNDS ===');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  
  const html = renderPDFDocument(snap);
  await page.setContent(html);

  const m = await page.evaluate(() => {
    const p1 = document.querySelectorAll('.page')[0];
    const p2 = document.querySelectorAll('.page')[1];
    const grid1 = p1.querySelector('.charts-grid')!;
    const card1 = grid1.querySelector('.chart-card')!;
    const svg1 = card1.querySelector('.chart-svg')!;
    const body1 = card1.querySelector('.chart-body')!;
    const title1 = card1.querySelector('.chart-title')!;
    const foot1 = card1.querySelector('.chart-foot')!;

    return {
      page1H: Math.round(p1.getBoundingClientRect().height),
      page1W: Math.round(p1.getBoundingClientRect().width),
      grid1H: Math.round(grid1.getBoundingClientRect().height),
      card1H: Math.round(card1.getBoundingClientRect().height),
      card1W: Math.round(card1.getBoundingClientRect().width),
      title1H: Math.round(title1.getBoundingClientRect().height),
      body1H: Math.round(body1.getBoundingClientRect().height),
      svg1H: Math.round(svg1.getBoundingClientRect().height),
      foot1H: Math.round(foot1.getBoundingClientRect().height),
      grid2H: Math.round(p2.querySelector('.charts-grid')!.getBoundingClientRect().height),
      remarksH: Math.round(p2.querySelector('.remarks-box')!.getBoundingClientRect().height),
    };
  });

  console.log('DOM Measurements:', JSON.stringify(m, null, 2));
  await browser.close();
}

run().catch(console.error);
