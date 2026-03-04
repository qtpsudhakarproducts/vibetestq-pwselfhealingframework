// pages/pim/PersonalDetailsPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';
import { DateHelpers }           from '../../helpers/DateHelpers';

export class PersonalDetailsPage extends BasePage {

  private readonly firstNameInput:      Locator;
  private readonly lastNameInput:       Locator;
  private readonly employeeIdInput:     Locator;
  private readonly dobInput:            Locator;
  private readonly genderMaleRadio:     Locator;
  private readonly genderFemaleRadio:   Locator;
  private readonly nationalityDropdown: Locator;
  private readonly photoUploadInput:    Locator;
  private readonly saveButton:          Locator;
  private readonly successToast:        Locator;

  constructor(page: Page) {
    super(page);

    this.firstNameInput      = this.page.getByPlaceholder('First Name')
                                        .describe('Employee first name input');
    this.lastNameInput       = this.page.getByPlaceholder('Last Name')
                                        .describe('Employee last name input');
    this.employeeIdInput     = this.page.locator('input.oxd-input').nth(1)
                                        .describe('Employee ID input field');
    this.dobInput            = this.page.getByPlaceholder('yyyy-dd-mm')
                                        .describe('Date of birth input');
    this.genderMaleRadio     = this.page.getByLabel('Male')
                                        .describe('Male gender radio button');
    this.genderFemaleRadio   = this.page.getByLabel('Female')
                                        .describe('Female gender radio button');
    this.nationalityDropdown = this.page.locator('.oxd-select-text').first()
                                        .describe('Nationality dropdown');
    this.photoUploadInput    = this.page.locator('input[type="file"]')
                                        .describe('Profile photo upload input');
    this.saveButton          = this.page.getByRole('button', { name: 'Save' }).first()
                                        .describe('Save personal details button');
    this.successToast        = this.page.locator('.oxd-toast-content')
                                        .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(empNumber: string): Promise<void> {
    await this.navigate(
      `/web/index.php/pim/viewPersonalDetails/empNumber/${empNumber}`
    );
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async updateFirstName(firstName: string): Promise<void> {
    await this.actions.fill(this.firstNameInput, firstName);
  }

  async updateLastName(lastName: string): Promise<void> {
    await this.actions.fill(this.lastNameInput, lastName);
  }

  // isoDate: standard ISO format string yyyy-mm-dd
  // DateHelpers converts it to OrangeHRM's expected format before filling
  async fillDateOfBirth(isoDate: string): Promise<void> {
    const orangeHRMDate = DateHelpers.fromISO(isoDate);
    await this.controls.fillDateInput(this.dobInput, orangeHRMDate);
  }

  async selectGender(gender: 'Male' | 'Female'): Promise<void> {
    if (gender === 'Male') {
      await this.actions.check(this.genderMaleRadio);
    } else {
      await this.actions.check(this.genderFemaleRadio);
    }
  }

  async selectNationality(nationality: string): Promise<void> {
    await this.controls.selectDropdown(this.nationalityDropdown, nationality);
  }

  async uploadProfilePhoto(filePath: string): Promise<void> {
    await this.actions.uploadFile(this.photoUploadInput, filePath);
  }

  async savePersonalDetails(): Promise<void> {
    await this.actions.click(this.saveButton);
    await this.controls.waitForToast();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/viewPersonalDetails/);
    await expect(this.firstNameInput).toBeVisible();
    await expect(this.lastNameInput).toBeVisible();
  }

  async assertPersonalDetailsSaved(): Promise<void> {
    await expect(this.successToast).toBeVisible();
  }

  // Kept for backwards compatibility
  async assertDetailsSavedSuccessfully(): Promise<void> {
    await this.assertPersonalDetailsSaved();
  }

  async assertFirstName(expectedFirstName: string): Promise<void> {
    await expect(this.firstNameInput).toHaveValue(expectedFirstName);
  }

  async assertLastName(expectedLastName: string): Promise<void> {
    await expect(this.lastNameInput).toHaveValue(expectedLastName);
  }

  async assertEmployeeId(expectedId: string): Promise<void> {
    await expect(this.employeeIdInput).toHaveValue(expectedId);
  }

  async assertDateOfBirth(isoDate: string): Promise<void> {
    const orangeHRMDate = DateHelpers.fromISO(isoDate);
    await expect(this.dobInput).toHaveValue(orangeHRMDate);
  }
}
