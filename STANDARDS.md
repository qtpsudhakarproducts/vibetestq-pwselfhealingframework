# OrangeHRM Automation Framework — Standards

This document defines every convention used in this framework.
All generated code must follow these standards without exception.
Read this document completely before generating any code.

---

## 1. Project Structure

```
pages/          ← page objects only — one class per page
helpers/        ← shared utilities — WaitHelpers, WebActions, AssertionHelpers, DateHelpers
  healing/      ← HealingEngine, HealingLLM adapters (Anthropic, OpenAI, Gemini, Ollama Cloud)
fixtures/       ← Playwright fixture definitions — single import point for all tests
data/           ← index.ts (barrel) · types.ts · generate.ts · readers.ts · config.ts
api/            ← ApiClient, EmployeeApi, UserApi, LeaveApi
tests/          ← test files — one spec file per feature area
reporters/      ← custom reporters
reports/        ← all output: html/, artifacts/, allure/, results.json, healing-log.json
test-data/      ← static seed files: employees.csv, leave-policy.json
```

New page objects go in `pages/<module>/PageName.ts`.
New test files go in `tests/<module>/feature.spec.ts`.
New API modules go in `api/EntityApi.ts` and exported from `api/index.ts`.

---

## 2. Naming Conventions

### Files
- Page objects: `PascalCase.ts` — `AddEmployeePage.ts`, `UserManagementPage.ts`
- Test files: `kebab-case.spec.ts` or descriptive names — `employee.spec.ts`
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

Exception: OrangeHRM custom components that do not expose ARIA roles — use `.oxd-*` class selectors with `.describe()`.

### Always call .describe() on every locator defined in a page object

```typescript
// ✅ CORRECT
private readonly firstNameInput = this.page
  .getByLabel('First Name')
  .describe('First Name input on Add Employee form');

// ❌ MISSING .describe()
private readonly firstNameInput = this.page.getByLabel('First Name');
```

### Locators are private class properties — NEVER inline in methods

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
// pages/<module>/PageName.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';       // or './BasePage' for root pages

export class PageName extends BasePage {

  // ─── Locators ──────────────────────────
  private readonly locatorName: Locator;

  // ─── Constructor ───────────────────────
  constructor(page: Page) {
    super(page);
    this.locatorName = this.page.getByRole('...').describe('...');
  }

  // ─── Navigation ────────────────────────
  async goto(): Promise<void> {
    await this.navigate('/web/index.php/...');
  }

  // ─── Actions ───────────────────────────
  async doSomething(): Promise<void> { ... }

  // ─── Assertions ────────────────────────
  async assertPageLoaded(): Promise<void> { ... }
  async assertSomethingSucceeded(): Promise<void> { ... }

}
```

---

## 5. Test Structure

Every test must have exactly THREE tags — one module, one type, one severity:

```typescript
test('description',
  { tag: ['@<module>', '@<type>', '@<severity>'] },
  async ({ fixture1, fixture2 }, testInfo) => {
    const data = generateXxx();
    testInfo.annotations.push({ type: 'fieldName', description: data.field });

    await fixture1.action(data);
    await fixture1.assertion();
  }
);
```

### Module tags
`@login` `@pim` `@admin` `@leave`

### Type tags
`@smoke` `@regression` `@sanity`

### Severity tags
`@critical` `@high` `@medium` `@low`

---

## 6. Data Rules

- NEVER hardcode employee names, usernames, or IDs in test files
- Always use `generateEmployee()`, `generateUser()`, `generateAnnualLeave()` from `data/` barrel
- Always annotate test data with `testInfo.annotations.push(...)` for debugging
- Credentials always come from the `credentials` fixture — never call `readEnv()` in test files
- `generateUser()` takes an `EmployeeData` object — not a raw name string:

```typescript
// ✅ CORRECT
const employee = generateEmployee();
const user     = generateUser(employee);   // fullName derived automatically

// ❌ WRONG — raw string risks silent mismatches
const user = generateUser('John Smith');
```

- Use the `fullName()` helper instead of accessing `.fullName` property (it no longer exists on `EmployeeData`):

```typescript
import { fullName } from '../../data';

await employeeListPage.assertEmployeeExistsInList(fullName(employee));
```

- File paths for test-data are centralised in `TEST_DATA` — never hardcode paths in tests:

```typescript
import { readCSV, TEST_DATA } from '../../data';

const rows = readCSV(TEST_DATA.employeesCsv);   // sync — no await needed
```

---

## 7. Import Rules

```typescript
// ✅ Test files always import test/expect from fixtures — not @playwright/test
import { test, expect } from '../../fixtures';

// ✅ All data layer imports come from the barrel — never from sub-files
import { generateEmployee, fullName, readCSV, TEST_DATA } from '../../data';

// ✅ API modules imported from the api barrel
import { EmployeeApi } from '../../api';

// ✅ Page objects imported directly only when needed outside fixtures
import { AddEmployeePage } from '../../pages/pim/AddEmployeePage';

// ❌ NEVER import from individual data sub-files
import { generateEmployee } from '../../data/generate';   // wrong
import { readCSV }          from '../../data/readers';    // wrong
import { readEnv }          from '../../data/config';     // wrong — use credentials fixture
```

---

## 8. Fixture Usage

- Tests use fixtures for page objects — not `new PageObject(page)` inline
- `beforeAll` / `afterAll` blocks receive fixtures as parameters — no manual `ApiClient.create()` or `readRuntimeConfig()` in test files:

```typescript
// ✅ CORRECT — fixture injected into beforeAll
test.beforeAll(async ({ adminApiClient }) => {
  empNumber = await new EmployeeApi(adminApiClient).createEmployee(employee);
});

// ❌ WRONG — manual client creation in test
test.beforeAll(async () => {
  const client = await ApiClient.create(readRuntimeConfig().env.baseURL, '...');
});
```

- Use the `credentials` fixture for admin/ESS usernames and passwords — never call `readEnv()` in a test:

```typescript
// ✅ CORRECT
async ({ credentials }) => {
  await loginPage.login(credentials.adminUsername, credentials.adminPassword);
}

// ❌ WRONG
const env = readEnv();
await loginPage.login(env.adminUsername, env.adminPassword);
```

- Built-in fixtures available from `fixtures/index.ts`:

| Fixture | Type | What it provides |
|---|---|---|
| `credentials` | `EnvConfig` | Admin + ESS usernames and passwords from env |
| `adminApiClient` | `ApiClient` | Authenticated API client (admin session) — auto-disposed |
| `employeeListPage` | `EmployeeListPage` | Navigated + loaded employee list |
| `addEmployeePage` | `AddEmployeePage` | Navigated + loaded add employee form |
| `userManagementPage` | `UserManagementPage` | Navigated + loaded user management page |
| `applyLeavePage` | `ApplyLeavePage` | Navigated + loaded leave application form (ESS auth) |
| `leaveListPage` | `LeaveListPage` | Navigated + loaded leave list (admin auth) |

---

## 9. Self-Healing

The framework includes a runtime self-healing engine. When a locator fails, the engine:
1. Captures the page's ARIA snapshot
2. Sends it to an LLM with the `.describe()` label and the failed locator
3. Receives a semantic replacement (e.g. `getByRole('button', { name: 'Login' })`)
4. Retries the action with the healed locator
5. Logs the result to `reports/healing-log.json`

**Rules for healing-compatible page objects:**
- Every locator MUST have a `.describe()` label — this is the LLM's only context for what broke
- All actions MUST go through `WebActions` (`this.actions.click`, `this.actions.fill`, etc.) — raw `locator.click()` bypasses the healing engine
- `assertPageLoaded()` must NOT assert the primary action locator — use URL pattern + supporting fields instead (avoids healing blocking navigation)

**Configuration (`.env`):**
```
ENABLE_RUNTIME_HEALING=true
HEAL_LLM_PROVIDER=ollama-cloud          # anthropic | openai | gemini | ollama-cloud
OLLAMA_CLOUD_API_KEY=<your-key>
OLLAMA_CLOUD_HOST=https://ollama.com
OLLAMA_CLOUD_MODEL=gemma3:4b
```

---

## 10. Reports

All output is written under `reports/` — never scattered across the project root:

| Path | Contents |
|---|---|
| `reports/html/` | Playwright HTML report |
| `reports/artifacts/` | Screenshots, videos, traces per test |
| `reports/allure/` | Allure raw results |
| `reports/results.json` | JSON test results |
| `reports/smart-report.html` | Custom summary reporter output |
| `reports/test-history.json` | Pass/fail history across runs |
| `reports/healing-log.json` | Self-healing decisions and outcomes |

The entire `reports/` directory is gitignored.

---

## 11. Framework Version

Built with:
- Playwright: `^1.50.0`
- TypeScript: `^5.7.0`
- @faker-js/faker: `^9.0.0`
- allure-playwright: `^3.0.0`
- ollama: `^0.5.0`
