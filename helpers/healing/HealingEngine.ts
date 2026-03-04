// helpers/healing/HealingEngine.ts
import { Page, Locator }    from '@playwright/test';
import { LLMAdapter }       from './LLMAdapter';
import { createLLMAdapter } from './LLMAdapterFactory';
import { HealingLogger }    from './HealingLogger';

export class HealingEngine {

  private readonly page:    Page;
  private readonly adapter: LLMAdapter;
  private readonly logger:  HealingLogger;

  constructor(page: Page) {
    this.page    = page;
    this.adapter = createLLMAdapter();
    this.logger  = new HealingLogger();
  }

  // Attempts to heal a failed locator.
  //
  // Returns the action result if healing succeeded.
  // Returns null if healing failed — WebActions then throws the original error.
  //
  // The healing attempt is fully silent on failure — it never throws.
  // The original error is always preserved and thrown if healing cannot recover.
  async attempt<T>(
    locator: Locator,
    fn:      () => Promise<T>
  ): Promise<T | null> {
    try {
      // 1. Snapshot the live accessibility tree at the point of failure
      const snapshot = await this.page.locator('body').ariaSnapshot();
      if (!snapshot) return null;

      const description = locator.toString();

      // 2. Ask the configured LLM for a better locator
      const suggestion = await this.adapter.suggestLocator(
        description,
        snapshot
      );

      if (!suggestion || !suggestion.startsWith('getBy')) {
        // Reject suggestions that are not semantic locators
        return null;
      }

      // 3. Try the suggested locator on the live page
      const healedLocator = this.buildLocator(suggestion);
      if (!healedLocator) return null;

      // Re-run the original action with the healed locator
      const result = await this.runWithLocator(fn, healedLocator);

      // 4. Log the successful heal for human review
      this.logger.append({
        description,
        original:  description,
        suggested: suggestion,
        action:    'healed',
        timestamp: new Date().toISOString(),
      });

      console.warn(
        `[HealingEngine] Healed locator:\n` +
        `  Description: ${description}\n` +
        `  Suggested:   ${suggestion}\n` +
        `  → Review healing-log.json and update the page object.`
      );

      return result;

    } catch {
      // Healing failed for any reason — return null to let original error propagate
      return null;
    }
  }

  // Builds a Playwright locator from a suggestion string like:
  //   getByRole('combobox', { name: 'Status' })
  private buildLocator(suggestion: string): Locator | null {
    try {
      // Safe construction — we only allow getBy* methods
      const method = suggestion.match(/^(getBy\w+)/)?.[1];
      if (!method || !(method in this.page)) return null;

      // Build via Function constructor scoped to page — no global eval
      const factory = new Function('page', `return page.${suggestion};`);
      return factory(this.page) as Locator;
    } catch {
      return null;
    }
  }

  // Runs the original action function, substituting the healed locator.
  private async runWithLocator<T>(
    fn:            () => Promise<T>,
    healedLocator: Locator
  ): Promise<T> {
    const action = this.extractAction(fn);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (healedLocator as any)[action]?.() as T;
  }

  // Extracts the action name from the fn closure string for direct re-invocation.
  private extractAction(fn: () => unknown): string {
    const src   = fn.toString();
    const match = src.match(/locator\.(click|fill|check|uncheck|hover|press|selectOption)\(/);
    return match?.[1] ?? 'click';
  }

}
