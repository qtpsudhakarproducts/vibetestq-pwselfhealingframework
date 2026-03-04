// helpers/WebActions.ts
import { Page, Locator }                                   from '@playwright/test';
import { ActionError, TimeoutError, ElementNotFoundError } from './errors';
import { HealingEngine }                                   from './healing';

export class WebActions {

  private readonly page:    Page;
  private readonly healing: HealingEngine | null;

  constructor(page: Page) {
    this.page = page;

    // Healing is null locally — ENABLE_RUNTIME_HEALING is only set in CI pipeline
    this.healing = process.env.ENABLE_RUNTIME_HEALING === 'true'
      ? new HealingEngine(page)
      : null;
  }

  // ─── Execute Wrapper ──────────────────────────────────────────────────────────

  // Central error handler for all WebActions methods.
  // Routes Playwright errors through error classification — every failure
  // surfaces the action name, locator description, and error type consistently.
  // When healing is enabled and the error is ElementNotFoundError, the healing
  // engine gets one attempt to find a better locator before failing.
  private async execute<T>(
    action:  string,
    locator: Locator,
    fn:      () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const cause       = error as Error;
      const locatorDesc = locator.toString();

      const isNotFound =
        cause.message.includes('not found')   ||
        cause.message.includes('not visible') ||
        cause.message.includes('not attached');

      // Runtime healing — CI only, actions only, ElementNotFoundError only
      if (isNotFound && this.healing) {
        const healed = await this.healing.attempt(locator, fn);
        if (healed !== null) return healed;
      }

      // Classify and throw — TimeoutError checked before ElementNotFoundError
      if (cause.message.includes('Timeout') || cause.message.includes('timeout')) {
        throw new TimeoutError(action, locatorDesc, cause);
      }
      if (isNotFound) {
        throw new ElementNotFoundError(action, locatorDesc, cause);
      }

      throw new ActionError(action, locatorDesc, cause);
    }
  }

  // ─── Click ────────────────────────────────────────────────────────────────────

  // Clicks an element. Playwright auto-waits for the element to be visible,
  // stable, and enabled before clicking.
  //
  // Usage:
  //   await this.actions.click(this.saveButton);
  async click(locator: Locator): Promise<void> {
    await this.execute('click', locator, () => locator.click());
  }

  // ─── Fill ─────────────────────────────────────────────────────────────────────

  // Clears and fills a text input. Playwright auto-waits for the element
  // to be visible and enabled before filling.
  //
  // Usage:
  //   await this.actions.fill(this.firstNameInput, employee.firstName);
  async fill(locator: Locator, value: string): Promise<void> {
    await this.execute('fill', locator, async () => {
      await locator.clear();
      await locator.fill(value);
    });
  }

  // ─── Check / Uncheck ──────────────────────────────────────────────────────────

  // Checks a checkbox. No-op if already checked.
  async check(locator: Locator): Promise<void> {
    await this.execute('check', locator, () => locator.check());
  }

  // Unchecks a checkbox. No-op if already unchecked.
  async uncheck(locator: Locator): Promise<void> {
    await this.execute('uncheck', locator, () => locator.uncheck());
  }

  // ─── Hover ────────────────────────────────────────────────────────────────────

  // Hovers over an element. Useful for revealing tooltip content or
  // triggering hover-state actions in the UI.
  async hover(locator: Locator): Promise<void> {
    await this.execute('hover', locator, () => locator.hover());
  }

  // ─── Press Key ────────────────────────────────────────────────────────────────

  // Presses a keyboard key on a focused element.
  // Used for Tab (to confirm inputs), Enter (to submit), Escape (to dismiss).
  async pressKey(locator: Locator, key: string): Promise<void> {
    await this.execute('pressKey', locator, () => locator.press(key));
  }

  // ─── Select Option ────────────────────────────────────────────────────────────

  // Selects from a native HTML <select> element.
  // OrangeHRM's custom Vue dropdowns are NOT native selects —
  // use selectFromDropdown() for those.
  async selectOption(locator: Locator, value: string): Promise<void> {
    await this.execute('selectOption', locator, () => locator.selectOption(value));
  }

  // ─── Upload File ──────────────────────────────────────────────────────────────

  // Sets files on a file input element.
  // Works directly on standard file inputs without opening a file dialog.
  async uploadFile(inputLocator: Locator, filePath: string): Promise<void> {
    await this.execute('uploadFile', inputLocator, () =>
      inputLocator.setInputFiles(filePath)
    );
  }

  // ─── Scroll Into View ─────────────────────────────────────────────────────────

  // Scrolls an element into the visible viewport.
  // Needed for long tables where target rows may be off-screen.
  async scrollIntoView(locator: Locator): Promise<void> {
    await this.execute('scrollIntoView', locator, () =>
      locator.scrollIntoViewIfNeeded()
    );
  }

  // ─── Click and Wait for Navigation ───────────────────────────────────────────

  // Clicks a button and waits for the URL to change.
  async clickAndWaitForNavigation(buttonLocator: Locator): Promise<void> {
    await this.execute('clickAndWaitForNavigation', buttonLocator, () =>
      Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle' }),
        buttonLocator.click(),
      ]).then(() => undefined)
    );
  }

  // Returns the number of rows currently visible in a table.
  async getTableRowCount(tableLocator: Locator): Promise<number> {
    const rows = tableLocator.getByRole('row');
    return await rows.count();
  }

}
