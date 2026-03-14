import { defineConfig, devices } from '@playwright/test';

/**
 * YaadBooks E2E Test Configuration
 * Run with: npx playwright test
 * Debug with: npx playwright test --ui
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  
  use: {
    // Base URL for all tests
    baseURL: process.env.TEST_URL || 'https://yaadbooks.com',
    
    // Collect trace on failure for debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  // Test timeout
  timeout: 60000,

  projects: [
    // Setup: Login once and save auth state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    // Desktop Chrome (main tests)
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    
    // Mobile Safari (responsive tests)
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
