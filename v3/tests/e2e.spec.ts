import { test, expect } from '@playwright/test';

test.describe('A&R Feedback Portal - Phase 2.1 E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    await page.goto('/');
    await expect(page.locator('.brand')).toBeVisible();
  });

  test.describe('Responsive Layout', () => {
    const viewports = [
      { width: 320, height: 568, name: 'mobile-320' },
      { width: 375, height: 667, name: 'mobile-375' },
      { width: 768, height: 1024, name: 'tablet-768' },
      { width: 1366, height: 768, name: 'desktop-1366' },
      { width: 1920, height: 1080, name: 'desktop-1920' },
    ];

    for (const viewport of viewports) {
      test(`Create Report page at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        await expect(page.locator('.brand')).toBeVisible();
        
        // Check no horizontal overflow
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 5);
        
        // Check A&R brand is visible and not broken
        const brand = page.locator('.brand');
        await expect(brand).toBeVisible();
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-artifacts/phase-2-1/create-${viewport.name === 'desktop-1920' ? 'wide-1920' : viewport.name}.png`,
          fullPage: true 
        });
      });
    }
  });

  test.describe('Create Report Workflow', () => {
    test('Generate MID Semester report', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto('/');
      await expect(page.locator('.brand')).toBeVisible();
      
      // Fill form
      await page.fill('#academic_year', '2022-23');
      await page.selectOption('#semester', '3');
      await page.fill('#subject_name', 'Engineering Mathematics-III');
      await page.fill('#subject_code', 'AR2301');
      await page.fill('#faculty_name', 'Prof. S. S. Borse');
      
      // Select Mid Semester
      await page.click('label:has-text("Mid Semester")');
      
      // Submit
      await page.click('button:has-text("Generate Report")');
      
      // Wait for report to be generated
      await page.waitForSelector('.report-block', { state: 'visible', timeout: 30000 });
      
      // Verify report metadata
      await expect(page.locator('.report-badge')).toContainText('Mid Semester');
      await expect(page.locator('.report-meta h2')).toContainText('Engineering Mathematics-III');
      
      // Verify 10 charts
      const charts = page.locator('.chart-card');
      await expect(charts).toHaveCount(10);
      
      // Verify report ID/version exists
      await expect(page.locator('.report-subtitle')).toContainText('Version');
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-artifacts/phase-2-1/mid-report-preview.png',
        fullPage: true 
      });
    });

    test('Generate END Semester report', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto('/');
      await expect(page.locator('.brand')).toBeVisible();
      
      // Fill form
      await page.fill('#academic_year', '2022-23');
      await page.selectOption('#semester', '3');
      await page.fill('#subject_name', 'Engineering Mathematics-III');
      await page.fill('#subject_code', 'AR2301');
      await page.fill('#faculty_name', 'Prof. S. S. Borse');
      
      // Select End Semester
      await page.click('label:has-text("End Semester")');
      
      // Submit
      await page.click('button:has-text("Generate Report")');
      
      // Wait for report
      await page.waitForSelector('.report-block', { state: 'visible', timeout: 30000 });
      
      // Verify period
      await expect(page.locator('.report-badge')).toContainText('End Semester');
      
      // Verify 10 charts
      const charts = page.locator('.chart-card');
      await expect(charts).toHaveCount(10);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-artifacts/phase-2-1/end-report-preview.png',
        fullPage: true 
      });
    });

    test('Regenerate creates new version', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto('/');
      await expect(page.locator('.brand')).toBeVisible();
      
      // Generate initial report
      await page.fill('#academic_year', '2022-23');
      await page.selectOption('#semester', '3');
      await page.fill('#subject_name', 'Test Subject');
      await page.fill('#subject_code', 'TEST101');
      await page.fill('#faculty_name', 'Prof. Test');
      await page.click('label:has-text("Mid Semester")');
      await page.click('button:has-text("Generate Report")');
      
      await page.waitForSelector('.report-block', { state: 'visible', timeout: 30000 });
      
      // Get initial version
      const initialSubtitle = await page.locator('.report-subtitle').textContent();
      const initialVersionMatch = initialSubtitle?.match(/Version (\d+)/);
      const initialVersion = initialVersionMatch ? parseInt(initialVersionMatch[1]) : 0;
      
      // Regenerate
      await page.click('button:has-text("Regenerate")');
      
      // Verify new version with auto-retry
      await expect(page.locator('.report-subtitle')).toContainText(`Version ${initialVersion + 1}`);
    });
  });

  test.describe('Archive Functionality', () => {
    test('Archive shows reports and allows search/filter', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      
      // First generate a report with unique details to have something in archive
      const uniqueCode = `ARCH_${Date.now()}`;
      await page.goto('/');
      await page.fill('#academic_year', '2022-23');
      await page.selectOption('#semester', '3');
      await page.fill('#subject_name', 'Archive Test Subject');
      await page.fill('#subject_code', uniqueCode);
      await page.fill('#faculty_name', 'Prof. Archive');
      await page.click('label:has-text("Mid Semester")');
      await page.click('button:has-text("Generate Report")');
      await page.waitForSelector('.report-block', { state: 'visible', timeout: 30000 });
      
      // Navigate to archive
      await page.click('button:has-text("Saved reports")');
      await expect(page.locator('.brand')).toBeVisible();
      
      // Verify archive loads
      await expect(page.locator('h1')).toContainText('Saved Reports');
      await expect(page.locator('.archive-table')).toBeVisible();
      
      // Search by unique code
      await page.fill('#archive-search', uniqueCode);
      await expect(page.locator('.archive-table tbody tr')).toHaveCount(1);
      
      // Filter by period MID (should show 1)
      await page.selectOption('select[aria-label="Filter by period"]', 'MID');
      await expect(page.locator('.archive-table tbody tr')).toHaveCount(1);
      
      // Filter by END (should show 0)
      await page.selectOption('select[aria-label="Filter by period"]', 'END');
      await expect(page.locator('.archive-table tbody tr')).toHaveCount(0);
      
      // Clear filters
      await page.click('button:has-text("Clear filters")');
      await page.fill('#archive-search', uniqueCode);
      await expect(page.locator('.archive-table tbody tr')).toHaveCount(1);
      
      // Open report
      await page.click('.archive-table tbody tr:first-child button:has-text("Open")');
      await page.waitForSelector('.report-block', { state: 'visible', timeout: 30000 });
      await expect(page.locator('.report-badge')).toContainText('Mid Semester');
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-artifacts/phase-2-1/saved-reports-desktop.png',
        fullPage: true 
      });
    });

    test('Archive mobile view', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await expect(page.locator('.brand')).toBeVisible();
      
      // Open mobile nav
      await page.click('[aria-label="Open navigation"]');
      await expect(page.locator('.mobile-nav')).toBeVisible();
      
      // Screenshot open mobile navigation
      await page.screenshot({
        path: 'test-artifacts/phase-2-1/mobile-navigation-open.png',
        fullPage: true,
      });

      // Navigate to saved reports
      await page.click('.mobile-nav-item:has-text("Saved reports")');
      await expect(page.locator('.brand')).toBeVisible();
      
      // Verify archive loads on mobile
      await expect(page.locator('h1')).toContainText('Saved Reports');
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-artifacts/phase-2-1/saved-reports-mobile.png',
        fullPage: true 
      });
    });
  });

  test.describe('Validation and Error States', () => {
    test('Shows validation errors', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto('/');
      await expect(page.locator('.brand')).toBeVisible();
      
      // Submit empty form
      await page.click('button:has-text("Generate Report")');
      
      // Check validation errors appear (using aria-describedby and error elements)
      await expect(page.locator('[aria-describedby="academic_year-error"]')).toBeVisible();
      await expect(page.locator('[aria-describedby="semester-error"]')).toBeVisible();
      await expect(page.locator('[aria-describedby="subject_name-error"]')).toBeVisible();
      await expect(page.locator('[aria-describedby="subject_code-error"]')).toBeVisible();
      await expect(page.locator('[aria-describedby="faculty_name-error"]')).toBeVisible();
      await expect(page.locator('[aria-describedby="period-error"]')).toBeVisible();

      // Check aria-invalid attributes
      await expect(page.locator('#academic_year')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('#semester')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('#subject_name')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('#subject_code')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('#faculty_name')).toHaveAttribute('aria-invalid', 'true');
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-artifacts/phase-2-1/validation-error-state.png',
        fullPage: true 
      });
    });

    test('Invalid academic year rejected', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto('/');
      await expect(page.locator('.brand')).toBeVisible();
      
      await page.fill('#academic_year', '2022-24'); // Non-consecutive
      await page.selectOption('#semester', '3');
      await page.fill('#subject_name', 'Test');
      await page.fill('#subject_code', 'T101');
      await page.fill('#faculty_name', 'Prof. Test');
      await page.click('label:has-text("Mid Semester")');
      await page.click('button:has-text("Generate Report")');
      
      // Verify aria-describedby association and error text
      await expect(page.locator('#academic_year')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('#academic_year')).toHaveAttribute('aria-describedby', 'academic_year-error');
      await expect(page.locator('#academic_year-error')).toContainText('consecutive');
    });
  });

  test.describe('PDF Download', () => {
    test('Download MID PDF', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto('/');
      await expect(page.locator('.brand')).toBeVisible();
      
      await page.fill('#academic_year', '2022-23');
      await page.selectOption('#semester', '3');
      await page.fill('#subject_name', 'PDF Test');
      await page.fill('#subject_code', 'PDF101');
      await page.fill('#faculty_name', 'Prof. PDF');
      await page.click('label:has-text("Mid Semester")');
      await page.click('button:has-text("Generate Report")');
      
      await page.waitForSelector('.report-block', { state: 'visible', timeout: 30000 });
      
      // Click download and verify download starts
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download PDF")');
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toContain('Feedback_PDF101_2022-23_MID.pdf');
    });
  });
});
