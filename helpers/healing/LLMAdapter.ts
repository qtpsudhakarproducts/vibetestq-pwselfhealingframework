// helpers/healing/LLMAdapter.ts

export interface LLMAdapter {
  suggestLocator(
    description:       string,
    accessibilityTree: string
  ): Promise<string | null>;
}
