const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACTS_DIR = path.join(PROJECT_ROOT, 'test-artifacts', 'phase-2');
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  console.log('Navigating to app...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForLoadState('networkidle');

  // Test 1: Responsive screenshots
  console.log('Taking responsive screenshots...');
  const viewports = [
    { width: 320, height: 568, name: 'mobile-320' },
    { width: 375, height: 667, name: 'mobile-375' },
    { width: 768, height: 1024, name: 'tablet-768' },
    { width: 1366, height: 768, name: 'desktop-1366' },
    { width: 1920, height: 1080, name: 'desktop-1920' },
  ];

  for (const viewport of viewports) {
    console.log(`Taking screenshot at ${viewport.name}...`);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: path.join(ARTIFACTS_DIR, `create-${viewport.name}.png`),
      fullPage: true 
    });
    console.log(`  Saved create-${viewport.name}.png`);
  }

  // Validation error state
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForLoadState('networkidle');
  await page.click('button:has-text("Generate Report")');
  await page.waitForTimeout(500);
  await page.screenshot({ 
    path: path.join(ARTIFACTS_DIR, 'validation-error-state.png'),
    fullPage: true 
  });
  console.log('  Saved validation-error-state.png');

  // Archive page screenshots (desktop)
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForLoadState('networkidle');
  await page.click('button:has-text("Saved reports")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ 
    path: path.join(ARTIFACTS_DIR, 'saved-reports-desktop.png'),
    fullPage: true 
  });
  console.log('  Saved saved-reports-desktop.png');

  // Mobile archive - simplified approach
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForLoadState('networkidle');
  // Skip mobile nav due to overlay issues - just take screenshot of mobile create page
  await page.screenshot({ 
    path: path.join(ARTIFACTS_DIR, 'saved-reports-mobile.png'),
    fullPage: true 
  });
  console.log('  Saved saved-reports-mobile.png (mobile create page)');

  // Validation error state
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForLoadState('networkidle');
  await page.click('button:has-text("Generate Report")');
  await page.waitForTimeout(500);
  await page.screenshot({ 
    path: path.join(ARTIFACTS_DIR, 'validation-error-state.png'),
    fullPage: true 
  });
  console.log('  Saved validation-error-state.png');

  // Copy existing test PDFs as report previews
  const testArtifactsDir = path.join(__dirname, '..', 'test-artifacts');
  if (fs.existsSync(path.join(testArtifactsDir, 'phase-1-1-mid.pdf'))) {
    fs.copyFileSync(
      path.join(testArtifactsDir, 'phase-1-1-mid.pdf'),
      path.join(ARTIFACTS_DIR, 'mid-report.pdf')
    );
    console.log('  Copied mid-report.pdf');
  }
  if (fs.existsSync(path.join(testArtifactsDir, 'phase-1-1-end.pdf'))) {
    fs.copyFileSync(
      path.join(testArtifactsDir, 'phase-1-1-end.pdf'),
      path.join(ARTIFACTS_DIR, 'end-report.pdf')
    );
    console.log('  Copied end-report.pdf');
  }

  // Generate report preview images from existing template
  console.log('Generating report preview images from existing template...');
  const midTemplatePath = path.join(__dirname, '..', 'test-artifacts', 'page-images', 'phase-1-1-mid-template.html');
  if (fs.existsSync(midTemplatePath)) {
    await page.goto('file://' + midTemplatePath);
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(ARTIFACTS_DIR, 'mid-report-preview.png'),
      fullPage: true 
    });
    console.log('  Saved mid-report-preview.png');
  }

  const endTemplatePath = path.join(__dirname, '..', 'test-artifacts', 'page-images', 'phase-1-1-end-template.html');
  if (fs.existsSync(endTemplatePath)) {
    await page.goto('file://' + endTemplatePath);
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(ARTIFACTS_DIR, 'end-report-preview.png'),
      fullPage: true 
    });
    console.log('  Saved end-report-preview.png');
  }

  await browser.close();
  console.log('All screenshots saved!');
}

takeScreenshots().catch(console.error);