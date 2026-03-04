// pages/pim/AddEmployeePage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';
import { EmployeeData }          from '../../data/types';

export class AddEmployeePage extends BasePage {

  private readonly pageHeading:     Locator;
  private readonly firstNameInput:  Locator;
  private readonly lastNameInput:   Locator;
  private readonly employeeIdInput: Locator;
  private readonly saveButton:      Locator;
  private readonly successToast:    Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading     = this.page.getByRole('heading', { name: 'Add Employee' })
                                    .describe('Add employee page heading');
    this.firstNameInput  = this.page.getByPlaceholder('First Name')
                                    .describe('Employee first name input');
    this.lastNameInput   = this.page.getByPlaceholder('Last Name')
                                    .describe('Employee last name input');
    this.employeeIdInput = this.page.locator('input.oxd-input').nth(4)
                                    .describe('Employee ID input field');
    this.saveButton      = this.page.getByRole('button', { name: 'Save' })
                                    .describe('Save new employee button');
    this.successToast    = this.page.locator('.oxd-toast-content')
                                    .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/pim/addEmployee');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async fillFirstName(firstName: string): Promise<void> {
    await this.actions.fill(this.firstNameInput, firstName);
  }

  async fillLastName(lastName: string): Promise<void> {
    await this.actions.fill(this.lastNameInput, lastName);
  }

  async fillEmployeeId(employeeId: string): Promise<void> {
    await this.actions.fill(this.employeeIdInput, employeeId);
  }

  async saveEmployee(): Promise<void> {
    await this.actions.click(this.saveButton);
  }

  async addEmployee(employee: EmployeeData): Promise<void> {
    await this.fillFirstName(employee.firstName);
    await this.fillLastName(employee.lastName);
    await this.fillEmployeeId(employee.employeeId);
    await this.saveEmployee();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/addEmployee/);
    await expect(this.pageHeading).toBeVisible();
    await expect(this.firstNameInput).toBeVisible();
  }

  async assertEmployeeSavedSuccessfully(): Promise<void> {
    await expect(this.successToast).toBeVisible({ timeout: 15_000 });
  }

  async assertRedirectedToPersonalDetails(): Promise<void> {
    await this.assertURL(/viewPersonalDetails/);
  }
}
