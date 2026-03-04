// api/ApiClient.ts
import { APIRequestContext, request } from '@playwright/test';

export class ApiClient {

  private readonly context:    APIRequestContext;
  private readonly baseURL:    string;
  private readonly authHeader: string;

  private constructor(
    context:    APIRequestContext,
    baseURL:    string,
    authHeader: string
  ) {
    this.context    = context;
    this.baseURL    = baseURL;
    this.authHeader = authHeader;
  }

  /**
   * Creates an ApiClient authenticated via a saved browser storage state file.
   * OrangeHRM API v2 uses session cookies — Basic auth is not supported.
   *
   * Usage: await ApiClient.create(baseURL, 'playwright/.auth/admin.json');
   */
  static async create(
    baseURL:          string,
    storageStatePath: string
  ): Promise<ApiClient> {
    const context = await request.newContext({ baseURL, storageState: storageStatePath });
    return new ApiClient(context, baseURL, '');
  }

  // ─── HTTP Methods ─────────────────────────────────────────────────────────────

  async get(path: string): Promise<unknown> {
    const response = await this.context.get(path);
    return this.handleResponse(response, `GET ${path}`);
  }

  async post(path: string, body: unknown): Promise<unknown> {
    const response = await this.context.post(path, {
      headers: { 'Content-Type': 'application/json' },
      data: body,
    });
    return this.handleResponse(response, `POST ${path}`);
  }

  async delete(path: string, body?: unknown): Promise<void> {
    const response = await this.context.delete(path, body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, data: body }
      : undefined
    );
    if (!response.ok()) {
      throw new Error(
        `DELETE ${path} failed with status ${response.status()}: ${await response.text()}`
      );
    }
  }

  private async handleResponse(
    response: Awaited<ReturnType<APIRequestContext['get']>>,
    label:    string
  ): Promise<unknown> {
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `${label} failed with status ${response.status()}: ${body}`
      );
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async dispose(): Promise<void> {
    await this.context.dispose();
  }

  // ─── Schema Validation ──────────────────────────────────────────────────────────

  /**
   * Validates that a parsed API response contains all expected top-level keys.
   * Throws with a clear diagnostic if the shape doesn’t match — surfaces API
   * contract breaks immediately at the API layer rather than as a confusing
   * undefined/null deep in test code.
   *
   * Usage:
   *   const body = ApiClient.assertResponseShape<{ data: OrangeHRMEmployee }>(
   *     raw, ['data'], 'POST /api/v2/pim/employees'
   *   );
   */
  static assertResponseShape<T extends object>(
    data:         unknown,
    requiredKeys: (keyof T & string)[],
    label:        string
  ): T {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error(
        `${label}: expected object response, got ${JSON.stringify(data)}`
      );
    }
    const obj     = data as Record<string, unknown>;
    const missing = requiredKeys.filter((k) => !(k in obj));
    if (missing.length > 0) {
      throw new Error(
        `${label}: API response missing required fields: [${missing.join(', ')}]\n` +
        `Received keys: [${Object.keys(obj).join(', ')}]\n` +
        `This likely means the API contract has changed — update the interface.`
      );
    }
    return obj as T;
  }

}
