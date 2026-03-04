# Level 2 — BasePage & Inheritance
### Playwright · TypeScript · OrangeHRM Demo Application

> **Prerequisites:** Level 1 must be complete. You should have six working page objects and three passing test files before starting this level.
> **What you will have by the end:** All page objects refactored to extend a shared `BasePage` class, eliminating boilerplate duplication. One new page object — `PersonalDetailsPage` — written from scratch using the new pattern.
> **What does NOT change:** Your test files. The improvement at Level 2 is entirely inside the page objects. Tests remain identical.
> **Next level:** Level 3 introduces fixtures — eliminating the repeated login setup you still see in every test file.

---

## 📋 Table of Contents

- [Part 1 — The Problem Level 1 Left Behind](#part-1--the-problem-level-1-left-behind)
- [Part 2 — What BasePage Is and How Inheritance Works](#part-2--what-basepage-is-and-how-inheritance-works)
- [Part 3 — Project Structure at Level 2](#part-3--project-structure-at-level-2)
- [Part 4 — Building BasePage](#part-4--building-basepage)
- [Part 5 — Refactoring Level 1 Page Objects](#part-5--refactoring-level-1-page-objects)
- [Part 6 — New Page Object — PersonalDetailsPage](#part-6--new-page-object--personaldetailspage)
- [Part 7 — Tests Stay the Same](#part-7--tests-stay-the-same)
- [Part 8 — What Level 2 Does Not Solve](#part-8--what-level-2-does-not-solve)

---

## Part 1 — The Problem Level 1 Left Behind

Open any two page objects from Level 1 and look at how they start:

**LoginPage.ts:**
```typescript
export class LoginPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/auth/login');
  }
}
```

**EmployeeListPage.ts:**
```typescript
export class EmployeeListPage {
  private readonly page: Page;         // ← same

  constructor(page: Page) {
    this.page = page;                  // ← same
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/pim/viewEmployeeList');
  }
}
```

**UserManagementPage.ts:**
```typescript
export class UserManagementPage {
  private readonly page: Page;         // ← same again

  constructor(page: Page) {
    this.page = page;                  // ← same again
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/viewSystemUsers');
  }
}
```

Every single page object at Level 1 declares the same `page` property and the same constructor logic. With six page objects you have six copies. Every time you add a new page object — and an enterprise application can have dozens — you write the same boilerplate again.

This violates the DRY principle covered in Level 0. Every piece of knowledge should exist in exactly one place. The `page` property and the navigation/waiting behaviour are knowledge that belongs in one place, not scattered across every page object.

**Level 2 fixes this with inheritance.**

---

## Part 2 — What BasePage Is and How Inheritance Works

### BasePage

`BasePage` is a parent class that every page object extends. It owns everything that is common to all pages:

- The `page` property — declared once, inherited everywhere
- `navigate(path)` — navigates to a path and waits for the page to fully load
- `waitForPageLoad()` — waits for the network to be idle
- `assertURL(pattern)` — asserts the browser is at the expected URL
- `assertPageTitle(title)` — asserts the page `<title>` tag
- Common utilities — `scrollToBottom()`, `reloadPage()`, `getCurrentURL()`

### How Inheritance Works

When a class `extends` another class, it inherits all of the parent's properties and methods automatically. The child class only needs to define what is unique to itself.

```typescript
// BasePage defines the shared stuff once
export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  protected async navigate(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }
}

// LoginPage extends BasePage — inherits page and navigate()
export class LoginPage extends BasePage {
  private readonly usernameInput: Locator;

  constructor(page: Page) {
    super(page);  // calls BasePage constructor — sets this.page
    this.usernameInput = this.page.getByPlaceholder('Username');
  }

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/auth/login');  // inherited from BasePage
  }
}
```

### Three Keywords to Understand

**`extends`** — tells TypeScript that `LoginPage` is a child of `BasePage`. `LoginPage` inherits everything `BasePage` declares.

**`super(page)`** — must be the first line in the child constructor. It calls the `BasePage` constructor, which sets `this.page`. Without `super()`, TypeScript throws a compile error.

**`protected`** — the `page` property in `BasePage` is `protected`, not `private`. `private` means only `BasePage` itself can access it. `protected` means `BasePage` and any class that extends it can access it. Since `LoginPage`, `EmployeeListPage`, and every other child class use `this.page` directly, it must be `protected`.

```typescript
// private — only BasePage can use this.page
// Child classes cannot access it → compile error
private readonly page: Page;

// protected — BasePage AND all child classes can use this.page
// This is what we need
protected readonly page: Page;
```

### What Changes and What Does Not

| | Level 1 | Level 2 |
|---|---------|---------|
| `page` property | Declared in every page object | Declared once in BasePage |
| Constructor | Sets `this.page = page` in every class | Calls `super(page)` — BasePage handles it |
| Navigation | `this.page.goto(path)` in every `goto()` | `this.navigate(path)` — inherited |
| URL assertion | `expect(this.page).toHaveURL(...)` repeated | `this.assertURL(...)` — inherited |
| Test files | Unchanged | Unchanged |

---

## Part 3 — Project Structure at Level 2

One file added — `BasePage.ts` in the root of `pages/`. Everything else stays the same.

```
orangehrm-automation/
│
├── pages/
│   ├── BasePage.ts                 ← NEW — parent class for all page objects
│   ├── LoginPage.ts                ← refactored to extend BasePage
│   ├── DashboardPage.ts            ← refactored to extend BasePage
│   ├── pim/
│   │   ├── EmployeeListPage.ts     ← refactored to extend BasePage
│   │   ├── AddEmployeePage.ts      ← refactored to extend BasePage
│   │   └── PersonalDetailsPage.ts  ← NEW — written from scratch using BasePage
│   ├── admin/
│   │   ├── UserManagementPage.ts   ← refactored to extend BasePage
│   │   └── AddUserPage.ts          ← refactored to extend BasePage
│   └── leave/                      ← used from Level 3 onwards
│
├── tests/                          ← NO CHANGES at Level 2
│   ├── login.spec.ts
│   ├── pim/
│   │   └── employee.spec.ts
│   ├── admin/
│   │   └── user.spec.ts
│   └── leave/
│
├── playwright.config.ts            ← NO CHANGES at Level 2
├── tsconfig.json
├── package.json
└── .gitignore
```

---

## Part 4 — Building BasePage

### The Complete BasePage.ts

```typescript
// pages/BasePage.ts
import { Page, expect } from '@playwright/test';

export class BasePage {

  // ─── Shared Properties ───────────────────────────────────────────────────────

  // protected — accessible by BasePage and all child classes
  // private would prevent child classes from using this.page directly
  protected readonly page: Page;

  // ─── Constructor ─────────────────────────────────────────────────────────────

  constructor(page: Page) {
    this.page = page;
    // No baseURL stored here — Playwright reads it from playwright.config.ts
    // automatically when page.goto('/some/path') is called
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  // Core navigation method — all child page objects call this.navigate()
  // instead of this.page.goto() directly.
  // Playwright automatically prepends baseURL from config, so we pass paths only.
  // Waits for networkidle so the page is fully loaded before the next step runs.
  protected async navigate(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  // Waits for the page to reach a fully loaded state.
  // Call this after actions that trigger navigation or heavy data loading.
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  // Waits for the browser to reach a specific URL before proceeding.
  // Useful after form submissions that trigger a redirect.
  async waitForURL(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlPattern);
  }

  // ─── Common Assertions ────────────────────────────────────────────────────────

  // Asserts the browser is at the expected URL.
  // Accepts a string (exact match) or a RegExp (partial match).
  // Child page objects call this inside their own assertPageLoaded() method.
  async assertURL(urlPattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(urlPattern);
  }

  // Asserts the page <title> tag matches the expected text.
  async assertPageTitle(expectedTitle: string): Promise<void> {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  // ─── Common Utilities ─────────────────────────────────────────────────────────

  // Returns the current browser URL as a string.
  // Useful in tests that need to capture a URL and compare it later.
  async getCurrentURL(): Promise<string> {
    return this.page.url();
  }

  // Returns the current page <title> as a string.
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  // Scrolls to the bottom of the page.
  // Useful for pages that lazy-load content on scroll.
  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight)
    );
  }

  // Scrolls back to the top of the page.
  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  // Reloads the current page and waits for it to fully load.
  // Useful in tests that verify state persists after a page refresh.
  async reloadPage(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

}
```

### Key Decisions in BasePage

**Why `navigate()` is `protected` and not `public`**

`navigate()` is an internal implementation detail used by child page objects inside their own `goto()` methods. Tests should never call `navigate()` directly — they call `loginPage.goto()`, `employeeListPage.goto()`, etc. Making it `protected` enforces this boundary. Tests cannot accidentally call it.

**Why `waitForPageLoad()` is `public`**

Tests sometimes need to explicitly wait for a page to finish loading after an action — for example after a form submission that triggers a slow redirect. Making it `public` allows tests to call it when needed.

**Why no `baseURL` property**

As established in our earlier discussion, `baseURL` belongs in `playwright.config.ts` — not in BasePage. Playwright reads it from the config and automatically prepends it to every `page.goto('/some/path')` call. Storing it in BasePage would duplicate what Playwright already handles.

---

## Part 5 — Refactoring Level 1 Page Objects

Each page object needs three changes:

1. Import `BasePage` and remove the `Page` import (it comes from BasePage now via `protected`)
2. Change `export class LoginPage {` to `export class LoginPage extends BasePage {`
3. Replace `this.page = page` in the constructor with `super(page)`
4. Replace `this.page.goto(path)` with `this.navigate(path)`
5. Replace `expect(this.page).toHaveURL(...)` with `this.assertURL(...)`

Let us go through each one.

---

### LoginPage.ts — Refactored

```typescript
// pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from './BasePage';

export class LoginPage extends BasePage {

  // ─── Locators ────────────────────────────────────────────────────────────────
  // No page property here — inherited from BasePage as this.page

  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton:   Locator;
  private readonly errorMessage:  Locator;

  // ─── Constructor ─────────────────────────────────────────────────────────────

  constructor(page: Page) {
    super(page);  // BasePage sets this.page — no need to do it here

    this.usernameInput = this.page.getByPlaceholder('Username')
                                  .describe('Username input field');
    this.passwordInput = this.page.getByPlaceholder('Password')
                                  .describe('Password input field');
    this.loginButton   = this.page.getByRole('button', { name: 'Login' })
                                  .describe('Login submit button');
    this.errorMessage  = this.page.locator('.oxd-alert-content-text')
                                  .describe('Login error message');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/auth/login');
    // this.navigate() is inherited from BasePage
    // It calls page.goto(path) and waits for networkidle automatically
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

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

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/auth\/login/);  // inherited from BasePage
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

**What changed from Level 1:**
- `import { Page, Locator, expect }` → `import { Locator, expect }` + `import { BasePage }`
- `export class LoginPage {` → `export class LoginPage extends BasePage {`
- `private readonly page: Page;` → removed entirely
- `this.page = page;` → `super(page);`
- `await this.page.goto(...)` → `await this.navigate(...)`
- `expect(this.page).toHaveURL(...)` → `await this.assertURL(...)`

---

### DashboardPage.ts — Refactored

```typescript
// pages/DashboardPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from './BasePage';

export class DashboardPage extends BasePage {

  private readonly dashboardHeading: Locator;
  private readonly pimMenuItem:      Locator;
  private readonly adminMenuItem:    Locator;
  private readonly leaveMenuItem:    Locator;
  private readonly userDropdown:     Locator;
  private readonly logoutOption:     Locator;

  constructor(page: Page) {
    super(page);

    this.dashboardHeading = this.page.getByRole('heading', { name: 'Dashboard' })
                                     .describe('Dashboard page heading');
    this.pimMenuItem      = this.page.getByRole('link', { name: 'PIM' })
                                     .describe('PIM navigation menu item');
    this.adminMenuItem    = this.page.getByRole('link', { name: 'Admin' })
                                     .describe('Admin navigation menu item');
    this.leaveMenuItem    = this.page.getByRole('link', { name: 'Leave' })
                                     .describe('Leave navigation menu item');
    this.userDropdown     = this.page.locator('.oxd-userdropdown-tab')
                                     .describe('User account dropdown trigger');
    this.logoutOption     = this.page.getByRole('menuitem', { name: 'Logout' })
                                     .describe('Logout menu option');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async navigateToPIM(): Promise<void> {
    await this.pimMenuItem.click();
  }

  async navigateToAdmin(): Promise<void> {
    await this.adminMenuItem.click();
  }

  async navigateToLeave(): Promise<void> {
    await this.leaveMenuItem.click();
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async logout(): Promise<void> {
    await this.userDropdown.click();
    await this.logoutOption.click();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/dashboard/);
    await expect(this.dashboardHeading).toBeVisible();
  }

  async assertLoggedInAs(expectedUsername: string): Promise<void> {
    await expect(this.userDropdown).toContainText(expectedUsername);
  }
}
```

---

### pim/EmployeeListPage.ts — Refactored

```typescript
// pages/pim/EmployeeListPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';

export class EmployeeListPage extends BasePage {

  private readonly pageHeading:       Locator;
  private readonly employeeNameInput: Locator;
  private readonly searchButton:      Locator;
  private readonly addButton:         Locator;
  private readonly employeeTable:     Locator;
  private readonly noRecordsMessage:  Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading       = this.page.getByRole('heading', { name: 'Employee Information' })
                                      .describe('Employee list page heading');
    this.employeeNameInput = this.page.getByPlaceholder('Type for hints...')
                                      .describe('Employee name search input');
    this.searchButton      = this.page.getByRole('button', { name: 'Search' })
                                      .describe('Search employees button');
    this.addButton         = this.page.getByRole('button', { name: 'Add' })
                                      .describe('Add new employee button');
    this.employeeTable     = this.page.locator('.oxd-table-body')
                                      .describe('Employee records table body');
    this.noRecordsMessage  = this.page.getByText('No Records Found')
                                      .describe('No records found message');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/pim/viewEmployeeList');
  }

  async clickAddEmployee(): Promise<void> {
    await this.addButton.click();
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async searchByEmployeeName(name: string): Promise<void> {
    await this.employeeNameInput.fill(name);
    await this.searchButton.click();
    await this.waitForPageLoad();  // inherited — waits for search results to load
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/viewEmployeeList/);
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

**Note the import path** — `EmployeeListPage` is inside `pages/pim/` so the import is `'../BasePage'` not `'./BasePage'`.

---

### pim/AddEmployeePage.ts — Refactored

```typescript
// pages/pim/AddEmployeePage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';

export class AddEmployeePage extends BasePage {

  private readonly pageHeading:     Locator;
  private readonly firstNameInput:  Locator;
  private readonly lastNameInput:   Locator;
  private readonly employeeIdInput: Locator;
  private readonly saveButton:      Locator;
  private readonly successToast:    Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading     = this.page.getByRole('heading', { name: 'Add Employee' })
                                    .describe('Add employee page heading');
    this.firstNameInput  = this.page.getByPlaceholder('First Name')
                                    .describe('Employee first name input');
    this.lastNameInput   = this.page.getByPlaceholder('Last Name')
                                    .describe('Employee last name input');
    this.employeeIdInput = this.page.locator('input.oxd-input').nth(4)
                                    .describe('Employee ID input field');
    this.saveButton      = this.page.getByRole('button', { name: 'Save' })
                                    .describe('Save new employee button');
    this.successToast    = this.page.locator('.oxd-toast-content')
                                    .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/pim/addEmployee');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

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

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/addEmployee/);
    await expect(this.pageHeading).toBeVisible();
    await expect(this.firstNameInput).toBeVisible();
  }

  async assertEmployeeSavedSuccessfully(): Promise<void> {
    await expect(this.successToast).toBeVisible();
  }

  async assertRedirectedToPersonalDetails(): Promise<void> {
    await this.assertURL(/viewPersonalDetails/);
  }
}
```

---

### admin/UserManagementPage.ts — Refactored

```typescript
// pages/admin/UserManagementPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';

export class UserManagementPage extends BasePage {

  private readonly pageHeading:      Locator;
  private readonly usernameInput:    Locator;
  private readonly searchButton:     Locator;
  private readonly addButton:        Locator;
  private readonly userTable:        Locator;
  private readonly noRecordsMessage: Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading      = this.page.getByRole('heading', { name: 'System Users' })
                                     .describe('System users page heading');
    this.usernameInput    = this.page.getByRole('textbox').first()
                                     .describe('Username search input');
    this.searchButton     = this.page.getByRole('button', { name: 'Search' })
                                     .describe('Search users button');
    this.addButton        = this.page.getByRole('button', { name: 'Add' })
                                     .describe('Add new user button');
    this.userTable        = this.page.locator('.oxd-table-body')
                                     .describe('System users table body');
    this.noRecordsMessage = this.page.getByText('No Records Found')
                                     .describe('No records found message');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/admin/viewSystemUsers');
  }

  async clickAddUser(): Promise<void> {
    await this.addButton.click();
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async searchByUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.searchButton.click();
    await this.waitForPageLoad();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/viewSystemUsers/);
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

### admin/AddUserPage.ts — Refactored

```typescript
// pages/admin/AddUserPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';

export class AddUserPage extends BasePage {

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
    super(page);

    this.pageHeading          = this.page.getByRole('heading', { name: 'Add User' })
                                         .describe('Add user page heading');
    this.userRoleDropdown     = this.page.locator('.oxd-select-text').first()
                                         .describe('User role dropdown');
    this.employeeNameInput    = this.page.getByPlaceholder('Type for hints...')
                                         .describe('Employee name autocomplete input');
    this.statusDropdown       = this.page.locator('.oxd-select-text').nth(1)
                                         .describe('User status dropdown');
    this.usernameInput        = this.page.locator('input.oxd-input').nth(1)
                                         .describe('New username input field');
    this.passwordInput        = this.page.locator('input[type="password"]').first()
                                         .describe('Password input field');
    this.confirmPasswordInput = this.page.locator('input[type="password"]').nth(1)
                                         .describe('Confirm password input field');
    this.saveButton           = this.page.getByRole('button', { name: 'Save' })
                                         .describe('Save new user button');
    this.successToast         = this.page.locator('.oxd-toast-content')
                                         .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/admin/saveSystemUser');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async selectUserRole(role: 'Admin' | 'ESS'): Promise<void> {
    await this.userRoleDropdown.click();
    await this.page.getByRole('option', { name: role }).click();
  }

  async fillEmployeeName(employeeName: string): Promise<void> {
    await this.employeeNameInput.fill(employeeName);
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

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/saveSystemUser/);
    await expect(this.pageHeading).toBeVisible();
  }

  async assertUserSavedSuccessfully(): Promise<void> {
    await expect(this.successToast).toBeVisible();
  }
}
```

---

## Part 6 — New Page Object — PersonalDetailsPage

When an admin saves a new employee in OrangeHRM, the application automatically redirects to that employee's Personal Details tab. In Level 1, `AddEmployeePage` asserted this redirect happened — but we never built a page object for the Personal Details page itself.

At Level 2 we add `PersonalDetailsPage.ts` — written from scratch using `extends BasePage`. This demonstrates the full benefit: a brand new page object needs zero boilerplate. It only declares what is unique to the Personal Details page.

### What the Personal Details Page Contains

After adding an employee, the Personal Details tab shows the employee's name, employee ID, and allows editing personal information — date of birth, gender, marital status, nationality, and driving license details.

At Level 2 we model the key identifiers and a few common actions. The full personal details form will be expanded at Level 4 when we add helper methods for date pickers and dropdowns.

```typescript
// pages/pim/PersonalDetailsPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';

export class PersonalDetailsPage extends BasePage {

  // ─── Locators ────────────────────────────────────────────────────────────────

  private readonly firstNameInput:   Locator;
  private readonly lastNameInput:    Locator;
  private readonly employeeIdInput:  Locator;
  private readonly saveButton:       Locator;
  private readonly successToast:     Locator;
  private readonly personalInfoTab:  Locator;

  // ─── Constructor ─────────────────────────────────────────────────────────────

  constructor(page: Page) {
    super(page);  // that's it for boilerplate — BasePage handles the rest

    this.firstNameInput  = this.page.getByPlaceholder('First Name')
                                    .describe('Employee first name input');
    this.lastNameInput   = this.page.getByPlaceholder('Last Name')
                                    .describe('Employee last name input');
    this.employeeIdInput = this.page.locator('input.oxd-input').nth(1)
                                    .describe('Employee ID input field');
    this.saveButton      = this.page.getByRole('button', { name: 'Save' }).first()
                                    .describe('Save personal details button');
    this.successToast    = this.page.locator('.oxd-toast-content')
                                    .describe('Success toast notification');
    this.personalInfoTab = this.page.getByRole('tab', { name: 'Personal Details' })
                                    .describe('Personal details tab');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(employeeId: string): Promise<void> {
    // Navigate directly to a specific employee's personal details tab
    await this.navigate(`/web/index.php/pim/viewPersonalDetails/empNumber/${employeeId}`);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async updateFirstName(firstName: string): Promise<void> {
    await this.firstNameInput.clear();
    await this.firstNameInput.fill(firstName);
  }

  async updateLastName(lastName: string): Promise<void> {
    await this.lastNameInput.clear();
    await this.lastNameInput.fill(lastName);
  }

  async savePersonalDetails(): Promise<void> {
    await this.saveButton.click();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/viewPersonalDetails/);  // inherited from BasePage
    await expect(this.firstNameInput).toBeVisible();
    await expect(this.lastNameInput).toBeVisible();
  }

  async assertPersonalDetailsSaved(): Promise<void> {
    await expect(this.successToast).toBeVisible();
  }

  async assertFirstName(expectedFirstName: string): Promise<void> {
    await expect(this.firstNameInput).toHaveValue(expectedFirstName);
  }

  async assertLastName(expectedLastName: string): Promise<void> {
    await expect(this.lastNameInput).toHaveValue(expectedLastName);
  }

  async assertEmployeeId(expectedId: string): Promise<void> {
    await expect(this.employeeIdInput).toHaveValue(expectedId);
  }
}
```

### Why This Demonstrates the Value of BasePage

Compare `PersonalDetailsPage` at Level 2 to what it would have looked like at Level 1:

**Level 1 — without BasePage:**
```typescript
export class PersonalDetailsPage {
  private readonly page: Page;         // boilerplate
  // ... locators

  constructor(page: Page) {
    this.page = page;                  // boilerplate
    // ... initialise locators
  }

  async goto(employeeId: string): Promise<void> {
    await this.page.goto(             // direct page.goto
      `/web/index.php/pim/viewPersonalDetails/empNumber/${employeeId}`
    );
    await this.page.waitForLoadState('networkidle');  // repeated wait
  }

  async assertPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/viewPersonalDetails/);  // repeated assertion
    // ...
  }
}
```

**Level 2 — with BasePage:**
```typescript
export class PersonalDetailsPage extends BasePage {
  // no page property
  // no boilerplate constructor setup

  constructor(page: Page) {
    super(page);  // one line — done
    // ... initialise locators
  }

  async goto(employeeId: string): Promise<void> {
    await this.navigate(             // inherited — handles goto + wait automatically
      `/web/index.php/pim/viewPersonalDetails/empNumber/${employeeId}`
    );
  }

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/viewPersonalDetails/);  // inherited
    // ...
  }
}
```

Every new page object you write from this point forward costs less to create and contains less noise. The pattern pays off more with every page you add.

---

## Part 7 — Tests Stay the Same

This is the most important point of Level 2.

**Your test files do not change at all.** Open `tests/pim/employee.spec.ts` from Level 1 — it is identical at Level 2. Open `tests/admin/user.spec.ts` — identical. Open `tests/login.spec.ts` — identical.

This is exactly what good abstraction should do. The tests describe what to test. The page objects describe how to interact with the application. When the how changes — and BasePage is a change to how page objects work internally — the what is completely unaffected.

A test that calls `loginPage.goto()` does not know or care whether `goto()` internally calls `this.page.goto()` directly or `this.navigate()` from BasePage. It only knows that after calling `goto()`, the login page is ready.

This is the principle of abstraction in action, applied at the framework level.

### Verify Nothing Broke

After refactoring, run the full test suite:

```bash
npx playwright test --workers=1
```

Every test that passed at Level 1 should still pass at Level 2. If any test fails after refactoring, the most likely cause is a broken import path — check that sub-folder page objects import from `'../BasePage'` not `'./BasePage'`.

---

## Part 8 — What Level 2 Does Not Solve

### Login is still repeated in every test file

Every `beforeEach` in every describe block still does:

```typescript
await loginPage.goto();
await loginPage.login('Admin', 'admin123');
await dashboardPage.assertPageLoaded();
```

BasePage eliminated boilerplate inside page objects. It did nothing for the repeated setup inside test files. **Level 3** introduces Playwright fixtures — a pre-authenticated admin session is created once and injected directly into any test that needs it. Login steps disappear from test files entirely.

### Test data is still hardcoded

Employee names, usernames, and passwords are still written directly in test files. **Level 5** addresses this with centralised test data factories.

### Tests still depend on each other

The user test still depends on the employee test having run first. **Level 6** fixes this with API-driven state setup.

---

> **You are ready for Level 3** when your refactored Level 2 suite passes all tests and you are tired of writing login steps in every single `beforeEach`.

---

### Quick Reference — What Changed at Level 2

| File | Change |
|------|--------|
| `pages/BasePage.ts` | Created — parent class for all page objects |
| `pages/LoginPage.ts` | Extends BasePage — removed boilerplate |
| `pages/DashboardPage.ts` | Extends BasePage — removed boilerplate |
| `pages/pim/EmployeeListPage.ts` | Extends BasePage — removed boilerplate |
| `pages/pim/AddEmployeePage.ts` | Extends BasePage — removed boilerplate |
| `pages/pim/PersonalDetailsPage.ts` | Created — new page object using BasePage |
| `pages/admin/UserManagementPage.ts` | Extends BasePage — removed boilerplate |
| `pages/admin/AddUserPage.ts` | Extends BasePage — removed boilerplate |
| `tests/**` | No changes |
| `playwright.config.ts` | No changes |

---

*Level 2 of 9 — Playwright TypeScript · OrangeHRM · Enterprise POM Framework*
*(Level 0 covers theory and setup — this series runs from Level 0 through Level 9)*
