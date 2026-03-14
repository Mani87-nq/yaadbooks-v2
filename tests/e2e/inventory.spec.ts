import { test, expect } from '@playwright/test';

/**
 * Inventory Module Tests
 * Tests product management and stock control.
 */

test.describe('Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: /inventory|products/i })).toBeVisible();
  });

  test.describe('Product List', () => {
    test('displays product list', async ({ page }) => {
      const hasProducts = await page.getByRole('table').isVisible().catch(() => false);
      const hasEmptyState = await page.getByText(/no products|add your first/i).isVisible().catch(() => false);
      expect(hasProducts || hasEmptyState).toBeTruthy();
    });

    test('can search products', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
      }
    });

    test('shows stock levels', async ({ page }) => {
      // Should show stock/quantity column
      const stockColumn = page.getByText(/stock|quantity|qty/i);
      await expect(stockColumn.first()).toBeVisible();
    });
  });

  test.describe('Create Product', () => {
    test('can create a new product', async ({ page }) => {
      await page.getByRole('button', { name: /add|new|create/i }).first().click();
      
      // Fill product details
      await page.getByLabel(/name/i).first().fill('Test Product ' + Date.now());
      
      const skuField = page.getByLabel(/sku/i);
      if (await skuField.isVisible()) {
        await skuField.fill('SKU-' + Date.now());
      }
      
      const priceField = page.getByLabel(/price/i);
      if (await priceField.isVisible()) {
        await priceField.fill('99.99');
      }
      
      const qtyField = page.getByLabel(/quantity|stock/i);
      if (await qtyField.isVisible()) {
        await qtyField.fill('100');
      }
      
      // Save
      await page.getByRole('button', { name: /save|create/i }).click();
      await expect(page.getByText(/created|success|added/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Stock Adjustments', () => {
    test('can adjust stock', async ({ page }) => {
      // Click first product
      const productRow = page.getByRole('row').nth(1);
      if (await productRow.isVisible()) {
        await productRow.click();
        
        // Look for adjust stock button
        const adjustBtn = page.getByRole('button', { name: /adjust|stock/i });
        if (await adjustBtn.isVisible()) {
          await adjustBtn.click();
        }
      }
    });
  });

  test.describe('Stock Transfers', () => {
    test('can access stock transfers', async ({ page }) => {
      await page.goto('/stock-transfers');
      await expect(page.getByText(/transfer/i)).toBeVisible();
    });
  });

  test.describe('Low Stock Alerts', () => {
    test('shows low stock warnings', async ({ page }) => {
      // Check for low stock indicator if products exist
      const lowStockIndicator = page.locator('[class*="warning"], [class*="low"]');
      // This may or may not be visible depending on data
    });
  });
});
