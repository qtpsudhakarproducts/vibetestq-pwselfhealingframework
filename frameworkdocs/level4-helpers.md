# Level 4 — Reusable Helper Layer
### Playwright · TypeScript · OrangeHRM Demo Application

> **Prerequisites:** Levels 1–3 must be complete. You should have a working fixture system, seven page objects extending BasePage, and passing tests across login, PIM, Admin, and Leave modules.
> **What you will have by the end:** A shared helper layer — `WebActions`, `WaitHelpers`, `AssertionHelpers`, and `DateHelpers` — that page objects use instead of re-implementing the same interaction patterns. Page objects become shorter and more focused. Tests do not change.
> **What changes:** Page objects are refactored to use helpers. `PersonalDetailsPage` is expanded with date, dropdown, and file upload interactions using the new helpers. Tests do not change.
> **Next level:** Level 5 introduces test independence — eliminating cross-test dependencies using `beforeAll` UI setup and API state setup so every test runs in any order.

---

## 📋 Table of Contents

- [Part 1 — The Problem Level 3 Left Behind](#part-1--the-problem-level-3-left-behind)
- [Part 2 — What the Helper Layer Is](#part-2--what-the-helper-layer-is)
- [Part 3 — Project Structure at Level 4](#part-3--project-structure-at-level-4)
- [Part 4 — WaitHelpers](#part-4--waithelpers)
- [Part 5 — WebActions](#part-5--webactions)
- [Part 6 — AssertionHelpers](#part-6--assertionhelpers)
- [Part 7 — DateHelpers](#part-7--datehelpers)
- [Part 8 — Refactoring Page Objects to Use Helpers](#part-8--refactoring-page-objects-to-use-helpers)
- [Part 9 — Expanding PersonalDetailsPage](#part-9--expanding-personaldetailspage)
- [Part 10 — What Level 4 Does Not Solve](#part-10--what-level-4-does-not-solve)

---

## Part 1 — The Problem Level 3 Left Behind

Open `AddUserPage.ts` and `ApplyLeavePage.ts` side by side. Look at how each selects from a dropdown:

**AddUserPage.ts:**
```typescript
async selectUserRole(role: 'Admin' | 'ESS'): Promise<void> {
  await this.userRoleDropdown.click();
  await this.page.getByRole('option', { name: role }).click();
}

async selectStatus(status: 'Enabled' | 'Disabled'): Promise<void> {
  await this.statusDropdown.click();
  await this.page.getByRole('option', { name: status }).click();
}
```

**ApplyLeavePage.ts:**
```typescript
async selectLeaveType(leaveType: string): Promise<void> {
  await this.leaveTypeDropdown.click();
  await this.page.getByRole('option', { name: leaveType }).click();
}
```

Identical pattern. Three copies already — and every new page object with a dropdown adds another. The same story repeats for autocomplete fields, date inputs, table row actions, and confirmation dialogs.

This is the same DRY violation that `BasePage` fixed for the `page` property — repeated knowledge scattered across files. The helper layer fixes it for interaction patterns.

---

## Part 2 — What the Helper Layer Is

Helpers are plain TypeScript classes that page objects use through **composition** — not inheritance. A page object receives a helper in its constructor and calls its methods.

**Inheritance (what BasePage uses):**
```typescript
// Page object IS-A BasePage
export class LoginPage extends BasePage { ... }
```

**Composition (what helpers use):**
```typescript
// Page object HAS-A WebActions — uses it, does not extend it
export class AddUserPage extends BasePage {
  private readonly actions: WebActions;
  private readonly waits:   WaitHelpers;

  constructor(page: Page) {
    super(page);
    this.actions = new WebActions(page);
    this.waits   = new WaitHelpers(page);
  }
}
```

Composition is the right choice here because helpers are utilities — tools a page object uses — not a category that a page object belongs to. A page object is a page. It uses actions and waits as tools.

### Four Helpers We Build

| Helper | Responsibility |
|--------|---------------|
| `WaitHelpers` | Targeted waiting strategies for OrangeHRM's async behaviour |
| `WebActions` | Reusable browser interaction patterns for OrangeHRM's custom components |
| `AssertionHelpers` | Composite assertions that verify multiple related things in one call |
| `DateHelpers` | Date formatting utilities for OrangeHRM's expected input format |

`WaitHelpers` is built first because `WebActions` depends on it — interactions need to wait for UI responses.

---

## Part 3 — Project Structure at Level 4

```
orangehrm-automation/
│
├── helpers/                            ← NEW — shared helper layer
│   ├── WaitHelpers.ts
│   ├── WebActions.ts
│   ├── AssertionHelpers.ts
│   ├── DateHelpers.ts
│   └── index.ts                        ← exports all helpers
│
├── pages/
│   ├── BasePage.ts                     ← no changes
│   ├── LoginPage.ts                    ← no changes
│   ├── DashboardPage.ts                ← no changes
│   ├── pim/
│   │   ├── EmployeeListPage.ts         ← refactored — uses WebActions, WaitHelpers
│   │   ├── AddEmployeePage.ts          ← refactored — uses WebActions, WaitHelpers
│   │   └── PersonalDetailsPage.ts      ← expanded — date, dropdown, file upload
│   ├── admin/
│   │   ├── UserManagementPage.ts       ← refactored — uses WebActions, WaitHelpers
│   │   └── AddUserPage.ts              ← refactored — uses WebActions, WaitHelpers
│   └── leave/
│       ├── ApplyLeavePage.ts           ← refactored — uses WebActions, WaitHelpers
│       └── LeaveListPage.ts            ← refactored — uses WebActions, WaitHelpers
│
├── fixtures/                           ← no changes
├── tests/                              ← NO CHANGES at Level 4
├── global-setup.ts                     ← no changes
└── playwright.config.ts                ← no changes
```

---

## Part 4 — WaitHelpers

`WaitHelpers` is built first because every other helper depends on it. Interactions need to wait for the UI to respond — a dropdown needs to open before an option can be clicked, a spinner needs to disappear before a table can be read.

OrangeHRM's `networkidle` strategy in `BasePage.waitForPageLoad()` is a blunt instrument. It waits for all network requests to stop — which is slower than necessary and occasionally unreliable on the shared demo site. `WaitHelpers` provides targeted waits tied to specific UI elements.

```typescript
// helpers/WaitHelpers.ts
import { Page, Locator } from '@playwright/test';

export class WaitHelpers {

  private readonly page:           Page;
  private readonly DEFAULT_TIMEOUT: number = 10_000;

  // OrangeHRM-specific selectors for common UI states
  private readonly SPINNER_SELECTOR      = '.oxd-loading-spinner';
  private readonly TOAST_SELECTOR        = '.oxd-toast-content';
  private readonly DROPDOWN_OPTIONS      = '.oxd-select-options';
  private readonly AUTOCOMPLETE_DROPDOWN = '.oxd-autocomplete-dropdown';

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Spinner ──────────────────────────────────────────────────────────────────

  // Waits for OrangeHRM's loading spinner to disappear.
  // More targeted than networkidle — fires as soon as the spinner is gone
  // rather than waiting for all network activity to stop.
  async waitForSpinnerToDisappear(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    const spinner = this.page.locator(this.SPINNER_SELECTOR);
    try {
      // If spinner is not present at all, this resolves immediately
      await spinner.waitFor({ state: 'hidden', timeout });
    } catch {
      // Spinner was not in the DOM — that is fine, nothing to wait for
    }
  }

  // ─── Table ────────────────────────────────────────────────────────────────────

  // Waits for a table to finish loading after a search or navigation.
  // OrangeHRM tables load asynchronously — asserting before load completes
  // causes intermittent failures when the table appears empty mid-load.
  // Resolves when either: the table has rows OR the no-records message appears.
  async waitForTableToLoad(tableLocator: Locator, timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    await this.waitForSpinnerToDisappear(timeout);

    const noRecords = this.page.getByText('No Records Found');

    await Promise.race([
      tableLocator.locator('role=row').first().waitFor({ state: 'visible', timeout }),
      noRecords.waitFor({ state: 'visible', timeout }),
    ]).catch(() => {
      // If neither appears within timeout, proceed — the assertion will catch it
    });
  }

  // ─── Toast ────────────────────────────────────────────────────────────────────

  // Waits for the OrangeHRM success/error toast to become visible.
  // Returns the toast locator so the caller can chain further assertions.
  async waitForToastToAppear(timeout = this.DEFAULT_TIMEOUT): Promise<Locator> {
    const toast = this.page.locator(this.TOAST_SELECTOR);
    await toast.waitFor({ state: 'visible', timeout });
    return toast;
  }

  // Waits for the toast to appear and then disappear.
  // OrangeHRM toasts auto-dismiss after a few seconds.
  // Call this when the next action depends on the toast being gone
  // — for example when a second form submission follows the first.
  async waitForToastToDisappear(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    await this.waitForToastToAppear(timeout);
    const toast = this.page.locator(this.TOAST_SELECTOR);
    await toast.waitFor({ state: 'hidden', timeout });
  }

  // ─── Dropdown ─────────────────────────────────────────────────────────────────

  // Waits for OrangeHRM's custom dropdown options list to be visible.
  // Called internally by WebActions after clicking a dropdown trigger.
  async waitForDropdownOptionsToAppear(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    await this.page
      .locator(this.DROPDOWN_OPTIONS)
      .waitFor({ state: 'visible', timeout });
  }

  // Waits for the dropdown options list to disappear after a selection.
  // Confirms the selection was registered before the next step runs.
  async waitForDropdownOptionsToDisappear(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    await this.page
      .locator(this.DROPDOWN_OPTIONS)
      .waitFor({ state: 'hidden', timeout });
  }

  // ─── Autocomplete ─────────────────────────────────────────────────────────────

  // Waits for OrangeHRM's autocomplete suggestion list to appear.
  async waitForAutocompleteToAppear(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    await this.page
      .locator(this.AUTOCOMPLETE_DROPDOWN)
      .waitFor({ state: 'visible', timeout });
  }

  // Waits for the autocomplete list to disappear after a selection.
  async waitForAutocompleteToDisappear(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    await this.page
      .locator(this.AUTOCOMPLETE_DROPDOWN)
      .waitFor({ state: 'hidden', timeout });
  }

  // ─── URL ──────────────────────────────────────────────────────────────────────

  // Waits for the URL to change from its current value.
  // Useful after form submissions that trigger unpredictable redirects —
  // more reliable than waitForURL(pattern) when the target URL is not known in advance.
  async waitForURLChange(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    const currentURL = this.page.url();
    await this.page.waitForFunction(
      (url: string) => window.location.href !== url,
      currentURL,
      { timeout }
    );
  }

}
```

---

## Part 5 — WebActions

`WebActions` provides one clean implementation of every interaction pattern that currently appears in multiple page objects. It uses `WaitHelpers` internally to wait for UI responses after each interaction.

Each method extracts the locator's `.describe()` label and includes it in any error message — so when an interaction fails, the error tells you exactly which element was involved.

```typescript
// helpers/WebActions.ts
import { Page, Locator } from '@playwright/test';
import { WaitHelpers }   from './WaitHelpers';

export class WebActions {

  private readonly page:  Page;
  private readonly waits: WaitHelpers;

  constructor(page: Page) {
    this.page  = page;
    this.waits = new WaitHelpers(page);
  }

  // Extracts the human-readable description from a locator's .describe() call.
  // Falls back to the locator's string representation if no description was set.
  private getDescription(locator: Locator): string {
    return locator.toString();
  }

  // ─── Dropdown ─────────────────────────────────────────────────────────────────

  // Selects an option from OrangeHRM's custom Vue dropdown.
  // Native page.selectOption() does not work on these components —
  // they require a click to open, then a click on the option.
  //
  // Usage:
  //   await this.actions.selectFromDropdown(this.userRoleDropdown, 'ESS');
  async selectFromDropdown(dropdownLocator: Locator, optionText: string): Promise<void> {
    const description = this.getDescription(dropdownLocator);
    try {
      await dropdownLocator.click();
      await this.waits.waitForDropdownOptionsToAppear();

      await this.page
        .locator('.oxd-select-option')
        .filter({ hasText: optionText })
        .click();

      await this.waits.waitForDropdownOptionsToDisappear();
    } catch (error) {
      throw new Error(
        `selectFromDropdown failed on "${description}" trying to select "${optionText}".\n` +
        `Cause: ${(error as Error).message}`
      );
    }
  }

  // ─── Autocomplete ─────────────────────────────────────────────────────────────

  // Fills an OrangeHRM autocomplete field and selects the first matching suggestion.
  // OrangeHRM autocomplete fields load suggestions asynchronously —
  // we wait for the dropdown to appear before clicking.
  //
  // Usage:
  //   await this.actions.fillAutocomplete(this.employeeNameInput, 'Alice');
  async fillAutocomplete(inputLocator: Locator, searchText: string): Promise<void> {
    const description = this.getDescription(inputLocator);
    try {
      await inputLocator.clear();
      await inputLocator.fill(searchText);
      await this.waits.waitForAutocompleteToAppear();

      await this.page
        .locator('.oxd-autocomplete-option')
        .first()
        .click();

      await this.waits.waitForAutocompleteToDisappear();
    } catch (error) {
      throw new Error(
        `fillAutocomplete failed on "${description}" searching for "${searchText}".\n` +
        `Cause: ${(error as Error).message}`
      );
    }
  }

  // ─── Date Input ───────────────────────────────────────────────────────────────

  // Fills an OrangeHRM date input field.
  // OrangeHRM date fields require Tab after filling to register the value —
  // without it the field reverts to empty when focus moves away.
  // The date string must be in OrangeHRM's expected format: yyyy-dd-mm.
  // Use DateHelpers.formatToOrangeHRM() to produce this string.
  //
  // Usage:
  //   await this.actions.fillDateInput(this.fromDateInput, '2025-01-15');
  async fillDateInput(inputLocator: Locator, formattedDate: string): Promise<void> {
    const description = this.getDescription(inputLocator);
    try {
      await inputLocator.clear();
      await inputLocator.fill(formattedDate);
      await inputLocator.press('Tab');

      // Verify the value was accepted — OrangeHRM clears invalid dates silently
      const actualValue = await inputLocator.inputValue();
      if (!actualValue) {
        throw new Error(
          `Date field cleared the value after Tab — "${formattedDate}" may be in the wrong format. ` +
          `OrangeHRM expects yyyy-dd-mm.`
        );
      }
    } catch (error) {
      throw new Error(
        `fillDateInput failed on "${description}" with value "${formattedDate}".\n` +
        `Cause: ${(error as Error).message}`
      );
    }
  }

  // ─── Table Row Action ─────────────────────────────────────────────────────────

  // Clicks an action button within a specific table row.
  // Identifies the row by searching for text that uniquely identifies it
  // — typically an employee name or username.
  //
  // Usage:
  //   await this.actions.clickTableRowAction(this.leaveTable, 'Alice Johnson', 'Approve');
  async clickTableRowAction(
    tableLocator:  Locator,
    rowIdentifier: string,
    actionName:    string
  ): Promise<void> {
    const description = this.getDescription(tableLocator);
    try {
      const row = tableLocator
        .getByRole('row', { name: new RegExp(rowIdentifier, 'i') });

      // Scroll the row into view before interacting — long tables may push it offscreen
      await row.scrollIntoViewIfNeeded();
      await row.getByRole('button', { name: actionName }).click();
    } catch (error) {
      throw new Error(
        `clickTableRowAction failed in "${description}" ` +
        `looking for row "${rowIdentifier}" and button "${actionName}".\n` +
        `Cause: ${(error as Error).message}`
      );
    }
  }

  // ─── Confirmation Dialog ──────────────────────────────────────────────────────

  // Handles OrangeHRM's confirmation modal dialog.
  // Called after actions that trigger a confirmation — delete, approve, reject.
  // Waits for the modal overlay to be visible before clicking the confirm button.
  //
  // Usage:
  //   await this.actions.handleConfirmationDialog('Ok');
  async handleConfirmationDialog(confirmButtonName: string = 'Ok'): Promise<void> {
    try {
      const modal = this.page.locator('.oxd-dialog-container');
      await modal.waitFor({ state: 'visible' });
      await modal.getByRole('button', { name: confirmButtonName }).click();
      await modal.waitFor({ state: 'hidden' });
    } catch (error) {
      throw new Error(
        `handleConfirmationDialog failed waiting for modal or clicking "${confirmButtonName}".\n` +
        `Cause: ${(error as Error).message}`
      );
    }
  }

  // ─── File Upload ──────────────────────────────────────────────────────────────

  // Uploads a file using an OrangeHRM file input.
  // OrangeHRM uses standard file inputs for profile photos and attachments —
  // setInputFiles() works directly on these without needing to open a file dialog.
  // After uploading, waits for the preview element to confirm the upload registered.
  //
  // Usage:
  //   await this.actions.uploadFile(this.photoUploadInput, 'test-data/photos/profile.jpg');
  async uploadFile(inputLocator: Locator, filePath: string): Promise<void> {
    const description = this.getDescription(inputLocator);
    try {
      await inputLocator.setInputFiles(filePath);

      // Wait for the upload preview to appear — confirms the file was accepted
      await this.page
        .locator('.oxd-file-input-div, .employee-image')
        .waitFor({ state: 'visible' });
    } catch (error) {
      throw new Error(
        `uploadFile failed on "${description}" with file "${filePath}".\n` +
        `Cause: ${(error as Error).message}`
      );
    }
  }

}
```

---

## Part 6 — AssertionHelpers

`AssertionHelpers` provides composite assertions — single method calls that verify multiple related things. This replaces the pattern of chaining four or five `expect()` calls in a test or page object assertion method.

### Soft assertions

Before looking at the helpers, one foundational pattern: `expect.soft()`.

A standard `expect()` stops the test immediately on failure — one broken field and the test is over. You fix it, rerun, discover the next broken field, repeat.

`expect.soft()` records the failure but continues the test. All assertions run. The test is marked failed at the end but the report shows every failure at once.

```typescript
// Standard — stops at first failure
await expect(firstNameInput).toHaveValue('Alice');    // fails here
await expect(lastNameInput).toHaveValue('Johnson');   // never reached
await expect(employeeIdInput).toHaveValue('EMP-001'); // never reached

// Soft — all three run regardless
await expect.soft(firstNameInput).toHaveValue('Alice');
await expect.soft(lastNameInput).toHaveValue('Johnson');
await expect.soft(employeeIdInput).toHaveValue('EMP-001');
// Test ends here — all three failures reported together
```

Use soft assertions when verifying multiple independent fields on the same page — form values, table cell contents, profile details. Use standard `expect()` for sequential steps where a failure on the first makes subsequent assertions meaningless.

`AssertionHelpers` uses `expect.soft()` internally wherever multiple independent fields are verified together.

```typescript
// helpers/AssertionHelpers.ts
import { Page, Locator, expect } from '@playwright/test';
import { WaitHelpers }           from './WaitHelpers';

export class AssertionHelpers {

  private readonly page:  Page;
  private readonly waits: WaitHelpers;

  constructor(page: Page) {
    this.page  = page;
    this.waits = new WaitHelpers(page);
  }

  // ─── Table ────────────────────────────────────────────────────────────────────

  // Asserts the table has exactly the expected number of data rows.
  // Waits for the table to finish loading before counting.
  //
  // Usage:
  //   await this.assertions.assertTableRowCount(this.employeeTable, 3);
  async assertTableRowCount(tableLocator: Locator, expectedCount: number): Promise<void> {
    await this.waits.waitForTableToLoad(tableLocator);
    const rows = tableLocator.getByRole('row');
    await expect(rows).toHaveCount(expectedCount);
  }

  // Asserts that a specific table row contains expected values.
  // expectedValues is a map of text strings that must all appear in the row.
  // Collects all failures and reports them together.
  //
  // Usage:
  //   await this.assertions.assertTableRowContains(
  //     this.userTable,
  //     'alice.johnson',
  //     { role: 'ESS', status: 'Enabled', username: 'alice.johnson' }
  //   );
  async assertTableRowContains(
    tableLocator:   Locator,
    rowIdentifier:  string,
    expectedValues: Record<string, string>
  ): Promise<void> {
    await this.waits.waitForTableToLoad(tableLocator);

    const row = tableLocator
      .getByRole('row', { name: new RegExp(rowIdentifier, 'i') });

    await expect(row).toBeVisible();

    // Soft assertions — each field is independent.
    // A missing role does not prevent checking status or username.
    // All failures reported together at the end of the test.
    for (const [key, value] of Object.entries(expectedValues)) {
      await expect.soft(
        row.getByText(value),
        `Expected row "${rowIdentifier}" to contain ${key}: "${value}"`
      ).toBeVisible();
    }
  }

  // ─── Dropdown ─────────────────────────────────────────────────────────────────

  // Asserts the currently selected value in an OrangeHRM custom dropdown.
  // OrangeHRM renders the selected value in a child span — this navigates to it.
  //
  // Usage:
  //   await this.assertions.assertDropdownSelectedValue(this.statusDropdown, 'Enabled');
  async assertDropdownSelectedValue(
    dropdownLocator: Locator,
    expectedValue:   string
  ): Promise<void> {
    const selectedText = dropdownLocator.locator('.oxd-select-text-input');
    await expect(selectedText).toHaveText(expectedValue);
  }

  // ─── Toast ────────────────────────────────────────────────────────────────────

  // Waits for the toast to appear and asserts its message text.
  // More specific than asserting visibility alone —
  // catches cases where a toast appears but carries an error message.
  //
  // Usage:
  //   await this.assertions.assertToastMessage('Successfully Saved');
  async assertToastMessage(expectedMessage: string): Promise<void> {
    const toast = await this.waits.waitForToastToAppear();
    await expect(toast.locator('.oxd-toast-content-text')).toHaveText(expectedMessage);
  }

  // ─── Form Validation ──────────────────────────────────────────────────────────

  // Asserts a validation error appears next to a specific form field.
  // OrangeHRM renders validation errors as siblings of the input inside
  // a shared form group container.
  //
  // Usage:
  //   await this.assertions.assertFormValidationError('Username', 'Required');
  async assertFormValidationError(fieldLabel: string, expectedError: string): Promise<void> {
    // Find the form group containing the field label
    const formGroup = this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.getByText(fieldLabel) });

    const errorMessage = formGroup.locator('.oxd-input-field-error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(expectedError);
  }

}
```

---

## Part 7 — DateHelpers

`DateHelpers` is a pure utility class — it has no browser dependency and does not receive `page` in its constructor. It handles the formatting mismatch between how test data is written (`2025-01-15`) and what OrangeHRM's date inputs expect (`2025-15-01`).

```typescript
// helpers/DateHelpers.ts

export class DateHelpers {

  // OrangeHRM date input format: yyyy-dd-mm
  // Note: this is NOT the standard ISO format (yyyy-mm-dd)
  // The day and month are swapped compared to what most developers expect
  private static readonly ORANGEHRM_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

  // ─── Formatting ───────────────────────────────────────────────────────────────

  // Converts a JavaScript Date object to OrangeHRM's expected input format.
  // OrangeHRM expects yyyy-dd-mm — day and month are in reversed order
  // compared to standard ISO 8601 (yyyy-mm-dd).
  //
  // Usage:
  //   DateHelpers.formatToOrangeHRM(new Date('2025-01-15'));
  //   → '2025-15-01'
  static formatToOrangeHRM(date: Date): string {
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day   = String(date.getDate()).padStart(2, '0');
    return `${year}-${day}-${month}`;
  }

  // Parses an ISO date string (yyyy-mm-dd) and returns OrangeHRM format (yyyy-dd-mm).
  // This is the most common conversion needed — test data is typically written
  // in ISO format for readability, but must be converted before being sent to a field.
  //
  // Usage:
  //   DateHelpers.fromISO('2025-01-15');
  //   → '2025-15-01'
  static fromISO(isoDateString: string): string {
    const [year, month, day] = isoDateString.split('-');
    if (!year || !month || !day) {
      throw new Error(
        `DateHelpers.fromISO: "${isoDateString}" is not a valid ISO date string. ` +
        `Expected format: yyyy-mm-dd.`
      );
    }
    return `${year}-${day}-${month}`;
  }

  // ─── Validation ───────────────────────────────────────────────────────────────

  // Returns true if the string is in OrangeHRM's expected date format (yyyy-dd-mm).
  // Use this as a guard before passing a date string to fillDateInput().
  //
  // Usage:
  //   DateHelpers.isValidOrangeHRMDate('2025-15-01'); → true
  //   DateHelpers.isValidOrangeHRMDate('2025-01-15'); → false (ISO format — will fail)
  static isValidOrangeHRMDate(dateString: string): boolean {
    if (!DateHelpers.ORANGEHRM_FORMAT.test(dateString)) return false;

    const [year, day, month] = dateString.split('-').map(Number);
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31)     return false;

    // Validate day against month — catches impossible dates like 2025-31-02
    const maxDays = new Date(year, month, 0).getDate();
    return day <= maxDays;
  }

}
```

### helpers/index.ts

Single export point — test files and page objects import from `'../helpers'` rather than individual files:

```typescript
// helpers/index.ts
export { WaitHelpers }      from './WaitHelpers';
export { WebActions }       from './WebActions';
export { AssertionHelpers } from './AssertionHelpers';
export { DateHelpers }      from './DateHelpers';
```

---

## Part 8 — Refactoring Page Objects to Use Helpers

Each page object that has custom dropdown, autocomplete, date, or table interaction gets two additions to its constructor:

```typescript
private readonly actions: WebActions;
private readonly waits:   WaitHelpers;

constructor(page: Page) {
  super(page);
  this.actions = new WebActions(page);
  this.waits   = new WaitHelpers(page);
  // ... locators
}
```

Then its action methods delegate to the helpers instead of driving the browser directly.

### AddUserPage.ts — Refactored

Before and after comparison to show the value clearly:

**Before (Level 3):**
```typescript
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
```

**After (Level 4):**
```typescript
async selectUserRole(role: 'Admin' | 'ESS'): Promise<void> {
  await this.actions.selectFromDropdown(this.userRoleDropdown, role);
}

async fillEmployeeName(employeeName: string): Promise<void> {
  await this.actions.fillAutocomplete(this.employeeNameInput, employeeName);
}

async selectStatus(status: 'Enabled' | 'Disabled'): Promise<void> {
  await this.actions.selectFromDropdown(this.statusDropdown, status);
}
```

The methods become single-line delegations. The interaction logic — opening dropdowns, waiting for options, handling autocomplete — lives in one place and is tested once.

**Full refactored AddUserPage.ts:**

```typescript
// pages/admin/AddUserPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';
import { WebActions }            from '../../helpers/WebActions';
import { WaitHelpers }           from '../../helpers/WaitHelpers';

export class AddUserPage extends BasePage {

  private readonly actions: WebActions;
  private readonly waits:   WaitHelpers;

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
    this.actions = new WebActions(page);
    this.waits   = new WaitHelpers(page);

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
    await this.actions.selectFromDropdown(this.userRoleDropdown, role);
  }

  async fillEmployeeName(employeeName: string): Promise<void> {
    await this.actions.fillAutocomplete(this.employeeNameInput, employeeName);
  }

  async selectStatus(status: 'Enabled' | 'Disabled'): Promise<void> {
    await this.actions.selectFromDropdown(this.statusDropdown, status);
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
    await this.waits.waitForToastToAppear();
  }

  async addUser(
    role:         'Admin' | 'ESS',
    employeeName: string,
    status:       'Enabled' | 'Disabled',
    username:     string,
    password:     string
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

### ApplyLeavePage.ts — Refactored

```typescript
// pages/leave/ApplyLeavePage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';
import { WebActions }            from '../../helpers/WebActions';
import { WaitHelpers }           from '../../helpers/WaitHelpers';

export class ApplyLeavePage extends BasePage {

  private readonly actions: WebActions;
  private readonly waits:   WaitHelpers;

  private readonly pageHeading:       Locator;
  private readonly leaveTypeDropdown: Locator;
  private readonly fromDateInput:     Locator;
  private readonly toDateInput:       Locator;
  private readonly commentInput:      Locator;
  private readonly applyButton:       Locator;
  private readonly successToast:      Locator;

  constructor(page: Page) {
    super(page);
    this.actions = new WebActions(page);
    this.waits   = new WaitHelpers(page);

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
    await this.actions.selectFromDropdown(this.leaveTypeDropdown, leaveType);
  }

  // date must be in OrangeHRM format: yyyy-dd-mm
  // Use DateHelpers.fromISO() to convert from standard ISO format
  async fillFromDate(date: string): Promise<void> {
    await this.actions.fillDateInput(this.fromDateInput, date);
  }

  async fillToDate(date: string): Promise<void> {
    await this.actions.fillDateInput(this.toDateInput, date);
  }

  async fillComment(comment: string): Promise<void> {
    await this.commentInput.fill(comment);
  }

  async submitLeaveApplication(): Promise<void> {
    await this.applyButton.click();
    await this.waits.waitForToastToAppear();
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
    if (comment) await this.fillComment(comment);
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

### LeaveListPage.ts — Refactored

```typescript
// pages/leave/LeaveListPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';
import { WebActions }            from '../../helpers/WebActions';
import { WaitHelpers }           from '../../helpers/WaitHelpers';

export class LeaveListPage extends BasePage {

  private readonly actions: WebActions;
  private readonly waits:   WaitHelpers;

  private readonly pageHeading:      Locator;
  private readonly leaveTable:       Locator;
  private readonly noRecordsMessage: Locator;
  private readonly successToast:     Locator;

  constructor(page: Page) {
    super(page);
    this.actions = new WebActions(page);
    this.waits   = new WaitHelpers(page);

    this.pageHeading      = this.page.getByRole('heading', { name: 'Leave List' })
                                     .describe('Leave list page heading');
    this.leaveTable       = this.page.locator('.oxd-table-body')
                                     .describe('Leave requests table body');
    this.noRecordsMessage = this.page.getByText('No Records Found')
                                     .describe('No records found message');
    this.successToast     = this.page.locator('.oxd-toast-content')
                                     .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/leave/viewLeaveList');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async approveLeaveRequest(employeeName: string): Promise<void> {
    await this.actions.clickTableRowAction(this.leaveTable, employeeName, 'Approve');
    await this.actions.handleConfirmationDialog('Ok');
    await this.waits.waitForToastToAppear();
  }

  async rejectLeaveRequest(employeeName: string): Promise<void> {
    await this.actions.clickTableRowAction(this.leaveTable, employeeName, 'Reject');
    await this.actions.handleConfirmationDialog('Ok');
    await this.waits.waitForToastToAppear();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/viewLeaveList/);
    await expect(this.pageHeading).toBeVisible();
  }

  async assertLeaveRequestVisible(employeeName: string): Promise<void> {
    await this.waits.waitForTableToLoad(this.leaveTable);
    await expect(
      this.leaveTable.getByRole('row', { name: new RegExp(employeeName, 'i') })
    ).toBeVisible();
  }

  async assertLeaveRequestStatus(
    employeeName:   string,
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

## Part 9 — Expanding PersonalDetailsPage

`PersonalDetailsPage` was introduced at Level 2 with only first name, last name, and employee ID. At Level 4 it gets the full treatment — gender dropdown, nationality dropdown, date of birth, and profile photo upload — all using helpers.

This page object is the best showcase of the helper layer because it uses four different helpers in a single class.

```typescript
// pages/pim/PersonalDetailsPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';
import { WebActions }            from '../../helpers/WebActions';
import { WaitHelpers }           from '../../helpers/WaitHelpers';
import { DateHelpers }           from '../../helpers/DateHelpers';

export class PersonalDetailsPage extends BasePage {

  private readonly actions: WebActions;
  private readonly waits:   WaitHelpers;

  private readonly firstNameInput:    Locator;
  private readonly lastNameInput:     Locator;
  private readonly employeeIdInput:   Locator;
  private readonly dobInput:          Locator;
  private readonly genderMaleRadio:   Locator;
  private readonly genderFemaleRadio: Locator;
  private readonly nationalityDropdown: Locator;
  private readonly photoUploadInput:  Locator;
  private readonly saveButton:        Locator;
  private readonly successToast:      Locator;

  constructor(page: Page) {
    super(page);
    this.actions = new WebActions(page);
    this.waits   = new WaitHelpers(page);

    this.firstNameInput     = this.page.getByPlaceholder('First Name')
                                       .describe('Employee first name input');
    this.lastNameInput      = this.page.getByPlaceholder('Last Name')
                                       .describe('Employee last name input');
    this.employeeIdInput    = this.page.locator('input.oxd-input').nth(1)
                                       .describe('Employee ID input field');
    this.dobInput           = this.page.getByPlaceholder('yyyy-dd-mm')
                                       .describe('Date of birth input');
    this.genderMaleRadio    = this.page.getByLabel('Male')
                                       .describe('Male gender radio button');
    this.genderFemaleRadio  = this.page.getByLabel('Female')
                                       .describe('Female gender radio button');
    this.nationalityDropdown = this.page.locator('.oxd-select-text').first()
                                        .describe('Nationality dropdown');
    this.photoUploadInput   = this.page.locator('input[type="file"]')
                                       .describe('Profile photo upload input');
    this.saveButton         = this.page.getByRole('button', { name: 'Save' }).first()
                                       .describe('Save personal details button');
    this.successToast       = this.page.locator('.oxd-toast-content')
                                       .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(empNumber: string): Promise<void> {
    await this.navigate(
      `/web/index.php/pim/viewPersonalDetails/empNumber/${empNumber}`
    );
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

  // isoDate: standard ISO format string yyyy-mm-dd
  // DateHelpers converts it to OrangeHRM's expected format before filling
  async fillDateOfBirth(isoDate: string): Promise<void> {
    const orangeHRMDate = DateHelpers.fromISO(isoDate);
    await this.actions.fillDateInput(this.dobInput, orangeHRMDate);
  }

  async selectGender(gender: 'Male' | 'Female'): Promise<void> {
    if (gender === 'Male') {
      await this.genderMaleRadio.check();
    } else {
      await this.genderFemaleRadio.check();
    }
  }

  async selectNationality(nationality: string): Promise<void> {
    await this.actions.selectFromDropdown(this.nationalityDropdown, nationality);
  }

  async uploadProfilePhoto(filePath: string): Promise<void> {
    await this.actions.uploadFile(this.photoUploadInput, filePath);
  }

  async savePersonalDetails(): Promise<void> {
    await this.saveButton.click();
    await this.waits.waitForToastToAppear();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/viewPersonalDetails/);
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

  async assertDateOfBirth(isoDate: string): Promise<void> {
    const orangeHRMDate = DateHelpers.fromISO(isoDate);
    await expect(this.dobInput).toHaveValue(orangeHRMDate);
  }
}
```

---

## Part 10 — What Level 4 Does Not Solve

### Test data is still hardcoded

Every test file still defines its own `const newEmployee`, `const newUser`, `const leaveApplication` objects with hardcoded names, dates, and credentials. If two tests use the same employee name, they conflict on the shared demo site. **Level 5** introduces a test data factory that generates unique values per run — eliminating both hardcoding and data conflicts.

### Tests still depend on each other

The leave approval test still depends on the apply test having run first. The user search test still depends on the add user test having created the user. **Level 6** fixes this with API-driven state setup — every test creates its own prerequisite data independently via the OrangeHRM API before the browser even opens.

---

> **You are ready for Level 5** when your helper-refactored suite passes all tests and you are frustrated by hardcoded test data causing conflicts on the shared demo site.

---

### Quick Reference — What Changed at Level 4

| File | Change |
|------|--------|
| `helpers/WaitHelpers.ts` | Created — targeted waiting strategies |
| `helpers/WebActions.ts` | Created — reusable interaction patterns |
| `helpers/AssertionHelpers.ts` | Created — composite assertion methods |
| `helpers/DateHelpers.ts` | Created — OrangeHRM date formatting utilities |
| `helpers/index.ts` | Created — single export point |
| `pages/admin/AddUserPage.ts` | Refactored — uses WebActions, WaitHelpers |
| `pages/leave/ApplyLeavePage.ts` | Refactored — uses WebActions, WaitHelpers |
| `pages/leave/LeaveListPage.ts` | Refactored — uses WebActions, WaitHelpers |
| `pages/pim/PersonalDetailsPage.ts` | Expanded — date, dropdown, gender, photo upload |
| `tests/**` | No changes |
| `fixtures/**` | No changes |
| `playwright.config.ts` | No changes |

---

*Level 4 of 9 — Playwright TypeScript · OrangeHRM · Enterprise POM Framework*
*(Level 0 covers theory and setup — this series runs from Level 0 through Level 9)*
