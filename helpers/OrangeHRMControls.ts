// helpers/OrangeHRMControls.ts
// Handles every UI component and wait specific to OrangeHRM's Vue component library.
// Receives the shared WebActions instance from BasePage — the same instance as this.actions —
// so error classification and self-healing apply throughout, at the WebActions layer.
//
// All OrangeHRM CSS selectors are centralised here. When OrangeHRM upgrades its component
// library, only this file needs updating — not every page object that uses these controls.
import { Page, Locator, expect } from '@playwright/test';
import { WebActions }            from './WebActions';

export class OrangeHRMControls {

  private readonly page:    Page;
  private readonly actions: WebActions;

  // OrangeHRM Vue component selectors — all app-specific CSS lives here
  private readonly SPINNER_SELECTOR      = '.oxd-loading-spinner';
  private readonly TOAST_SELECTOR        = '.oxd-toast-content';
  private readonly DROPDOWN_OPTIONS      = '.oxd-select-dropdown';
  private readonly AUTOCOMPLETE_DROPDOWN = '.oxd-autocomplete-dropdown';

  // Receives the shared WebActions instance — no separate instantiation.
  constructor(page: Page, actions: WebActions) {
    this.page    = page;
    this.actions = actions;
  }

  // ─── App-Specific Waits (public) ─────────────────────────────────────────────

  // Waits for OrangeHRM's toast notification to appear.
  // Call after any action that triggers a success/error toast (save, update, delete).
  async waitForToast(timeout?: number): Promise<Locator> {
    const toast = this.page.locator(this.TOAST_SELECTOR);
    await toast.waitFor({ state: 'visible', timeout });
    return toast;
  }

  // Waits for a table to finish loading — spinner disappears then row or no-records appears.
  async waitForTableToLoad(
    tableLocator: Locator,
    timeout?:     number
  ): Promise<void> {
    await this.waitForSpinnerToDisappear(timeout);
    const noRecords = this.page.locator('span', { hasText: 'No Records Found' });
    await Promise.race([
      tableLocator.locator('role=row').first().waitFor({ state: 'visible', timeout }),
      noRecords.waitFor({ state: 'visible', timeout }),
    ]).catch(() => {
      // If neither appears, proceed — the assertion will catch it
    });
  }

  // ─── Private App-Specific Waits ──────────────────────────────────────────────

  private async waitForSpinnerToDisappear(timeout?: number): Promise<void> {
    const spinner = this.page.locator(this.SPINNER_SELECTOR);
    try {
      await spinner.waitFor({ state: 'hidden', timeout });
    } catch {
      // Spinner was not in the DOM — nothing to wait for
    }
  }

  private async waitForDropdownOptionsToAppear(timeout?: number): Promise<void> {
    await this.page.locator(this.DROPDOWN_OPTIONS).waitFor({ state: 'visible', timeout });
  }

  private async waitForDropdownOptionsToDisappear(timeout?: number): Promise<void> {
    await this.page.locator(this.DROPDOWN_OPTIONS).waitFor({ state: 'hidden', timeout });
  }

  private async waitForAutocompleteToAppear(timeout?: number): Promise<void> {
    await this.page.locator(this.AUTOCOMPLETE_DROPDOWN).waitFor({ state: 'visible', timeout });
  }

  private async waitForAutocompleteToDisappear(timeout?: number): Promise<void> {
    await this.page.locator(this.AUTOCOMPLETE_DROPDOWN).waitFor({ state: 'hidden', timeout });
  }

  // ─── Custom Dropdown ──────────────────────────────────────────────────────────

  // Selects an option from OrangeHRM's custom Vue dropdown component.
  // Native page.selectOption() does not work — these are not <select> elements.
  // The interaction: click to open → wait for options → click matching option → wait to close.
  //
  // Usage:
  //   await this.controls.selectDropdown(this.userRoleDropdown, 'ESS');
  //   await this.controls.selectDropdown(this.statusDropdown, 'Enabled');
  async selectDropdown(dropdownLocator: Locator, optionText: string): Promise<void> {
    await this.actions.click(dropdownLocator);
    await this.waitForDropdownOptionsToAppear();

    const option = this.page
      .locator('.oxd-select-option')
      .filter({ hasText: optionText })
      .describe(`"${optionText}" option in dropdown`);

    await this.actions.click(option);
    await this.waitForDropdownOptionsToDisappear();
  }

  // ─── Autocomplete ─────────────────────────────────────────────────────────────

  // Fills an OrangeHRM autocomplete field and selects the first matching suggestion.
  // Autocomplete suggestions load asynchronously — waits for the dropdown before clicking.
  //
  // Implementation note (Gap 5 — known fragility):
  // The selection uses ArrowDown + Enter (keyboard) rather than mouse click.
  // OrangeHRM's Vue autocomplete uses @mousedown.prevent on each option, which means
  // Playwright's click() fires a real mousedown that triggers input blur BEFORE the
  // @click handler can set the Vue model — leaving the field as "Invalid".
  // Keyboard navigation bypasses this race. If selection breaks after an OrangeHRM
  // upgrade, check whether @keydown handlers are still attached to the dropdown.
  //
  // Usage:
  //   await this.controls.fillAutocomplete(this.employeeNameInput, employee.fullName);
  async fillAutocomplete(inputLocator: Locator, searchText: string): Promise<void> {
    // Type character-by-character to trigger Vue's @keydown/@input search watchers.
    // locator.fill() only fires an `input` event and skips the key events that
    // OrangeHRM's Vue autocomplete component needs to display suggestions.
    await this.actions.typeSequentially(inputLocator, searchText);
    await this.waitForAutocompleteToAppear();

    // Use keyboard navigation to select the first option.
    // Advantages over mouse click:
    //   • ArrowDown + Enter is handled by Vue's own keyboard handler (@keydown),
    //     guaranteeing the component updates its v-model correctly.
    //   • Avoids a mousedown→blur→click race where blur can clear the selection
    //     before the click handler sets it.
    await this.actions.pressKey(inputLocator, 'ArrowDown');
    await this.actions.pressKey(inputLocator, 'Enter');
    await this.waitForAutocompleteToDisappear();

    // Allow Vue's reactivity to settle after selection before the caller proceeds.
    await this.page.waitForTimeout(300);
  }

  // ─── Date Input ───────────────────────────────────────────────────────────────

  // Fills an OrangeHRM date input field.
  // Requires Tab after filling — OrangeHRM reverts the value without it.
  // Verifies the value was accepted — OrangeHRM clears invalid dates silently.
  // Use DateHelpers.fromISO() to produce the correctly formatted string.
  //
  // Usage:
  //   await this.controls.fillDateInput(this.fromDateInput, DateHelpers.fromISO('2025-06-01'));
  async fillDateInput(inputLocator: Locator, formattedDate: string): Promise<void> {
    await this.actions.fill(inputLocator, formattedDate);
    await this.actions.pressKey(inputLocator, 'Tab');

    // Verify the value was accepted — OrangeHRM clears invalid dates silently
    const actualValue = await inputLocator.inputValue();
    if (!actualValue) {
      throw new Error(
        `fillDateInput: date field rejected "${formattedDate}". ` +
        `OrangeHRM expects format yyyy-dd-mm. ` +
        `Use DateHelpers.fromISO() to produce the correct string.`
      );
    }
  }

  // ─── Confirmation Dialog ──────────────────────────────────────────────────────

  // Handles OrangeHRM's modal confirmation dialog.
  // Used after delete, approve, and reject actions that trigger a confirmation.
  // Waits for the modal to appear, clicks the confirm button, waits for it to close.
  //
  // Usage:
  //   await this.controls.handleConfirmationDialog('Ok');
  //   await this.controls.handleConfirmationDialog('Confirm');
  async handleConfirmationDialog(confirmButtonName = 'Ok'): Promise<void> {
    const modal = this.page
      .locator('.oxd-dialog-container')
      .describe('OrangeHRM confirmation dialog');

    await modal.waitFor({ state: 'visible' });

    const confirmButton = modal
      .getByRole('button', { name: confirmButtonName })
      .describe(`"${confirmButtonName}" button in confirmation dialog`);

    await this.actions.click(confirmButton);
    await modal.waitFor({ state: 'hidden' });
  }

  // ─── Table Row Action ─────────────────────────────────────────────────────────

  // Clicks an action button within a specific table row.
  // Identifies the row by a unique identifier — typically an employee name or username.
  // Scrolls the row into view before interacting — long tables push rows off-screen.
  //
  // Usage:
  //   await this.controls.clickTableRowAction(this.leaveTable, employee.fullName, 'Approve');
  //   await this.controls.clickTableRowAction(this.userTable, user.username, 'Delete');
  async clickTableRowAction(
    tableLocator:  Locator,
    rowIdentifier: string,
    actionName:    string
  ): Promise<void> {
    const row = tableLocator
      .getByRole('row', { name: new RegExp(rowIdentifier, 'i') })
      .describe(`Row containing "${rowIdentifier}"`);

    await this.actions.scrollIntoView(row);

    const actionButton = row
      .getByRole('button', { name: actionName })
      .describe(`"${actionName}" button in row "${rowIdentifier}"`);

    await this.actions.click(actionButton);
  }

  // ─── File Upload ──────────────────────────────────────────────────────────────

  // Uploads a file via an OrangeHRM file input and waits for the preview to confirm.
  // OrangeHRM uses standard file inputs for photos and attachments.
  // After upload, waits for the preview element to confirm the file was accepted.
  //
  // Usage:
  //   await this.controls.uploadFile(this.photoInput, 'test-data/photos/profile.jpg');
  async uploadFile(inputLocator: Locator, filePath: string): Promise<void> {
    await this.actions.uploadFile(inputLocator, filePath);

    // Wait for OrangeHRM's upload preview to appear — confirms the file registered
    await this.page
      .locator('.oxd-file-input-div, .employee-image')
      .waitFor({ state: 'visible' });
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  // Asserts the currently selected value in OrangeHRM's custom Vue dropdown.
  // OrangeHRM renders the selected value inside a child span — not a native select.
  //
  // Usage:
  //   await this.controls.assertDropdownValue(this.statusDropdown, 'Enabled');
  async assertDropdownValue(dropdownLocator: Locator, expectedValue: string): Promise<void> {
    await expect(
      dropdownLocator.locator('.oxd-select-text-input')
    ).toHaveText(expectedValue);
  }

  // Asserts the OrangeHRM toast message matches the expected text.
  // Waits for the toast to appear before asserting — safe to call immediately after an action.
  //
  // Usage:
  //   await this.controls.assertToastMessage('Successfully Saved');
  async assertToastMessage(expectedMessage: string): Promise<void> {
    const toast = await this.waitForToast();
    await expect(
      toast.locator('.oxd-toast-content-text')
    ).toHaveText(expectedMessage);
  }

  // Asserts a validation error appears next to a specific OrangeHRM form field.
  // OrangeHRM renders validation errors inside .oxd-input-group as siblings of the input.
  //
  // Usage:
  //   await this.controls.assertFormFieldError('Username', 'Required');
  async assertFormFieldError(fieldLabel: string, expectedError: string): Promise<void> {
    const formGroup = this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.getByText(fieldLabel) });

    await expect(
      formGroup.locator('.oxd-input-field-error-message')
    ).toHaveText(expectedError);
  }

}
