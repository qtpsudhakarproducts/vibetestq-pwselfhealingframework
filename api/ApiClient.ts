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
   * Creates an ApiClient using admin credentials.
   * Uses Playwright's request context — completely independent of any browser page.
   */
  static async create(
    baseURL:  string,
    username: string,
    password: string
  ): Promise<ApiClient> {
    const context = await request.newContext({ baseURL });

    // OrangeHRM API uses HTTP Basic Authentication
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    const authHeader  = `Basic ${credentials}`;

    return new ApiClient(context, baseURL, authHeader);
  }

  // ─── HTTP Methods ─────────────────────────────────────────────────────────────

  async get(path: string): Promise<unknown> {
    const response = await this.context.get(path, {
      headers: { Authorization: this.authHeader },
    });
    return this.handleResponse(response, `GET ${path}`);
  }

  async post(path: string, body: unknown): Promise<unknown> {
    const response = await this.context.post(path, {
      headers: {
        Authorization:  this.authHeader,
        'Content-Type': 'application/json',
      },
      data: body,
    });
    return this.handleResponse(response, `POST ${path}`);
  }

  async delete(path: string): Promise<void> {
    const response = await this.context.delete(path, {
      headers: { Authorization: this.authHeader },
    });
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
