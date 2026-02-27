// helpers/WaitHelpers.ts
import { Page, Locator } from '@playwright/test';

export class WaitHelpers {

  private readonly page:             Page;
  private readonly DEFAULT_TIMEOUT:  number = 10_000;

  // OrangeHRM-specific selectors for common UI states
  private readonly SPINNER_SELECTOR       = '.oxd-loading-spinner';
  private readonly TOAST_SELECTOR         = '.oxd-toast-content';
  private readonly DROPDOWN_OPTIONS       = '.oxd-select-options';
  private readonly AUTOCOMPLETE_DROPDOWN  = '.oxd-autocomplete-dropdown';

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Spinner ──────────────────────────────────────────────────────────────────

  async waitForSpinnerToDisappear(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    const spinner = this.page.locator(this.SPINNER_SELECTOR);
    try {
      await spinner.waitFor({ state: 'hidden', timeout });
    } catch {
      // Spinner was not in the DOM — nothing to wait for
    }
  }

  // ─── Table ────────────────────────────────────────────────────────────────────

  async waitForTableToLoad(
    tableLocator: Locator,
    timeout = this.DEFAULT_TIMEOUT
  ): Promise<void> {
    await this.waitForSpinnerToDisappear(timeout);
    const noRecords = this.page.getByText('No Records Found');
    await Promise.race([
      tableLocator.locator('role=row').first().waitFor({ state: 'visible', timeout }),
      noRecords.waitFor({ state: 'visible', timeout }),
    ]).catch(() => {
      // If neither appears proceed — the assertion will catch it
    });
  }

  // ─── Toast ────────────────────────────────────────────────────────────────────

  async waitForToastToAppear(timeout = this.DEFAULT_TIMEOUT): Promise<Locator> {
    const toast = this.page.locator(this.TOAST_SELECTOR);
    await toast.waitFor({ state: 'visible', timeout });
    return toast;
  }

  async waitForToastToDisappear(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    await this.waitForToastToAppear(timeout);
    const toast = this.page.locator(this.TOAST_SELECTOR);
    await toast.waitFor({ state: 'hidden', timeout });
  }

  // ─── Dropdown ─────────────────────────────────────────────────────────────────

  async waitForDropdownOptionsToAppear(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    await this.page
      .locator(this.DROPDOWN_OPTIONS)
      .waitFor({ state: 'visible', timeout });
  }

  async waitForDropdownOptionsToDisappear(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    await this.page
      .locator(this.DROPDOWN_OPTIONS)
      .waitFor({ state: 'hidden', timeout });
  }

  // ─── Autocomplete ─────────────────────────────────────────────────────────────

  async waitForAutocompleteToAppear(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    await this.page
      .locator(this.AUTOCOMPLETE_DROPDOWN)
      .waitFor({ state: 'visible', timeout });
  }

  async waitForAutocompleteToDisappear(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    await this.page
      .locator(this.AUTOCOMPLETE_DROPDOWN)
      .waitFor({ state: 'hidden', timeout });
  }

  // ─── URL ──────────────────────────────────────────────────────────────────────

  async waitForURLChange(timeout = this.DEFAULT_TIMEOUT): Promise<void> {
    const currentURL = this.page.url();
    await this.page.waitForFunction(
      (url: string) => window.location.href !== url,
      currentURL,
      { timeout }
    );
  }

}
