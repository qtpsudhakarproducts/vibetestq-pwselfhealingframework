# Level 9 — AI-Assisted Test Generation with Playwright Agents
### Playwright · TypeScript · OrangeHRM Demo Application

> **Prerequisites:** Levels 1–8 must be complete. You should have a production-grade framework running in CI with tagged tests, Allure reports, and GitHub Pages publishing.
> **What you will have by the end:** Playwright Agents integrated with the framework. A `STANDARDS.md` that encodes every framework convention. A `seed.spec.ts` that connects agents to your fixtures and auth state. The full planner → generator → healer cycle demonstrated on a real OrangeHRM feature.
> **What changes:** `STANDARDS.md`, `seed.spec.ts`, `specs/` folder, agent definitions in `.github/`. The framework itself does not change — agents generate code that fits into it.
> **This is the final level.** The framework is complete.

---

## 📋 Table of Contents

- [Part 1 — The Problem Level 8 Left Behind](#part-1--the-problem-level-8-left-behind)
- [Part 2 — Why Agents Need a Standards File](#part-2--why-agents-need-a-standards-file)
- [Part 3 — Writing STANDARDS.md](#part-3--writing-standardsmd)
- [Part 4 — How Playwright Agents Work](#part-4--how-playwright-agents-work)
- [Part 5 — Setup](#part-5--setup)
- [Part 6 — Writing seed.spec.ts](#part-6--writing-seedspects)
- [Part 7 — Running the Planner](#part-7--running-the-planner)
- [Part 8 — Running the Generator](#part-8--running-the-generator)
- [Part 9 — Running the Healer](#part-9--running-the-healer)
- [Part 10 — The Full Cycle](#part-10--the-full-cycle)
- [Part 11 — Honest Boundaries](#part-11--honest-boundaries)

---

## Part 1 — The Problem Level 8 Left Behind

The framework is production-grade. Tests are independent, data is generated, runs are tagged, CI pipelines fire on every PR, Allure reports publish history to GitHub Pages.

Every single test was written by a human.

When OrangeHRM adds a new module — Performance Management, Training, Recruitment — someone needs to write page objects, fixtures, API setup, test files, and tag every test correctly. They need to know the patterns, follow the conventions, and apply eight levels of deliberate design decisions consistently.

At one or two new features per sprint, test authoring becomes the bottleneck. The framework is excellent — but a human has to write every line.

Playwright Agents change this. The planner explores the application and produces a human-readable test plan. The generator converts that plan into executable Playwright tests. The healer runs the tests and fixes failures automatically. The human reviews, approves, and commits.

But agents without guidance produce code that runs — and violates every convention the framework has established. The standards file is what separates generated code that gets merged from generated code that gets rejected.

---

## Part 2 — Why Agents Need a Standards File

Run the generator against OrangeHRM without a standards file. It produces something like this:

```typescript
test('add employee', async ({ page }) => {
  await page.goto('https://opensource-demo.orangehrmlive.com');
  await page.click('.oxd-input');
  await page.fill('.oxd-input', 'John');
  await page.locator('button[type="submit"]').click();
  expect(await page.locator('.success-message').textContent()).toBe('Successfully Saved');
});
```

This test runs. It violates every framework convention:

- CSS selectors instead of semantic locators
- Raw `page` interactions instead of page objects
- No fixtures — auth state is not loaded
- No `EmployeeData` type — data is hardcoded inline
- No tags — `@pim`, `@smoke`, `@critical` are all missing
- No annotations — no `empNumber` attached for debugging
- No `beforeAll` API setup — no cleanup

Now run the generator with `STANDARDS.md` in context. It produces:

```typescript
import { test, expect }     from '../../fixtures';
import { generateEmployee } from '../../data/generate';

test.describe('PIM — Employee Management', () => {

  test('admin can add a new employee via UI',
    { tag: ['@pim', '@smoke', '@critical'] },
    async ({ addEmployeePage, employeeListPage }, testInfo) => {
      const employee = generateEmployee();
      testInfo.annotations.push({ type: 'employeeId', description: employee.employeeId });

      await addEmployeePage.addEmployee(employee);
      await addEmployeePage.assertEmployeeSavedSuccessfully();
    }
  );

});
```

Same feature. Completely different output. The standards file is the difference.

---

## Part 3 — Writing STANDARDS.md

`STANDARDS.md` lives at the project root. It is the first document the agent reads before generating anything. It captures every convention in the framework explicitly — decisions that exist in the code but are never written down anywhere.

```markdown
# OrangeHRM Automation Framework — Standards

This document defines every convention used in this framework.
All generated code must follow these standards without exception.
Read this document completely before generating any code.

---

## 1. Project Structure

\`\`\`
pages/          ← page objects only — one class per page
helpers/        ← shared utilities — WaitHelpers, WebActions, OrangeHRMControls, AssertionHelpers, DateHelpers, errors
fixtures/       ← Playwright fixture definitions
data/           ← types.ts, generate.ts, readers.ts
api/            ← ApiClient, EmployeeApi, UserApi, LeaveApi
tests/          ← test files — one spec file per feature area
reporters/      ← custom reporters
specs/          ← agent-generated Markdown test plans (do not edit manually)
\`\`\`

New page objects go in `pages/<module>/PageName.ts`.
New test files go in `tests/<module>/feature.spec.ts`.
New API modules go in `api/EntityApi.ts` and exported from `api/index.ts`.

---

## 2. Naming Conventions

### Files
- Page objects: `PascalCase.ts` — `AddEmployeePage.ts`, `UserManagementPage.ts`
- Test files: `kebab-case.spec.ts` — `employee-management.spec.ts`
- Helper files: `PascalCase.ts` — `WaitHelpers.ts`
- API modules: `PascalCase.ts` — `EmployeeApi.ts`

### Classes
- Page objects: `PascalCase` matching the file name — `class AddEmployeePage`
- Helpers: `PascalCase` — `class WaitHelpers`
- API modules: `PascalCase` — `class EmployeeApi`

### Methods
- Actions: verb + noun — `addEmployee`, `searchByName`, `clickAddUser`
- Assertions: `assert` prefix — `assertEmployeeSavedSuccessfully`, `assertNoRecordsFound`
- Navigation: `goto` — `async goto(): Promise<void>`

### Variables
- Data objects: camelCase matching the type — `const employee`, `const user`, `const leave`
- Generated IDs: camelCase with type suffix — `empNumber`, `userId`, `leaveId`

---

## 3. Locator Strategy

### Always use semantic locators — NEVER CSS selectors or XPath

```typescript
// ✅ CORRECT
page.getByRole('button', { name: 'Save' })
page.getByLabel('First Name')
page.getByPlaceholder('Username')
page.getByText('Successfully Saved')

// ❌ NEVER
page.locator('.oxd-button--medium')
page.locator('button[type="submit"]')
page.locator('//button[@class="save"]')
```

### Always call .describe() on every locator defined in a page object

```typescript
// ✅ CORRECT
private readonly firstNameInput = this.page
  .getByLabel('First Name')
  .describe('First Name input on Add Employee form');

// ❌ MISSING .describe()
private readonly firstNameInput = this.page.getByLabel('First Name');
```

### Locators are private class properties — never inline in methods

```typescript
// ✅ CORRECT — defined as property, used in method
private readonly saveButton = this.page
  .getByRole('button', { name: 'Save' })
  .describe('Save button on Add Employee form');

async saveEmployee(): Promise<void> {
  await this.saveButton.click();
}

// ❌ NEVER — inline locator in method body
async saveEmployee(): Promise<void> {
  await this.page.getByRole('button', { name: 'Save' }).click();
}
```

---

## 4. Page Object Structure

Every page object must follow this exact structure:

```typescript
import { Page }             from '@playwright/test';
import { BasePage }         from '../BasePage';
import { WebActions }       from '../../helpers/WebActions';
import { OrangeHRMControls} from '../../helpers/OrangeHRMControls';
import { WaitHelpers }      from '../../helpers/WaitHelpers';
// ... other imports

export class ExamplePage extends BasePage {

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  // actions  → generic browser interactions (click, fill, check, hover)
  // controls → OrangeHRM-specific components (dropdown, autocomplete, date, dialog)

  private readonly actions:  WebActions;
  private readonly controls: OrangeHRMControls;
  private readonly waits:    WaitHelpers;

  // ─── Locators ────────────────────────────────────────────────────────────────
  // All locators defined as private properties with .describe()

  private readonly exampleInput = this.page
    .getByLabel('Example Field')
    .describe('Example input on the Example page');

  // ─── Constructor ─────────────────────────────────────────────────────────────

  constructor(page: Page) {
    super(page);
    this.actions  = new WebActions(page);
    this.controls = new OrangeHRMControls(page);
    this.waits    = new WaitHelpers(page);
  }

  // ─── Navigation ───────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/example/path');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────
  // Generic interactions → this.actions.*
  // OrangeHRM components → this.controls.*

  async fillExampleField(value: string): Promise<void> {
    await this.actions.fill(this.exampleInput, value);
  }

  async selectExampleDropdown(value: string): Promise<void> {
    await this.controls.selectDropdown(this.exampleDropdown, value);
  }

  // ─── Composite Methods ────────────────────────────────────────────────────────
  // Accept typed data objects — NEVER individual parameters

  async addExample(data: ExampleData): Promise<void> {
    await this.fillExampleField(data.field);
    await this.saveExample();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────
  // Prefixed with 'assert' — verify page state

  async assertExampleSavedSuccessfully(): Promise<void> {
    await this.assertions.assertToastMessage('Successfully Saved');
  }

}
```

### What belongs in a page object
- Locators for that page's elements
- Actions that interact with that page
- Assertions that verify that page's state
- Navigation to that page

### What NEVER belongs in a page object
- Test data — data belongs in `data/generate.ts` or `data/readers.ts`
- Business logic or conditional flows
- Knowledge of other pages
- Direct `expect()` calls outside assertion methods

---

## 5. Data Conventions

### Always accept typed data objects — NEVER individual parameters

```typescript
// ✅ CORRECT
async addEmployee(employee: EmployeeData): Promise<void>
async addUser(user: UserData): Promise<void>
async applyForLeave(leave: LeaveData): Promise<void>

// ❌ NEVER
async addEmployee(firstName: string, lastName: string, employeeId: string): Promise<void>
```

### Always use generators — NEVER hardcode data in tests

```typescript
// ✅ CORRECT
const employee = generateEmployee();
const user     = generateUser(employee);
const leave    = generateLeave({ leaveType: 'Sick Leave' });

// ❌ NEVER
const employee = { firstName: 'John', lastName: 'Smith', employeeId: 'EMP-001' };
```

### Use overrides only when the test specifically cares about a value

```typescript
// ✅ CORRECT — test specifically needs female gender
const employee = generateEmployee({ gender: 'Female' });

// ❌ WRONG — overriding values the test does not care about
const employee = generateEmployee({ firstName: 'Alice', nationality: 'British' });
```

---

## 6. Test Structure

### Every test file follows this pattern

```typescript
import { test, expect }     from '../../fixtures';
import { generateEmployee } from '../../data/generate';

test.describe('Module — Feature Name', () => {

  // Shared state for tests that need API setup
  let empNumber: string;
  let employee:  ReturnType<typeof generateEmployee>;

  // API setup — create preconditions before tests run
  test.beforeAll(async ({ employeeApi }) => {
    employee  = generateEmployee();
    empNumber = await employeeApi.create(employee);
  });

  // Cleanup — always clean up API-created data
  test.afterAll(async ({ employeeApi }) => {
    if (empNumber) await employeeApi.delete(empNumber);
  });

  // Every test gets exactly THREE tags: module, type, severity
  test('descriptive test name',
    { tag: ['@module', '@type', '@severity'] },
    async ({ pageObjectFixture }, testInfo) => {

      // Attach generated IDs for debugging
      testInfo.annotations.push({ type: 'empNumber', description: empNumber });

      // Test body
    }
  );

});
```

### Tag rules — every test must have exactly three tags

**Module tags:** `@login`, `@pim`, `@admin`, `@leave`
**Type tags:** `@smoke`, `@regression`, `@sanity`
**Severity tags:** `@critical`, `@high`, `@medium`, `@low`

No test is untagged. No test has two module tags or two severity tags.

### When to use beforeAll vs per-test generation

Use `beforeAll` + API setup when multiple tests in the same describe block share a precondition — an employee that multiple user tests need.

Use per-test generation when only one test needs the data and no other test depends on it.

### Always annotate generated IDs

```typescript
testInfo.annotations.push({ type: 'empNumber', description: empNumber });
testInfo.annotations.push({ type: 'username',  description: user.username });
testInfo.annotations.push({ type: 'leaveId',   description: String(leaveId) });
```

---

## 7. Imports

### Always import from these paths — never from node_modules directly

```typescript
import { test, expect }                from '../../fixtures';
import { generateEmployee, generateUser, generateLeave } from '../../data/generate';
import { readLeavePolicy, readEnv }    from '../../data/readers';
import { EmployeeData, UserData }      from '../../data/types';
import { ApiClient, EmployeeApi }      from '../../api';
```

### Import order
1. Playwright imports
2. Fixture imports
3. Data imports (generate, readers, types)
4. API imports
5. Page object imports
6. Helper imports

---

## 8. What the Agent Must Never Do

- Use CSS selectors or XPath — semantic locators only
- Hardcode test data — always use generators
- Put selectors in test files — selectors belong in page objects
- Create page objects without `.describe()` on locators
- Write tests without all three tags
- Accept individual parameters in composite methods — always use typed objects
- Skip `beforeAll`/`afterAll` when API-created data needs cleanup
- Import directly from `@playwright/test` in test files — always use `../../fixtures`
- Call `locator.click()`, `locator.fill()` directly in page objects — all interactions route through `this.actions.*` or `this.controls.*`
- Use `this.actions.*` for OrangeHRM-specific components — `selectDropdown`, `fillAutocomplete`, `fillDateInput`, `handleConfirmationDialog` belong on `this.controls.*`
- Use `this.controls.*` for generic interactions — `click`, `fill`, `check`, `hover`, `pressKey` belong on `this.actions.*`
```

---

## Part 4 — How Playwright Agents Work

Playwright Agents are native to Playwright — introduced in version 1.56. No external AI service to configure separately. They run through your AI IDE — VS Code with GitHub Copilot.

Under the hood each agent is a Markdown file containing instructions and MCP tools. Playwright provides these files — you do not write them. They connect your AI tool to the browser so the agent can interact with the live application.

### The three agents

**🎭 Planner** — explores the live application by navigating it, reading the DOM, and understanding the available interactions. Given a requirement or user story, it produces a structured Markdown test plan in `specs/`. The plan is human-readable — you can review and edit it before the generator runs.

**🎭 Generator** — reads the Markdown plan from `specs/` and produces executable Playwright test files. It verifies selectors live against the running application as it generates — not by guessing. The generated tests reference your fixtures, follow your file structure, and mirror the seed test's patterns.

**🎭 Healer** — runs the generated tests. When a test fails it replays the failing steps, inspects the current UI, identifies the root cause — changed locator, timing issue, broken assertion — patches the test, and re-runs until it passes. If it determines the underlying functionality is broken rather than the test, it marks the test as skipped rather than masking a real defect.

### The workflow

```
Requirement
    ↓
🎭 Planner → specs/feature.md
    ↓
🎭 Generator → tests/feature.spec.ts
    ↓
🎭 Healer → passing tests / skipped if functionality broken
    ↓
Human review → commit
```

### The seed file

The seed test is the agent's entry point into your framework. It runs before the planner explores the application — loading auth state, executing global setup, activating fixtures. The planner sees the application in its post-setup state. The generator mirrors the seed test's import patterns and fixture usage in every test it produces.

This is the critical integration point between Playwright Agents and the eight-level framework built in this series.

---

## Part 5 — Setup

### Prerequisites

```bash
# Ensure Playwright is at least version 1.56
npm install --save-dev @playwright/test@latest
npx playwright install chromium
```

### Initialise agents for VS Code Copilot

```bash
npx playwright init-agents --loop=vscode
```

> **Note:** VS Code v1.105 or later is required for the agentic experience to work correctly. Ensure GitHub Copilot is installed and active in VS Code before running the agents.

This generates agent definition files in `.github/`:

```
.github/
  playwright-test-generator.md    ← generator agent instructions
  playwright-test-healer.md       ← healer agent instructions
  playwright-test-planner.md      ← planner agent instructions
```

These files are collections of natural language instructions and MCP tool definitions. They tell Claude exactly how to use Playwright's browser automation tools to explore the app, verify selectors, and fix failures.

**Regenerate whenever Playwright is updated:**

```bash
npx playwright init-agents --loop=vscode
```

Agent definitions are versioned with Playwright — running an old definition against a new Playwright version may miss new tools and capabilities.

### Project structure after setup

```
orangehrm-automation/
│
├── .github/
│   ├── workflows/                          ← from Level 8
│   ├── playwright-test-generator.md        ← NEW — generator agent
│   ├── playwright-test-healer.md           ← NEW — healer agent
│   └── playwright-test-planner.md          ← NEW — planner agent
│
├── specs/                                  ← NEW — agent-generated test plans
│   └── (generated by planner)
│
├── STANDARDS.md                            ← NEW — framework conventions for agents
├── seed.spec.ts                            ← NEW — agent entry point
│
├── data/                                   ← no changes
├── api/                                    ← no changes
├── pages/                                  ← no changes
├── helpers/                                ← no changes
├── fixtures/                               ← no changes
└── tests/                                  ← agents generate into here
```

---

## Part 6 — Writing seed.spec.ts

The seed test is what connects the agents to the framework. The planner runs it before exploring the application. The generator mirrors its import patterns in every test it produces. Without a well-written seed test, the generator does not know your fixtures exist.

```typescript
// seed.spec.ts — agent entry point
// This test runs before the planner explores the application.
// It loads admin auth state, activates all fixtures, and confirms the app is reachable.
// The generator uses this file as the template for all generated tests —
// every generated test will import from the same paths shown here.

import { test, expect }                         from './fixtures';
import { generateEmployee, generateUser,
         generateLeave }                         from './data/generate';
import { readEnv }                              from './data/readers';
import { EmployeeData, UserData, LeaveData }    from './data/types';
import { EmployeeApi, UserApi, LeaveApi }       from './api';

// The seed test itself is minimal — its purpose is to activate the environment,
// not to test anything. The planner will build real scenarios from here.
test('seed', async ({
  page,
  addEmployeePage,
  employeeListPage,
  userManagementPage,
  addUserPage,
  applyLeavePage,
  leaveListPage,
  employeeApi,
  userApi,
  leaveApi,
}) => {
  // Confirm the application is reachable and the admin session is active
  await page.goto('/web/index.php/dashboard/index');
  await expect(page).toHaveURL(/dashboard/);

  // The seed verifies the framework is functional:
  // - Fixtures inject correctly
  // - Auth state is loaded
  // - API clients are available
  // - All page objects are instantiated

  // Generators will use this test as a pattern reference.
  // Generated tests will:
  // - Import from './fixtures' (not '@playwright/test')
  // - Use typed data objects from './data/generate'
  // - Use API fixtures for setup (employeeApi, userApi, leaveApi)
  // - Follow the page object patterns shown in this file's imports
});
```

### What the seed communicates to the generator

By importing every fixture, every page object, and every data utility, the seed tells the generator:

- These are the fixtures available — use them, do not instantiate page objects manually
- This is the import path for data generators — use `./data/generate`, not inline objects
- These are the API fixtures — use `employeeApi.create()` for preconditions, not UI flows
- Import from `./fixtures` — never from `@playwright/test` directly

The generator reads the seed as a reference pattern. The richer the seed's imports, the more of the framework's conventions the generator picks up automatically.

---

## Part 7 — Running the Planner

The planner takes a requirement and produces a human-readable Markdown test plan in `specs/`. You give it context — the requirement, the seed file, and `STANDARDS.md`.

### Starting the planner in VS Code Copilot

Open the Copilot Chat panel in VS Code (Ctrl+Alt+I), switch to Agent mode, and run:

```
Use the playwright test planner agent.

Context:
- seed test: seed.spec.ts
- standards: STANDARDS.md
- application URL: https://opensource-demo.orangehrmlive.com

Requirement:
As an Admin, I want to be able to search for system users by username
so that I can quickly find and manage specific user accounts.

Generate a test plan for the user search feature in the Admin module.
Include smoke, regression, and edge case scenarios.
Use Admin credentials to log in.
```

### Example planner output — specs/user-search.md

```markdown
# OrangeHRM — User Search Test Plan

## Application Overview
The User Management page allows Admin users to search for system users
by username. The search filters the user table in real time.

## Test Environment
- URL: https://opensource-demo.orangehrmlive.com
- Authentication: Admin session (loaded via seed.spec.ts)
- Module: Admin → User Management

## Test Scenarios

### Scenario 1 — Search Returns Matching User [smoke, critical]
**Precondition:** A system user exists with a known username.
**Steps:**
1. Navigate to Admin → User Management
2. Enter the known username in the Username search field
3. Click Search

**Expected Results:**
- Table displays exactly one row
- Row contains the searched username
- Row shows correct role and status

---

### Scenario 2 — Search Returns No Results for Unknown Username [regression, medium]
**Precondition:** None
**Steps:**
1. Navigate to Admin → User Management
2. Enter a username that does not exist
3. Click Search

**Expected Results:**
- Table shows "No Records Found"
- No user rows are displayed

---

### Scenario 3 — Empty Search Returns All Users [regression, medium]
**Precondition:** At least one user exists
**Steps:**
1. Navigate to Admin → User Management
2. Leave the Username field empty
3. Click Search

**Expected Results:**
- Table displays all system users
- Row count is greater than zero

---

### Scenario 4 — Partial Username Match [regression, high]
**Precondition:** A user exists with username containing 'admin'
**Steps:**
1. Navigate to Admin → User Management
2. Enter 'admin' in the Username field
3. Click Search

**Expected Results:**
- All users whose username contains 'admin' are displayed
- Users without 'admin' in their username are not shown
```

### Review the plan before generating

The plan is human-readable and editable. Before running the generator:

- Verify the scenarios match the requirement
- Check that preconditions are realistic for the framework
- Add or remove scenarios based on risk assessment
- Confirm the tag assignments match your standards

The plan is the source of truth. Editing it here is cheaper than correcting generated code.

---

## Part 8 — Running the Generator

The generator reads `specs/user-search.md` and produces executable Playwright test files. It verifies selectors live against the running application as it generates.

### Starting the generator in VS Code Copilot

In the Copilot Chat panel in Agent mode, run:

```
Use the playwright test generator agent.

Context:
- spec: specs/user-search.md
- seed test: seed.spec.ts
- standards: STANDARDS.md

Generate Playwright tests for all scenarios in specs/user-search.md.
Follow STANDARDS.md exactly — semantic locators, typed data objects,
fixtures from seed.spec.ts, three tags per test, testInfo annotations.
Save the output to tests/admin/user-search.spec.ts.
```

### Example generator output — tests/admin/user-search.spec.ts

```typescript
// spec: specs/user-search.md
// seed: seed.spec.ts

import { test, expect }                from '../../fixtures';
import { generateEmployee, generateUser } from '../../data/generate';

test.describe('Admin — User Search', () => {

  let empNumber: string;
  let employee:  ReturnType<typeof generateEmployee>;
  let user:      ReturnType<typeof generateUser>;

  // Create a known user via API before search tests
  test.beforeAll(async ({ employeeApi, userApi }) => {
    employee  = generateEmployee();
    empNumber = await employeeApi.create(employee);
    user      = generateUser(employee);
    await userApi.create(user, empNumber);
  });

  test.afterAll(async ({ employeeApi }) => {
    if (empNumber) await employeeApi.delete(empNumber);
  });

  // Scenario 1
  test('search returns matching user',
    { tag: ['@admin', '@smoke', '@critical'] },
    async ({ userManagementPage }, testInfo) => {
      testInfo.annotations.push({ type: 'username', description: user.username });

      await userManagementPage.searchByUsername(user.username);
      await userManagementPage.assertUserExistsInList(user.username);
      await userManagementPage.assertTableRowCount(1);
    }
  );

  // Scenario 2
  test('search returns no results for unknown username',
    { tag: ['@admin', '@regression', '@medium'] },
    async ({ userManagementPage }) => {
      const phantom = generateUser(generateEmployee());
      await userManagementPage.searchByUsername(phantom.username + 'NOTEXIST');
      await userManagementPage.assertNoRecordsFound();
    }
  );

  // Scenario 3
  test('empty search returns all users',
    { tag: ['@admin', '@regression', '@medium'] },
    async ({ userManagementPage }) => {
      await userManagementPage.searchByUsername('');
      await userManagementPage.assertTableHasRecords();
    }
  );

  // Scenario 4
  test('partial username match returns filtered results',
    { tag: ['@admin', '@regression', '@high'] },
    async ({ userManagementPage }, testInfo) => {
      testInfo.annotations.push({ type: 'username', description: user.username });

      // Search for a partial match that should include our generated user
      const partialUsername = user.username.split('.')[0];
      await userManagementPage.searchByUsername(partialUsername);
      await userManagementPage.assertUserExistsInList(user.username);
    }
  );

});
```

### Review generated output against STANDARDS.md

Before running the healer, review the generated file against the checklist:

- ✅ Imports from `../../fixtures` — not `@playwright/test`
- ✅ Uses `generateEmployee()` and `generateUser()` — no hardcoded data
- ✅ `beforeAll` with API setup and `afterAll` cleanup
- ✅ Typed data objects — `generateEmployee()` returns `EmployeeData`
- ✅ Three tags on every test — module, type, severity
- ✅ `testInfo.annotations` for generated IDs
- ✅ Page object methods used — no raw `page.click()` or `page.fill()`
- ✅ Assertion methods with `assert` prefix

If anything violates standards, correct it before running the healer — the healer fixes test failures, not standards violations.

---

## Part 9 — Running the Healer

The generator may produce tests with initial errors — a locator that does not quite match, a timing issue, an assertion that needs adjustment. The healer runs the tests, identifies failures, and fixes them automatically.

### Starting the healer in VS Code Copilot

In the Copilot Chat panel in Agent mode, run:

```
Use the playwright test healer agent.

Run the tests in tests/admin/user-search.spec.ts.
Fix any failing tests.
Do not change passing tests.
If a test failure indicates the functionality is broken rather than
the test being wrong, mark the test as skipped with a comment explaining why.
```

### What the healer does

**Replays failing steps** — it runs the test, pauses on failure, and examines the current DOM.

**Identifies the root cause** — changed locator, missing wait, incorrect assertion value, timing issue.

**Patches the test** — updates the failing line and re-runs. Repeats until the test passes.

**Marks broken functionality as skipped** — if the healer determines the application is not behaving as expected (not a test error, but a genuine defect), it marks the test as `test.skip()` with a comment. This surfaces a real defect without hiding it in a permanently failing test.

### What the healer does not change

- Passing tests — the healer only touches failing tests
- Standards compliance — the healer fixes failures, not style
- Tag assignments — tags are not adjusted by the healer
- API setup in `beforeAll` — structural patterns are not changed

### After the healer

Run the full suite to confirm no regressions:

```bash
npm run test:admin
```

Then review the healer's changes before committing. The healer's patches are code — they need the same review as any generated code.

---

## Part 10 — The Full Cycle

A new OrangeHRM feature arrives — **Job Title Management**. Admins can add, edit, and delete job titles. Walk through the complete cycle.

### Step 1 — Write the requirement

```
As an Admin, I want to manage job titles so that employees can be
assigned to appropriate positions.

Acceptance criteria:
- Admin can add a new job title with a title name and job description
- Admin can edit an existing job title
- Admin can delete a job title
- Duplicate job title names are rejected with a validation error
```

### Step 2 — Run the planner

```
Use the playwright test planner agent.
Seed: seed.spec.ts
Standards: STANDARDS.md

Requirement: [paste requirement above]

Generate a test plan covering smoke, regression, and edge case scenarios.
```

Planner output: `specs/job-title-management.md`

Review the plan. Confirm the scenarios are correct. Add any missing edge cases. Remove scenarios that are out of scope.

### Step 3 — Run the generator

```
Use the playwright test generator agent.
Spec: specs/job-title-management.md
Seed: seed.spec.ts
Standards: STANDARDS.md

Generate tests for all scenarios.
Save to tests/admin/job-title-management.spec.ts.
```

Generator output: `tests/admin/job-title-management.spec.ts`

If the Job Title pages need new page objects, the generator creates them in `pages/admin/`. Review the output against `STANDARDS.md`.

### Step 4 — Run the healer

```
Use the playwright test healer agent.
Run tests/admin/job-title-management.spec.ts.
Fix failing tests. Skip tests where functionality is broken.
```

Healer output: passing test suite or skipped tests with defect comments.

### Step 5 — Human review and commit

- Review all generated and healed code against `STANDARDS.md`
- Run the smoke suite to confirm no regressions: `npm run test:smoke`
- Commit the spec file, the generated tests, and any new page objects
- The PR check workflow fires and validates the smoke suite

**Total time from requirement to committed tests: minutes, not hours.**

---

## Part 11 — Honest Boundaries

### What agents do well

- Exploring unfamiliar application areas and producing structured test plans
- Generating test code that follows the seed test's patterns
- Fixing broken locators when UI changes cause test failures
- Covering happy-path and common edge case scenarios

### What agents cannot do

**Decide what to test.** The planner explores the application and proposes scenarios — but which scenarios matter, which risks are highest, and which edge cases are business-critical requires domain knowledge and risk assessment. The planner produces coverage; the human decides what coverage means.

**Understand test independence.** The generator produces tests that follow the seed's patterns — but it does not reason about whether a test creates a dependency on application state that another test relies on. API setup, `beforeAll`/`afterAll` patterns, and cleanup logic require human judgment about state management.

**Keep `STANDARDS.md` current.** When the framework evolves — a new helper, a new fixture pattern, a new naming rule — `STANDARDS.md` must be updated manually. An outdated standards file produces outdated generated code. Every framework decision that changes should be reflected in `STANDARDS.md` before the agents run again.

**Handle complex business flows.** Multi-step workflows with conditional branching, state dependencies, and non-obvious data relationships are difficult for the planner to map correctly. Complex flows need human-authored specs and human-reviewed generation.

**Replace engineering judgment.** The planner → generator → healer cycle accelerates test authoring. It does not replace the test engineer who understands the application, knows the risks, designs the test strategy, and maintains the framework. Agents amplify capability — they do not substitute for it.

---

> **The framework is complete.** Nine levels from a raw Playwright installation to an AI-assisted, CI-integrated, production-grade test automation framework for OrangeHRM.

---

### Quick Reference — What Changed at Level 9

| File | Change |
|------|--------|
| `STANDARDS.md` | Created — complete framework conventions for agents |
| `seed.spec.ts` | Created — agent entry point connecting to fixtures and data layer |
| `.github/playwright-test-planner.md` | Created — planner agent definition (generated by init-agents) |
| `.github/playwright-test-generator.md` | Created — generator agent definition (generated by init-agents) |
| `.github/playwright-test-healer.md` | Created — healer agent definition (generated by init-agents) |
| `specs/` | Created — folder for agent-generated Markdown test plans |
| `tests/**` | Agents generate new test files here |
| `pages/**` | Agents may generate new page objects here |
| Everything else | No changes |

---

### The Complete Series

| Level | Title | Core Problem Solved |
|-------|-------|-------------------|
| 0 | Theory, Foundations & Setup | Understanding POM before writing code |
| 1 | Basic Page Object Model | Selectors scattered in test files |
| 2 | BasePage & Inheritance | Boilerplate repeated in every page object |
| 3 | Fixtures & Shared State | Login repeated in every test |
| 4 | Reusable Web Action Helpers | Complex UI patterns reimplemented everywhere |
| 5 | Test Independence & State Setup | Tests depending on each other for state |
| 6 | Test Data Management | Hardcoded data causing conflicts and maintenance burden |
| 7 | Reporting & Test Organisation | Test results meaningless at scale |
| 8 | CI/CD Integration | Tests running locally only, no team visibility |
| 9 | AI-Assisted Test Generation | Test authoring as the productivity bottleneck |

---

*Level 9 of 9 — Playwright TypeScript · OrangeHRM · Enterprise POM Framework*
*(Level 0 covers theory and setup — this series runs from Level 0 through Level 9)*
