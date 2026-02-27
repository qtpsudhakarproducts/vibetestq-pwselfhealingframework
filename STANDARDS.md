# OrangeHRM Automation Framework — Standards

This document defines every convention used in this framework.
All generated code must follow these standards without exception.
Read this document completely before generating any code.

---

## 1. Project Structure

```
pages/          ← page objects only — one class per page
helpers/        ← shared utilities — WaitHelpers, WebActions, AssertionHelpers, DateHelpers
fixtures/       ← Playwright fixture definitions
data/           ← types.ts, generate.ts, readers.ts
api/            ← ApiClient, EmployeeApi, UserApi, LeaveApi
tests/          ← test files — one spec file per feature area
reporters/      ← custom reporters
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
- Always use `generateEmployee()`, `generateUser()`, `generateAnnualLeave()` from `data/generate.ts`
- Always annotate test data with `testInfo.annotations.push(...)` for debugging
- Credentials always come from `readEnv()` — never hardcoded

---

## 7. Import Rules

```typescript
// ✅ Test files always import from fixtures — not @playwright/test
import { test, expect } from '../../fixtures';

// ✅ Data from data layer
import { generateEmployee } from '../../data/generate';

// ✅ Page objects imported directly (used in beforeAll setup blocks)
import { AddEmployeePage } from '../../pages/pim/AddEmployeePage';
```

---

## 8. Fixture Usage

- Tests use fixtures for page objects — not `new PageObject(page)` inline
- `beforeAll` blocks that set up shared state use `browser` fixture directly with `storageState`
- `beforeEach` blocks should only contain data setup, not page object instantiation

---

## 9. Framework Version

Built with:
- Playwright: `^1.50.0`
- TypeScript: `^5.7.0`
- @faker-js/faker: `^9.0.0`
- allure-playwright: `^3.0.0`
