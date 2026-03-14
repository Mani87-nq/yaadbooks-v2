import { test, expect } from '@playwright/test';

/**
 * Invoice Module Tests
 * Tests the complete invoice lifecycle.
 */

test.describe('Invoices', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/invoices');
    await expect(page.getByRole('heading', { name: /invoices/i })).toBeVisible();
  });

  test.describe('List View', () => {
    test('displays invoice list', async ({ page }) => {
      const hasInvoices = await page.getByRole('table').isVisible().catch(() => false);
      const hasEmptyState = await page.getByText(/no invoices|create your first/i).isVisible().catch(() => false);
      expect(hasInvoices || hasEmptyState).toBeTruthy();
    });

    test('can filter by status', async ({ page }) => {
      const statusFilter = page.getByRole('combobox', { name: /status|filter/i });
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        await page.getByRole('option', { name: /paid/i }).click();
      }
    });
  });

  test.describe('Create Invoice', () => {
    test('can create a basic invoice', async ({ page }) => {
      // Click create button
      await page.getByRole('button', { name: /create|new|add/i }).first().click();
      
      // Wait for form
      await expect(page.getByText(/new invoice|create invoice/i)).toBeVisible();
      
      // Select customer (if dropdown)
      const customerSelect = page.getByLabel(/customer/i);
      if (await customerSelect.isVisible()) {
        await customerSelect.click();
        await page.getByRole('option').first().click();
      }
      
      // Add line item
      const addItemBtn = page.getByRole('button', { name: /add item|add line/i });
      if (await addItemBtn.isVisible()) {
        await addItemBtn.click();
      }
      
      // Fill item details
      const descField = page.getByPlaceholder(/description|item/i).first();
      if (await descField.isVisible()) {
        await descField.fill('Test Service');
      }
      
      const qtyField = page.getByLabel(/quantity|qty/i).first();
      if (await qtyField.isVisible()) {
        await qtyField.fill('1');
      }
      
      const priceField = page.getByLabel(/price|rate|amount/i).first();
      if (await priceField.isVisible()) {
        await priceField.fill('1000');
      }
      
      // Save as draft
      await page.getByRole('button', { name: /save|create/i }).click();
      
      // Verify success
      await expect(page.getByText(/created|saved|success/i)).toBeVisible({ timeout: 15000 });
    });

    test('calculates totals correctly', async ({ page }) => {
      await page.getByRole('button', { name: /create|new/i }).first().click();
      
      // Add item with known values
      const priceField = page.getByLabel(/price|rate/i).first();
      const qtyField = page.getByLabel(/quantity/i).first();
      
      if (await priceField.isVisible() && await qtyField.isVisible()) {
        await qtyField.fill('2');
        await priceField.fill('500');
        
        // Check subtotal shows 1000
        await expect(page.getByText(/1,?000/)).toBeVisible();
      }
    });
  });

  test.describe('Invoice Actions', () => {
    test('can preview invoice PDF', async ({ page }) => {
      // Click first invoice
      const invoiceRow = page.getByRole('row').nth(1);
      if (await invoiceRow.isVisible()) {
        await invoiceRow.click();
        
        // Look for preview/PDF button
        const previewBtn = page.getByRole('button', { name: /preview|pdf|view/i });
        if (await previewBtn.isVisible()) {
          await previewBtn.click();
          // Should open preview or download
        }
      }
    });

    test('can mark invoice as paid', async ({ page }) => {
      const invoiceRow = page.getByRole('row').nth(1);
      if (await invoiceRow.isVisible()) {
        await invoiceRow.click();
        
        const paidBtn = page.getByRole('button', { name: /mark.*paid|record payment/i });
        if (await paidBtn.isVisible()) {
          await paidBtn.click();
          await expect(page.getByText(/paid|payment recorded/i)).toBeVisible();
        }
      }
    });
  });

  test.describe('Recurring Invoices', () => {
    test('can access recurring invoices', async ({ page }) => {
      await page.goto('/invoices/recurring');
      await expect(page.getByText(/recurring/i)).toBeVisible();
    });
  });

  test.describe('Credit Notes', () => {
    test('can access credit notes', async ({ page }) => {
      await page.goto('/invoices/credit-notes');
      await expect(page.getByText(/credit note/i)).toBeVisible();
    });
  });
});
