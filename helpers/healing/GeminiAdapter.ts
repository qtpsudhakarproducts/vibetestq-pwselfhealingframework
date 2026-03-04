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
