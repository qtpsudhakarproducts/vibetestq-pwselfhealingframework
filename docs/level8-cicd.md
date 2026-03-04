# Level 8 — CI/CD Integration & Execution Strategy
### Playwright · TypeScript · OrangeHRM Demo Application

> **Prerequisites:** Levels 1–7 must be complete. You should have a tagged, annotated test suite with a working custom reporter and all three modules passing locally.
> **What you will have by the end:** Three GitHub Actions workflows — a PR quality gate, a nightly regression with Allure history, and a manual run. Test results published to GitHub Pages after every nightly run. History and trends visible across runs.
> **What changes:** `.github/workflows/`, `playwright.config.ts`, `package.json`. The test suite, page objects, helpers, fixtures, data layer, and API layer do not change.
> **Next level:** Level 9 introduces AI-assisted test generation — an agent that reads your codebase, derives your standards, and generates new tests that match what your team would write manually.

---

## 📋 Table of Contents

- [Part 1 — The Problem Level 7 Left Behind](#part-1--the-problem-level-7-left-behind)
- [Part 2 — Project Structure at Level 8](#part-2--project-structure-at-level-8)
- [Part 3 — Installing Allure](#part-3--installing-allure)
- [Part 4 — GitHub Pages Setup](#part-4--github-pages-setup)
- [Part 5 — PR Check Workflow](#part-5--pr-check-workflow)
- [Part 6 — Nightly Regression Workflow](#part-6--nightly-regression-workflow)
- [Part 7 — Manual Run Workflow](#part-7--manual-run-workflow)
- [Part 8 — Parallel Execution and Retry Strategy](#part-8--parallel-execution-and-retry-strategy)
- [Part 9 — package.json Scripts](#part-9--packagejson-scripts)
- [Part 10 — What Level 8 Does Not Solve](#part-10--what-level-8-does-not-solve)

---

## Part 1 — The Problem Level 7 Left Behind

The framework now produces clean, structured reports. Tags make targeted runs possible. The custom reporter groups failures by module and severity. Screenshots, videos, and traces capture every failure.

All of this happens locally, triggered manually, visible only to whoever ran the suite.

The team does not know if the suite is passing. A developer merges a pull request without running tests. A regression introduced on Tuesday is not discovered until Friday when someone runs the suite manually. There is no history — no way to know whether last week's pass rate was better or worse than this week's.

Level 8 puts the framework into GitHub Actions and makes results a team resource, not a local artifact.

---

## Part 2 — Project Structure at Level 8

```
orangehrm-automation/
│
├── .github/
│   └── workflows/
│       ├── pr-check.yml          ← NEW — smoke suite on every pull request
│       ├── nightly-regression.yml ← NEW — full suite nightly, publishes to GitHub Pages
│       └── manual-run.yml        ← NEW — configurable tag and environment
│
├── allure-results/               ← NEW — raw Allure output (gitignored)
├── allure-report/                ← NEW — generated HTML report (gitignored)
│
├── data/                         ← no changes
├── api/                          ← no changes
├── helpers/                      ← no changes
├── pages/                        ← no changes
├── fixtures/                     ← no changes
├── reporters/                    ← no changes
├── tests/                        ← no changes
│
├── playwright.config.ts          ← updated — Allure reporter, CI environment detection
└── package.json                  ← updated — test scripts added
```

### Add generated folders to `.gitignore`

Raw Allure results and generated reports are build artefacts — never commit them:

```
# .gitignore
allure-results/
allure-report/
playwright-report/
test-results/
```

---

## Part 3 — Installing Allure

```bash
# Allure reporter for Playwright — writes raw JSON results during test run
npm install --save-dev allure-playwright

# Allure commandline — converts raw results into HTML report
# Bundles the Allure CLI — no separate Java installation required
npm install --save-dev allure-commandline
```

### Update playwright.config.ts

Add the Allure reporter alongside the existing reporters. Allure writes raw results to `allure-results/` during the run. The HTML report is generated separately after the run completes.

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { readEnv }      from './data/readers';

const env = readEnv();

// Detect CI environment — affects workers, retries, and trace settings
const isCI = !!process.env.CI;

export default defineConfig({

  testDir: './tests',

  reporter: [

    // list — real-time terminal output
    ['list'],

    // html — interactive report for local debugging
    // open: 'never' prevents auto-opening in CI
    ['html', { open: 'never', outputFolder: 'playwright-report' }],

    // json — machine-readable results
    ['json', { outputFile: 'test-results/results.json' }],

    // allure — raw results for Allure HTML report generation
    // Only active in CI — no overhead locally unless explicitly needed
    ...(isCI ? [['allure-playwright', { outputFolder: 'allure-results' }] as const] : []),

    // summary — our custom grouped reporter from Level 7
    ['./reporters/SummaryReporter.ts'],

  ],

  use: {
    baseURL:           env.baseURL,
    headless:          true,
    viewport:          { width: 1280, height: 720 },
    actionTimeout:     10_000,
    navigationTimeout: 30_000,
    screenshot:        'only-on-failure',
    video:             'retain-on-failure',

    // Trace on first retry in CI — full replay for flaky failures
    // Off locally — no overhead during development
    trace: isCI ? 'on-first-retry' : 'off',
  },

  projects: [
    {
      name:      'admin',
      use:       { storageState: 'playwright/.auth/admin.json' },
      testMatch: ['**/pim/**', '**/admin/**', '**/leave/leave.spec.ts'],
    },
    {
      name:      'ess',
      use:       { storageState: 'playwright/.auth/ess.json' },
      testMatch: ['**/leave/apply.spec.ts'],
    },
    {
      name:      'no-auth',
      testMatch: ['**/login.spec.ts'],
    },
  ],

  globalSetup: './global-setup.ts',

  // More retries in CI — transient network issues on the demo site
  // No retries locally — failures should be investigated immediately
  retries: isCI ? 2 : 0,

  // Workers tuned for the shared OrangeHRM demo site — see Part 8
  workers: isCI ? 2 : 1,

  timeout:   60_000,
  outputDir: 'test-results/',

});
```

---

## Part 4 — GitHub Pages Setup

One-time configuration on the GitHub repository before the first nightly run.

### Step 1 — Enable GitHub Pages

In the repository: **Settings → Pages → Source → Deploy from a branch**

Set branch to `gh-pages`, folder to `/ (root)`. Save.

GitHub will serve whatever is on the `gh-pages` branch at:
`https://<your-org>.github.io/<your-repo>/`

### Step 2 — Create the gh-pages branch

The `gh-pages` branch must exist before the workflow runs. Create it as an empty orphan branch — it has no shared history with `main`:

```bash
git checkout --orphan gh-pages
git rm -rf .
echo "Allure reports will appear here after the first nightly run." > index.html
git add index.html
git commit -m "initialise gh-pages branch"
git push origin gh-pages
git checkout main
```

The `peaceiris/actions-gh-pages` action used in the workflow will overwrite this with the real report on first run.

### Step 3 — Workflow permissions

The nightly workflow pushes to `gh-pages`. GitHub Actions needs write permission to do this.

In the repository: **Settings → Actions → General → Workflow permissions**

Select **Read and write permissions**. Save.

No manual secrets are needed — GitHub provides `GITHUB_TOKEN` automatically to every workflow.

---

## Part 5 — PR Check Workflow

Runs on every pull request targeting `main`. Executes the smoke suite only — fast enough to not block the developer, comprehensive enough to catch regressions on the critical path.

If any smoke test fails, the pull request check fails and merge is blocked until it passes.

No report publishing — the result is the GitHub check status. Green means the critical path is intact.

```yaml
# .github/workflows/pr-check.yml
name: PR Check — Smoke Suite

on:
  pull_request:
    branches:
      - main

jobs:
  smoke:
    name: Smoke Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:

      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Create environment file
        run: |
          mkdir -p test-data
          cat > test-data/.env.dev << EOF
          BASE_URL=${{ secrets.BASE_URL }}
          ADMIN_USERNAME=${{ secrets.ADMIN_USERNAME }}
          ADMIN_PASSWORD=${{ secrets.ADMIN_PASSWORD }}
          ESS_USERNAME=${{ secrets.ESS_USERNAME }}
          ESS_PASSWORD=${{ secrets.ESS_PASSWORD }}
          EOF

      - name: Run smoke suite
        run: npx playwright test --grep @smoke
        env:
          CI: true
          TEST_ENV: dev

      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-pr-${{ github.run_number }}
          path: playwright-report/
          retention-days: 7
```

### GitHub Secrets

The environment file is built from GitHub secrets — credentials never appear in the repository. Add these in **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|--------|-------|
| `BASE_URL` | `https://opensource-demo.orangehrmlive.com` |
| `ADMIN_USERNAME` | `Admin` |
| `ADMIN_PASSWORD` | `admin123` |
| `ESS_USERNAME` | `alice.johnson` |
| `ESS_PASSWORD` | `Alice@1234` |

---

## Part 6 — Nightly Regression Workflow

Runs the full suite at midnight every day. On completion it generates an Allure report with history from the previous run and publishes it to GitHub Pages.

The history step is what makes Allure valuable over a single-run report — trends, flakiness tracking, and pass rate over time all depend on preserving history across runs.

```yaml
# .github/workflows/nightly-regression.yml
name: Nightly Regression

on:
  schedule:
    # Runs at 00:00 UTC every day
    - cron: '0 0 * * *'

  # Allow manual trigger from the Actions tab
  workflow_dispatch:

jobs:
  regression:
    name: Full Regression Suite
    runs-on: ubuntu-latest
    timeout-minutes: 60

    # Required to push to gh-pages
    permissions:
      contents: write

    steps:

      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Create environment file
        run: |
          mkdir -p test-data
          cat > test-data/.env.dev << EOF
          BASE_URL=${{ secrets.BASE_URL }}
          ADMIN_USERNAME=${{ secrets.ADMIN_USERNAME }}
          ADMIN_PASSWORD=${{ secrets.ADMIN_PASSWORD }}
          ESS_USERNAME=${{ secrets.ESS_USERNAME }}
          ESS_PASSWORD=${{ secrets.ESS_PASSWORD }}
          EOF

      - name: Run full regression suite
        run: npx playwright test --grep @regression
        env:
          CI: true
          TEST_ENV: dev
        # continue-on-error so report is published even when tests fail
        continue-on-error: true

      # ── Allure History ─────────────────────────────────────────────────────
      # Download the previous report from gh-pages before generating the new one.
      # Copy its history/ folder into allure-results/ so Allure builds trend data.
      # Without this step every run starts fresh — no history, no trends.

      - name: Download previous Allure report from gh-pages
        uses: actions/checkout@v4
        with:
          ref: gh-pages
          path: gh-pages-previous
        # Don't fail if gh-pages branch has no previous report yet
        continue-on-error: true

      - name: Copy Allure history from previous report
        run: |
          if [ -d "gh-pages-previous/history" ]; then
            cp -r gh-pages-previous/history allure-results/history
            echo "✅ History copied from previous report"
          else
            echo "ℹ️  No previous history found — first run or history missing"
          fi
        continue-on-error: true

      # ── Generate Allure Report ─────────────────────────────────────────────

      - name: Generate Allure report
        run: npx allure generate allure-results --clean -o allure-report
        if: always()

      # ── Publish to GitHub Pages ────────────────────────────────────────────

      - name: Publish Allure report to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        if: always()
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir:  ./allure-report
          # Keep previous runs in subdirectories for direct linking
          keep_files: false

      # ── Upload artifacts ───────────────────────────────────────────────────

      - name: Upload Allure results as artifact
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: allure-results-${{ github.run_number }}
          path: allure-results/
          retention-days: 30

      - name: Upload Playwright report as artifact
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ github.run_number }}
          path: playwright-report/
          retention-days: 14
```

### What the published report shows

After the first nightly run, the Allure report is live at:
`https://<your-org>.github.io/<your-repo>/`

**Overview** — total pass rate, duration, environment details

**Suites** — results broken down by test file and describe block

**Graphs** — pass rate trend over time, test duration trend

**Categories** — failures automatically categorised as product defects, test defects, or broken tests based on failure type

**Timeline** — when each test ran and how long it took

After the second run, history begins accumulating — trend lines appear and flaky tests become visible.

---

## Part 7 — Manual Run Workflow

Allows anyone on the team to trigger a targeted run directly from the GitHub Actions tab — choosing which tag to run and which environment to target. No local setup required.

```yaml
# .github/workflows/manual-run.yml
name: Manual Run

on:
  workflow_dispatch:
    inputs:
      tag:
        description: 'Test tag to run'
        required: true
        default: '@smoke'
        type: choice
        options:
          - '@smoke'
          - '@regression'
          - '@sanity'
          - '@pim'
          - '@admin'
          - '@leave'
          - '@critical'
      environment:
        description: 'Target environment'
        required: true
        default: 'dev'
        type: choice
        options:
          - dev
          - staging

jobs:
  manual:
    name: Manual — ${{ github.event.inputs.tag }} on ${{ github.event.inputs.environment }}
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:

      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Create environment file
        run: |
          mkdir -p test-data
          ENV="${{ github.event.inputs.environment }}"
          if [ "$ENV" = "staging" ]; then
            cat > test-data/.env.staging << EOF
          BASE_URL=${{ secrets.STAGING_BASE_URL }}
          ADMIN_USERNAME=${{ secrets.STAGING_ADMIN_USERNAME }}
          ADMIN_PASSWORD=${{ secrets.STAGING_ADMIN_PASSWORD }}
          ESS_USERNAME=${{ secrets.STAGING_ESS_USERNAME }}
          ESS_PASSWORD=${{ secrets.STAGING_ESS_PASSWORD }}
          EOF
          else
            cat > test-data/.env.dev << EOF
          BASE_URL=${{ secrets.BASE_URL }}
          ADMIN_USERNAME=${{ secrets.ADMIN_USERNAME }}
          ADMIN_PASSWORD=${{ secrets.ADMIN_PASSWORD }}
          ESS_USERNAME=${{ secrets.ESS_USERNAME }}
          ESS_PASSWORD=${{ secrets.ESS_PASSWORD }}
          EOF
          fi

      - name: Run selected tests
        run: npx playwright test --grep "${{ github.event.inputs.tag }}"
        env:
          CI: true
          TEST_ENV: ${{ github.event.inputs.environment }}

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: manual-report-${{ github.event.inputs.tag }}-${{ github.run_number }}
          path: playwright-report/
          retention-days: 7
```

---

## Part 8 — Parallel Execution and Retry Strategy

### Workers on the shared OrangeHRM demo site

The OrangeHRM demo site is shared — it serves many users simultaneously and has no guaranteed capacity. Too many parallel workers create race conditions on shared data and trigger rate limiting.

```typescript
// playwright.config.ts
workers: isCI ? 2 : 1,
```

**2 workers in CI** — safe for the shared site. Two tests run concurrently. Faster than sequential but not aggressive enough to cause data conflicts.

**1 worker locally** — sequential by default. Easier to debug, no interference between tests.

If you move to a dedicated OrangeHRM instance you can raise workers to 4 or more — the limit then becomes the machine's CPU, not the server's capacity.

### Why 2 works — test independence

Tests at Level 5 are fully independent — each creates its own employee, user, and leave data via API before running. There is no shared state between tests that could cause conflicts when they run in parallel. Two workers can safely run two different tests simultaneously because neither test depends on what the other is doing.

This is why test independence at Level 5 was a prerequisite for safe parallel execution at Level 8.

### Retry strategy

```typescript
retries: isCI ? 2 : 0,
```

**2 retries in CI** — transient failures on the shared demo site (network timeouts, slow page loads, brief unavailability) are retried automatically. A test must fail 3 times consecutively before the pipeline marks it as failed. Genuine failures still fail — flaky infrastructure issues do not.

**0 retries locally** — failures should be investigated immediately. Silent retries during development mask real problems.

### The flakiness signal

When a test passes on retry it is marked `flaky` in the Allure report — not passed, not failed. After several nightly runs, Allure's graphs show which tests are consistently flaky. These are candidates for investigation — either the test needs stabilising, or the application has a genuine intermittent issue.

This is the cross-run value of Allure that the built-in HTML reporter cannot provide.

---

## Part 9 — package.json Scripts

Clean aliases for every run type. Developers never need to remember `--grep` syntax.

```json
{
  "scripts": {

    "test":            "playwright test",
    "test:smoke":      "playwright test --grep @smoke",
    "test:regression": "playwright test --grep @regression",
    "test:sanity":     "playwright test --grep @sanity",

    "test:pim":        "playwright test --grep @pim",
    "test:admin":      "playwright test --grep @admin",
    "test:leave":      "playwright test --grep @leave",
    "test:login":      "playwright test --grep @login",

    "test:critical":   "playwright test --grep @critical",

    "test:ci":         "CI=true playwright test --grep @regression",

    "report":          "playwright show-report",
    "report:allure":   "allure generate allure-results --clean -o allure-report && allure open allure-report",
    "report:clean":    "rm -rf allure-results allure-report playwright-report test-results"

  }
}
```

### Usage

```bash
# Daily development — run smoke before pushing
npm run test:smoke

# Full regression locally
npm run test:regression

# Investigate a specific module
npm run test:admin

# View the last HTML report
npm run report

# Generate and open Allure report locally
npm run report:allure

# Clean all generated artefacts
npm run report:clean
```

---

## Part 10 — What Level 8 Does Not Solve

### Test creation still requires manual effort

The framework is now production-grade — independent tests, type-safe data, tagged runs, CI pipelines, published reports with history. Every test in the suite was written manually, following the patterns established across Levels 1 through 8.

When a new feature is added to OrangeHRM, someone needs to write the page objects, the fixtures, and the test cases. They need to know the patterns, follow the conventions, and apply the same standards the framework has established.

**Level 9** introduces an AI agent that reads the codebase — the page objects, fixtures, helpers, and test files from Levels 1 through 8 — derives the team's standards from what it sees, and generates new tests that are indistinguishable from what the team would write manually.

---

> **You are ready for Level 9** when the framework is running in CI and the bottleneck has shifted from framework quality to test authoring speed — writing new tests for every new feature takes longer than it should.

---

### Quick Reference — What Changed at Level 8

| File | Change |
|------|--------|
| `.github/workflows/pr-check.yml` | Created — smoke suite on pull requests |
| `.github/workflows/nightly-regression.yml` | Created — full suite nightly, publishes to GitHub Pages |
| `.github/workflows/manual-run.yml` | Created — configurable tag and environment |
| `playwright.config.ts` | Updated — Allure reporter, CI detection, workers, retries, trace |
| `package.json` | Updated — test scripts for every run type |
| `.gitignore` | Updated — allure-results/, allure-report/ added |
| `tests/**` | No changes |
| `pages/**` | No changes |
| `helpers/**` | No changes |
| `fixtures/**` | No changes |
| `data/**` | No changes |
| `api/**` | No changes |
| `reporters/**` | No changes |

---

*Level 8 of 9 — Playwright TypeScript · OrangeHRM · Enterprise POM Framework*
*(Level 0 covers theory and setup — this series runs from Level 0 through Level 9)*
