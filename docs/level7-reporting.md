# Level 7 — Reporting & Test Organisation
### Playwright · TypeScript · OrangeHRM Demo Application

> **Prerequisites:** Levels 1–6 must be complete. You should have independent tests, a working data layer, and passing tests across all three modules.
> **What you will have by the end:** Every test is tagged by module, type, and severity. Targeted runs execute only the tests you need. Screenshots, video, and traces capture failures automatically. Runtime data is attached to the report. A custom summary reporter prints a structured, grouped overview after every run.
> **What changes:** `playwright.config.ts`, every test file, and a new `reporters/` folder. Page objects, helpers, fixtures, and the data layer do not change.
> **Next level:** Level 8 introduces CI/CD integration — running the framework reliably in GitHub Actions with parallel execution, retry strategy, and scheduled runs.

---

## 📋 Table of Contents

- [Part 1 — The Problem Level 6 Left Behind](#part-1--the-problem-level-6-left-behind)
- [Part 2 — Tagging Strategy](#part-2--tagging-strategy)
- [Part 3 — Targeted Runs with --grep](#part-3--targeted-runs-with---grep)
- [Part 4 — Reporter Configuration](#part-4--reporter-configuration)
- [Part 5 — Screenshot, Video, and Trace on Failure](#part-5--screenshot-video-and-trace-on-failure)
- [Part 6 — Test Annotations](#part-6--test-annotations)
- [Part 7 — Custom Summary Reporter](#part-7--custom-summary-reporter)
- [Part 8 — Updating Tests](#part-8--updating-tests)
- [Part 9 — What Level 7 Does Not Solve](#part-9--what-level-7-does-not-solve)

---

## Part 1 — The Problem Level 6 Left Behind

After six levels the test suite has real depth — login, PIM, Admin, Leave, data-driven tests, independent setup. Run it in CI and you see something like this:

```
  53 passed, 4 failed (2m 14s)
```

That is it. Four tests failed. Which ones? Which module? How critical are they? Are they new failures or known flaky tests? Was it a data issue or a UI regression?

The terminal output scrolls past hundreds of lines. The developer stares at a wall of green and red dots. The QA lead asks for a status update and gets a screenshot of the terminal.

This is the reporting problem. The test suite is working — but its results are not communicating. Level 7 fixes that.

---

## Part 2 — Tagging Strategy

Tags are strings attached to individual tests. Playwright uses them for two things — filtering which tests to run, and surfacing metadata in reports.

A well-tagged test communicates three things about itself:

**Module** — which part of the application does this test cover?
**Type** — what kind of test is this?
**Severity** — how critical is this test to the product?

```typescript
test('admin can add a new employee', { tag: ['@pim', '@smoke', '@critical'] }, async ({ addEmployeePage }) => {
  // ...
});
```

### Module Tags

| Tag | Covers |
|-----|--------|
| `@login` | Authentication and session management |
| `@pim` | Employee management — add, search, edit, personal details |
| `@admin` | System user management — add, search, roles |
| `@leave` | Leave application and approval workflow |

### Type Tags

| Tag | Meaning |
|-----|---------|
| `@smoke` | Core happy-path scenarios — runs in ~2 minutes, gates every deployment |
| `@regression` | Full coverage including edge cases — runs nightly |
| `@sanity` | Quick post-deployment check — runs after every release |

### Severity Tags

| Tag | Meaning |
|-----|---------|
| `@critical` | Failure means the application is broken for all users |
| `@high` | Failure blocks a primary user workflow |
| `@medium` | Failure degrades an important feature |
| `@low` | Failure is an inconvenience — workaround exists |

### Tagging Rules

Every test gets exactly one module tag, one type tag, and one severity tag. No test is untagged. No test has two module tags or two severity tags.

---

## Part 3 — Targeted Runs with --grep

`--grep` accepts a regular expression and runs only tests whose title or tags match.

### Run by module

```bash
# All PIM tests
npx playwright test --grep @pim

# All Admin tests
npx playwright test --grep @admin

# All Leave tests
npx playwright test --grep @leave
```

### Run by type

```bash
# Smoke suite only — fast, runs before every deploy
npx playwright test --grep @smoke

# Full regression — runs nightly
npx playwright test --grep @regression

# Post-deploy sanity check
npx playwright test --grep @sanity
```

### Run by severity

```bash
# Critical path only
npx playwright test --grep @critical

# Critical and high severity
npx playwright test --grep "@critical|@high"
```

### Combine tags

```bash
# Smoke tests in the PIM module only
npx playwright test --grep "(?=.*@smoke)(?=.*@pim)"

# All critical tests across admin and leave modules
npx playwright test --grep "(?=.*@critical)(?=.*(@admin|@leave))"
```

### Exclude tags

```bash
# Everything except low severity
npx playwright test --grep-invert @low

# Skip leave tests — useful when leave module has a known environment issue
npx playwright test --grep-invert @leave
```

---

## Part 4 — Reporter Configuration

`playwright.config.ts` is updated to configure three reporters together. Each serves a different audience and purpose.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import { readEnv }               from './data/readers';

const env = readEnv();

export default defineConfig({

  testDir: './tests',

  // ─── Reporters ──────────────────────────────────────────────────────────────

  reporter: [

    // list — terminal output during the run
    // Shows each test result as it completes — good for local development
    ['list'],

    // html — full interactive report saved to playwright-report/
    // Open with: npx playwright show-report
    // Contains: screenshots, videos, traces, annotations, timing
    // open: 'never' prevents the browser from opening automatically in CI
    ['html', { open: 'never', outputFolder: 'playwright-report' }],

    // json — machine-readable results for CI dashboards and custom tooling
    // Contains the complete test result tree in JSON format
    ['json', { outputFile: 'test-results/results.json' }],

    // summary — our custom reporter (built in Part 8)
    // Prints a grouped summary by module and severity after the run
    ['./reporters/SummaryReporter.ts'],

  ],

  // ─── Global Test Configuration ──────────────────────────────────────────────

  use: {
    baseURL:            env.baseURL,
    headless:           true,
    viewport:           { width: 1280, height: 720 },
    actionTimeout:      10_000,
    navigationTimeout:  30_000,

    // ─── Failure Capture — configured in Part 5 ───────────────────────────────
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
    trace:      'on-first-retry',
  },

  // ─── Projects ───────────────────────────────────────────────────────────────

  projects: [
    {
      name:  'admin',
      use:   { storageState: 'playwright/.auth/admin.json' },
      testMatch: ['**/pim/**', '**/admin/**', '**/leave/leave.spec.ts'],
    },
    {
      name:  'ess',
      use:   { storageState: 'playwright/.auth/ess.json' },
      testMatch: ['**/leave/apply.spec.ts'],
    },
    {
      name:  'no-auth',
      testMatch: ['**/login.spec.ts'],
    },
  ],

  globalSetup:   './global-setup.ts',
  retries:       1,
  workers:       2,
  timeout:       60_000,
  outputDir:     'test-results/',

});
```

### What each reporter produces

**`list`** — real-time terminal output:
```
  ✓ PIM — Add Employee [admin] (3.2s)
  ✓ PIM — Employee appears in list [admin] (1.8s)
  ✗ Admin — Add User [admin] (8.1s)
```

**`html`** — interactive report at `playwright-report/index.html`. Click any test to see its steps, screenshots, video, trace, and annotations. Filter by status, tag, project.

**`json`** — complete structured results at `test-results/results.json`. Every test, every step, every attachment. Used by CI dashboards and the custom reporter in Part 8.

**`SummaryReporter`** — our custom grouped summary, shown in Part 8.

---

## Part 5 — Screenshot, Video, and Trace on Failure

Three lines in `playwright.config.ts` that cost nothing to configure and save hours of debugging time.

```typescript
screenshot: 'only-on-failure',   // captures the page state at the moment of failure
video:      'retain-on-failure',  // records the full browser session, keeps it only if the test fails
trace:      'on-first-retry',     // records a full trace on the first retry — step by step replay
```

### What each captures

**Screenshot** — a PNG of the browser at the exact moment the test failed. Attached to the HTML report under the failing test. Shows you what the user would have seen.

**Video** — a full recording of the browser session from start to failure. Attached to the HTML report. Invaluable for failures that only happen in CI where you cannot see the browser.

**Trace** — Playwright's most powerful debugging tool. Records every action, every network request, every DOM snapshot throughout the test. Open with `npx playwright show-trace trace.zip` to replay the test step by step, inspect the DOM at any point, and see all network activity.

### Trace options explained

```typescript
trace: 'off'             // never record — fastest, no debugging info
trace: 'on'              // always record — slowest, captures everything
trace: 'on-first-retry'  // record only when a test is retried — best balance
trace: 'retain-on-failure' // record always, delete if test passes
```

`on-first-retry` is the recommended setting. Stable tests never record a trace — zero overhead. Flaky tests capture a trace on their first retry — exactly when you need it most.

### Viewing reports and traces

```bash
# Open the HTML report in your browser
npx playwright show-report

# Open a specific trace file
npx playwright show-trace test-results/trace.zip
```

---

## Part 6 — Test Annotations

Test annotations attach metadata to a test at runtime — after the test has started and has access to generated data. This metadata appears in the HTML report attached to that specific test result.

The critical use case: when a test fails, you want to know exactly what data was involved. Without annotations you see:

```
Error: Expected row "Alice Johnson" to be visible — element not found
```

With annotations you see:

```
Error: Expected row "Alice Johnson" to be visible — element not found

Annotations:
  empNumber:  EMP-A4KX92PL
  username:   alice.johnson.4821
  leaveId:    1047
```

Now you can reproduce the failure exactly — the employee ID and leave request ID are right there.

### How to add annotations

```typescript
test('admin can approve leave request', async ({ leaveListPage }, testInfo) => {
  const employee = generateEmployee();
  const empNumber = await employeeApi.create(employee);
  const leave     = generateLeave();
  const leaveId   = await leaveApi.createRequest(leave, empNumber);

  // Attach generated IDs to the test report
  // These appear in the HTML report under this test's details
  testInfo.annotations.push({ type: 'empNumber', description: empNumber });
  testInfo.annotations.push({ type: 'leaveId',   description: String(leaveId) });

  await leaveListPage.approveLeaveRequest(employee.fullName);
  await leaveListPage.assertLeaveApproved();
});
```

### Annotating in beforeAll

When using `beforeAll` for API setup, annotations must be added inside each test because `testInfo` belongs to the current test, not the describe block:

```typescript
test.describe('Admin — User Management', () => {

  let empNumber: string;
  let employee:  ReturnType<typeof generateEmployee>;
  let user:      ReturnType<typeof generateUser>;

  test.beforeAll(async ({ employeeApi }) => {
    employee  = generateEmployee();
    empNumber = await employeeApi.create(employee);
    user      = generateUser(employee);
  });

  test('admin can add a new system user', async ({ addUserPage }, testInfo) => {
    // Attach the empNumber so failures show what employee was involved
    testInfo.annotations.push({ type: 'empNumber',  description: empNumber });
    testInfo.annotations.push({ type: 'username',   description: user.username });

    await addUserPage.addUser(user);
    await addUserPage.assertUserSavedSuccessfully();
  });

});
```

---

## Part 7 — Custom Summary Reporter

The built-in reporters show you what passed and what failed. The custom reporter shows you what it means — grouped by module and severity, with failed tests listed explicitly.

```typescript
// reporters/SummaryReporter.ts
import {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
  Suite,
} from '@playwright/test/reporter';

interface TestRecord {
  title:    string;
  status:   string;
  tags:     string[];
  duration: number;
}

export default class SummaryReporter implements Reporter {

  private results: TestRecord[] = [];

  // Called when each test finishes
  onTestEnd(test: TestCase, result: TestResult): void {
    this.results.push({
      title:    test.title,
      status:   result.status,
      tags:     test.tags,
      duration: result.duration,
    });
  }

  // Called when the entire run finishes — print the summary
  onEnd(result: FullResult): void {
    const passed  = this.results.filter(r => r.status === 'passed');
    const failed  = this.results.filter(r => r.status === 'failed');
    const skipped = this.results.filter(r => r.status === 'skipped');
    const flaky   = this.results.filter(r => r.status === 'flaky');

    const totalMs  = this.results.reduce((sum, r) => sum + r.duration, 0);
    const totalSec = (totalMs / 1000).toFixed(1);

    console.log('\n' + '─'.repeat(60));
    console.log('  TEST RUN SUMMARY');
    console.log('─'.repeat(60));

    // ─── Overall counts ──────────────────────────────────────────────────────

    console.log(
      `\n  ✅ Passed:  ${String(passed.length).padEnd(4)}` +
      `❌ Failed:  ${String(failed.length).padEnd(4)}` +
      `⏭  Skipped: ${String(skipped.length).padEnd(4)}` +
      (flaky.length ? `⚠️  Flaky: ${flaky.length}` : '') +
      `\n  ⏱  Duration: ${totalSec}s`
    );

    // ─── Results by module ────────────────────────────────────────────────────

    const modules = ['@login', '@pim', '@admin', '@leave'];
    console.log('\n  By Module:');

    for (const mod of modules) {
      const modResults = this.results.filter(r => r.tags.includes(mod));
      if (modResults.length === 0) continue;

      const modPassed = modResults.filter(r => r.status === 'passed').length;
      const modFailed = modResults.filter(r => r.status === 'failed').length;
      const label     = mod.padEnd(10);

      const status = modFailed > 0
        ? `❌  ${modPassed} passed   ${modFailed} failed`
        : `✅  ${modPassed} passed`;

      console.log(`    ${label}  ${status}`);
    }

    // ─── Failed tests ─────────────────────────────────────────────────────────

    if (failed.length > 0) {
      console.log('\n  Failed Tests:');
      for (const f of failed) {
        const severity = f.tags.find(t =>
          ['@critical', '@high', '@medium', '@low'].includes(t)
        ) ?? '@unknown';
        console.log(`    ❌ [${severity.replace('@', '')}]  ${f.title}`);
      }
    }

    // ─── Flaky tests ──────────────────────────────────────────────────────────

    if (flaky.length > 0) {
      console.log('\n  Flaky Tests (passed on retry):');
      for (const f of flaky) {
        console.log(`    ⚠️  ${f.title}`);
      }
    }

    console.log('\n' + '─'.repeat(60) + '\n');
  }

}
```

### Example output

```
────────────────────────────────────────────────────────────
  TEST RUN SUMMARY
────────────────────────────────────────────────────────────

  ✅ Passed:  49    ❌ Failed:  3     ⏭  Skipped: 1
  ⏱  Duration: 127.4s

  By Module:
    @login      ✅  4 passed
    @pim        ✅  18 passed
    @admin      ❌  10 passed   2 failed
    @leave      ❌  17 passed   1 failed

  Failed Tests:
    ❌ [critical]  Admin — Add User — employee name autocomplete failed
    ❌ [high]      Admin — Search User — unexpected empty results
    ❌ [high]      Leave — Approve Request — confirmation dialog not found

────────────────────────────────────────────────────────────
```

A QA lead reads this in five seconds. Two admin failures, one leave failure. Both admin failures are in the user management flow — likely the same root cause. Investigate there first.

---

## Part 8 — Updating Tests

Every test gets three tags and, where API setup is used, annotations for the generated data IDs.

### tests/login.spec.ts

```typescript
// tests/login.spec.ts
import { test, expect } from '../fixtures';

test.describe('Login', () => {

  test('valid credentials log in successfully',
    { tag: ['@login', '@smoke', '@critical'] },
    async ({ page, loginPage, dashboardPage }) => {
      await loginPage.goto();
      await loginPage.login('Admin', 'admin123');
      await dashboardPage.assertPageLoaded();
    }
  );

  test('invalid password shows error message',
    { tag: ['@login', '@regression', '@high'] },
    async ({ page, loginPage }) => {
      await loginPage.goto();
      await loginPage.login('Admin', 'wrongpassword');
      await loginPage.assertInvalidCredentialsError();
    }
  );

  test('empty username shows validation error',
    { tag: ['@login', '@regression', '@medium'] },
    async ({ page, loginPage }) => {
      await loginPage.goto();
      await loginPage.login('', 'admin123');
      await loginPage.assertUsernameRequiredError();
    }
  );

});
```

---

### tests/pim/employee.spec.ts

```typescript
// tests/pim/employee.spec.ts
import { test, expect }     from '../../fixtures';
import { generateEmployee } from '../../data/generate';

test.describe('PIM — Employee Management', () => {

  test('admin can add a new employee via UI',
    { tag: ['@pim', '@smoke', '@critical'] },
    async ({ addEmployeePage, employeeListPage }, testInfo) => {
      const employee = generateEmployee();

      // Attach generated data — failures show exactly which employee was involved
      testInfo.annotations.push({ type: 'employeeId', description: employee.employeeId });
      testInfo.annotations.push({ type: 'fullName',   description: employee.fullName });

      await addEmployeePage.addEmployee(employee);
      await addEmployeePage.assertEmployeeSavedSuccessfully();
      await addEmployeePage.assertRedirectedToPersonalDetails();

      await employeeListPage.goto();
      await employeeListPage.searchByEmployeeName(employee.firstName);
      await employeeListPage.assertEmployeeExistsInList(employee.fullName);
    }
  );

  test('search with non-existent name shows no records found',
    { tag: ['@pim', '@regression', '@medium'] },
    async ({ employeeListPage }) => {
      const phantom = generateEmployee();
      await employeeListPage.searchByEmployeeName(phantom.firstName + phantom.employeeId);
      await employeeListPage.assertNoRecordsFound();
    }
  );

});
```

---

### tests/admin/user.spec.ts

```typescript
// tests/admin/user.spec.ts
import { test, expect }                from '../../fixtures';
import { generateEmployee, generateUser } from '../../data/generate';

test.describe('Admin — User Management', () => {

  let empNumber: string;
  let employee:  ReturnType<typeof generateEmployee>;
  let user:      ReturnType<typeof generateUser>;

  test.beforeAll(async ({ employeeApi }) => {
    employee  = generateEmployee();
    empNumber = await employeeApi.create(employee);
    user      = generateUser(employee);
  });

  test.afterAll(async ({ employeeApi }) => {
    if (empNumber) await employeeApi.delete(empNumber);
  });

  test('admin can add a new system user',
    { tag: ['@admin', '@smoke', '@critical'] },
    async ({ userManagementPage, addUserPage }, testInfo) => {
      testInfo.annotations.push({ type: 'empNumber', description: empNumber });
      testInfo.annotations.push({ type: 'username',  description: user.username });

      await userManagementPage.clickAddUser();
      await addUserPage.assertPageLoaded();
      await addUserPage.addUser(user);
      await addUserPage.assertUserSavedSuccessfully();
    }
  );

  test('newly created user appears in user management list',
    { tag: ['@admin', '@regression', '@high'] },
    async ({ userManagementPage }, testInfo) => {
      testInfo.annotations.push({ type: 'username', description: user.username });

      await userManagementPage.searchByUsername(user.username);
      await userManagementPage.assertUserExistsInList(user.username);
    }
  );

  test('search with non-existent username shows no records found',
    { tag: ['@admin', '@regression', '@medium'] },
    async ({ userManagementPage }) => {
      const phantom = generateUser(generateEmployee());
      await userManagementPage.searchByUsername(phantom.username + 'NOTEXIST');
      await userManagementPage.assertNoRecordsFound();
    }
  );

});
```

---

### tests/leave/leave.spec.ts

```typescript
// tests/leave/leave.spec.ts
import { test, expect }                    from '../../fixtures';
import { generateEmployee, generateLeave } from '../../data/generate';
import { readLeavePolicy, readEmployees }  from '../../data/readers';

const policy = readLeavePolicy();

test.describe('Leave — Apply Workflow (ESS)', () => {

  test('ESS user can submit a leave application',
    { tag: ['@leave', '@smoke', '@critical'] },
    async ({ applyLeavePage }, testInfo) => {
      const leave = generateLeave();

      testInfo.annotations.push({ type: 'leaveType', description: leave.leaveType });
      testInfo.annotations.push({ type: 'fromDate',  description: leave.fromDate });

      await applyLeavePage.applyForLeave(leave);
      await applyLeavePage.assertLeaveApplicationSubmitted();
    }
  );

  test('generated leave type is valid according to policy',
    { tag: ['@leave', '@regression', '@medium'] },
    async ({}) => {
      const leave = generateLeave();
      expect(policy.leaveTypes).toContain(leave.leaveType);
    }
  );

});

test.describe('Leave — Approve Workflow (Admin)', () => {

  let empNumber: string;
  let leaveId:   number;
  let employee:  ReturnType<typeof generateEmployee>;

  test.beforeAll(async ({ employeeApi, leaveApi }) => {
    employee  = generateEmployee();
    empNumber = await employeeApi.create(employee);
    const leave = generateLeave();
    leaveId   = await leaveApi.createRequest(leave, empNumber);
  });

  test.afterAll(async ({ employeeApi }) => {
    if (empNumber) await employeeApi.delete(empNumber);
  });

  test('admin can see pending leave request in leave list',
    { tag: ['@leave', '@smoke', '@high'] },
    async ({ leaveListPage }, testInfo) => {
      testInfo.annotations.push({ type: 'empNumber', description: empNumber });
      testInfo.annotations.push({ type: 'leaveId',   description: String(leaveId) });

      await leaveListPage.assertLeaveRequestVisible(employee.fullName);
      await leaveListPage.assertLeaveRequestStatus(employee.fullName, 'Pending');
    }
  );

  test('admin can approve a leave request',
    { tag: ['@leave', '@smoke', '@critical'] },
    async ({ leaveListPage }, testInfo) => {
      testInfo.annotations.push({ type: 'empNumber', description: empNumber });
      testInfo.annotations.push({ type: 'leaveId',   description: String(leaveId) });

      await leaveListPage.approveLeaveRequest(employee.fullName);
      await leaveListPage.assertLeaveApproved();
    }
  );

});

// ─── Data-Driven ──────────────────────────────────────────────────────────────

const employeeDataset = readEmployees();

test.describe('PIM — Data-Driven Employee Creation', () => {

  for (const emp of employeeDataset) {
    test(`can add employee: ${emp.firstName} ${emp.lastName}`,
      { tag: ['@pim', '@regression', '@medium'] },
      async ({ addEmployeePage }) => {
        await addEmployeePage.addEmployee(emp);
        await addEmployeePage.assertEmployeeSavedSuccessfully();
      }
    );
  }

});
```

---

## Part 9 — What Level 7 Does Not Solve

### Test execution is still local and sequential

The entire suite runs on one machine, in sequence, triggered manually. There is no automated trigger on pull requests. No parallel execution across multiple workers in CI. No nightly regression schedule. No quality gate that blocks a merge if smoke tests fail.

**Level 8** puts the framework into GitHub Actions — parallel execution, retry strategy, smoke tests gating pull requests, nightly regression, and test results published to the Actions summary.

---

> **You are ready for Level 8** when your reports are clean and meaningful and you want the suite running automatically — on every PR, on a schedule, and with results visible without leaving GitHub.

---

### Quick Reference — What Changed at Level 7

| File | Change |
|------|--------|
| `playwright.config.ts` | Updated — reporters, screenshot, video, trace configured |
| `reporters/SummaryReporter.ts` | Created — custom grouped summary reporter |
| `tests/login.spec.ts` | Updated — tags on every test |
| `tests/pim/employee.spec.ts` | Updated — tags and annotations |
| `tests/admin/user.spec.ts` | Updated — tags and annotations |
| `tests/leave/leave.spec.ts` | Updated — tags and annotations |
| `pages/**` | No changes |
| `helpers/**` | No changes |
| `fixtures/**` | No changes |
| `data/**` | No changes |
| `api/**` | No changes |

---

*Level 7 of 9 — Playwright TypeScript · OrangeHRM · Enterprise POM Framework*
*(Level 0 covers theory and setup — this series runs from Level 0 through Level 9)*
