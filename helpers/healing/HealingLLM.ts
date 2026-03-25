// helpers/healing/HealingLLM.ts
import { Ollama } from 'ollama';
import { readRuntimeConfig } from '../../data/config';

export type HealingContext = {
  description: string;
  locator: string;
  error: string;
  accessibilityTree: string;
};

export interface LLMAdapter {
  suggestLocator(context: HealingContext): Promise<string | null>;
}

function buildPrompt(context: HealingContext): string {
  return `
A Playwright locator failed.

Description (semantic intent): "${context.description}"
Locator (technical selector): "${context.locator}"
Error message: "${context.error}"

Here is the current accessibility tree of the page:
${context.accessibilityTree}

Return ONLY a single Playwright locator expression for this element.

Rules:
- Use semantic locators only: getByRole, getByLabel, getByPlaceholder, getByText
- No CSS selectors, no XPath, no data-testid unless no semantic option exists
- No explanation, no code block, no backticks
- Just the locator expression on a single line

Example: getByRole('combobox', { name: 'Status' })
  `.trim();
}

class OpenAIAdapter implements LLMAdapter {

  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const healing = readRuntimeConfig().healing;
    this.apiKey = healing.apiKey;
    this.model = healing.model;
  }

  async suggestLocator(context: HealingContext): Promise<string | null> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: buildPrompt(context) }],
      }),
    });

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices?.[0]?.message?.content?.trim() ?? null;
  }

}

class AnthropicAdapter implements LLMAdapter {

  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const healing = readRuntimeConfig().healing;
    this.apiKey = healing.apiKey;
    this.model = healing.model;
  }

  async suggestLocator(context: HealingContext): Promise<string | null> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 100,
        messages: [{ role: 'user', content: buildPrompt(context) }],
      }),
    });

    const data = await response.json() as {
      content: Array<{ text: string }>;
    };

    return data.content?.[0]?.text?.trim() ?? null;
  }

}

class GeminiAdapter implements LLMAdapter {

  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const healing = readRuntimeConfig().healing;
    this.apiKey = healing.apiKey;
    this.model = healing.model;
  }

  async suggestLocator(context: HealingContext): Promise<string | null> {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(context) }] }],
      }),
    });

    const data = await response.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  }

}

class OllamaCloudAdapter implements LLMAdapter {

  private readonly apiKey: string;
  private readonly model: string;
  private readonly host: string;

  constructor() {
    const healing = readRuntimeConfig().healing;
    this.apiKey = healing.apiKey;
    this.model  = healing.model;
    this.host   = healing.ollamaHost ?? 'https://ollama.com';
  }

  async suggestLocator(context: HealingContext): Promise<string | null> {
    const client = new Ollama({
      host: this.host,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    const res = await client.chat({
      model: this.model,
      messages: [{ role: 'user', content: buildPrompt(context) }],
      options: { temperature: 0 },
    });

    return res.message?.content?.trim() ?? null;
  }

}

export function createLLMAdapter(): LLMAdapter {
  const provider = readRuntimeConfig().healing.provider;

  switch (provider) {
    case 'anthropic':    return new AnthropicAdapter();
    case 'openai':       return new OpenAIAdapter();
    case 'gemini':       return new GeminiAdapter();
    case 'ollama-cloud': return new OllamaCloudAdapter();
    default:
      throw new Error(
        `HEAL_LLM_PROVIDER "${provider}" is not supported.\n` +
        `Supported values: anthropic, openai, gemini, ollama-cloud`
      );
  }
}
