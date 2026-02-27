// pages/pim/PersonalDetailsPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';

export class PersonalDetailsPage extends BasePage {

  private readonly pageHeading:    Locator;
  private readonly firstNameInput: Locator;
  private readonly lastNameInput:  Locator;
  private readonly saveButton:     Locator;
  private readonly successToast:   Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading    = this.page.getByRole('heading', { name: 'Personal Details' })
                                   .describe('Personal details page heading');
    this.firstNameInput = this.page.getByPlaceholder('First Name')
                                   .describe('First name input on personal details');
    this.lastNameInput  = this.page.getByPlaceholder('Last Name')
                                   .describe('Last name input on personal details');
    this.saveButton     = this.page.getByRole('button', { name: 'Save' }).first()
                                   .describe('Save personal details button');
    this.successToast   = this.page.locator('.oxd-toast-content')
                                   .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(employeeId: string): Promise<void> {
    await this.navigate(`/web/index.php/pim/viewPersonalDetails/empNumber/${employeeId}`);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async updateFirstName(firstName: string): Promise<void> {
    await this.firstNameInput.clear();
    await this.firstNameInput.fill(firstName);
  }

  async updateLastName(lastName: string): Promise<void> {
    await this.lastNameInput.clear();
    await this.lastNameInput.fill(lastName);
  }

  async savePersonalDetails(): Promise<void> {
    await this.saveButton.click();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/viewPersonalDetails/);
    await expect(this.pageHeading).toBeVisible();
  }

  async assertDetailsSavedSuccessfully(): Promise<void> {
    await expect(this.successToast).toBeVisible({ timeout: 15_000 });
  }
}
