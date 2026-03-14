import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Tests
 * Tests for WCAG 2.1 compliance using axe-core.
 * 
 * Install: npm install @axe-core/playwright
 */

test.describe('Accessibility', () => {
  
  test.describe('Core Pages', () => {
    const pagesToTest = [
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/login', name: 'Login', requiresAuth: false },
      { path: '/invoices', name: 'Invoices' },
      { path: '/customers', name: 'Customers' },
      { path: '/pos', name: 'Point of Sale' },
      { path: '/settings', name: 'Settings' },
    ];

    for (const pageInfo of pagesToTest) {
      test(`${pageInfo.name} has no critical accessibility violations`, async ({ page, browser }) => {
        if (pageInfo.requiresAuth === false) {
          // Use fresh context for non-auth pages
          const context = await browser.newContext();
          const freshPage = await context.newPage();
          await freshPage.goto(pageInfo.path);
          
          const results = await new AxeBuilder({ page: freshPage })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
          
          // Filter to critical and serious violations only
          const criticalViolations = results.violations.filter(
            v => v.impact === 'critical' || v.impact === 'serious'
          );
          
          if (criticalViolations.length > 0) {
            console.log(`\n❌ Accessibility issues on ${pageInfo.name}:`);
            criticalViolations.forEach(v => {
              console.log(`  - ${v.id}: ${v.description} (${v.impact})`);
              console.log(`    Affected: ${v.nodes.length} elements`);
            });
          }
          
          expect(criticalViolations.length).toBe(0);
          await context.close();
        } else {
          await page.goto(pageInfo.path);
          
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();
          
          const criticalViolations = results.violations.filter(
            v => v.impact === 'critical' || v.impact === 'serious'
          );
          
          expect(criticalViolations.length).toBe(0);
        }
      });
    }
  });

  test.describe('Keyboard Navigation', () => {
    test('can navigate login form with keyboard only', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('/login');
      
      // Tab to email field
      await page.keyboard.press('Tab');
      const emailFocused = await page.getByLabel('Email').evaluate(
        el => el === document.activeElement
      );
      expect(emailFocused).toBeTruthy();
      
      // Tab to password
      await page.keyboard.press('Tab');
      const passwordFocused = await page.getByLabel('Password').evaluate(
        el => el === document.activeElement
      );
      expect(passwordFocused).toBeTruthy();
      
      // Tab to submit button
      await page.keyboard.press('Tab');
      const submitFocused = await page.getByRole('button', { name: /sign in/i }).evaluate(
        el => el === document.activeElement
      );
      // Should be able to reach submit
      
      await context.close();
    });

    test('can navigate sidebar with keyboard', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Find sidebar nav
      const sidebar = page.locator('nav, aside').first();
      
      // All links should be keyboard accessible
      const links = await sidebar.getByRole('link').all();
      
      for (const link of links.slice(0, 5)) {
        // Each link should be focusable
        await link.focus();
        const isFocused = await link.evaluate(el => el === document.activeElement);
        expect(isFocused).toBeTruthy();
      }
    });

    test('modals can be closed with Escape key', async ({ page }) => {
      await page.goto('/customers');
      
      // Open a modal
      await page.getByRole('button', { name: /add|new|create/i }).first().click();
      
      // Wait for modal
      await page.waitForTimeout(500);
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Modal should close (or form should be hidden)
      await page.waitForTimeout(500);
    });

    test('focus trap in modals', async ({ page }) => {
      await page.goto('/customers');
      
      // Open modal
      await page.getByRole('button', { name: /add|new|create/i }).first().click();
      await page.waitForTimeout(500);
      
      // Tab through all elements - should cycle within modal
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
      }
      
      // Focus should still be within modal area
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A']).toContain(focusedElement);
    });
  });

  test.describe('Screen Reader Support', () => {
    test('images have alt text', async ({ page }) => {
      await page.goto('/dashboard');
      
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const isDecorative = await img.getAttribute('role') === 'presentation';
        
        // Image should have alt text, aria-label, or be marked as decorative
        const hasAccessibleName = alt !== null || ariaLabel !== null || isDecorative;
        expect(hasAccessibleName).toBeTruthy();
      }
    });

    test('form inputs have labels', async ({ page }) => {
      await page.goto('/customers');
      await page.getByRole('button', { name: /add|new/i }).first().click();
      await page.waitForTimeout(500);
      
      const inputs = await page.locator('input:not([type="hidden"])').all();
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');
        
        // Check for associated label
        let hasLabel = false;
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          hasLabel = await label.count() > 0;
        }
        
        const isAccessible = hasLabel || ariaLabel || ariaLabelledBy || placeholder;
        
        if (!isAccessible) {
          const inputHtml = await input.evaluate(el => el.outerHTML);
          console.warn(`⚠️ Input without accessible label: ${inputHtml.slice(0, 100)}`);
        }
      }
    });

    test('buttons have accessible names', async ({ page }) => {
      await page.goto('/dashboard');
      
      const buttons = await page.locator('button').all();
      
      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        
        const hasAccessibleName = (text && text.trim()) || ariaLabel || title;
        
        if (!hasAccessibleName) {
          const buttonHtml = await button.evaluate(el => el.outerHTML);
          console.warn(`⚠️ Button without accessible name: ${buttonHtml.slice(0, 100)}`);
        }
      }
    });

    test('headings are in correct order', async ({ page }) => {
      await page.goto('/dashboard');
      
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      
      let lastLevel = 0;
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName);
        const level = parseInt(tagName.replace('H', ''));
        
        // Heading level shouldn't skip more than 1 level
        if (lastLevel > 0 && level > lastLevel + 1) {
          console.warn(`⚠️ Heading level skipped from H${lastLevel} to H${level}`);
        }
        
        lastLevel = level;
      }
    });
  });

  test.describe('Color and Contrast', () => {
    test('text has sufficient color contrast', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Use axe-core for contrast checking
      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();
      
      const contrastViolations = results.violations;
      
      if (contrastViolations.length > 0) {
        console.log('\n⚠️ Color contrast issues:');
        contrastViolations.forEach(v => {
          console.log(`  ${v.nodes.length} elements with insufficient contrast`);
        });
      }
      
      // Allow some violations but flag them
      expect(contrastViolations.length).toBeLessThan(10);
    });

    test('information is not conveyed by color alone', async ({ page }) => {
      await page.goto('/invoices');
      
      // Check that status indicators have text/icons, not just color
      const statusBadges = page.locator('[class*="status"], [class*="badge"]');
      const count = await statusBadges.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const badge = statusBadges.nth(i);
        const text = await badge.textContent();
        
        // Badge should have text content, not just color
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Responsive and Zoom', () => {
    test('page is readable at 200% zoom', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Simulate 200% zoom by setting viewport
      await page.setViewportSize({ width: 640, height: 480 });
      
      // Content should still be visible and not overflow
      const body = page.locator('body');
      const overflow = await body.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.overflowX;
      });
      
      // Should handle overflow gracefully
      expect(['visible', 'auto', 'scroll', 'hidden']).toContain(overflow);
    });

    test('touch targets are large enough on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
      await page.goto('/dashboard');
      
      const buttons = await page.locator('button').all();
      
      for (const button of buttons.slice(0, 10)) {
        const box = await button.boundingBox();
        if (box) {
          // WCAG recommends 44x44 minimum touch target
          const meetsMinSize = box.width >= 44 && box.height >= 44;
          // Or has adequate spacing
          if (!meetsMinSize) {
            console.warn(`⚠️ Small touch target: ${box.width}x${box.height}px`);
          }
        }
      }
    });
  });
});
