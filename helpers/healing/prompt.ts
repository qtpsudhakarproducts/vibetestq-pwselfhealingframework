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
