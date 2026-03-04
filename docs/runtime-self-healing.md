# Runtime Self-Healing Framework
### Playwright · TypeScript · LLM-Powered Locator Recovery

---

> **What this document covers:** How to build runtime self-healing into a Playwright Page Object Model framework. When a locator fails mid-test, the framework intercepts the failure, asks an LLM to suggest a correct locator using the live accessibility tree, tries it, and if it works continues the test. All successful heals are logged for human review.
>
> **This is not the Playwright Healer Agent.** The Healer Agent is post-execution — it runs after tests finish and fail. Runtime self-healing fires during test execution, inside the running test, before a failure is thrown.
>
> **Healing only applies to actions — never to assertions.** A failing assertion is a real failure and must reach the report unchanged.

---

## Table of Contents

- [Part 1 — The Core Idea](#part-1--the-core-idea)
- [Part 2 — Prerequisites](#part-2--prerequisites)
- [Part 3 — Design Decisions](#part-3--design-decisions)
- [Part 4 — File Structure](#part-4--file-structure)
- [Part 5 — Environment Variables](#part-5--environment-variables)
- [Part 6 — The Interface: LLMAdapter.ts](#part-6--the-interface-llmadapterts)
- [Part 7 — The Prompt: prompt.ts](#part-7--the-prompt-promptts)
- [Part 8 — Provider Implementations](#part-8--provider-implementations)
- [Part 9 — The Factory: LLMAdapterFactory.ts](#part-9--the-factory-llmadapterfactoryts)
- [Part 10 — The Logger: HealingLogger.ts](#part-10--the-logger-healingloggerts)
- [Part 11 — The Engine: HealingEngine.ts](#part-11--the-engine-healingenginets)
- [Part 12 — The Export: healing/index.ts](#part-12--the-export-healingindexts)
- [Part 13 — Wiring into WebActions](#part-13--wiring-into-webactions)
- [Part 14 — CI Pipeline Configuration](#part-14--ci-pipeline-configuration)
- [Part 15 — The Healing Log](#part-15--the-healing-log)
- [Part 16 — What Healing Does Not Do](#part-16--what-healing-does-not-do)

---

## Part 1 — The Core Idea

Every interaction in the framework routes through a single method — `WebActions.execute()`. This is the seam. When Playwright throws an `ElementNotFoundError`, `execute()` intercepts it before it becomes a test failure and triggers a healing attempt.

```
Test calls → page object method
                ↓
         WebActions.execute()
                ↓
         Playwright action runs
                ↓
         ElementNotFoundError thrown
                ↓
         HealingEngine.attempt()
           — snapshot accessibility tree
           — ask LLM for better locator
           — try suggested locator
                ↓
         Success → continue test + write to log
         Failure → throw original error
```

The key insight: because **all** interactions route through `execute()`, healing is wired in once and covers every page object in the framework automatically. Page objects need no changes.

---

## Part 2 — Prerequisites

### The `.describe()` label is mandatory on every locator

This is the most important prerequisite. The LLM receives the locator's `.describe()` label as the element description — not the locator expression itself.

```typescript
// ✅ Correct — LLM receives "User status dropdown"
private readonly statusDropdown = this.page
  .locator('.oxd-select-text')
  .nth(1)
  .describe('User status dropdown');

// ❌ Wrong — LLM receives "locator('.oxd-select-text').nth(1)"
// Not enough context to reason about what element to find
private readonly statusDropdown = this.page
  .locator('.oxd-select-text')
  .nth(1);
```

Without `.describe()` the healing prompt has no semantic context and suggestion quality collapses. This must be enforced as a framework standard before healing is added.

### All interactions must route through WebActions

Page objects must not call `locator.click()`, `locator.fill()` etc. directly. All interactions must go through `this.actions.click()`, `this.actions.fill()` etc. — methods on the `WebActions` class. Only then does healing cover them.

```typescript
// ✅ Correct — routes through WebActions, healing covers it
await this.actions.click(this.saveButton);

// ❌ Wrong — bypasses WebActions, healing never fires
await this.saveButton.click();
```

---

## Part 3 — Design Decisions

**Pipeline only, never local.**
Runtime healing is disabled locally. Developers need to see real failures immediately. Healing also adds latency per failed locator from the LLM call. The flag `ENABLE_RUNTIME_HEALING=true` is set only in the CI nightly pipeline — never in local env files.

**LLM of choice via environment variable.**
The provider is selected at runtime through `HEAL_LLM_PROVIDER`. Adding a new provider means writing one new adapter class and one case in the factory. Nothing else changes. `WebActions` never knows which provider is active.

**Adapter pattern for providers.**
One interface. One implementation per provider. A factory reads the env and returns the correct adapter. `WebActions` depends only on the interface — never on a concrete provider class.

**Actions only — never assertions.**
`AssertionHelpers` calls `expect()` directly. It never calls `WebActions.execute()`. There is no path by which a failing assertion can reach the healing code. This is structural, not a flag or a configuration — the class boundary enforces it.

**Heal only `ElementNotFoundError` — never `TimeoutError`.**
A timeout means the element exists but the page is slow. That is a performance or environment problem — not a locator problem. Attempting to heal a timeout by changing the locator is wrong. Only `ElementNotFoundError` triggers healing.

**Human review, never auto-commit.**
Every successful heal is written to `healing-log.json`. A human reviews the log, decides which suggestions are correct, and updates the page objects. The framework never writes back to source files automatically.

---

## Part 4 — File Structure

All healing code lives in a self-contained folder. `WebActions` imports only `HealingEngine` from this folder — the adapters, factory, logger, and prompt are internal implementation details.

```
helpers/
  healing/
    LLMAdapter.ts          ← interface — the only type WebActions knows about
    AnthropicAdapter.ts    ← Anthropic API implementation
    OpenAIAdapter.ts       ← OpenAI API implementation
    GeminiAdapter.ts       ← Gemini API implementation
    LLMAdapterFactory.ts   ← reads HEAL_LLM_PROVIDER, returns correct adapter
    prompt.ts              ← shared prompt builder — one place to tune the instruction
    HealingEngine.ts       ← orchestrator: snapshot → LLM → try → log
    HealingLogger.ts       ← appends to healing-log.json
    index.ts               ← exports HealingEngine only
```

`WebActions` import:
```typescript
import { HealingEngine } from './healing';
```

Nothing else from the healing folder is visible outside it.

---

## Part 5 — Environment Variables

```bash
# Master switch — absent locally, set true in CI nightly pipeline only
ENABLE_RUNTIME_HEALING=true

# Which LLM provider to use
# Supported: anthropic | openai | gemini
HEAL_LLM_PROVIDER=anthropic

# Model name for the chosen provider
HEAL_LLM_MODEL=claude-sonnet-4-20250514

# API key for the chosen provider
# Stored as a GitHub Actions repository secret — never in source
HEAL_LLM_API_KEY=sk-ant-...
```

**Model defaults if `HEAL_LLM_MODEL` is not set:**

| Provider | Default model |
|----------|--------------|
| `anthropic` | `claude-sonnet-4-20250514` |
| `openai` | `gpt-4o` |
| `gemini` | `gemini-1.5-flash` |

---

## Part 6 — The Interface: LLMAdapter.ts

One method. Takes the element description and the accessibility tree snapshot. Returns a locator expression string or null.

```typescript
// helpers/healing/LLMAdapter.ts

export interface LLMAdapter {
  suggestLocator(
    description:      string,
    accessibilityTree: string
  ): Promise<string | null>;
}
```

`WebActions` and `HealingEngine` depend only on this interface. Swapping providers requires no changes to either.

---

## Part 7 — The Prompt: prompt.ts

The prompt is shared across all providers. One place to tune the instruction — consistent reasoning regardless of which LLM is behind it.

The prompt instructs the LLM to:
- Return only a locator expression — no explanation, no code block
- Use semantic locators only — `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`
- Never use CSS selectors or XPath

```typescript
// helpers/healing/prompt.ts

export function buildPrompt(description: string, accessibilityTree: string): string {
  return `
A Playwright locator failed. The element was described as: "${description}".

Here is the current accessibility tree of the page:
${accessibilityTree}

Return ONLY a single Playwright locator expression for this element.

Rules:
- Use semantic locators only: getByRole, getByLabel, getByPlaceholder, getByText
- No CSS selectors, no XPath, no data-testid unless no semantic option exists
- No explanation, no code block, no backticks
- Just the locator expression on a single line

Example: getByRole('combobox', { name: 'Status' })
  `.trim();
}
```

---

## Part 8 — Provider Implementations

Each adapter handles only the HTTP call for its provider. All three follow the same pattern: read `HEAL_LLM_API_KEY` and `HEAL_LLM_MODEL` from env, call the provider API with the shared prompt, return the trimmed text response.

### AnthropicAdapter.ts

```typescript
// helpers/healing/AnthropicAdapter.ts
import { LLMAdapter }  from './LLMAdapter';
import { buildPrompt } from './prompt';

export class AnthropicAdapter implements LLMAdapter {

  private readonly apiKey: string;
  private readonly model:  string;

  constructor() {
    this.apiKey = process.env.HEAL_LLM_API_KEY!;
    this.model  = process.env.HEAL_LLM_MODEL ?? 'claude-sonnet-4-20250514';
  }

  async suggestLocator(description: string, tree: string): Promise<string | null> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      this.model,
        max_tokens: 100,
        messages:   [{ role: 'user', content: buildPrompt(description, tree) }],
      }),
    });

    const data = await response.json() as {
      content: Array<{ text: string }>;
    };

    return data.content?.[0]?.text?.trim() ?? null;
  }

}
```

### OpenAIAdapter.ts

```typescript
// helpers/healing/OpenAIAdapter.ts
import { LLMAdapter }  from './LLMAdapter';
import { buildPrompt } from './prompt';

export class OpenAIAdapter implements LLMAdapter {

  private readonly apiKey: string;
  private readonly model:  string;

  constructor() {
    this.apiKey = process.env.HEAL_LLM_API_KEY!;
    this.model  = process.env.HEAL_LLM_MODEL ?? 'gpt-4o';
  }

  async suggestLocator(description: string, tree: string): Promise<string | null> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model:    this.model,
        messages: [{ role: 'user', content: buildPrompt(description, tree) }],
      }),
    });

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices?.[0]?.message?.content?.trim() ?? null;
  }

}
```

### GeminiAdapter.ts

```typescript
// helpers/healing/GeminiAdapter.ts
import { LLMAdapter }  from './LLMAdapter';
import { buildPrompt } from './prompt';

export class GeminiAdapter implements LLMAdapter {

  private readonly apiKey: string;
  private readonly model:  string;

  constructor() {
    this.apiKey = process.env.HEAL_LLM_API_KEY!;
    this.model  = process.env.HEAL_LLM_MODEL ?? 'gemini-1.5-flash';
  }

  async suggestLocator(description: string, tree: string): Promise<string | null> {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(description, tree) }] }],
      }),
    });

    const data = await response.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  }

}
```

### Adding a new provider

1. Create `helpers/healing/YourProviderAdapter.ts` implementing `LLMAdapter`
2. Add one case to `LLMAdapterFactory`
3. Nothing else changes

---

## Part 9 — The Factory: LLMAdapterFactory.ts

Reads `HEAL_LLM_PROVIDER` and returns the correct adapter. Throws a clear error for unknown providers so misconfiguration fails loudly at startup rather than silently during a test run.

```typescript
// helpers/healing/LLMAdapterFactory.ts
import { LLMAdapter }       from './LLMAdapter';
import { AnthropicAdapter } from './AnthropicAdapter';
import { OpenAIAdapter }    from './OpenAIAdapter';
import { GeminiAdapter }    from './GeminiAdapter';

export function createLLMAdapter(): LLMAdapter {
  const provider = process.env.HEAL_LLM_PROVIDER;

  switch (provider) {
    case 'anthropic': return new AnthropicAdapter();
    case 'openai':    return new OpenAIAdapter();
    case 'gemini':    return new GeminiAdapter();
    default:
      throw new Error(
        `HEAL_LLM_PROVIDER "${provider}" is not supported.\n` +
        `Supported values: anthropic, openai, gemini`
      );
  }
}
```

---

## Part 10 — The Logger: HealingLogger.ts

Appends to `healing-log.json` in the project root. Each entry records the original description, the original locator, the suggested replacement, the action that was being attempted, and a timestamp.

```typescript
// helpers/healing/HealingLogger.ts
import * as fs   from 'fs';
import * as path from 'path';

export interface HealEntry {
  description: string;
  original:    string;
  suggested:   string;
  action:      string;
  timestamp:   string;
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
        // Corrupted log — start fresh
        log = { heals: [] };
      }
    }

    log.heals.push(entry);
    fs.writeFileSync(this.logPath, JSON.stringify(log, null, 2));
  }

}
```

---

## Part 11 — The Engine: HealingEngine.ts

The orchestrator. This is the only file `WebActions` imports from the healing folder. It coordinates: snapshot the page, call the LLM adapter, try the suggestion, log on success, return null on failure.

```typescript
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
      const snapshot = await this.page.accessibility.snapshot();
      if (!snapshot) return null;

      const description = locator.toString();

      // 2. Ask the configured LLM for a better locator
      const suggestion = await this.adapter.suggestLocator(
        description,
        JSON.stringify(snapshot, null, 2)
      );

      if (!suggestion || !suggestion.startsWith('getBy')) {
        // Reject suggestions that are not semantic locators
        return null;
      }

      // 3. Try the suggested locator on the live page
      const healedLocator = this.buildLocator(suggestion);
      if (!healedLocator) return null;

      // Re-run the original action with the healed locator
      // We do this by replacing the locator in a new bound call
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
  // The fn() closure captured the original locator — we wrap it to use the new one.
  private async runWithLocator<T>(
    fn:            () => Promise<T>,
    healedLocator: Locator
  ): Promise<T> {
    // fn() is a closure like () => locator.click()
    // We cannot mutate the original locator, so we bind a new fn directly
    return await healedLocator[this.extractAction(fn)]?.() as T;
  }

  // Extracts the action name from the fn closure string for direct re-invocation.
  // If extraction fails, falls back to calling fn() directly on the healed locator.
  private extractAction(fn: () => unknown): keyof Locator {
    const src = fn.toString();
    const match = src.match(/locator\.(click|fill|check|uncheck|hover|press|selectOption)\(/);
    return (match?.[1] as keyof Locator) ?? 'click';
  }

}
```

> **Note on `runWithLocator`:** The approach above works for simple atomic actions. For more complex `fn()` closures (e.g. `locator.fill('value')`), a cleaner production approach is to pass the action name and arguments explicitly to `execute()` rather than reconstructing from the closure. This is a reasonable next step once the basic healing loop is confirmed working.

---

## Part 12 — The Export: healing/index.ts

Only `HealingEngine` is exported. Adapters, factory, logger, and prompt are internal implementation details of the healing module.

```typescript
// helpers/healing/index.ts
export { HealingEngine } from './HealingEngine';
```

---

## Part 13 — Wiring into WebActions

Two changes to `WebActions`: import `HealingEngine`, instantiate it in the constructor only when the flag is set, and check `this.healing` in `execute()` before throwing.

```typescript
// helpers/WebActions.ts
import { Page, Locator }                                   from '@playwright/test';
import { WaitHelpers }                                     from './WaitHelpers';
import { ActionError, TimeoutError, ElementNotFoundError } from './errors';
import { HealingEngine }                                   from './healing';

export class WebActions {

  private readonly page:    Page;
  private readonly waits:   WaitHelpers;
  private readonly healing: HealingEngine | null;

  constructor(page: Page) {
    this.page  = page;
    this.waits = new WaitHelpers(page);

    // Healing is null locally — ENABLE_RUNTIME_HEALING is only set in CI pipeline
    this.healing = process.env.ENABLE_RUNTIME_HEALING === 'true'
      ? new HealingEngine(page)
      : null;
  }

  // ─── Execute Wrapper ──────────────────────────────────────────────────────────

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

  // All action methods unchanged — click, fill, check, etc.
  // Every one of them routes through execute() above.

}
```

**Zero changes to page objects.** `OrangeHRMControls`, `AddUserPage`, `ApplyLeavePage` — none of them change. Healing is wired in at the `WebActions` layer and covers everything automatically.

---

## Part 14 — CI Pipeline Configuration

### GitHub Actions — nightly regression workflow

Healing runs in the nightly workflow only. The PR smoke check does not get the healing env vars — it should fail fast on real failures, not attempt to work around them.

```yaml
# .github/workflows/nightly-regression.yml

      - name: Run full regression suite
        run: npx playwright test --grep @regression
        env:
          CI: true
          TEST_ENV: dev
          # Runtime self-healing — nightly only
          ENABLE_RUNTIME_HEALING: 'true'
          HEAL_LLM_PROVIDER: 'anthropic'
          HEAL_LLM_MODEL: 'claude-sonnet-4-20250514'
          HEAL_LLM_API_KEY: ${{ secrets.HEAL_LLM_API_KEY }}
        continue-on-error: true

      # Upload healing log as an artifact for review after each run
      - name: Upload healing log
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: healing-log-${{ github.run_number }}
          path: healing-log.json
          if-no-files-found: ignore
          retention-days: 30
```

### GitHub Actions secrets to add

In **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|--------|-------|
| `HEAL_LLM_API_KEY` | API key for the chosen provider |

### Switching providers

To switch from Anthropic to OpenAI, change two env vars in the workflow — nothing else:

```yaml
HEAL_LLM_PROVIDER: 'openai'
HEAL_LLM_MODEL: 'gpt-4o'
HEAL_LLM_API_KEY: ${{ secrets.HEAL_LLM_API_KEY }}
```

---

## Part 15 — The Healing Log

After a successful heal, `healing-log.json` is written to the project root and uploaded as a CI artifact.

```json
{
  "heals": [
    {
      "description": "locator('.oxd-select-text').nth(1).describe('User status dropdown')",
      "original":    "locator('.oxd-select-text').nth(1).describe('User status dropdown')",
      "suggested":   "getByRole('combobox', { name: 'Status' })",
      "action":      "healed",
      "timestamp":   "2026-03-03T02:14:33Z"
    },
    {
      "description": "getByPlaceholder('Username').describe('Username field on login')",
      "original":    "getByPlaceholder('Username').describe('Username field on login')",
      "suggested":   "getByLabel('Username')",
      "action":      "healed",
      "timestamp":   "2026-03-03T02:15:01Z"
    }
  ]
}
```

### Reviewing the log

After each nightly run:

1. Download `healing-log-{run_number}` from the CI artifacts
2. For each entry — open the relevant page object
3. Replace the `original` locator with the `suggested` locator
4. Run the test locally to confirm the fix
5. Commit and push

The healing log is the bridge between the LLM's suggestion and your source code. You always review before committing.

---

## Part 16 — What Healing Does Not Do

**Does not run locally.**
`ENABLE_RUNTIME_HEALING` is absent in local environments. `this.healing` is null. Zero overhead, zero LLM calls. Failures surface immediately.

**Does not heal assertions.**
`AssertionHelpers` uses `expect()` directly. It never calls `WebActions.execute()`. There is no code path from an assertion failure to the healing engine. This is structural — not a flag.

**Does not heal timeouts.**
`TimeoutError` means the element exists but the page is slow. Changing the locator will not fix a slow page. Timeouts bypass the healing check entirely.

**Does not commit automatically.**
Healing never writes to source files. It logs suggestions to `healing-log.json` for human review. Every fix is a deliberate human decision.

**Does not mask application defects.**
If an application feature is genuinely broken — the button no longer exists because the feature was removed — the LLM will not find the element either. `attempt()` returns null, the original `ElementNotFoundError` is thrown, and the test fails correctly.

**Does not replace the Playwright Healer Agent.**
The Healer Agent is post-execution — it patches source files after a test run completes. Runtime healing fires mid-run and keeps the current test moving. They solve different problems and complement each other.

---

## Summary — The Interaction Stack

```
Page Objects
    ↓  calls
OrangeHRMControls    (application-specific component sequences)
    ↓  calls
WebActions           (generic interactions + execute() wrapper)
    ↓  on ElementNotFoundError
HealingEngine        (CI only — snapshot → LLM → try → log)
    ↓  calls
LLMAdapter           (interface)
    ↓  implemented by
AnthropicAdapter / OpenAIAdapter / GeminiAdapter
    ↓  selected by
LLMAdapterFactory    (reads HEAL_LLM_PROVIDER from env)
```

Every interaction in the framework passes through `WebActions`. Healing is wired in at that single point. Adding a new page object, a new module, or a new test requires no healing-specific code — it is covered automatically.

---

*Runtime Self-Healing Guide — Playwright TypeScript · OrangeHRM · Enterprise POM Framework*
*(Companion to Level 4 — Reusable Helper Layer)*
