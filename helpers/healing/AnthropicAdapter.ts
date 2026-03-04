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
