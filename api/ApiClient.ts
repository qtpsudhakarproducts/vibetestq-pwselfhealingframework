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

  async delete(path: string): Promise<void> {
    const response = await this.context.delete(path);
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

}
