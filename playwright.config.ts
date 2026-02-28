// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

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

    // smart reporter — history-aware HTML report with trends, flakiness, stability grades
    ['playwright-smart-reporter', {
      outputFile:               path.resolve('smart-report.html'),
      historyFile:              path.resolve('test-history.json'),
      maxHistoryRuns:           20,
      performanceThreshold:     0.2,
      projectName:              'orangehrm-ui',
      runId:                    process.env.GITHUB_RUN_ID,

      // Analysis features
      enableRetryAnalysis:      true,
      enableFailureClustering:  true,
      enableStabilityScore:     true,
      enableTrendsView:         true,
      enableComparison:         true,
      enableGalleryView:        true,
      enableTraceViewer:        true,
      enableNetworkLogs:        true,

      // Flakiness thresholds
      thresholds: {
        flakinessStable:   0.1,
        flakinessUnstable: 0.3,
      },

      // Branding
      branding: {
        title:  'OrangeHRM Automation Report',
        footer: 'vibetestq-pwselfhealingframework',
      },
    }],

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

    // Trace retained on failure — required for smart reporter network logs
    trace: isCI ? 'retain-on-failure' : 'off',
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
