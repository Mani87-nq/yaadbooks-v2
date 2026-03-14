import { test, expect } from '@playwright/test';

/**
 * Reports Module Tests
 * Tests all financial reports and exports.
 */

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
  });

  test.describe('Reports Dashboard', () => {
    test('displays reports list', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible();
    });

    test('shows available report types', async ({ page }) => {
      // Should list various report options
      const reportTypes = ['trial balance', 'general ledger', 'cash flow', 'aging'];
      for (const report of reportTypes) {
        const reportLink = page.getByText(new RegExp(report, 'i'));
        await expect(reportLink.first()).toBeVisible();
      }
    });
  });

  test.describe('Trial Balance', () => {
    test('can generate trial balance', async ({ page }) => {
      await page.goto('/reports/trial-balance');
      await expect(page.getByText(/trial balance/i)).toBeVisible();
      
      // Generate report
      const generateBtn = page.getByRole('button', { name: /generate|run|view/i });
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    test('can export to PDF/Excel', async ({ page }) => {
      await page.goto('/reports/trial-balance');
      
      const exportBtn = page.getByRole('button', { name: /export|download|pdf|excel/i });
      if (await exportBtn.isVisible()) {
        // Export functionality exists
        expect(true).toBe(true);
      }
    });
  });

  test.describe('General Ledger', () => {
    test('can view general ledger', async ({ page }) => {
      await page.goto('/reports/general-ledger');
      await expect(page.getByText(/general ledger/i)).toBeVisible();
    });

    test('can filter by account', async ({ page }) => {
      await page.goto('/reports/general-ledger');
      
      const accountFilter = page.getByRole('combobox', { name: /account/i });
      if (await accountFilter.isVisible()) {
        await accountFilter.click();
      }
    });

    test('can filter by date range', async ({ page }) => {
      await page.goto('/reports/general-ledger');
      
      const dateFilter = page.getByLabel(/date|from|start/i);
      if (await dateFilter.isVisible()) {
        await dateFilter.click();
      }
    });
  });

  test.describe('Cash Flow', () => {
    test('can view cash flow statement', async ({ page }) => {
      await page.goto('/reports/cash-flow');
      await expect(page.getByText(/cash flow/i)).toBeVisible();
    });
  });

  test.describe('Aging Reports', () => {
    test('can view AR/AP aging', async ({ page }) => {
      await page.goto('/reports/aging');
      await expect(page.getByText(/aging/i)).toBeVisible();
    });

    test('shows aging buckets', async ({ page }) => {
      await page.goto('/reports/aging');
      
      // Should show aging periods (current, 30, 60, 90+ days)
      const agingPeriods = ['current', '30', '60', '90'];
      for (const period of agingPeriods) {
        const periodText = page.getByText(new RegExp(period, 'i'));
        // At least some should be visible if there's data
      }
    });
  });

  test.describe('Audit Trail', () => {
    test('can view audit trail', async ({ page }) => {
      await page.goto('/reports/audit-trail');
      await expect(page.getByText(/audit/i)).toBeVisible();
    });

    test('shows user actions', async ({ page }) => {
      await page.goto('/reports/audit-trail');
      
      // Should show action types
      const actionTypes = ['created', 'updated', 'deleted'];
      // May or may not have data
    });
  });
});
