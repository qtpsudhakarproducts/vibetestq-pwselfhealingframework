// helpers/healing/HealingRuntime.ts
import * as fs from 'fs';
import * as path from 'path';
import { Page, Locator } from '@playwright/test';
import { LLMAdapter, HealingContext, createLLMAdapter } from './HealingLLM';
import { readRuntimeConfig } from '../../data/config';

export interface HealEntry {
  description: string;
  original: string;
  suggested: string;
  action: string;
  timestamp: string;
  status?: 'healed' | 'rejected' | 'skipped' | 'failed';
  reason?: string;
  provider?: string;
  latencyMs?: number;
  url?: string;
}

export class HealingLogger {

  private readonly logPath: string;

  constructor(logPath = path.join(process.cwd(), 'healing-log.json')) {
    this.logPath = logPath;
  }

  append(entry: HealEntry): void {
    let log: { heals: HealEntry[] } = { heals: [] };

    if (fs.existsSync(this.logPath)) {
      try {
        log = JSON.parse(fs.readFileSync(this.logPath, 'utf-8'));
      } catch {
        log = { heals: [] };
      }
    }

    log.heals.push(entry);
    fs.writeFileSync(this.logPath, JSON.stringify(log, null, 2));
  }

}

export class HealingEngine {

  private readonly page: Page;
  private readonly adapter: LLMAdapter;
  private readonly logger: HealingLogger;
  private readonly provider: string;

  private readonly maxLLMCalls: number;
  private readonly maxConsecutiveFailures: number;
  private llmCalls = 0;
  private consecutiveFailures = 0;
  private readonly suggestionCache = new Map<string, string>();

  constructor(page: Page) {
    const healing = readRuntimeConfig().healing;
    this.page = page;
    this.adapter = createLLMAdapter();
    this.logger = new HealingLogger();
    this.provider = healing.provider;
    this.maxLLMCalls = healing.maxCalls;
    this.maxConsecutiveFailures = healing.maxConsecutiveFailures;
  }

  async attempt<T>(
    context: Omit<HealingContext, 'accessibilityTree'>,
    perform: (target: Locator) => Promise<T>
  ): Promise<T | null> {
    const description = context.description;
    const locator = context.locator;
    const url = this.page.url();
    const cacheKey = `${url}|${locator}`;

    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.logger.append({
        description,
        original: locator,
        suggested: '',
        action: 'healing-circuit-open',
        timestamp: new Date().toISOString(),
        status: 'skipped',
        reason: `consecutive failure limit reached (${this.maxConsecutiveFailures})`,
        provider: this.provider,
        url,
      });
      return null;
    }

    try {
      const cached = this.suggestionCache.get(cacheKey);
      if (cached) {
        const cachedLocator = this.buildLocator(cached);
        if (cachedLocator) {
          const result = await perform(cachedLocator);
          this.consecutiveFailures = 0;
          this.logger.append({
            description,
            original: locator,
            suggested: cached,
            action: 'healed-from-cache',
            timestamp: new Date().toISOString(),
            status: 'healed',
            provider: this.provider,
            url,
          });
          return result;
        }
      }

      if (this.llmCalls >= this.maxLLMCalls) {
        this.logger.append({
          description,
          original: locator,
          suggested: '',
          action: 'healing-budget-exceeded',
          timestamp: new Date().toISOString(),
          status: 'skipped',
          reason: `llm call budget reached (${this.maxLLMCalls})`,
          provider: this.provider,
          url,
        });
        return null;
      }

      const snapshot = await this.page.locator('body').ariaSnapshot();
      if (!snapshot) {
        this.consecutiveFailures += 1;
        return null;
      }

      this.llmCalls += 1;
      const startedAt = Date.now();
      const suggestion = await this.adapter.suggestLocator({
        description,
        locator,
        error: context.error,
        accessibilityTree: snapshot,
      });
      const latencyMs = Date.now() - startedAt;

      if (!suggestion || !suggestion.startsWith('getBy')) {
        this.consecutiveFailures += 1;
        this.logger.append({
          description,
          original: locator,
          suggested: suggestion ?? '',
          action: 'healing-rejected',
          timestamp: new Date().toISOString(),
          status: 'rejected',
          reason: 'non-semantic or empty suggestion',
          provider: this.provider,
          latencyMs,
          url,
        });
        return null;
      }

      const healedLocator = this.buildLocator(suggestion);
      if (!healedLocator) {
        this.consecutiveFailures += 1;
        this.logger.append({
          description,
          original: locator,
          suggested: suggestion,
          action: 'healing-rejected',
          timestamp: new Date().toISOString(),
          status: 'rejected',
          reason: 'unsupported locator syntax',
          provider: this.provider,
          latencyMs,
          url,
        });
        return null;
      }

      const result = await perform(healedLocator);
      this.consecutiveFailures = 0;
      this.suggestionCache.set(cacheKey, suggestion);

      this.logger.append({
        description,
        original: locator,
        suggested: suggestion,
        action: 'healed',
        timestamp: new Date().toISOString(),
        status: 'healed',
        provider: this.provider,
        latencyMs,
        url,
      });

      console.warn(
        `[HealingEngine] Healed locator:\n` +
        `  Description: ${description}\n` +
        `  Suggested:   ${suggestion}\n` +
        `  → Review healing-log.json and update the page object.`
      );

      return result;

    } catch {
      this.consecutiveFailures += 1;
      return null;
    }
  }

  private buildLocator(suggestion: string): Locator | null {
    const value = suggestion.trim().replace(/;$/, '');
    const open = value.indexOf('(');
    const close = value.lastIndexOf(')');
    if (open < 0 || close < open) return null;

    const method = value.slice(0, open).trim();
    const args = value.slice(open + 1, close).trim();

    switch (method) {
      case 'getByRole': {
        const role = this.extractString(args);
        if (!role) return null;
        const name = this.extractString(args, 'name');
        const exact = this.extractBoolean(args, 'exact');
        const options: { name?: string; exact?: boolean } = {};
        if (name !== null) options.name = name;
        if (exact !== null) options.exact = exact;
        if (Object.keys(options).length > 0) {
          return this.page.getByRole(role as Parameters<Page['getByRole']>[0], options);
        }
        return this.page.getByRole(role as Parameters<Page['getByRole']>[0]);
      }
      case 'getByLabel':
        return this.buildTextLocator('label', args);
      case 'getByPlaceholder':
        return this.buildTextLocator('placeholder', args);
      case 'getByText':
        return this.buildTextLocator('text', args);
      case 'getByTestId': {
        const testId = this.extractString(args);
        return testId ? this.page.getByTestId(testId) : null;
      }
      default:
        return null;
    }
  }

  private buildTextLocator(
    type: 'label' | 'placeholder' | 'text',
    args: string
  ): Locator | null {
    const text = this.extractString(args);
    if (!text) return null;
    const exact = this.extractBoolean(args, 'exact');
    const options = exact === null ? undefined : { exact };

    switch (type) {
      case 'label':
        return options ? this.page.getByLabel(text, options) : this.page.getByLabel(text);
      case 'placeholder':
        return options ? this.page.getByPlaceholder(text, options) : this.page.getByPlaceholder(text);
      case 'text':
        return options ? this.page.getByText(text, options) : this.page.getByText(text);
    }
  }

  private extractString(args: string, key?: string): string | null {
    const prefix = key ? `${key}\\s*:\\s*` : '^\\s*';
    const match = args.match(new RegExp(`${prefix}(['"])([^'"]+)\\1`));
    return match ? match[2] : null;
  }

  private extractBoolean(args: string, key: string): boolean | null {
    const match = args.match(new RegExp(`${key}\\s*:\\s*(true|false)`));
    if (!match) return null;
    return match[1] === 'true';
  }

}
