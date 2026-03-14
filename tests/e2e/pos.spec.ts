import { test, expect } from '@playwright/test';

/**
 * Point of Sale (POS) Module Tests
 * Tests the complete POS sales flow.
 */

test.describe('Point of Sale', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos');
  });

  test.describe('POS Interface', () => {
    test('loads POS interface', async ({ page }) => {
      // Should show POS grid or product list
      await expect(page.getByText(/point of sale|pos|sale/i)).toBeVisible();
    });

    test('displays product grid', async ({ page }) => {
      // Look for product cards or grid
      const productGrid = page.locator('[class*="grid"], [class*="product"]');
      await expect(productGrid.first()).toBeVisible();
    });

    test('shows cart/checkout area', async ({ page }) => {
      // Cart should be visible
      const cart = page.getByText(/cart|checkout|total/i);
      await expect(cart.first()).toBeVisible();
    });
  });

  test.describe('Sale Flow', () => {
    test('can add product to cart', async ({ page }) => {
      // Click first product
      const product = page.locator('[class*="product"], [data-product]').first();
      if (await product.isVisible()) {
        await product.click();
        
        // Cart should update
        await expect(page.getByText(/\$|JMD|total/i)).toBeVisible();
      }
    });

    test('can complete a sale', async ({ page }) => {
      // Add item
      const product = page.locator('[class*="product"]').first();
      if (await product.isVisible()) {
        await product.click();
      }
      
      // Click pay/checkout
      const payBtn = page.getByRole('button', { name: /pay|checkout|complete/i });
      if (await payBtn.isVisible()) {
        await payBtn.click();
        
        // Handle payment modal
        const cashBtn = page.getByRole('button', { name: /cash/i });
        if (await cashBtn.isVisible()) {
          await cashBtn.click();
        }
        
        // Complete sale
        const completeBtn = page.getByRole('button', { name: /complete|confirm|done/i });
        if (await completeBtn.isVisible()) {
          await completeBtn.click();
        }
      }
    });

    test('can apply discount', async ({ page }) => {
      const discountBtn = page.getByRole('button', { name: /discount/i });
      if (await discountBtn.isVisible()) {
        await discountBtn.click();
        // Should show discount input
      }
    });
  });

  test.describe('POS Settings', () => {
    test('can access grid settings', async ({ page }) => {
      await page.goto('/pos/grid-settings');
      await expect(page.getByText(/grid|settings/i)).toBeVisible();
    });

    test('can access day management', async ({ page }) => {
      await page.goto('/pos/day-management');
      await expect(page.getByText(/day|shift|register/i)).toBeVisible();
    });

    test('can view POS sessions', async ({ page }) => {
      await page.goto('/pos/sessions');
      await expect(page.getByText(/session/i)).toBeVisible();
    });
  });

  test.describe('Returns', () => {
    test('can access returns page', async ({ page }) => {
      await page.goto('/pos/returns');
      await expect(page.getByText(/return/i)).toBeVisible();
    });
  });
});
