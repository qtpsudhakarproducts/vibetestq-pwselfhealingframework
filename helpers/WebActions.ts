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

  private getDescription(locator: Locator): string {
    return locator.toString();
  }

  // ─── Dropdown ─────────────────────────────────────────────────────────────────

  // Selects an option from OrangeHRM's custom Vue dropdown.
  // Native page.selectOption() does not work on these components.
  async selectFromDropdown(dropdownLocator: Locator, optionText: string): Promise<void> {
    const description = this.getDescription(dropdownLocator);
    try {
      await dropdownLocator.click();
      await this.waits.waitForDropdownOptionsToAppear();
      await this.page.getByRole('option', { name: optionText }).click();
      await this.waits.waitForDropdownOptionsToDisappear();
    } catch (error) {
      throw new Error(
        `selectFromDropdown failed for "${description}" with option "${optionText}": ${error}`
      );
    }
  }

  // ─── Autocomplete ─────────────────────────────────────────────────────────────

  // Fills an OrangeHRM autocomplete field and selects the first matching option.
  async fillAutocomplete(inputLocator: Locator, searchText: string): Promise<void> {
    const description = this.getDescription(inputLocator);
    try {
      await inputLocator.fill(searchText);
      await this.waits.waitForAutocompleteToAppear();
      await this.page.locator('.oxd-autocomplete-option').first().click();
      await this.waits.waitForAutocompleteToDisappear();
    } catch (error) {
      throw new Error(
        `fillAutocomplete failed for "${description}" with text "${searchText}": ${error}`
      );
    }
  }

  // ─── Date Input ───────────────────────────────────────────────────────────────

  // Fills an OrangeHRM date input field.
  // Clears the field first to avoid appending to an existing date.
  async fillDateInput(dateLocator: Locator, dateValue: string): Promise<void> {
    const description = this.getDescription(dateLocator);
    try {
      await dateLocator.clear();
      await dateLocator.fill(dateValue);
      await dateLocator.press('Tab');
    } catch (error) {
      throw new Error(
        `fillDateInput failed for "${description}" with value "${dateValue}": ${error}`
      );
    }
  }

  // ─── Click and Wait ───────────────────────────────────────────────────────────

  // Clicks a button and waits for the toast notification to appear.
  async clickAndWaitForToast(buttonLocator: Locator): Promise<Locator> {
    const description = this.getDescription(buttonLocator);
    try {
      await buttonLocator.click();
      return await this.waits.waitForToastToAppear();
    } catch (error) {
      throw new Error(
        `clickAndWaitForToast failed for "${description}": ${error}`
      );
    }
  }

  // Clicks a button and waits for the URL to change.
  async clickAndWaitForNavigation(buttonLocator: Locator): Promise<void> {
    const description = this.getDescription(buttonLocator);
    try {
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle' }),
        buttonLocator.click(),
      ]);
    } catch (error) {
      throw new Error(
        `clickAndWaitForNavigation failed for "${description}": ${error}`
      );
    }
  }

  // ─── Table Actions ────────────────────────────────────────────────────────────

  // Finds a row in a table by partial text match and clicks a button in that row.
  async clickButtonInTableRow(
    tableLocator:  Locator,
    rowSearchText: string,
    buttonName:    string
  ): Promise<void> {
    const row = tableLocator.getByRole('row', {
      name: new RegExp(rowSearchText, 'i'),
    });
    await row.getByRole('button', { name: buttonName }).click();
  }

  // Returns the number of rows currently visible in a table.
  async getTableRowCount(tableLocator: Locator): Promise<number> {
    const rows = tableLocator.getByRole('row');
    return await rows.count();
  }

}
