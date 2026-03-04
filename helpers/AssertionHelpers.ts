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
    console.log(`Assertion passed: ${locator.description()} is visible`);
  }

  async assertHidden(locator: Locator): Promise<void> {
    await expect(locator).toBeHidden();
    console.log(`Assertion passed: ${locator.description()} is hidden`);
  }

  async assertAllVisible(...locators: Locator[]): Promise<void> {
    await Promise.all(locators.map(l => expect(l).toBeVisible()));
    console.log(`Assertion passed: all ${locators.length} elements are visible`);
  }

  async assertAllHidden(...locators: Locator[]): Promise<void> {
    await Promise.all(locators.map(l => expect(l).toBeHidden()));
    console.log(`Assertion passed: all ${locators.length} elements are hidden`);
  }

  // ─── Text ─────────────────────────────────────────────────────────────────────

  async assertText(locator: Locator, expectedText: string): Promise<void> {
    await expect(locator).toHaveText(expectedText);
    console.log(`Assertion passed: ${locator.description()} has text "${expectedText}"`);
  }

  async assertContainsText(locator: Locator, expectedText: string): Promise<void> {
    await expect(locator).toContainText(expectedText);
    console.log(`Assertion passed: ${locator.description()} contains text "${expectedText}"`);
  }

  // ─── Form Fields ──────────────────────────────────────────────────────────────

  // Asserts a form input has the expected value.
  async assertFieldValue(fieldLocator: Locator, expectedValue: string): Promise<void> {
    await expect(fieldLocator).toHaveValue(expectedValue);
    console.log(`Assertion passed: ${fieldLocator.description()} has value "${expectedValue}"`);
  }

  async assertFieldEmpty(fieldLocator: Locator): Promise<void> {
    await expect(fieldLocator).toHaveValue('');
    console.log(`Assertion passed: ${fieldLocator.description()} is empty`);
  }

  async assertFieldNotEmpty(fieldLocator: Locator): Promise<void> {
    await expect(fieldLocator).not.toHaveValue('');
    console.log(`Assertion passed: ${fieldLocator.description()} is not empty`);
  }

  async assertFieldError(errorLocator: Locator, expectedMessage: string): Promise<void> {
    await expect(errorLocator).toBeVisible();
    await expect(errorLocator).toContainText(expectedMessage);
    console.log(`Assertion passed: ${errorLocator.description()} contains error "${expectedMessage}"`);
  }

  // ─── Dropdowns ───────────────────────────────────────────────────────────────

  async assertDropdownValue(dropdownLocator: Locator, expectedValue: string): Promise<void> {
    await expect(dropdownLocator).toHaveText(expectedValue);
    console.log(`Assertion passed: ${dropdownLocator.description()} has dropdown value "${expectedValue}"`);
  }

  async assertDropdownContains(dropdownLocator: Locator, expectedValue: string): Promise<void> {
    await expect(dropdownLocator).toContainText(expectedValue);
    console.log(`Assertion passed: ${dropdownLocator.description()} contains dropdown value "${expectedValue}"`);
  }

  async assertDropdownOptionExists(dropdownLocator: Locator, optionText: string): Promise<void> {
    await expect(dropdownLocator.getByRole('option', { name: optionText })).toBeVisible();
    console.log(`Assertion passed: ${dropdownLocator.description()} has option "${optionText}"`);
  }

  async assertDropdownOptionNotExists(dropdownLocator: Locator, optionText: string): Promise<void> {
    await expect(dropdownLocator.getByRole('option', { name: optionText })).toBeHidden();
    console.log(`Assertion passed: ${dropdownLocator.description()} does not have option "${optionText}"`);
  }

  async assertDropdownOptionSelected(dropdownLocator: Locator, optionText: string): Promise<void> {
    await expect(
      dropdownLocator.getByRole('option', { name: optionText })
    ).toHaveAttribute('aria-selected', 'true');
    console.log(`Assertion passed: ${dropdownLocator.description()} has selected option "${optionText}"`);
  }


  //─── Checkbox ────────────────────────────────────────────────────────────────

  // Asserts a checkbox is checked.
  async assertCheckboxToBeChecked(checkboxLocator: Locator): Promise<void> {
    await expect(checkboxLocator).toBeChecked();
    console.log(`Assertion passed: ${checkboxLocator.description()} is checked`);
  }

  async assertCheckboxToBeUnchecked(checkboxLocator: Locator): Promise<void> {
    await expect(checkboxLocator).not.toBeChecked();
    console.log(`Assertion passed: ${checkboxLocator.description()} is unchecked`);
  }

  //─── Radio Buttons ────────────────────────────────────────────────────────────────

  async assertRadioToBeSelected(radioLocator: Locator): Promise<void> {
    await expect(radioLocator).toBeChecked();
    console.log(`Assertion passed: ${radioLocator.description()} is selected`);
  }

  async assertRadioToBeUnselected(radioLocator: Locator): Promise<void> {
    await expect(radioLocator).not.toBeChecked();
    console.log(`Assertion passed: ${radioLocator.description()} is unselected`);
  }

  async assertRadioGroupSelected(radioGroupLocator: Locator, optionText: string): Promise<void> {
    await expect(
      radioGroupLocator.getByRole('radio', { name: optionText })
    ).toBeChecked();
    console.log(`Assertion passed: ${radioGroupLocator.description()} has selected option "${optionText}"`);
  }

  async assertRadioGroupNotSelected(radioGroupLocator: Locator, optionText: string): Promise<void> {
    await expect(
      radioGroupLocator.getByRole('radio', { name: optionText })
    ).not.toBeChecked();
    console.log(`Assertion passed: ${radioGroupLocator.description()} does not have selected option "${optionText}"`);
  }

  //─── Page Text ────────────────────────────────────────────────────────────────
  // Asserts the page contains the expected text somewhere.
  async assertPageContainsText(expectedText: string): Promise<void> {
    await expect(this.page.locator('body')).toContainText(expectedText);
    console.log(`Assertion passed: page contains text "${expectedText}"`);
  }

  async assertPageNotContainsText(unexpectedText: string): Promise<void> {
    await expect(this.page.locator('body')).not.toContainText(unexpectedText);
    console.log(`Assertion passed: page does not contain text "${unexpectedText}"`);
  }

  // ─── URL ─────────────────────────────────────────────────────────────────────

  async assertURL(expectedPattern: RegExp | string): Promise<void> {
    await expect(this.page).toHaveURL(expectedPattern);
    console.log('Assertion passed: URL matches expected pattern');
  }

  async assertURLContains(expectedSubstring: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(expectedSubstring));
    console.log(`Assertion passed: URL contains "${expectedSubstring}"`);
  }

  async assertURLNotContains(unexpectedSubstring: string): Promise<void> {
    await expect(this.page).not.toHaveURL(new RegExp(unexpectedSubstring));
    console.log(`Assertion passed: URL does not contain "${unexpectedSubstring}"`);
  }

  async assertElementCount(locator: Locator, expectedCount: number): Promise<void> {
    await expect(locator).toHaveCount(expectedCount);
    console.log(`Assertion passed: ${locator.description()} count is ${expectedCount}`);
  }

  async assertAttribute(locator: Locator, attributeName: string, expectedValue: string): Promise<void> {
    await expect(locator).toHaveAttribute(attributeName, expectedValue);
    console.log(`Assertion passed: ${locator.description()} has attribute ${attributeName}="${expectedValue}"`);
  }

  async assertAttributeNot(locator: Locator, attributeName: string, unexpectedValue: string): Promise<void> {
    await expect(locator).not.toHaveAttribute(attributeName, unexpectedValue);
    console.log(`Assertion passed: ${locator.description()} does not have attribute ${attributeName}="${unexpectedValue}"`);
  }

  async assertFocused(locator: Locator): Promise<void> {
    await expect(locator).toBeFocused();
    console.log(`Assertion passed: ${locator.description()} is focused`);
  }

  async assertNotFocused(locator: Locator): Promise<void> {
    await expect(locator).not.toBeFocused();
    console.log(`Assertion passed: ${locator.description()} is not focused`);
  }

  async assertEnabled(locator: Locator): Promise<void> {
    await expect(locator).toBeEnabled();
    console.log(`Assertion passed: ${locator.description()} is enabled`);
  }

  async assertDisabled(locator: Locator): Promise<void> {
    await expect(locator).toBeDisabled();
    console.log(`Assertion passed: ${locator.description()} is disabled`);
  }

}

