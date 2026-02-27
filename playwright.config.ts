// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

// Detect CI environment — affects workers, retries, and trace settings
const isCI = !!process.env.CI;

export default defineConfig({

  testDir: './tests',

  fullyParallel: false,       // OrangeHRM demo is shared — run sequentially to avoid conflicts
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,     // More retries in CI — transient network on the demo site

  // Workers tuned for the shared OrangeHRM demo site
  workers: isCI ? 2 : 1,

  timeout:   60_000,
  outputDir: 'test-results/',

  // ─── Reporters ──────────────────────────────────────────────────────────────

  reporter: [

    // list — real-time terminal output during the run
    ['list'],

    // html — interactive report saved to playwright-report/
    ['html', { open: 'never', outputFolder: 'playwright-report' }],

    // json — machine-readable results for CI dashboards
    ['json', { outputFile: 'test-results/results.json' }],

    // allure — raw results for Allure HTML report generation (CI only)
    ...(isCI ? [['allure-playwright', { outputFolder: 'allure-results', detail: true, suiteTitle: true }] as const] : []),

    // summary reporter — grouped overview after every run
    ['./reporters/SummaryReporter.ts'],

  ],

  // ─── Global Settings ────────────────────────────────────────────────────────

  use: {
    baseURL: 'https://opensource-demo.orangehrmlive.com',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout:     10_000,
    navigationTimeout: 30_000,

    // Failure capture
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',

    // Trace on first retry in CI — full replay for flaky failures
    trace: isCI ? 'on-first-retry' : 'off',
  },

  // ─── Projects ───────────────────────────────────────────────────────────────

  projects: [
    {
      name:      'admin',
      use:       {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      testMatch: ['**/pim/**', '**/admin/**', '**/leave/leave.spec.ts'],
    },
    {
      name:      'ess',
      use:       {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/ess.json',
      },
      testMatch: ['**/leave/apply.spec.ts'],
    },
    {
      name:      'no-auth',
      use:       { ...devices['Desktop Chrome'] },
      testMatch: ['**/login.spec.ts'],
    },
  ],

  globalSetup: './global-setup.ts',

});
