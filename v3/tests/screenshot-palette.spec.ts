import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/Rahul/.gemini/antigravity-ide/brain/f6c06377-a740-49cd-8fea-58650055c8f3';

test.describe('Color Palette Verification & Screenshots', () => {
  test('Capture Desktop & Mobile views and verify pie-chart colors', async ({ page }) => {
    // 1. Desktop 1366x768 - Create Form
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await page.waitForSelector('.app-shell');
    
    // Screenshot 1: Desktop Initial Create Form
    const createScreenshotPath = path.join(ARTIFACT_DIR, 'palette_desktop_create.png');
    await page.screenshot({ path: createScreenshotPath, fullPage: false });

    // Fill form and select MID period
    await page.fill('#academic_year', '2025-26');
    await page.selectOption('#semester', '6');
    await page.fill('#subject_name', 'Robotics & Control Systems');
    await page.fill('#subject_code', 'AR601');
    await page.fill('#faculty_name', 'Prof. V. S. Kulkarni');
    await page.click('label:has-text("Mid Semester")');

    // Verify MID option has active terracotta styling
    const midOption = page.locator('.period-option-active');
    await expect(midOption).toBeVisible();

    // Click Generate
    await page.click('button:has-text("Generate Report")');
    await page.waitForSelector('.report-block', { state: 'visible', timeout: 30000 });
    const previewLocator = page.locator('#report-preview');
    await previewLocator.waitFor({ state: 'visible' });
    await previewLocator.scrollIntoViewIfNeeded();

    // Screenshot 2: Desktop Report Preview
    const previewScreenshotPath = path.join(ARTIFACT_DIR, 'palette_desktop_preview.png');
    await page.screenshot({ path: previewScreenshotPath, fullPage: false });

    // Verify Pie Chart Colors:
    // Slices MUST retain their exact quality colors: #2563EB, #0D9488, #D97706, #DC2626
    const sliceFills = await page.locator('#report-preview .chart-svg path').evaluateAll((paths) =>
      Array.from(new Set(paths.map((p) => p.getAttribute('fill')).filter(Boolean)))
    );
    console.log('Observed Pie Chart Slice Fills:', sliceFills);

    const validChartColors = ['#2563EB', '#0D9488', '#D97706', '#DC2626'];
    for (const fill of sliceFills) {
      expect(validChartColors).toContain(fill);
    }

    // Verify that NO slice fill is Warm Ivory (#F7F5F0), Deep Forest (#1B302E), or Muted Terracotta (#B6654D)
    expect(sliceFills).not.toContain('#F7F5F0');
    expect(sliceFills).not.toContain('#1B302E');
    expect(sliceFills).not.toContain('#B6654D');

    // 2. Desktop Saved Reports
    await page.click('button:has-text("Saved reports")');
    await page.waitForSelector('#view-archive');
    await page.waitForTimeout(500);
    const archiveScreenshotPath = path.join(ARTIFACT_DIR, 'palette_desktop_archive.png');
    await page.screenshot({ path: archiveScreenshotPath, fullPage: false });

    // 3. Mobile 375x812 - Create Form
    await page.setViewportSize({ width: 375, height: 812 });
    await page.click('button:has-text("New Report")');
    await page.waitForSelector('#view-create');
    await page.waitForTimeout(300);
    const mobileCreatePath = path.join(ARTIFACT_DIR, 'palette_mobile_create.png');
    await page.screenshot({ path: mobileCreatePath, fullPage: false });

    // 4. Mobile 375x812 - Open Drawer Navigation
    await page.click('.mobile-menu-btn');
    await page.waitForSelector('.mobile-nav');
    await page.waitForTimeout(300);
    const mobileNavPath = path.join(ARTIFACT_DIR, 'palette_mobile_nav.png');
    await page.screenshot({ path: mobileNavPath, fullPage: false });

    console.log('Successfully captured all verification screenshots to artifact directory.');
  });
});
