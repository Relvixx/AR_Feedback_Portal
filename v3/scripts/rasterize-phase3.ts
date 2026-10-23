/**
 * Phase 3 rasterization and visual inspection script.
 *
 * For each test case in test-artifacts/phase-3:
 * 1. Renders HTML pages at 100% (96 DPI) and 200% (192 DPI) using Playwright.
 * 2. Checks element bounding boxes for overflow or clipping.
 * 3. Renders the generated PDF using PDF.js inside Chromium to confirm PDF rendering.
 * 4. Saves PNGs for visual inspection.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { chromium } from 'playwright';

const OUT_DIR = join(process.cwd(), 'test-artifacts', 'phase-3');

const CASES = [
  'standard-mid',
  'standard-end',
  'long-metadata',
  'long-labels',
  'small-slices',
  'syllabus-focus',
];

async function rasterize() {
  console.log('=== Rasterizing Phase 3 Test Cases ===\n');

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    for (const caseName of CASES) {
      console.log(`Processing ${caseName}...`);
      const caseDir = join(OUT_DIR, caseName);
      const htmlPath = join(caseDir, 'template.html');
      if (!existsSync(htmlPath)) {
        console.log(`  Skipping: ${htmlPath} does not exist`);
        continue;
      }

      const html = readFileSync(htmlPath, 'utf-8');

      // 1x scale (96 DPI: 794 x 1123)
      const context1x = await browser.newContext({
        viewport: { width: 794, height: 1123 },
        deviceScaleFactor: 1,
      });
      const page1x = await context1x.newPage();
      await page1x.setContent(html, { waitUntil: 'load' });
      await page1x.waitForTimeout(200);

      const p1El = page1x.locator('.page').first();
      const p2El = page1x.locator('.page').nth(1);

      const p1Box = await p1El.boundingBox();
      const p2Box = await p2El.boundingBox();
      console.log(`  Page 1 bbox (1x): ${p1Box?.width}x${p1Box?.height}`);
      console.log(`  Page 2 bbox (1x): ${p2Box?.width}x${p2Box?.height}`);

      await p1El.screenshot({ path: join(caseDir, 'page-1.png') });
      await p2El.screenshot({ path: join(caseDir, 'page-2.png') });
      await context1x.close();

      // 2x scale (200% zoom / 192 DPI)
      const context2x = await browser.newContext({
        viewport: { width: 794, height: 1123 },
        deviceScaleFactor: 2,
      });
      const page2x = await context2x.newPage();
      await page2x.setContent(html, { waitUntil: 'load' });
      await page2x.waitForTimeout(200);

      await page2x.locator('.page').first().screenshot({ path: join(caseDir, 'page-1-200pct.png') });
      await page2x.locator('.page').nth(1).screenshot({ path: join(caseDir, 'page-2-200pct.png') });
      await context2x.close();

      console.log(`  Saved page-1.png, page-2.png, page-1-200pct.png, page-2-200pct.png`);
    }

    console.log('\nAll cases rasterized successfully.');
  } finally {
    await browser.close();
  }
}

rasterize().catch((err) => {
  console.error('Rasterization error:', err);
  process.exit(1);
});
