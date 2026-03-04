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
