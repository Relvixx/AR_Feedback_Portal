import { chromium } from 'playwright';
import { join } from 'path';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { generateFirstReport } from '../src/lib/feedback/generator';
import { renderTemplate } from '../src/lib/pdf/generator';

async function renderHTMLToImages(report: any, outputDir: string, prefix: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Generate HTML from template
  const html = renderTemplate(report);
  
  // Save HTML for debugging
  const htmlPath = join(outputDir, `${prefix}-template.html`);
  writeFileSync(htmlPath, html);
  
  // Set viewport for A4 at 200 DPI
  await page.setViewportSize({ width: 1654, height: 2339 });
  
  // Load the HTML content
  await page.setContent(html, { waitUntil: 'networkidle' });
  
  // Wait for fonts and images to load
  await page.waitForTimeout(2000);
  
  // Take screenshot of page 1 (first .page element)
  const page1 = page.locator('.page').first();
  await page1.screenshot({ path: join(outputDir, `${prefix}-page-1.png`) });
  
  // Take screenshot of page 2 (second .page element)
  const page2 = page.locator('.page').nth(1);
  await page2.screenshot({ path: join(outputDir, `${prefix}-page-2.png`) });
  
  // Also take full page screenshot
  await page.screenshot({ path: join(outputDir, `${prefix}-full.png`), fullPage: true });
  
  await browser.close();
  console.log(`Screenshots saved to ${outputDir}`);
}

async function main() {
  console.log('=== PDF Visual Rendering via HTML Template ===\n');
  
  const artifactsDir = join(process.cwd(), 'test-artifacts');
  const outputDir = join(artifactsDir, 'page-images');
  
  mkdirSync(outputDir, { recursive: true });
  
  const academic = {
    academicYear: '2022-23',
    semester: 3,
    department: 'Automation and Robotics',
    subjectName: 'Engineering Mathematics-III',
    subjectCode: 'AR2301',
    facultyName: 'Prof. S. S. Borse',
  };
  
  // Generate MID report
  console.log('Generating MID report...');
  const midResult = generateFirstReport({ academic, period: 'MID' });
  const midSnapshot = midResult.snapshot;
  
  console.log('Rendering MID report pages...');
  await renderHTMLToImages(midSnapshot, outputDir, 'phase-1-1-mid');
  
  // Generate END report
  console.log('\nGenerating END report...');
  const endResult = generateFirstReport({ academic, period: 'END' });
  const endSnapshot = endResult.snapshot;
  
  console.log('Rendering END report pages...');
  await renderHTMLToImages(endSnapshot, outputDir, 'phase-1-1-end');
  
  console.log('\nDone! Check the page-images directory for screenshots.');
}

main();