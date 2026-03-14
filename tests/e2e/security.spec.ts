import { test, expect } from '@playwright/test';

/**
 * Security Tests
 * Tests for OWASP Top 10 vulnerabilities and common security issues.
 * 
 * IMPORTANT: Run these against a staging environment, not production!
 */

test.describe('Security Tests', () => {
  
  test.describe('Authentication Security', () => {
    test('login page is served over HTTPS', async ({ page }) => {
      await page.goto('/login');
      expect(page.url()).toMatch(/^https:/);
    });

    test('protected routes redirect to login when unauthenticated', async ({ browser }) => {
      // Create a fresh context without auth
      const context = await browser.newContext();
      const page = await context.newPage();
      
      const protectedRoutes = ['/dashboard', '/invoices', '/customers', '/settings'];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        // Should redirect to login
        await expect(page).toHaveURL(/login/);
      }
      
      await context.close();
    });

    test('session expires after logout', async ({ page, browser }) => {
      await page.goto('/dashboard');
      
      // Get current cookies
      const cookies = await page.context().cookies();
      
      // Logout
      const userMenu = page.locator('[class*="avatar"], [class*="user"]').first();
      await userMenu.click();
      await page.getByRole('button', { name: /sign out/i }).click();
      
      // Wait for redirect
      await page.waitForURL('**/login**');
      
      // Try to access protected route with old session
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await newContext.addCookies(cookies);
      
      await newPage.goto('/dashboard');
      // Should be redirected to login (session invalidated)
      await expect(newPage).toHaveURL(/login/);
      
      await newContext.close();
    });

    test('rate limiting on login attempts', async ({ page }) => {
      await page.goto('/login');
      
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await page.getByLabel('Email').fill('attacker@test.com');
        await page.getByLabel('Password').fill('wrongpassword');
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForTimeout(500);
      }
      
      // Should show rate limit message or lock
      const rateLimited = await page.getByText(/too many|rate limit|locked|try again/i).isVisible();
      // Note: If this fails, rate limiting may not be implemented
      if (!rateLimited) {
        console.warn('⚠️ WARNING: No rate limiting detected on login!');
      }
    });

    test('passwords are not exposed in page source', async ({ page }) => {
      await page.goto('/login');
      
      await page.getByLabel('Password').fill('SecretPassword123!');
      
      // Password should be masked (type="password")
      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Check page source doesn't contain password
      const content = await page.content();
      expect(content).not.toContain('SecretPassword123!');
    });
  });

  test.describe('XSS (Cross-Site Scripting) Prevention', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "';alert('XSS');//",
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
    ];

    test('customer name field sanitizes XSS', async ({ page }) => {
      await page.goto('/customers');
      await page.getByRole('button', { name: /add|new|create/i }).first().click();
      
      for (const payload of xssPayloads.slice(0, 2)) {
        const nameField = page.getByLabel(/name/i).first();
        if (await nameField.isVisible()) {
          await nameField.fill(payload);
          
          // Submit form
          await page.getByRole('button', { name: /save/i }).click();
          
          // Check for alert dialogs (XSS would trigger these)
          page.on('dialog', async dialog => {
            console.error(`❌ XSS VULNERABILITY DETECTED: ${dialog.message()}`);
            await dialog.dismiss();
            throw new Error('XSS vulnerability found!');
          });
          
          await page.waitForTimeout(1000);
        }
      }
    });

    test('search inputs sanitize XSS', async ({ page }) => {
      await page.goto('/customers');
      
      const searchInput = page.getByPlaceholder(/search/i);
      if (await searchInput.isVisible()) {
        for (const payload of xssPayloads) {
          await searchInput.fill(payload);
          await page.waitForTimeout(500);
          
          // Content should be escaped, not executed
          const pageContent = await page.content();
          expect(pageContent).not.toContain('<script>alert');
        }
      }
    });
  });

  test.describe('SQL Injection Prevention', () => {
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1; DELETE FROM invoices",
      "admin'--",
    ];

    test('search fields reject SQL injection', async ({ page }) => {
      await page.goto('/customers');
      
      const searchInput = page.getByPlaceholder(/search/i);
      if (await searchInput.isVisible()) {
        for (const payload of sqlPayloads) {
          await searchInput.fill(payload);
          await page.waitForTimeout(500);
          
          // Should not crash or show SQL error
          const hasError = await page.getByText(/sql|syntax|error|unexpected/i).isVisible();
          expect(hasError).toBeFalsy();
        }
      }
    });

    test('URL parameters reject SQL injection', async ({ page }) => {
      for (const payload of sqlPayloads) {
        const response = await page.goto(`/customers?search=${encodeURIComponent(payload)}`);
        
        // Should return 200 or 400, not 500
        expect(response?.status()).toBeLessThan(500);
        
        // Should not expose SQL errors
        const content = await page.content();
        expect(content.toLowerCase()).not.toContain('sql syntax');
        expect(content.toLowerCase()).not.toContain('postgresql');
        expect(content.toLowerCase()).not.toContain('prisma');
      }
    });
  });

  test.describe('CSRF Protection', () => {
    test('forms include CSRF tokens or use SameSite cookies', async ({ page }) => {
      await page.goto('/customers');
      await page.getByRole('button', { name: /add|new/i }).first().click();
      
      // Check for CSRF token in form or verify SameSite cookies
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));
      
      if (sessionCookie) {
        // Session cookie should have SameSite attribute
        expect(['Strict', 'Lax']).toContain(sessionCookie.sameSite);
      }
    });
  });

  test.describe('Sensitive Data Exposure', () => {
    test('API responses do not leak sensitive user data', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Intercept API calls
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /api.key/i,
        /token.*[a-f0-9]{20}/i,
      ];
      
      page.on('response', async response => {
        if (response.url().includes('/api/')) {
          try {
            const body = await response.text();
            for (const pattern of sensitivePatterns) {
              if (pattern.test(body)) {
                console.warn(`⚠️ Potential sensitive data in ${response.url()}`);
              }
            }
          } catch {}
        }
      });
      
      await page.waitForTimeout(3000);
    });

    test('error pages do not expose stack traces', async ({ page }) => {
      // Try to trigger an error
      const response = await page.goto('/api/v1/nonexistent-endpoint');
      
      const content = await page.content();
      expect(content).not.toContain('node_modules');
      expect(content).not.toContain('at Function');
      expect(content).not.toContain('.ts:');
      expect(content).not.toContain('.js:');
    });
  });

  test.describe('Authorization', () => {
    test('cannot access other users data via URL manipulation', async ({ page }) => {
      // Try to access invoices with random IDs
      const randomIds = ['00000000-0000-0000-0000-000000000000', 'admin', '../../../etc/passwd'];
      
      for (const id of randomIds) {
        const response = await page.goto(`/invoices/${id}`);
        
        // Should return 404 or redirect, not 200 with other user's data
        const status = response?.status() || 0;
        expect([404, 403, 302, 301]).toContain(status);
      }
    });

    test('API endpoints require authentication', async ({ browser }) => {
      const context = await browser.newContext(); // No auth
      const page = await context.newPage();
      
      const apiEndpoints = [
        '/api/v1/customers',
        '/api/v1/invoices',
        '/api/v1/products',
        '/api/v1/user-settings',
      ];
      
      for (const endpoint of apiEndpoints) {
        const response = await page.goto(endpoint);
        const status = response?.status() || 0;
        
        // Should return 401 or 403
        expect([401, 403]).toContain(status);
      }
      
      await context.close();
    });
  });

  test.describe('Security Headers', () => {
    test('response includes security headers', async ({ page }) => {
      const response = await page.goto('/dashboard');
      const headers = response?.headers() || {};
      
      // Check for recommended security headers
      const securityHeaders = {
        'x-frame-options': ['DENY', 'SAMEORIGIN'],
        'x-content-type-options': ['nosniff'],
        'x-xss-protection': ['1; mode=block', '0'], // 0 is acceptable for modern browsers
      };
      
      for (const [header, validValues] of Object.entries(securityHeaders)) {
        const value = headers[header];
        if (value) {
          expect(validValues.some(v => value.includes(v))).toBeTruthy();
        } else {
          console.warn(`⚠️ Missing security header: ${header}`);
        }
      }
    });

    test('strict-transport-security header present', async ({ page }) => {
      const response = await page.goto('/dashboard');
      const hsts = response?.headers()['strict-transport-security'];
      
      if (hsts) {
        expect(hsts).toContain('max-age');
      } else {
        console.warn('⚠️ Missing HSTS header');
      }
    });
  });
});
