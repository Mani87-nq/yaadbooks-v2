import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Quick validation that all routes work
 * Run this first to catch any major breakages.
 */

// All routes that should be accessible when logged in
const PROTECTED_ROUTES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/pos', name: 'Point of Sale' },
  { path: '/pos/day-management', name: 'Day Management' },
  { path: '/pos/sessions', name: 'POS Sessions' },
  { path: '/pos/returns', name: 'POS Returns' },
  { path: '/pos/grid-settings', name: 'Grid Settings' },
  { path: '/invoices', name: 'Invoices' },
  { path: '/invoices/recurring', name: 'Recurring Invoices' },
  { path: '/invoices/credit-notes', name: 'Credit Notes' },
  { path: '/invoices/reminders', name: 'Payment Reminders' },
  { path: '/customers', name: 'Customers' },
  { path: '/customers/statements', name: 'Customer Statements' },
  { path: '/quotations', name: 'Quotations' },
  { path: '/inventory', name: 'Inventory' },
  { path: '/stock-transfers', name: 'Stock Transfers' },
  { path: '/expenses', name: 'Expenses' },
  { path: '/accounting/chart', name: 'Chart of Accounts' },
  { path: '/accounting/journal', name: 'Journal Entries' },
  { path: '/fixed-assets', name: 'Fixed Assets' },
  { path: '/banking', name: 'Banking' },
  { path: '/banking/reconciliation', name: 'Bank Reconciliation' },
  { path: '/payroll', name: 'Payroll' },
  { path: '/reports', name: 'Reports' },
  { path: '/reports/trial-balance', name: 'Trial Balance' },
  { path: '/reports/general-ledger', name: 'General Ledger' },
  { path: '/reports/cash-flow', name: 'Cash Flow' },
  { path: '/reports/aging', name: 'AR/AP Aging' },
  { path: '/reports/audit-trail', name: 'Audit Trail' },
  { path: '/ai', name: 'AI Assistant' },
  { path: '/settings', name: 'Settings' },
  { path: '/notifications', name: 'Notifications' },
];

test.describe('Smoke Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const route of PROTECTED_ROUTES) {
    test(`${route.name} (${route.path}) loads without error`, async ({ page }) => {
      const response = await page.goto(route.path);
      
      // Should not redirect to login (auth should be preserved)
      expect(page.url()).not.toContain('/login');
      
      // Should return 200
      expect(response?.status()).toBeLessThan(400);
      
      // Should not show error page
      await expect(page.getByText(/500|error|something went wrong/i)).not.toBeVisible();
      
      // Page should have content (not blank)
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(100);
    });
  }
});

test.describe('Navigation', () => {
  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click through main nav items
    const navItems = [
      'Dashboard',
      'Invoices',
      'Customers',
      'Inventory',
      'Settings',
    ];
    
    for (const item of navItems) {
      const link = page.getByRole('link', { name: new RegExp(item, 'i') }).first();
      if (await link.isVisible()) {
        await link.click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).not.toContain('/login');
      }
    }
  });

  test('user menu opens and has correct options', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click user avatar/menu
    const userMenu = page.locator('[class*="avatar"], [class*="user"]').first();
    await userMenu.click();
    
    // Should show menu options
    await expect(page.getByText(/profile|settings|sign out/i).first()).toBeVisible();
  });

  test('sign out redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Open user menu
    const userMenu = page.locator('[class*="avatar"], [class*="user"]').first();
    await userMenu.click();
    
    // Click sign out
    const signOutBtn = page.getByRole('button', { name: /sign out|logout/i });
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
      
      // Should redirect to login
      await page.waitForURL('**/login**', { timeout: 10000 });
    }
  });
});

test.describe('Error Handling', () => {
  test('404 page for invalid routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    
    // Should show 404 or redirect, not crash
    const is404 = await page.getByText(/404|not found/i).isVisible().catch(() => false);
    const redirected = page.url().includes('/dashboard') || page.url().includes('/login');
    
    expect(is404 || redirected).toBeTruthy();
  });
});
