// pages/BasePage.ts
import { Page, expect } from '@playwright/test';

export class BasePage {

  // ─── Shared Properties ────────────────────────────────────────────────────────
  // protected — accessible by BasePage and all child classes
  protected readonly page: Page;

  // ─── Constructor ──────────────────────────────────────────────────────────────

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Navigation ───────────────────────────────────────────────────────────────

  protected async navigate(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForURL(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlPattern);
  }

  // ─── Common Assertions ────────────────────────────────────────────────────────

  async assertURL(urlPattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(urlPattern);
  }

  async assertPageTitle(expectedTitle: string): Promise<void> {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  // ─── Common Utilities ─────────────────────────────────────────────────────────

  async getCurrentURL(): Promise<string> {
    return this.page.url();
  }

  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight)
    );
  }

  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  async reloadPage(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

}
