import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Setup: Login once and save authentication state.
 * All other tests reuse this session (no repeated logins).
 */
setup('authenticate', async ({ page }) => {
  // Use test credentials from environment or defaults
  const email = process.env.TEST_USER_EMAIL || 'test@yaadbooks.com';
  const password = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
  
  // Navigate to login
  await page.goto('/login');
  
  // Fill login form (using placeholders since labels may not be properly associated)
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  
  // Submit (use exact match to avoid matching "Sign in with Google")
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 30000 });
  
  // Verify we're logged in (use heading to be specific)
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});
