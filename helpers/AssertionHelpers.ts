// helpers/AssertionHelpers.ts
// Purely generic assertion utilities — no app-specific selectors or dependencies.
// OrangeHRM-specific assertions (toast, dropdown value, form errors) live in OrangeHRMControls.
import { Locator, Page, expect } from '@playwright/test';

export class AssertionHelpers {

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Visibility ───────────────────────────────────────────────────────────────

  async assertVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
  }

  async assertHidden(locator: Locator): Promise<void> {
    await expect(locator).toBeHidden();
  }

  async assertAllVisible(...locators: Locator[]): Promise<void> {
    await Promise.all(locators.map(l => expect(l).toBeVisible()));
  }

  async assertAllHidden(...locators: Locator[]): Promise<void> {
    await Promise.all(locators.map(l => expect(l).toBeHidden()));
  }

  // ─── Text ─────────────────────────────────────────────────────────────────────

  async assertText(locator: Locator, expectedText: string): Promise<void> {
    await expect(locator).toHaveText(expectedText);
  }

  async assertContainsText(locator: Locator, expectedText: string): Promise<void> {
    await expect(locator).toContainText(expectedText);
  }

  // ─── Form Fields ──────────────────────────────────────────────────────────────

  // Asserts a form input has the expected value.
  async assertFieldValue(fieldLocator: Locator, expectedValue: string): Promise<void> {
    await expect(fieldLocator).toHaveValue(expectedValue);
  }

  async assertFieldError(errorLocator: Locator, expectedMessage: string): Promise<void> {
    await expect(errorLocator).toBeVisible();
    await expect(errorLocator).toContainText(expectedMessage);
  }

  // ─── Dropdowns ───────────────────────────────────────────────────────────────

  async assertDropdownValue(dropdownLocator: Locator, expectedValue: string): Promise<void> {
    await expect(dropdownLocator).toHaveText(expectedValue);
  }

  async assertDropdownContains(dropdownLocator: Locator, expectedValue: string): Promise<void> {
    await expect(dropdownLocator).toContainText(expectedValue);
  }

  async assertDropdownOptionExists(dropdownLocator: Locator, optionText: string): Promise<void> {
    await expect(dropdownLocator.getByRole('option', { name: optionText })).toBeVisible();
  }

  async assertDropdownOptionNotExists(dropdownLocator: Locator, optionText: string): Promise<void> {
    await expect(dropdownLocator.getByRole('option', { name: optionText })).toBeHidden();
  }

  async assertDropdownOptionSelected(dropdownLocator: Locator, optionText: string): Promise<void> {
    await expect(
      dropdownLocator.getByRole('option', { name: optionText })
    ).toHaveAttribute('aria-selected', 'true');
  }


  //─── Checkbox ────────────────────────────────────────────────────────────────

  // Asserts a checkbox is checked.
  async assertCheckboxToBeChecked(checkboxLocator: Locator): Promise<void> {
    await expect(checkboxLocator).toBeChecked();
  }

  async assertCheckboxToBeUnchecked(checkboxLocator: Locator): Promise<void> {
    await expect(checkboxLocator).not.toBeChecked();
  }

  //─── Radio Buttons ────────────────────────────────────────────────────────────────

  async assertRadioToBeSelected(radioLocator: Locator): Promise<void> {
    await expect(radioLocator).toBeChecked();
  }

  async assertRadioToBeUnselected(radioLocator: Locator): Promise<void> {
    await expect(radioLocator).not.toBeChecked();
  }

  async assertRadioGroupSelected(radioGroupLocator: Locator, optionText: string): Promise<void> {
    await expect(
      radioGroupLocator.getByRole('radio', { name: optionText })
    ).toBeChecked();
  }

  async assertRadioGroupNotSelected(radioGroupLocator: Locator, optionText: string): Promise<void> {
    await expect(
      radioGroupLocator.getByRole('radio', { name: optionText })
    ).not.toBeChecked();
  }

  //─── Page Text ────────────────────────────────────────────────────────────────
  // Asserts the page contains the expected text somewhere.
  async assertPageContainsText(expectedText: string): Promise<void> {
    await expect(this.page.locator('body')).toContainText(expectedText);
  }

  async assertPageNotContainsText(unexpectedText: string): Promise<void> {
    await expect(this.page.locator('body')).not.toContainText(unexpectedText);
  }

  // ─── URL ─────────────────────────────────────────────────────────────────────

  async assertURL(expectedPattern: RegExp | string): Promise<void> {
    await expect(this.page).toHaveURL(expectedPattern);
  }

  async assertURLContains(expectedSubstring: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(expectedSubstring));
  }

  async assertURLNotContains(unexpectedSubstring: string): Promise<void> {
    await expect(this.page).not.toHaveURL(new RegExp(unexpectedSubstring));
  }

  async assertElementCount(locator: Locator, expectedCount: number): Promise<void> {
    await expect(locator).toHaveCount(expectedCount);
  }

  async assertAttribute(locator: Locator, attributeName: string, expectedValue: string): Promise<void> {
    await expect(locator).toHaveAttribute(attributeName, expectedValue);
  }

  async assertAttributeNot(locator: Locator, attributeName: string, unexpectedValue: string): Promise<void> {
    await expect(locator).not.toHaveAttribute(attributeName, unexpectedValue);
  }

  async assertFocused(locator: Locator): Promise<void> {
    await expect(locator).toBeFocused();
  }

  async assertNotFocused(locator: Locator): Promise<void> {
    await expect(locator).not.toBeFocused();
  }

}

