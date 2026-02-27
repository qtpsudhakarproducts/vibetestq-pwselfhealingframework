// pages/admin/AddUserPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';
import { UserData }              from '../../data/types';

export class AddUserPage extends BasePage {

  private readonly pageHeading:          Locator;
  private readonly userRoleDropdown:     Locator;
  private readonly employeeNameInput:    Locator;
  private readonly statusDropdown:       Locator;
  private readonly usernameInput:        Locator;
  private readonly passwordInput:        Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly saveButton:           Locator;
  private readonly successToast:         Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading          = this.page.getByRole('heading', { name: 'Add User' })
                                         .describe('Add user page heading');
    this.userRoleDropdown     = this.page.locator('.oxd-select-text').first()
                                         .describe('User role dropdown');
    this.employeeNameInput    = this.page.getByPlaceholder('Type for hints...')
                                         .describe('Employee name autocomplete input');
    this.statusDropdown       = this.page.locator('.oxd-select-text').nth(1)
                                         .describe('User status dropdown');
    this.usernameInput        = this.page.locator('input.oxd-input').nth(1)
                                         .describe('New username input field');
    this.passwordInput        = this.page.locator('input[type="password"]').first()
                                         .describe('Password input field');
    this.confirmPasswordInput = this.page.locator('input[type="password"]').nth(1)
                                         .describe('Confirm password input field');
    this.saveButton           = this.page.getByRole('button', { name: 'Save' })
                                         .describe('Save new user button');
    this.successToast         = this.page.locator('.oxd-toast-content')
                                         .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/admin/saveSystemUser');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async selectUserRole(role: 'Admin' | 'ESS'): Promise<void> {
    await this.userRoleDropdown.click();
    await this.page.getByRole('option', { name: role }).click();
  }

  async fillEmployeeName(employeeName: string): Promise<void> {
    await this.employeeNameInput.fill(employeeName);
    await this.page.locator('.oxd-autocomplete-option').first().waitFor({ state: 'visible', timeout: 10_000 });
    await this.page.locator('.oxd-autocomplete-option').first().click();
  }

  async selectStatus(status: 'Enabled' | 'Disabled'): Promise<void> {
    await this.statusDropdown.click();
    await this.page.getByRole('option', { name: status }).click();
  }

  async fillUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async fillConfirmPassword(password: string): Promise<void> {
    await this.confirmPasswordInput.fill(password);
  }

  async saveUser(): Promise<void> {
    await this.saveButton.click();
  }

  async addUser(user: UserData): Promise<void> {
    await this.selectUserRole(user.role);
    await this.fillEmployeeName(user.employeeName);
    await this.selectStatus(user.status);
    await this.fillUsername(user.username);
    await this.fillPassword(user.password);
    await this.fillConfirmPassword(user.password);
    await this.saveUser();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/saveSystemUser/);
    await expect(this.pageHeading).toBeVisible();
  }

  async assertUserSavedSuccessfully(): Promise<void> {
    await expect(this.successToast).toBeVisible({ timeout: 15_000 });
  }
}
