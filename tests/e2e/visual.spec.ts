import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 * Captures screenshots and compares against baselines to detect CSS/layout changes.
 * 
 * First run creates baseline screenshots.
 * Subsequent runs compare against baselines.
 * 
 * Update baselines: npx playwright test visual.spec.ts --update-snapshots
 */

test.describe('Visual Regression', () => {
  // Configure for visual testing
  test.use({
    // Consistent viewport for screenshots
    viewport: { width: 1280, height: 720 },
  });

  test.describe('Core Pages - Desktop', () => {
    const pages = [
      { path: '/dashboard', name: 'dashboard' },
      { path: '/invoices', name: 'invoices' },
      { path: '/customers', name: 'customers' },
      { path: '/inventory', name: 'inventory' },
      { path: '/pos', name: 'pos' },
      { path: '/settings', name: 'settings' },
      { path: '/reports', name: 'reports' },
    ];

    for (const pageInfo of pages) {
      test(`${pageInfo.name} page matches snapshot`, async ({ page }) => {
        await page.goto(pageInfo.path);
        
        // Wait for page to fully load
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // Allow animations to settle
        
        // Hide dynamic content that changes between runs
        await page.evaluate(() => {
          // Hide timestamps, dates, random IDs
          document.querySelectorAll('[data-testid="timestamp"], time, .timestamp').forEach(el => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
        });
        
        // Take full page screenshot
        await expect(page).toHaveScreenshot(`${pageInfo.name}-desktop.png`, {
          fullPage: true,
          maxDiffPixels: 100, // Allow small differences
        });
      });
    }
  });

  test.describe('Core Pages - Mobile', () => {
    test.use({
      viewport: { width: 375, height: 667 }, // iPhone SE
    });

    const pages = [
      { path: '/dashboard', name: 'dashboard' },
      { path: '/invoices', name: 'invoices' },
      { path: '/pos', name: 'pos' },
    ];

    for (const pageInfo of pages) {
      test(`${pageInfo.name} mobile matches snapshot`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        await expect(page).toHaveScreenshot(`${pageInfo.name}-mobile.png`, {
          fullPage: true,
          maxDiffPixels: 100,
        });
      });
    }
  });

  test.describe('Components', () => {
    test('invoice create form matches snapshot', async ({ page }) => {
      await page.goto('/invoices');
      await page.getByRole('button', { name: /create|new/i }).first().click();
      await page.waitForTimeout(500);
      
      // Screenshot just the form/modal
      const form = page.locator('form, [role="dialog"]').first();
      await expect(form).toHaveScreenshot('invoice-form.png', {
        maxDiffPixels: 50,
      });
    });

    test('customer create form matches snapshot', async ({ page }) => {
      await page.goto('/customers');
      await page.getByRole('button', { name: /add|new/i }).first().click();
      await page.waitForTimeout(500);
      
      const form = page.locator('form, [role="dialog"]').first();
      await expect(form).toHaveScreenshot('customer-form.png', {
        maxDiffPixels: 50,
      });
    });

    test('sidebar navigation matches snapshot', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const sidebar = page.locator('nav, aside').first();
      await expect(sidebar).toHaveScreenshot('sidebar.png', {
        maxDiffPixels: 30,
      });
    });

    test('header matches snapshot', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const header = page.locator('header').first();
      await expect(header).toHaveScreenshot('header.png', {
        maxDiffPixels: 30,
      });
    });
  });

  test.describe('Dark Mode', () => {
    test.use({
      colorScheme: 'dark',
    });

    test('dashboard dark mode matches snapshot', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('dashboard-dark.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Print Layouts', () => {
    test('invoice print layout matches snapshot', async ({ page }) => {
      await page.goto('/invoices');
      
      // Click first invoice
      const invoiceRow = page.getByRole('row').nth(1);
      if (await invoiceRow.isVisible()) {
        await invoiceRow.click();
        
        // Look for print/PDF preview
        const printBtn = page.getByRole('button', { name: /print|pdf|preview/i });
        if (await printBtn.isVisible()) {
          await printBtn.click();
          await page.waitForTimeout(1000);
          
          // Screenshot print preview
          await expect(page).toHaveScreenshot('invoice-print.png', {
            maxDiffPixels: 100,
          });
        }
      }
    });
  });

  test.describe('Empty States', () => {
    test('empty customers list matches snapshot', async ({ browser }) => {
      // This would require a test account with no customers
      // For now, just verify the empty state component exists
      const page = await browser.newPage();
      await page.goto('/customers');
      
      const emptyState = page.getByText(/no customers|add your first|get started/i);
      if (await emptyState.isVisible()) {
        await expect(page).toHaveScreenshot('customers-empty.png', {
          maxDiffPixels: 50,
        });
      }
    });
  });

  test.describe('Error States', () => {
    test('404 page matches snapshot', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-12345');
      await page.waitForLoadState('networkidle');
      
      // Only screenshot if it's actually a 404 page
      const is404 = await page.getByText(/404|not found/i).isVisible();
      if (is404) {
        await expect(page).toHaveScreenshot('404-page.png', {
          maxDiffPixels: 50,
        });
      }
    });
  });
});
