// pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from './BasePage';

export class LoginPage extends BasePage {

  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton:   Locator;
  private readonly errorMessage:  Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = this.page.getByPlaceholder('Username')
                                  .describe('Username input field');
    this.passwordInput = this.page.getByPlaceholder('Password')
                                  .describe('Password input field');
    this.loginButton   = this.page.getByRole('button', { name: 'Login' })
                                  .describe('Login submit button');
    this.errorMessage  = this.page.locator('.oxd-alert-content-text')
                                  .describe('Login error message');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/auth/login');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async fillUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async login(username: string, password: string): Promise<void> {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/auth\/login/);
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  async assertInvalidCredentialsError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toHaveText('Invalid credentials');
  }

  async assertUsernameRequiredError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText('Username cannot be empty');
  }
}
