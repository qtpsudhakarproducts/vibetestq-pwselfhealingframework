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
