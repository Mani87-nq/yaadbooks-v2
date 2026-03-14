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
  
  // Fill login form
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  
  // Submit
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 30000 });
  
  // Verify we're logged in
  await expect(page.getByText(/dashboard|welcome/i)).toBeVisible();
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});
