// helpers/WaitHelpers.ts
// Generic, browser-level wait utilities.
// No app-specific selectors belong here — those live in OrangeHRMControls.
//
// Timeouts: no DEFAULT_TIMEOUT constant — Playwright's global config governs all waits
// (actionTimeout: 10_000, navigationTimeout: 30_000, set in playwright.config.ts).
// Pass an explicit timeout only when a specific wait genuinely needs to deviate.
import { Page, Locator, expect } from '@playwright/test';

export class WaitHelpers {

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Element State ────────────────────────────────────────────────────────────

  // Waits for an element to become visible in the DOM.
  async waitForElement(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
    console.log(`Waiting For: ${locator.description()} is visible`);
  }

  // Waits for an element to disappear (hidden or detached).
  async waitForElementToDisappear(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout });
    console.log(`Waiting For: ${locator.description()} is hidden`);
  }

  // Waits for an element to become enabled (not disabled).
  async waitForElementToBeEnabled(locator: Locator, timeout?: number): Promise<void> {
    await expect(locator).toBeEnabled({ timeout });
    console.log(`Waiting For: ${locator.description()} is enabled`);
  }

  // ─── Page / Network ───────────────────────────────────────────────────────────

  // Waits for the network to reach idle state — no requests for 500ms.
  // Useful after actions that trigger background API calls.
  async waitForNetworkIdle(timeout?: number): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
    console.log('Waiting For: page reached networkidle state');
  }

  // Waits for the page URL to change away from its current value.
  // Useful after form submissions that trigger navigation.
  async waitForURLChange(timeout?: number): Promise<void> {
    const currentURL = this.page.url();
    await this.page.waitForFunction(
      (url: string) => window.location.href !== url,
      currentURL,
      { timeout }
    );
    console.log('Waiting For: URL changed');
  }

  // Waits for the page URL to match the given string or pattern.
  async waitForURLToMatch(pattern: string | RegExp, timeout?: number): Promise<void> {
    await this.page.waitForURL(pattern, { timeout });
    console.log(`Waiting For: URL matched ${pattern.toString()}`);
  }

}
