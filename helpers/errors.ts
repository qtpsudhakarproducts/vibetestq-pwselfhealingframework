// helpers/errors.ts

// Base class for all WebActions failures.
// Preserves the original Playwright stack trace — never lost on rethrow.
// Includes the action name and locator description for immediate context.
export class ActionError extends Error {
  constructor(
    public readonly action:  string,
    public readonly locator: string,
    public readonly cause:   Error,
  ) {
    super(`[${action}] failed on "${locator}": ${cause.message}`);
    this.name  = 'ActionError';
    this.stack = cause.stack; // preserve original Playwright trace
  }
}

// Thrown when Playwright's action timeout expires.
// Indicates the element was found but not interactable within the timeout window.
// Self-healing signal: check for timing issues or slow page responses.
export class TimeoutError extends ActionError {
  constructor(action: string, locator: string, cause: Error) {
    super(action, locator, cause);
    this.name = 'TimeoutError';
  }
}

// Thrown when the element could not be found in the DOM.
// Indicates a locator mismatch — the selector no longer matches any element.
// Self-healing signal: the locator needs updating.
export class ElementNotFoundError extends ActionError {
  constructor(action: string, locator: string, cause: Error) {
    super(action, locator, cause);
    this.name = 'ElementNotFoundError';
  }
}
