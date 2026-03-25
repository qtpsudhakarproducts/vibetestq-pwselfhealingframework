// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { readRuntimeConfig } from './data/config';

// Load .env for local development — CI always provides env vars directly
if (!process.env.CI) {
  try { process.loadEnvFile('.env'); } catch { /* .env is optional */ }
}

const runtime = readRuntimeConfig();
const isCI = runtime.ci.isCI;

export default defineConfig({

  testDir: './tests',

  fullyParallel: false,       // OrangeHRM demo is shared — run sequentially to avoid conflicts
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,     // 1 local retry handles transient slowness on the shared demo site

  // Workers: controlled by PLAYWRIGHT_WORKERS env var (default 1).
  // Increase for dedicated environments — keep at 1 for the shared demo site.
  workers: isCI ? 2 : runtime.env.workers,

  timeout:   60_000,
  expect:   { timeout: 15_000 }, // Shared demo site can be slow — 15s for all expect() calls
  outputDir: 'reports/artifacts/',

  // ─── Reporters ──────────────────────────────────────────────────────────────

  reporter: [

    // list — real-time terminal output during the run
    ['list'],

    // html — interactive report saved to reports/html/
    ['html', { open: 'never', outputFolder: 'reports/html' }],

    // json — machine-readable results for CI dashboards
    ['json', { outputFile: 'reports/results.json' }],

    // allure — raw results for Allure HTML report generation (CI only)
    ...(isCI ? [['allure-playwright', { outputFolder: 'reports/allure', detail: true, suiteTitle: true }] as const] : []),

    // summary reporter — grouped overview after every run
    ['./reporters/SummaryReporter.ts'],

    // smart reporter — history-aware HTML report with trends, flakiness, stability grades
    ['playwright-smart-reporter', {
      outputFile:               path.resolve('reports/smart-report.html'),
      historyFile:              path.resolve('reports/test-history.json'),
      maxHistoryRuns:           20,
      performanceThreshold:     0.2,
      projectName:              'orangehrm-ui',
      runId:                    runtime.ci.runId,

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
    baseURL: runtime.env.baseURL,
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
