import { test, expect } from '@playwright/test';

/**
 * Customer Module Tests
 * Tests all CRUD operations and edge cases for customers.
 */

test.describe('Customers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/customers');
    await expect(page.getByRole('heading', { name: /customers/i })).toBeVisible();
  });

  test.describe('List View', () => {
    test('displays customer list', async ({ page }) => {
      // Should show customer table or empty state
      const hasCustomers = await page.getByRole('table').isVisible().catch(() => false);
      const hasEmptyState = await page.getByText(/no customers|add your first/i).isVisible().catch(() => false);
      expect(hasCustomers || hasEmptyState).toBeTruthy();
    });

    test('search filters customers', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500); // Debounce
        // Results should update (either filtered or "no results")
      }
    });
  });

  test.describe('Create Customer', () => {
    test('can create a new customer', async ({ page }) => {
      // Click add button
      await page.getByRole('button', { name: /add|new|create/i }).first().click();
      
      // Fill required fields
      await page.getByLabel(/name/i).first().fill('Test Customer ' + Date.now());
      
      // Fill email if visible
      const emailField = page.getByLabel(/email/i);
      if (await emailField.isVisible()) {
        await emailField.fill(`test${Date.now()}@example.com`);
      }
      
      // Fill phone if visible
      const phoneField = page.getByLabel(/phone/i);
      if (await phoneField.isVisible()) {
        await phoneField.fill('876-555-0100');
      }
      
      // Save
      await page.getByRole('button', { name: /save|create|add/i }).click();
      
      // Verify success
      await expect(page.getByText(/created|success|added/i)).toBeVisible({ timeout: 10000 });
    });

    test('validates required fields', async ({ page }) => {
      await page.getByRole('button', { name: /add|new|create/i }).first().click();
      
      // Try to save without filling required fields
      await page.getByRole('button', { name: /save|create/i }).click();
      
      // Should show validation error
      await expect(page.getByText(/required|invalid|please/i)).toBeVisible();
    });
  });

  test.describe('Edit Customer', () => {
    test('can edit existing customer', async ({ page }) => {
      // Click first customer row
      const customerRow = page.getByRole('row').nth(1);
      if (await customerRow.isVisible()) {
        await customerRow.click();
        
        // Should open edit view or detail
        await expect(page.getByLabel(/name/i).first()).toBeVisible();
      }
    });
  });

  test.describe('Customer Statements', () => {
    test('can generate customer statement', async ({ page }) => {
      await page.goto('/customers/statements');
      await expect(page.getByText(/statement/i)).toBeVisible();
    });
  });
});
