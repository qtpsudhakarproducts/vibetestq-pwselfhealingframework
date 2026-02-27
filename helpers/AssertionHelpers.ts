// helpers/AssertionHelpers.ts
import { Locator, expect } from '@playwright/test';

export class AssertionHelpers {

  // ─── Table Assertions ─────────────────────────────────────────────────────────

  // Asserts a row containing the given text exists in the table.
  async assertRowExistsInTable(tableLocator: Locator, rowText: string): Promise<void> {
    await expect(
      tableLocator.getByRole('row', { name: new RegExp(rowText, 'i') })
    ).toBeVisible();
  }

  // Asserts a row containing the given text does NOT exist in the table.
  async assertRowNotInTable(tableLocator: Locator, rowText: string): Promise<void> {
    await expect(
      tableLocator.getByRole('row', { name: new RegExp(rowText, 'i') })
    ).not.toBeVisible();
  }

  // ─── Toast Assertions ─────────────────────────────────────────────────────────

  // Asserts the toast is visible and contains the expected message.
  async assertToastContains(toastLocator: Locator, expectedText: string): Promise<void> {
    await expect(toastLocator).toBeVisible();
    await expect(toastLocator).toContainText(expectedText);
  }

  // Asserts the success toast is visible (any success message).
  async assertSuccessToastVisible(toastLocator: Locator): Promise<void> {
    await expect(toastLocator).toBeVisible({ timeout: 15_000 });
  }

  // ─── Form Assertions ──────────────────────────────────────────────────────────

  // Asserts a form field has the expected value.
  async assertFieldValue(fieldLocator: Locator, expectedValue: string): Promise<void> {
    await expect(fieldLocator).toHaveValue(expectedValue);
  }

  // Asserts a form field has a validation error visible nearby.
  async assertFieldHasError(errorLocator: Locator, errorMessage: string): Promise<void> {
    await expect(errorLocator).toBeVisible();
    await expect(errorLocator).toContainText(errorMessage);
  }

  // ─── Visibility Assertions ────────────────────────────────────────────────────

  // Asserts all provided locators are visible.
  async assertAllVisible(...locators: Locator[]): Promise<void> {
    await Promise.all(locators.map(l => expect(l).toBeVisible()));
  }

  // Asserts all provided locators are hidden.
  async assertAllHidden(...locators: Locator[]): Promise<void> {
    await Promise.all(locators.map(l => expect(l).toBeHidden()));
  }

}
