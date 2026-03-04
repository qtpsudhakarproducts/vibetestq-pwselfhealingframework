# Level 1 — Basic Page Object Model
### Playwright · TypeScript · OrangeHRM Demo Application

> **Who this is for:** QA engineers new to Page Object Model or Playwright TypeScript.
> **What you will have by the end:** A working test suite built around OrangeHRM's PIM and Admin modules — structured the way every higher level builds on top of.
> **Application under test:** https://opensource-demo.orangehrmlive.com — Credentials: Admin / admin123
> **Next level:** Level 2 introduces BasePage — eliminating the duplication you will notice by the end of this level.

---

## 📋 Table of Contents

- [Part 1 — What We Are Building and Why](#part-1--what-we-are-building-and-why)
- [Part 2 — Project Structure](#part-2--project-structure)
- [Part 3 — playwright.config.ts](#part-3--playwrightconfigts)
- [Part 4 — The Business Flow We Are Automating](#part-4--the-business-flow-we-are-automating)
- [Part 5 — Page Objects](#part-5--page-objects)
- [Part 6 — Tests](#part-6--tests)
- [Part 7 — Running the Tests](#part-7--running-the-tests)
- [Part 8 — What Level 1 Does Not Solve](#part-8--what-level-1-does-not-solve)

---

## Part 1 — What We Are Building and Why

> Level 0 covers the full theory behind Page Object Model — what it is, why it exists, the core principles, and how it solves the maintenance problem at enterprise scale. If you have not read Level 0, read it first. This level assumes that knowledge and moves straight into implementation.

### What We Are Building at Level 1

We are automating a real business workflow in OrangeHRM using the POM pattern. Every page of the application gets one TypeScript class. That class owns the locators, actions, and assertions for that page. Test files call methods on page objects — they never interact with the browser directly.

```typescript
// Tests call page object methods — never page.fill(), page.click() directly
test('admin can log in', async ({ page }) => {
  const loginPage     = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await loginPage.goto();
  await loginPage.login('Admin', 'admin123');
  await dashboardPage.assertPageLoaded();
});
```

By the end of Level 1 you will have six page objects covering OrangeHRM's PIM and Admin modules, and three test files that exercise a complete business flow — from adding an employee all the way through to logging in as that employee for the first time.

---

## Part 2 — Project Structure

```
orangehrm-automation/
│
├── pages/                          ← All page object classes
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── pim/                        ← PIM module pages
│   │   ├── EmployeeListPage.ts
│   │   └── AddEmployeePage.ts
│   ├── admin/                      ← Admin module pages
│   │   ├── UserManagementPage.ts
│   │   └── AddUserPage.ts
│   └── leave/                      ← Leave module pages (used from Level 3 onwards)
│
├── tests/                          ← All test files
│   ├── login.spec.ts
│   ├── pim/
│   │   └── employee.spec.ts
│   ├── admin/
│   │   └── user.spec.ts
│   └── leave/                      ← Leave tests (used from Level 3 onwards)
│
├── playwright.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

### Why sub-folders inside `pages/`?

OrangeHRM has modules — PIM, Admin, Leave. Grouping page objects by module from the start means adding new pages in later levels does not require restructuring. It mirrors how the application itself is organised.

### The One Rule at Level 1

**If it touches the browser — it belongs in `pages/`.
If it describes what to test — it belongs in `tests/`.**

### tsconfig.json

Playwright's setup generates this automatically, but here is what it should contain:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {
      "@pages/*": ["pages/*"]
    }
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

`strict: true` enables all TypeScript strict checks — this catches errors at development time rather than at test runtime, which is essential when multiple engineers contribute to the same codebase.

---

## Part 3 — playwright.config.ts

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,       // OrangeHRM demo is shared — run sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'https://opensource-demo.orangehrmlive.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### Key decisions explained

**`fullyParallel: false`** — the OrangeHRM demo site is shared publicly. Running parallel tests means multiple users creating and deleting the same data simultaneously, causing flaky failures. At Level 1 we run sequentially to keep things stable.

**`baseURL`** — set once here. Every `page.goto('/web/index.php/auth/login')` call in a page object automatically resolves to the full URL. You never hardcode `https://opensource-demo.orangehrmlive.com` anywhere in your page objects or tests.

**`trace`, `screenshot`, `video`** — captured automatically on failure. Essential for debugging failures on the shared demo site where you cannot easily reproduce state.

---

## Part 4 — The Business Flow We Are Automating

In OrangeHRM a System User must be linked to an existing Employee. You cannot create a user without an employee already in the system. This makes the correct order clear:

```
Step 1 — Login as Admin
         ↓
Step 2 — PIM → Add Employee
         Creates the person record in the system
         ↓
Step 3 — Verify employee appears in the Employee List
         ↓
Step 4 — Admin → Add User
         Creates login credentials linked to that employee
         ↓
Step 5 — Verify user appears in User Management list
         ↓
Step 6 — Logout and Login with the new user credentials
         Validates the complete flow end to end
```

This is a real business workflow — not an isolated test. It is exactly the scenario a QA engineer would execute during an HR system onboarding sprint.

### Pages We Need

| Module | Page | Responsibility |
|--------|------|----------------|
| — | LoginPage | Login and logout |
| — | DashboardPage | Verify login, navigate to modules |
| PIM | EmployeeListPage | Search employees, navigate to Add Employee |
| PIM | AddEmployeePage | Fill and submit the Add Employee form |
| Admin | UserManagementPage | Search users, navigate to Add User |
| Admin | AddUserPage | Fill and submit the Add User form |

---

## Part 5 — Page Objects

### A Note on `.describe()`

Every locator in this framework uses Playwright's `.describe()` method to attach a human-readable label:

```typescript
this.usernameInput = page.getByPlaceholder('Username')
                         .describe('Username input field');
```

This label appears in three places as the framework matures:

**Failure messages** — when a test fails, the error output shows "Username input field" instead of a raw selector. Anyone reading the report understands what broke immediately, without needing to decode CSS or XPath.

**Debugging logs** — at Level 7 we build a custom logging layer that uses these descriptions to produce readable action logs: `[ACTION] Filling "Username input field"` instead of `[ACTION] Filling getByPlaceholder('Username')`.

**AI self-healing** — at Level 9, when a locator breaks because a developer changed the DOM, an AI agent uses the description as semantic intent to find the correct element in the updated page. The description survives selector changes because it describes what the element *is*, not where it currently lives in the DOM.

`.describe()` adds the most value on positional locators like `.nth(4)` or `.first()` — where the raw selector tells you nothing. We apply it consistently across all locators so the pattern is uniform and the full benefit is available at every level.

---

### LoginPage.ts

The entry point for every test. Every test that needs an authenticated session starts here.

```typescript
// pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {

  private readonly page:          Page;
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton:   Locator;
  private readonly errorMessage:  Locator;

  constructor(page: Page) {
    this.page          = page;
    this.usernameInput = page.getByPlaceholder('Username')
                             .describe('Username input field');
    this.passwordInput = page.getByPlaceholder('Password')
                             .describe('Password input field');
    this.loginButton   = page.getByRole('button', { name: 'Login' })
                             .describe('Login submit button');
    this.errorMessage  = page.locator('.oxd-alert-content-text')
                             .describe('Login error message');
  }

  // ─── Navigation ──────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/auth/login');
  }

  // ─── Actions ─────────────────────────────────────────────

  async fillUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async login(username: string, password: string): Promise<void> {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  // ─── Assertions ───────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/auth\/login/);
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  async assertInvalidCredentialsError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toHaveText('Invalid credentials');
  }

  async assertUsernameRequiredError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toHaveText('Username cannot be empty');
  }
}
```

---

### DashboardPage.ts

The landing page after a successful login. Used to verify login success and navigate to other modules.

```typescript
// pages/DashboardPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {

  private readonly page:             Page;
  private readonly dashboardHeading: Locator;
  private readonly pimMenuItem:      Locator;
  private readonly adminMenuItem:    Locator;
  private readonly leaveMenuItem:    Locator;
  private readonly userDropdown:     Locator;
  private readonly logoutOption:     Locator;

  constructor(page: Page) {
    this.page             = page;
    this.dashboardHeading = page.getByRole('heading', { name: 'Dashboard' })
                               .describe('Dashboard page heading');
    this.pimMenuItem      = page.getByRole('link', { name: 'PIM' })
                               .describe('PIM navigation menu item');
    this.adminMenuItem    = page.getByRole('link', { name: 'Admin' })
                               .describe('Admin navigation menu item');
    this.leaveMenuItem    = page.getByRole('link', { name: 'Leave' })
                               .describe('Leave navigation menu item');
    this.userDropdown     = page.locator('.oxd-userdropdown-tab')
                               .describe('User account dropdown trigger');
    this.logoutOption     = page.getByRole('menuitem', { name: 'Logout' })
                               .describe('Logout menu option');
  }

  // ─── Navigation ──────────────────────────────────────────

  async navigateToPIM(): Promise<void> {
    await this.pimMenuItem.click();
  }

  async navigateToAdmin(): Promise<void> {
    await this.adminMenuItem.click();
  }

  async navigateToLeave(): Promise<void> {
    await this.leaveMenuItem.click();
  }

  // ─── Actions ─────────────────────────────────────────────

  async logout(): Promise<void> {
    await this.userDropdown.click();
    await this.logoutOption.click();
  }

  // ─── Assertions ───────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/dashboard/);
    await expect(this.dashboardHeading).toBeVisible();
  }

  async assertLoggedInAs(expectedUsername: string): Promise<void> {
    await expect(this.userDropdown).toContainText(expectedUsername);
  }
}
```

---

### pim/EmployeeListPage.ts

The PIM employee list — search and navigate to Add Employee.

```typescript
// pages/pim/EmployeeListPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class EmployeeListPage {

  private readonly page:              Page;
  private readonly pageHeading:       Locator;
  private readonly employeeNameInput: Locator;
  private readonly searchButton:      Locator;
  private readonly addButton:         Locator;
  private readonly employeeTable:     Locator;
  private readonly noRecordsMessage:  Locator;

  constructor(page: Page) {
    this.page              = page;
    this.pageHeading       = page.getByRole('heading', { name: 'Employee Information' })
                                 .describe('Employee list page heading');
    this.employeeNameInput = page.getByPlaceholder('Type for hints...')
                                 .describe('Employee name search input');
    this.searchButton      = page.getByRole('button', { name: 'Search' })
                                 .describe('Search employees button');
    this.addButton         = page.getByRole('button', { name: 'Add' })
                                 .describe('Add new employee button');
    this.employeeTable     = page.locator('.oxd-table-body')
                                 .describe('Employee records table body');
    this.noRecordsMessage  = page.getByText('No Records Found')
                                 .describe('No records found message');
  }

  // ─── Navigation ──────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/pim/viewEmployeeList');
  }

  async clickAddEmployee(): Promise<void> {
    await this.addButton.click();
  }

  // ─── Actions ─────────────────────────────────────────────

  async searchByEmployeeName(name: string): Promise<void> {
    await this.employeeNameInput.fill(name);
    await this.searchButton.click();
  }

  // ─── Assertions ───────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/viewEmployeeList/);
    await expect(this.pageHeading).toBeVisible();
  }

  async assertEmployeeExistsInList(employeeName: string): Promise<void> {
    await expect(
      this.employeeTable.getByRole('row', { name: new RegExp(employeeName, 'i') })
    ).toBeVisible();
  }

  async assertNoRecordsFound(): Promise<void> {
    await expect(this.noRecordsMessage).toBeVisible();
  }

  async assertAddButtonVisible(): Promise<void> {
    await expect(this.addButton).toBeVisible();
  }
}
```

---

### pim/AddEmployeePage.ts

The form for creating a new employee in PIM. At Level 1 we use only the mandatory fields — First Name, Last Name, and Employee ID.

```typescript
// pages/pim/AddEmployeePage.ts
import { Page, Locator, expect } from '@playwright/test';

export class AddEmployeePage {

  private readonly page:            Page;
  private readonly pageHeading:     Locator;
  private readonly firstNameInput:  Locator;
  private readonly lastNameInput:   Locator;
  private readonly employeeIdInput: Locator;
  private readonly saveButton:      Locator;
  private readonly successToast:    Locator;

  constructor(page: Page) {
    this.page            = page;
    this.pageHeading     = page.getByRole('heading', { name: 'Add Employee' })
                               .describe('Add employee page heading');
    this.firstNameInput  = page.getByPlaceholder('First Name')
                               .describe('Employee first name input');
    this.lastNameInput   = page.getByPlaceholder('Last Name')
                               .describe('Employee last name input');
    // Employee ID is an input without a unique placeholder — located by position
    this.employeeIdInput = page.locator('input.oxd-input').nth(4)
                               .describe('Employee ID input field');
    this.saveButton      = page.getByRole('button', { name: 'Save' })
                               .describe('Save new employee button');
    this.successToast    = page.locator('.oxd-toast-content')
                               .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/pim/addEmployee');
  }

  // ─── Actions ─────────────────────────────────────────────

  async fillFirstName(firstName: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
  }

  async fillLastName(lastName: string): Promise<void> {
    await this.lastNameInput.fill(lastName);
  }

  async fillEmployeeId(employeeId: string): Promise<void> {
    await this.employeeIdInput.clear();
    await this.employeeIdInput.fill(employeeId);
  }

  async saveEmployee(): Promise<void> {
    await this.saveButton.click();
  }

  async addEmployee(
    firstName: string,
    lastName: string,
    employeeId: string
  ): Promise<void> {
    await this.fillFirstName(firstName);
    await this.fillLastName(lastName);
    await this.fillEmployeeId(employeeId);
    await this.saveEmployee();
  }

  // ─── Assertions ───────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/addEmployee/);
    await expect(this.pageHeading).toBeVisible();
    await expect(this.firstNameInput).toBeVisible();
  }

  async assertEmployeeSavedSuccessfully(): Promise<void> {
    await expect(this.successToast).toBeVisible();
  }

  async assertRedirectedToPersonalDetails(): Promise<void> {
    // After saving, OrangeHRM redirects to the employee's personal details tab
    await expect(this.page).toHaveURL(/viewPersonalDetails/);
  }
}
```

---

### admin/UserManagementPage.ts

The Admin → User Management list — search and navigate to Add User.

```typescript
// pages/admin/UserManagementPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class UserManagementPage {

  private readonly page:             Page;
  private readonly pageHeading:      Locator;
  private readonly usernameInput:    Locator;
  private readonly searchButton:     Locator;
  private readonly addButton:        Locator;
  private readonly userTable:        Locator;
  private readonly noRecordsMessage: Locator;

  constructor(page: Page) {
    this.page             = page;
    this.pageHeading      = page.getByRole('heading', { name: 'System Users' })
                               .describe('System users page heading');
    this.usernameInput    = page.getByRole('textbox').first()
                               .describe('Username search input');
    this.searchButton     = page.getByRole('button', { name: 'Search' })
                               .describe('Search users button');
    this.addButton        = page.getByRole('button', { name: 'Add' })
                               .describe('Add new user button');
    this.userTable        = page.locator('.oxd-table-body')
                               .describe('System users table body');
    this.noRecordsMessage = page.getByText('No Records Found')
                               .describe('No records found message');
  }

  // ─── Navigation ──────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/viewSystemUsers');
  }

  async clickAddUser(): Promise<void> {
    await this.addButton.click();
  }

  // ─── Actions ─────────────────────────────────────────────

  async searchByUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.searchButton.click();
  }

  // ─── Assertions ───────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/viewSystemUsers/);
    await expect(this.pageHeading).toBeVisible();
  }

  async assertUserExistsInList(username: string): Promise<void> {
    await expect(
      this.userTable.getByRole('row', { name: new RegExp(username, 'i') })
    ).toBeVisible();
  }

  async assertNoRecordsFound(): Promise<void> {
    await expect(this.noRecordsMessage).toBeVisible();
  }
}
```

---

### admin/AddUserPage.ts

The form for creating a new system user. The Employee Name field links the user to an existing PIM employee — this is why the employee must be created first.

```typescript
// pages/admin/AddUserPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class AddUserPage {

  private readonly page:                 Page;
  private readonly pageHeading:          Locator;
  private readonly userRoleDropdown:     Locator;
  private readonly employeeNameInput:    Locator;
  private readonly statusDropdown:       Locator;
  private readonly usernameInput:        Locator;
  private readonly passwordInput:        Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly saveButton:           Locator;
  private readonly successToast:         Locator;

  constructor(page: Page) {
    this.page                 = page;
    this.pageHeading          = page.getByRole('heading', { name: 'Add User' })
                                    .describe('Add user page heading');
    this.userRoleDropdown     = page.locator('.oxd-select-text').first()
                                    .describe('User role dropdown');
    this.employeeNameInput    = page.getByPlaceholder('Type for hints...')
                                    .describe('Employee name autocomplete input');
    this.statusDropdown       = page.locator('.oxd-select-text').nth(1)
                                    .describe('User status dropdown');
    this.usernameInput        = page.locator('input.oxd-input').nth(1)
                                    .describe('New username input field');
    this.passwordInput        = page.locator('input[type="password"]').first()
                                    .describe('Password input field');
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1)
                                    .describe('Confirm password input field');
    this.saveButton           = page.getByRole('button', { name: 'Save' })
                                    .describe('Save new user button');
    this.successToast         = page.locator('.oxd-toast-content')
                                    .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/saveSystemUser');
  }

  // ─── Actions ─────────────────────────────────────────────

  async selectUserRole(role: 'Admin' | 'ESS'): Promise<void> {
    await this.userRoleDropdown.click();
    await this.page.getByRole('option', { name: role }).click();
  }

  async fillEmployeeName(employeeName: string): Promise<void> {
    await this.employeeNameInput.fill(employeeName);
    // OrangeHRM shows an autocomplete dropdown — select the first matching result
    await this.page.locator('.oxd-autocomplete-option').first().click();
  }

  async selectStatus(status: 'Enabled' | 'Disabled'): Promise<void> {
    await this.statusDropdown.click();
    await this.page.getByRole('option', { name: status }).click();
  }

  async fillUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async fillConfirmPassword(password: string): Promise<void> {
    await this.confirmPasswordInput.fill(password);
  }

  async saveUser(): Promise<void> {
    await this.saveButton.click();
  }

  async addUser(
    role: 'Admin' | 'ESS',
    employeeName: string,
    status: 'Enabled' | 'Disabled',
    username: string,
    password: string
  ): Promise<void> {
    await this.selectUserRole(role);
    await this.fillEmployeeName(employeeName);
    await this.selectStatus(status);
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.fillConfirmPassword(password);
    await this.saveUser();
  }

  // ─── Assertions ───────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/saveSystemUser/);
    await expect(this.pageHeading).toBeVisible();
  }

  async assertUserSavedSuccessfully(): Promise<void> {
    await expect(this.successToast).toBeVisible();
  }
}
```

---

## Part 6 — Tests

### tests/login.spec.ts

```typescript
// tests/login.spec.ts
import { test } from '@playwright/test';
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

  test('newly created ESS user can log in', async ({ page }) => {
    // This validates the full end-to-end flow
    // Assumes the user alice.johnson was created by the admin user tests
    // Level 5 will manage this dependency properly with test data factories
    const dashboardPage = new DashboardPage(page);
    await loginPage.login('alice.johnson', 'Alice@1234');
    await dashboardPage.assertPageLoaded();
    await dashboardPage.assertLoggedInAs('alice.johnson');
  });

});
```

---

### tests/pim/employee.spec.ts

```typescript
// tests/pim/employee.spec.ts
import { test } from '@playwright/test';
import { LoginPage }        from '../../pages/LoginPage';
import { DashboardPage }    from '../../pages/DashboardPage';
import { EmployeeListPage } from '../../pages/pim/EmployeeListPage';
import { AddEmployeePage }  from '../../pages/pim/AddEmployeePage';

// Test data — hardcoded at Level 1
// Level 5 moves this to a centralised test data layer with factory functions
const admin = {
  username: 'Admin',
  password: 'admin123',
};

const newEmployee = {
  firstName:  'Alice',
  lastName:   'Johnson',
  employeeId: 'EMP-L1-001',
  fullName:   'Alice Johnson',
};

test.describe('PIM — Employee Management', () => {

  let loginPage:     LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage     = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login(admin.username, admin.password);
    await dashboardPage.assertPageLoaded();
  });

  test('admin can navigate to employee list from dashboard', async ({ page }) => {
    const employeeListPage = new EmployeeListPage(page);

    await dashboardPage.navigateToPIM();
    await employeeListPage.assertPageLoaded();
  });

  test('admin can add a new employee', async ({ page }) => {
    const employeeListPage = new EmployeeListPage(page);
    const addEmployeePage  = new AddEmployeePage(page);

    await employeeListPage.goto();
    await employeeListPage.assertAddButtonVisible();
    await employeeListPage.clickAddEmployee();

    await addEmployeePage.assertPageLoaded();
    await addEmployeePage.addEmployee(
      newEmployee.firstName,
      newEmployee.lastName,
      newEmployee.employeeId
    );

    await addEmployeePage.assertEmployeeSavedSuccessfully();
    await addEmployeePage.assertRedirectedToPersonalDetails();
  });

  test('newly added employee appears in the employee list', async ({ page }) => {
    const employeeListPage = new EmployeeListPage(page);

    await employeeListPage.goto();
    await employeeListPage.searchByEmployeeName(newEmployee.firstName);
    await employeeListPage.assertEmployeeExistsInList(newEmployee.fullName);
  });

  test('search with non-existent name shows no records found', async ({ page }) => {
    const employeeListPage = new EmployeeListPage(page);

    await employeeListPage.goto();
    await employeeListPage.searchByEmployeeName('ZZZNONEXISTENT999');
    await employeeListPage.assertNoRecordsFound();
  });

});
```

---

### tests/admin/user.spec.ts

```typescript
// tests/admin/user.spec.ts
import { test } from '@playwright/test';
import { LoginPage }          from '../../pages/LoginPage';
import { DashboardPage }      from '../../pages/DashboardPage';
import { UserManagementPage } from '../../pages/admin/UserManagementPage';
import { AddUserPage }        from '../../pages/admin/AddUserPage';

// Test data
// The employee below must already exist in PIM before this test runs
// because OrangeHRM requires a user to be linked to an existing employee.
// This cross-test dependency is a known limitation at Level 1.
// Level 6 resolves this by using API calls to create required state independently.
const admin = {
  username: 'Admin',
  password: 'admin123',
};

const newUser = {
  role:         'ESS'           as const,
  employeeName: 'Alice Johnson', // must match an employee in PIM
  status:       'Enabled'       as const,
  username:     'alice.johnson',
  password:     'Alice@1234',
};

test.describe('Admin — User Management', () => {

  let loginPage:     LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage     = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login(admin.username, admin.password);
    await dashboardPage.assertPageLoaded();
  });

  test('admin can navigate to user management from dashboard', async ({ page }) => {
    const userManagementPage = new UserManagementPage(page);

    await dashboardPage.navigateToAdmin();
    await userManagementPage.assertPageLoaded();
  });

  test('admin can add a new system user linked to an employee', async ({ page }) => {
    const userManagementPage = new UserManagementPage(page);
    const addUserPage        = new AddUserPage(page);

    await userManagementPage.goto();
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

  test('newly created user appears in the user management list', async ({ page }) => {
    const userManagementPage = new UserManagementPage(page);

    await userManagementPage.goto();
    await userManagementPage.searchByUsername(newUser.username);
    await userManagementPage.assertUserExistsInList(newUser.username);
  });

  test('search with non-existent username shows no records found', async ({ page }) => {
    const userManagementPage = new UserManagementPage(page);

    await userManagementPage.goto();
    await userManagementPage.searchByUsername('ZZZNONEXISTENT999');
    await userManagementPage.assertNoRecordsFound();
  });

});
```

---

## Part 7 — Running the Tests

> Project setup — installing Node.js, VS Code, Playwright, and creating the folder structure — is covered in Level 0 Part 8. This section covers only how to run the tests once the project is set up.

### Run in the correct business flow order

At Level 1, tests have a dependency — the employee must exist before the user can be linked to them. Run in this order:

```bash
# Step 1 — Create the employee in PIM
npx playwright test tests/pim/employee.spec.ts

# Step 2 — Create a user linked to that employee in Admin
npx playwright test tests/admin/user.spec.ts

# Step 3 — Validate the new user can log in
npx playwright test tests/login.spec.ts
```

### Run all tests sequentially

```bash
npx playwright test --workers=1
```

### Useful commands

```bash
# Run in headed mode — see the browser as tests execute
npx playwright test --headed

# Run a specific test by name
npx playwright test --grep "admin can add a new employee"

# Run all tests in a specific folder
npx playwright test tests/pim/

# View the HTML report after a run
npx playwright show-report

# Run a single file
npx playwright test tests/login.spec.ts
```

### What to expect

On the shared OrangeHRM demo site, occasional failures can happen due to other users modifying data. If a test fails unexpectedly, check whether the employee or user data still exists in the application before assuming the test code is broken. This instability is one of the motivations for Level 6 — API-driven state setup that makes each test fully independent of shared data.

---

## Part 8 — What Level 1 Does Not Solve

By the end of Level 1 the framework works. But as the suite grows you will notice the same patterns repeating. These are deliberately left for the next levels.

### Every page object repeats the same boilerplate

Every single page object at Level 1 starts with:

```typescript
private readonly page: Page;

constructor(page: Page) {
  this.page = page;
}

async goto(): Promise<void> {
  await this.page.goto('/some/path');
}
```

With six page objects you have six copies. With twenty pages across PIM, Admin, and Leave you have twenty copies. **Level 2** introduces `BasePage` — a parent class that every page object extends, so this boilerplate is declared once and inherited everywhere.

### Login is repeated in every test file

Every `beforeEach` in every describe block does:

```typescript
await loginPage.goto();
await loginPage.login('Admin', 'admin123');
await dashboardPage.assertPageLoaded();
```

This appears in every test file that needs an authenticated session. **Level 3** introduces Playwright fixtures that inject a pre-authenticated session directly into tests so login steps are never repeated.

### Test data is hardcoded in test files

Employee names, credentials, and IDs are written directly in test files. Changing a value means finding every file that uses it. **Level 5** introduces a centralised test data layer with factory functions that generate unique data per run.

### Tests depend on each other

The user test depends on the employee test having run first. If the employee test fails, the user test fails for the wrong reason. **Level 6** uses API calls to create required state independently before each test, removing all cross-test dependencies.

---

> **You are ready for Level 2** when your Level 1 suite is working and you feel the pain of writing the same `private readonly page: Page` and constructor boilerplate in every new page object you create.

---

*Level 1 of 9 — Playwright TypeScript · OrangeHRM · Enterprise POM Framework*
*(Level 0 covers theory and setup — this series runs from Level 0 through Level 9)*
