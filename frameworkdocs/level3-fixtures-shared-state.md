# Level 3 — Fixtures & Shared State
### Playwright · TypeScript · OrangeHRM Demo Application

> **Prerequisites:** Levels 1 and 2 must be complete. You should have a working `BasePage`, seven page objects, and three passing test files before starting this level.
> **What you will have by the end:** A custom fixture system that injects pre-authenticated sessions and page objects directly into tests. Login steps disappear from every test file. The Leave module is introduced with two new page objects and multi-role test scenarios.
> **What changes:** Test files are rewritten to use fixtures — they become significantly shorter and more readable. Page objects are unchanged.
> **Next level:** Level 4 introduces reusable web action helpers — eliminating repeated interaction patterns across page objects.

---

## 📋 Table of Contents

- [Part 1 — The Problem Level 2 Left Behind](#part-1--the-problem-level-2-left-behind)
- [Part 2 — What Fixtures Are and How They Work](#part-2--what-fixtures-are-and-how-they-work)
- [Part 3 — Authentication State — The Core Concept](#part-3--authentication-state--the-core-concept)
- [Part 4 — Project Structure at Level 3](#part-4--project-structure-at-level-3)
- [Part 5 — Setting Up Authentication State Files](#part-5--setting-up-authentication-state-files)
- [Part 6 — Building the Fixture System](#part-6--building-the-fixture-system)
- [Part 7 — Leave Module Page Objects](#part-7--leave-module-page-objects)
- [Part 8 — Rewriting Tests to Use Fixtures](#part-8--rewriting-tests-to-use-fixtures)
- [Part 9 — playwright.config.ts Updates](#part-9--playwrightconfigts-updates)
- [Part 10 — What Level 3 Does Not Solve](#part-10--what-level-3-does-not-solve)

---

## Part 1 — The Problem Level 2 Left Behind

Open any test file from Level 2. Every describe block starts with the same three lines:

```typescript
test.beforeEach(async ({ page }) => {
  loginPage     = new LoginPage(page);
  dashboardPage = new DashboardPage(page);

  await loginPage.goto();
  await loginPage.login('Admin', 'admin123');
  await dashboardPage.assertPageLoaded();
});
```

With three test files you have three copies. As the suite grows — PIM tests, Admin tests, Leave tests, each with multiple describe blocks — every single one repeats the same login ceremony.

This creates two problems:

**Speed** — every test drives the full login UI flow. Each login takes 2–4 seconds on the shared OrangeHRM demo site. A suite of 50 tests that all log in separately wastes 2–3 minutes just on repeated authentication that adds zero testing value.

**Noise** — the login code in `beforeEach` is setup infrastructure, not test logic. It occupies space in every test file and distracts from what the test is actually doing.

Level 3 solves both with Playwright's fixture system combined with shared authentication state.

---

## Part 2 — What Fixtures Are and How They Work

### The Idea

Playwright fixtures are a dependency injection system for tests. Instead of a test creating and setting up everything it needs itself, fixtures prepare those things and inject them as parameters.

You have already been using a built-in Playwright fixture without knowing it — `{ page }`:

```typescript
test('some test', async ({ page }) => {
  // page is injected by Playwright's built-in fixture
  // You never create it yourself — Playwright handles it
});
```

`page` is a fixture. Playwright creates a new browser page, injects it into the test, and cleans it up when the test finishes. You never call `new Page()` or worry about teardown.

Custom fixtures work exactly the same way — but you define them. Instead of just `page`, your tests can receive `adminPage`, `essPage`, `employeeListPage` — fully configured objects injected and ready to use.

### Before Fixtures — Level 2

```typescript
test('admin can add a new employee', async ({ page }) => {
  // Test has to set everything up itself
  const loginPage        = new LoginPage(page);
  const dashboardPage    = new DashboardPage(page);
  const employeeListPage = new EmployeeListPage(page);
  const addEmployeePage  = new AddEmployeePage(page);

  await loginPage.goto();
  await loginPage.login('Admin', 'admin123');
  await dashboardPage.assertPageLoaded();
  await employeeListPage.goto();

  // Now the actual test begins — but we are already 5 lines in
  await employeeListPage.clickAddEmployee();
  // ...
});
```

### After Fixtures — Level 3

```typescript
test('admin can add a new employee', async ({ employeeListPage, addEmployeePage }) => {
  // employeeListPage is injected — already authenticated and navigated
  // Test starts immediately with what it is actually testing
  await employeeListPage.clickAddEmployee();
  await addEmployeePage.assertPageLoaded();
  await addEmployeePage.addEmployee('Alice', 'Johnson', 'EMP-001');
  await addEmployeePage.assertEmployeeSavedSuccessfully();
});
```

The fixture handles authentication, navigation, and page object instantiation. The test focuses entirely on its scenario.

### How Fixtures Are Defined

Fixtures are defined by extending Playwright's base `test` object:

```typescript
import { test as base } from '@playwright/test';

// Define your custom fixtures
const test = base.extend<{
  adminPage:        DashboardPage;
  employeeListPage: EmployeeListPage;
}>({
  // Each fixture is an async function
  // { page } is injected by Playwright — it is the authenticated browser page
  adminPage: async ({ page }, use) => {
    // SETUP — runs before the test
    const dashboardPage = new DashboardPage(page);
    // ... authentication happens here
    await use(dashboardPage);  // inject into test
    // TEARDOWN — runs after the test (if needed)
  },
});

export { test };
```

The `use()` call is the boundary between setup and teardown. Code before `use()` runs before the test. Code after `use()` runs after the test.

---

## Part 3 — Authentication State — The Core Concept

### The Problem With UI Login in Every Test

Driving the login form for every test is slow and fragile. The login page is UI. It can have its own flakiness — slow network, server hiccup, rate limiting on the shared demo site. When a login step fails, the test that depends on it fails too — for the wrong reason. Your PIM employee test should not fail because the login page was slow.

### Playwright's storageState Solution

Playwright can save the entire browser authentication state — cookies, local storage, session storage — to a JSON file after a successful login. Any subsequent test that loads this state file starts with the browser already authenticated. No login form. No credentials. No UI interaction at all.

```
Normal test flow (Level 2):
  Browser opens → Navigate to /login → Fill username → Fill password → Click Login
  → Verify dashboard → [Test scenario] → 3-4 seconds wasted per test

With storageState (Level 3):
  Browser opens → Load auth state → [Test scenario] → 0 seconds wasted
```

### How It Works Step by Step

**Step 1** — A one-time global setup script runs before any tests. It opens a browser, logs in via UI, and saves the browser state to a JSON file (`playwright/.auth/admin.json`).

**Step 2** — Tests that need authentication load this file as their starting state. The browser wakes up already logged in.

**Step 3** — When the auth state expires or changes (demo site resets, password changes), you re-run the setup script. Tests themselves never change.

### Two Authentication States We Need

We use three user types across OrangeHRM:

| State File | User | Role | Used By |
|------------|------|------|---------|
| `playwright/.auth/admin.json` | Admin | Admin | All admin tests |
| `playwright/.auth/ess.json` | alice.johnson | ESS | Leave apply tests |

The ESS user (`alice.johnson`) was created in Level 1. From Level 3 onwards, this user has its own authenticated session for testing ESS-specific workflows like applying for leave.

---

## Part 4 — Project Structure at Level 3

```
orangehrm-automation/
│
├── playwright/
│   └── .auth/                          ← NEW — authentication state files
│       ├── admin.json                  ← generated by global setup
│       └── ess.json                    ← generated by global setup
│
├── pages/                              ← NO CHANGES to existing page objects
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── pim/
│   │   ├── EmployeeListPage.ts
│   │   ├── AddEmployeePage.ts
│   │   └── PersonalDetailsPage.ts
│   ├── admin/
│   │   ├── UserManagementPage.ts
│   │   └── AddUserPage.ts
│   └── leave/
│       ├── ApplyLeavePage.ts           ← NEW — ESS user applies for leave
│       └── LeaveListPage.ts            ← NEW — Admin manages leave requests
│
├── fixtures/                           ← NEW — custom fixture definitions
│   └── index.ts                        ← exports extended test with all fixtures
│
├── tests/
│   ├── login.spec.ts                   ← updated to use fixtures
│   ├── pim/
│   │   └── employee.spec.ts            ← updated to use fixtures
│   ├── admin/
│   │   └── user.spec.ts                ← updated to use fixtures
│   └── leave/
│       └── leave.spec.ts               ← NEW — leave workflow tests
│
├── global-setup.ts                     ← NEW — one-time auth state generation
├── playwright.config.ts                ← updated — globalSetup, storageState
├── tsconfig.json
├── package.json
└── .gitignore
```

### Important — Add `.auth` to `.gitignore`

Authentication state files contain session tokens. They must never be committed to version control:

```
# .gitignore — add these lines
playwright/.auth/
test-results/
playwright-report/
node_modules/
.env
```

---

## Part 5 — Setting Up Authentication State Files

### global-setup.ts

This script runs once before any tests. It logs in as each user type and saves the browser state.

```typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig): Promise<void> {
  const { baseURL } = config.projects[0].use;
  const browser     = await chromium.launch();

  // ─── Save Admin Authentication State ─────────────────────────────────────────

  const adminContext = await browser.newContext();
  const adminPage    = await adminContext.newPage();

  await adminPage.goto(`${baseURL}/web/index.php/auth/login`);
  await adminPage.getByPlaceholder('Username').fill('Admin');
  await adminPage.getByPlaceholder('Password').fill('admin123');
  await adminPage.getByRole('button', { name: 'Login' }).click();

  // Wait until we are on the dashboard — confirms login succeeded
  await adminPage.waitForURL(/dashboard/);

  // Save the authenticated state to a file
  // All future tests that load this file start already logged in as Admin
  await adminContext.storageState({ path: 'playwright/.auth/admin.json' });
  await adminContext.close();

  console.log('✅ Admin authentication state saved');

  // ─── Save ESS User Authentication State ──────────────────────────────────────

  const essContext = await browser.newContext();
  const essPage    = await essContext.newPage();

  await essPage.goto(`${baseURL}/web/index.php/auth/login`);
  await essPage.getByPlaceholder('Username').fill('alice.johnson');
  await essPage.getByPlaceholder('Password').fill('Alice@1234');
  await essPage.getByRole('button', { name: 'Login' }).click();

  await essPage.waitForURL(/dashboard/);

  await essContext.storageState({ path: 'playwright/.auth/ess.json' });
  await essContext.close();

  console.log('✅ ESS user authentication state saved');

  await browser.close();
}

export default globalSetup;
```

### Create the `.auth` Directory

The `.auth` directory must exist before `global-setup.ts` tries to write to it:

```bash
mkdir -p playwright/.auth
```

---

## Part 6 — Building the Fixture System

### fixtures/index.ts

All custom fixtures are defined in a single file and exported as an extended `test` object. Every test file imports `test` from this file instead of from `@playwright/test` directly.

```typescript
// fixtures/index.ts
import { test as base, expect } from '@playwright/test';

import { DashboardPage }        from '../pages/DashboardPage';
import { EmployeeListPage }     from '../pages/pim/EmployeeListPage';
import { AddEmployeePage }      from '../pages/pim/AddEmployeePage';
import { PersonalDetailsPage }  from '../pages/pim/PersonalDetailsPage';
import { UserManagementPage }   from '../pages/admin/UserManagementPage';
import { AddUserPage }          from '../pages/admin/AddUserPage';
import { ApplyLeavePage }       from '../pages/leave/ApplyLeavePage';
import { LeaveListPage }        from '../pages/leave/LeaveListPage';

// ─── Fixture Type Definitions ─────────────────────────────────────────────────
// Declares what each fixture provides to tests

type OrangeHRMFixtures = {
  // Authenticated sessions
  adminDashboard:  DashboardPage;    // admin logged in, on dashboard
  essDashboard:    DashboardPage;    // ESS user logged in, on dashboard

  // PIM fixtures — admin authenticated, page navigated
  employeeListPage:    EmployeeListPage;
  addEmployeePage:     AddEmployeePage;
  personalDetailsPage: PersonalDetailsPage;

  // Admin fixtures — admin authenticated, page navigated
  userManagementPage:  UserManagementPage;
  addUserPage:         AddUserPage;

  // Leave fixtures
  applyLeavePage:  ApplyLeavePage;  // ESS user authenticated
  leaveListPage:   LeaveListPage;   // admin authenticated
};

// ─── Extended Test Object ─────────────────────────────────────────────────────
// Import this instead of @playwright/test in all test files

const test = base.extend<OrangeHRMFixtures>({

  // ─── Authenticated Session Fixtures ──────────────────────────────────────────

  // Provides a DashboardPage with an active admin session.
  // The storageState is loaded from the file saved by global-setup.ts.
  // Tests receive this already on the Dashboard — no login steps needed.
  adminDashboard: async ({ page }, use) => {
    const dashboard = new DashboardPage(page);
    await dashboard.assertPageLoaded();
    await use(dashboard);
  },

  // Provides a DashboardPage with an active ESS user session.
  essDashboard: async ({ page }, use) => {
    const dashboard = new DashboardPage(page);
    await dashboard.assertPageLoaded();
    await use(dashboard);
  },

  // ─── PIM Fixtures ─────────────────────────────────────────────────────────────

  // Provides an EmployeeListPage — admin authenticated, page loaded.
  employeeListPage: async ({ page }, use) => {
    const employeeList = new EmployeeListPage(page);
    await employeeList.goto();
    await employeeList.assertPageLoaded();
    await use(employeeList);
  },

  // Provides an AddEmployeePage — admin authenticated, navigated to add form.
  addEmployeePage: async ({ page }, use) => {
    const addEmployee = new AddEmployeePage(page);
    await addEmployee.goto();
    await addEmployee.assertPageLoaded();
    await use(addEmployee);
  },

  // Provides a PersonalDetailsPage — admin authenticated.
  // Does not navigate automatically — employee ID is required to navigate.
  personalDetailsPage: async ({ page }, use) => {
    const personalDetails = new PersonalDetailsPage(page);
    await use(personalDetails);
  },

  // ─── Admin Fixtures ───────────────────────────────────────────────────────────

  // Provides a UserManagementPage — admin authenticated, page loaded.
  userManagementPage: async ({ page }, use) => {
    const userManagement = new UserManagementPage(page);
    await userManagement.goto();
    await userManagement.assertPageLoaded();
    await use(userManagement);
  },

  // Provides an AddUserPage — admin authenticated, navigated to add form.
  addUserPage: async ({ page }, use) => {
    const addUser = new AddUserPage(page);
    await addUser.goto();
    await addUser.assertPageLoaded();
    await use(addUser);
  },

  // ─── Leave Fixtures ───────────────────────────────────────────────────────────

  // Provides an ApplyLeavePage — ESS user authenticated, navigated to apply form.
  applyLeavePage: async ({ page }, use) => {
    const applyLeave = new ApplyLeavePage(page);
    await applyLeave.goto();
    await applyLeave.assertPageLoaded();
    await use(applyLeave);
  },

  // Provides a LeaveListPage — admin authenticated, navigated to leave list.
  leaveListPage: async ({ page }, use) => {
    const leaveList = new LeaveListPage(page);
    await leaveList.goto();
    await leaveList.assertPageLoaded();
    await use(leaveList);
  },

});

// Re-export expect so test files only need one import
export { test, expect };
```

### How the storageState Reaches the Fixtures

The fixtures themselves do not load the storage state file directly — `playwright.config.ts` does. We configure two separate Playwright projects: one that uses the admin state and one that uses the ESS state. Fixtures pick up whichever state their project has loaded. This is configured in Part 9.

---

## Part 7 — Leave Module Page Objects

The Leave module introduces a two-role workflow. An ESS user applies for leave. An admin user sees the pending request and approves or rejects it. This is a fundamentally different interaction pattern from the CRUD operations in PIM and Admin.

### leave/ApplyLeavePage.ts

```typescript
// pages/leave/ApplyLeavePage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';

export class ApplyLeavePage extends BasePage {

  private readonly pageHeading:      Locator;
  private readonly leaveTypeDropdown:Locator;
  private readonly fromDateInput:    Locator;
  private readonly toDateInput:      Locator;
  private readonly commentInput:     Locator;
  private readonly applyButton:      Locator;
  private readonly successToast:     Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading       = this.page.getByRole('heading', { name: 'Apply Leave' })
                                      .describe('Apply leave page heading');
    this.leaveTypeDropdown = this.page.locator('.oxd-select-text').first()
                                      .describe('Leave type dropdown');
    this.fromDateInput     = this.page.getByPlaceholder('yyyy-dd-mm').first()
                                      .describe('Leave from date input');
    this.toDateInput       = this.page.getByPlaceholder('yyyy-dd-mm').nth(1)
                                      .describe('Leave to date input');
    this.commentInput      = this.page.locator('textarea.oxd-textarea')
                                      .describe('Leave application comment textarea');
    this.applyButton       = this.page.getByRole('button', { name: 'Apply' })
                                      .describe('Submit leave application button');
    this.successToast      = this.page.locator('.oxd-toast-content')
                                      .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/leave/applyLeave');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async selectLeaveType(leaveType: string): Promise<void> {
    await this.leaveTypeDropdown.click();
    await this.page.getByRole('option', { name: leaveType }).click();
  }

  async fillFromDate(date: string): Promise<void> {
    await this.fromDateInput.fill(date);
    await this.fromDateInput.press('Enter');
  }

  async fillToDate(date: string): Promise<void> {
    await this.toDateInput.fill(date);
    await this.toDateInput.press('Enter');
  }

  async fillComment(comment: string): Promise<void> {
    await this.commentInput.fill(comment);
  }

  async submitLeaveApplication(): Promise<void> {
    await this.applyButton.click();
  }

  async applyForLeave(
    leaveType: string,
    fromDate:  string,
    toDate:    string,
    comment?:  string
  ): Promise<void> {
    await this.selectLeaveType(leaveType);
    await this.fillFromDate(fromDate);
    await this.fillToDate(toDate);
    if (comment) {
      await this.fillComment(comment);
    }
    await this.submitLeaveApplication();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/applyLeave/);
    await expect(this.pageHeading).toBeVisible();
    await expect(this.leaveTypeDropdown).toBeVisible();
  }

  async assertLeaveApplicationSubmitted(): Promise<void> {
    await expect(this.successToast).toBeVisible();
  }
}
```

---

### leave/LeaveListPage.ts

```typescript
// pages/leave/LeaveListPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';

export class LeaveListPage extends BasePage {

  private readonly pageHeading:       Locator;
  private readonly leaveTable:        Locator;
  private readonly noRecordsMessage:  Locator;
  private readonly approveButton:     Locator;
  private readonly rejectButton:      Locator;
  private readonly confirmButton:     Locator;
  private readonly successToast:      Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading      = this.page.getByRole('heading', { name: 'Leave List' })
                                     .describe('Leave list page heading');
    this.leaveTable       = this.page.locator('.oxd-table-body')
                                     .describe('Leave requests table body');
    this.noRecordsMessage = this.page.getByText('No Records Found')
                                     .describe('No records found message');
    this.approveButton    = this.page.getByRole('button', { name: 'Approve' })
                                     .describe('Approve leave request button');
    this.rejectButton     = this.page.getByRole('button', { name: 'Reject' })
                                     .describe('Reject leave request button');
    this.confirmButton    = this.page.getByRole('button', { name: 'Ok' })
                                     .describe('Confirm action dialog button');
    this.successToast     = this.page.locator('.oxd-toast-content')
                                     .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/leave/viewLeaveList');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async approveLeaveRequest(employeeName: string): Promise<void> {
    const row = this.leaveTable
      .getByRole('row', { name: new RegExp(employeeName, 'i') });
    await row.getByRole('button', { name: 'Approve' }).click();
    await this.confirmButton.click();
  }

  async rejectLeaveRequest(employeeName: string): Promise<void> {
    const row = this.leaveTable
      .getByRole('row', { name: new RegExp(employeeName, 'i') });
    await row.getByRole('button', { name: 'Reject' }).click();
    await this.confirmButton.click();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/viewLeaveList/);
    await expect(this.pageHeading).toBeVisible();
  }

  async assertLeaveRequestVisible(employeeName: string): Promise<void> {
    await expect(
      this.leaveTable.getByRole('row', { name: new RegExp(employeeName, 'i') })
    ).toBeVisible();
  }

  async assertLeaveRequestStatus(
    employeeName: string,
    expectedStatus: 'Pending' | 'Approved' | 'Rejected'
  ): Promise<void> {
    const row = this.leaveTable
      .getByRole('row', { name: new RegExp(employeeName, 'i') });
    await expect(row.getByText(expectedStatus)).toBeVisible();
  }

  async assertNoRecordsFound(): Promise<void> {
    await expect(this.noRecordsMessage).toBeVisible();
  }

  async assertLeaveApproved(): Promise<void> {
    await expect(this.successToast).toBeVisible();
  }
}
```

---

## Part 8 — Rewriting Tests to Use Fixtures

Test files now import `test` from `fixtures/index.ts` instead of `@playwright/test`. The `beforeEach` login setup is gone entirely. Tests receive ready-to-use page objects directly.

### tests/login.spec.ts

Login tests are a special case — they specifically test the login form, so they cannot use a pre-authenticated fixture. They still use `@playwright/test` directly and the `LoginPage` explicitly.

```typescript
// tests/login.spec.ts
// Login tests intentionally do NOT use authenticated fixtures
// because they are testing the login page itself
import { test, expect } from '@playwright/test';
import { LoginPage }     from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Login', () => {

  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.assertPageLoaded();
  });

  test('valid admin credentials redirect to dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await loginPage.login('Admin', 'admin123');
    await dashboardPage.assertPageLoaded();
  });

  test('invalid password shows error message', async () => {
    await loginPage.login('Admin', 'wrongpassword');
    await loginPage.assertInvalidCredentialsError();
  });

  test('invalid username shows error message', async () => {
    await loginPage.login('nonexistentuser', 'admin123');
    await loginPage.assertInvalidCredentialsError();
  });

  test('empty username shows required field error', async () => {
    await loginPage.fillPassword('admin123');
    await loginPage.clickLogin();
    await loginPage.assertUsernameRequiredError();
  });

});
```

> Login tests do not use fixtures because they specifically test the login flow itself. Using a pre-authenticated session would bypass the thing being tested.

---

### tests/pim/employee.spec.ts

```typescript
// tests/pim/employee.spec.ts
import { test, expect }     from '../../fixtures';
import { AddEmployeePage }  from '../../pages/pim/AddEmployeePage';

const newEmployee = {
  firstName:  'Bob',
  lastName:   'Williams',
  employeeId: 'EMP-L3-001',
  fullName:   'Bob Williams',
};

test.describe('PIM — Employee Management', () => {

  test('admin can navigate to employee list from dashboard', async ({ adminDashboard, employeeListPage }) => {
    // adminDashboard — already logged in as admin, on the dashboard
    // employeeListPage — already navigated to the employee list
    await employeeListPage.assertPageLoaded();
  });

  test('admin can add a new employee', async ({ addEmployeePage, employeeListPage }) => {
    await addEmployeePage.addEmployee(
      newEmployee.firstName,
      newEmployee.lastName,
      newEmployee.employeeId
    );

    await addEmployeePage.assertEmployeeSavedSuccessfully();
    await addEmployeePage.assertRedirectedToPersonalDetails();
  });

  test('newly added employee appears in the employee list', async ({ employeeListPage }) => {
    await employeeListPage.searchByEmployeeName(newEmployee.firstName);
    await employeeListPage.assertEmployeeExistsInList(newEmployee.fullName);
  });

  test('search with non-existent name shows no records found', async ({ employeeListPage }) => {
    await employeeListPage.searchByEmployeeName('ZZZNONEXISTENT999');
    await employeeListPage.assertNoRecordsFound();
  });

});
```

**Compare with Level 2:** Each test went from 8–10 lines of setup + test to 3–5 lines of pure test logic. The `beforeEach` block is gone entirely.

---

### tests/admin/user.spec.ts

```typescript
// tests/admin/user.spec.ts
import { test, expect } from '../../fixtures';

const newUser = {
  role:         'ESS'           as const,
  employeeName: 'Alice Johnson',
  status:       'Enabled'       as const,
  username:     'alice.johnson2',
  password:     'Alice@1234',
};

test.describe('Admin — User Management', () => {

  test('admin can navigate to user management from dashboard', async ({ adminDashboard, userManagementPage }) => {
    await userManagementPage.assertPageLoaded();
  });

  test('admin can add a new system user linked to an employee', async ({ userManagementPage, addUserPage }) => {
    await userManagementPage.clickAddUser();
    await addUserPage.assertPageLoaded();
    await addUserPage.addUser(
      newUser.role,
      newUser.employeeName,
      newUser.status,
      newUser.username,
      newUser.password
    );
    await addUserPage.assertUserSavedSuccessfully();
  });

  test('newly created user appears in the user management list', async ({ userManagementPage }) => {
    await userManagementPage.searchByUsername(newUser.username);
    await userManagementPage.assertUserExistsInList(newUser.username);
  });

  test('search with non-existent username shows no records found', async ({ userManagementPage }) => {
    await userManagementPage.searchByUsername('ZZZNONEXISTENT999');
    await userManagementPage.assertNoRecordsFound();
  });

});
```

---

### tests/leave/leave.spec.ts

This is the first test file that uses two different authenticated roles in the same suite. The ESS user applies for leave and the Admin approves it — a complete multi-role workflow.

```typescript
// tests/leave/leave.spec.ts
import { test, expect } from '../../fixtures';

const leaveApplication = {
  leaveType: 'Annual Leave',
  fromDate:  '2025-12-01',
  toDate:    '2025-12-01',
  comment:   'Planned day off',
  employee:  'Alice Johnson',
};

test.describe('Leave — Apply and Approve Workflow', () => {

  test('ESS user can navigate to apply leave page', async ({ essDashboard, applyLeavePage }) => {
    await applyLeavePage.assertPageLoaded();
  });

  test('ESS user can submit a leave application', async ({ applyLeavePage }) => {
    await applyLeavePage.applyForLeave(
      leaveApplication.leaveType,
      leaveApplication.fromDate,
      leaveApplication.toDate,
      leaveApplication.comment
    );
    await applyLeavePage.assertLeaveApplicationSubmitted();
  });

  test('admin can see pending leave request in leave list', async ({ leaveListPage }) => {
    await leaveListPage.assertLeaveRequestVisible(leaveApplication.employee);
    await leaveListPage.assertLeaveRequestStatus(leaveApplication.employee, 'Pending');
  });

  test('admin can approve a leave request', async ({ leaveListPage }) => {
    await leaveListPage.approveLeaveRequest(leaveApplication.employee);
    await leaveListPage.assertLeaveApproved();
    await leaveListPage.assertLeaveRequestStatus(leaveApplication.employee, 'Approved');
  });

});
```

---

## Part 9 — playwright.config.ts Updates

Level 3 requires three changes to the config: registering the global setup script, creating separate projects for admin and ESS sessions, and telling each project which storage state to load.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:       './tests',
  fullyParallel: false,
  forbidOnly:    !!process.env.CI,
  retries:       process.env.CI ? 1 : 0,
  reporter:      [['html'], ['list']],

  // ─── Global Setup ─────────────────────────────────────────────────────────────
  // Runs once before all tests — saves authentication state files
  globalSetup: './global-setup.ts',

  use: {
    baseURL:    'https://opensource-demo.orangehrmlive.com',
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'on-first-retry',
  },

  // ─── Projects ─────────────────────────────────────────────────────────────────
  // Two projects — one per authentication role
  // Each loads its own pre-saved auth state file
  projects: [

    // Admin project — loads admin session
    // Used by: PIM tests, Admin tests, Leave approval tests
    {
      name: 'admin',
      use:  {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      testMatch: [
        '**/tests/pim/**',
        '**/tests/admin/**',
        '**/tests/leave/**/leave.spec.ts',
      ],
    },

    // ESS project — loads ESS user session
    // Used by: Leave apply tests
    {
      name: 'ess',
      use:  {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/ess.json',
      },
      testMatch: [
        '**/tests/leave/**/apply*.spec.ts',
      ],
    },

    // No-auth project — no storage state loaded
    // Used by: Login tests (they must use the login form directly)
    {
      name: 'no-auth',
      use:  {
        ...devices['Desktop Chrome'],
      },
      testMatch: [
        '**/tests/login.spec.ts',
      ],
    },

  ],
});
```

### Key Config Decisions Explained

**`globalSetup`** — points to the script that generates auth state files. Runs once before any test, regardless of how many workers or projects are configured.

**Three projects** — splitting by authentication role means each test automatically gets the correct session. The `admin` project loads the admin state, the `ess` project loads the ESS state, and the `no-auth` project loads nothing — which is exactly what login tests need.

**`testMatch` per project** — controls which test files each project runs. This prevents a test that needs admin auth from accidentally running with the ESS session.

---

## Part 10 — What Level 3 Does Not Solve

### Complex UI interaction patterns are still duplicated

Date pickers, dropdown selectors, and autocomplete fields each have their own interaction logic currently written directly in each page object. `AddEmployeePage` and `ApplyLeavePage` both have their own date field filling logic. `AddUserPage` and `ApplyLeavePage` both have their own dropdown selection logic.

As more page objects are added, these patterns multiply. **Level 4** extracts them into shared web action helpers — one implementation of "fill a date picker", "select from OrangeHRM dropdown", "handle autocomplete" — used by all page objects.

### Test data is still hardcoded

Employee names, leave dates, and user credentials are still defined as constants in each test file. **Level 5** introduces a centralised test data factory with dynamically generated, unique data per test run.

### Tests still depend on each other

The leave approval test depends on the apply test having run first. The user search test depends on the add user test having created the user. **Level 6** uses API calls to create required state independently so every test is fully self-contained.

---

> **You are ready for Level 4** when your Level 3 suite passes all tests and you notice the same dropdown, date picker, or autocomplete interaction being written differently in multiple page objects.

---

### Quick Reference — What Changed at Level 3

| File | Change |
|------|--------|
| `global-setup.ts` | Created — saves admin and ESS auth state files |
| `fixtures/index.ts` | Created — all custom fixtures defined and exported |
| `pages/leave/ApplyLeavePage.ts` | Created — ESS leave application page |
| `pages/leave/LeaveListPage.ts` | Created — admin leave management page |
| `tests/login.spec.ts` | Minor update — no fixtures (intentional) |
| `tests/pim/employee.spec.ts` | Rewritten — uses fixtures, no beforeEach login |
| `tests/admin/user.spec.ts` | Rewritten — uses fixtures, no beforeEach login |
| `tests/leave/leave.spec.ts` | Created — multi-role leave workflow tests |
| `playwright.config.ts` | Updated — globalSetup, three projects with storageState |
| `pages/**` | No changes |

---

*Level 3 of 9 — Playwright TypeScript · OrangeHRM · Enterprise POM Framework*
*(Level 0 covers theory and setup — this series runs from Level 0 through Level 9)*
