// pages/pim/EmployeeListPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';

export class EmployeeListPage extends BasePage {

  private readonly pageHeading:       Locator;
  private readonly employeeNameInput: Locator;
  private readonly searchButton:      Locator;
  private readonly addButton:         Locator;
  private readonly employeeTable:     Locator;
  private readonly noRecordsMessage:  Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading       = this.page.getByRole('heading', { name: 'Employee Information' })
                                      .describe('Employee list page heading');
    this.employeeNameInput = this.page.getByPlaceholder('Type for hints...')
                                      .describe('Employee name search input');
    this.searchButton      = this.page.getByRole('button', { name: 'Search' })
                                      .describe('Search employees button');
    this.addButton         = this.page.getByRole('button', { name: 'Add' })
                                      .describe('Add new employee button');
    this.employeeTable     = this.page.locator('.oxd-table-body')
                                      .describe('Employee records table body');
    this.noRecordsMessage  = this.page.getByText('No Records Found')
                                      .describe('No records found message');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/pim/viewEmployeeList');
  }

  async clickAddEmployee(): Promise<void> {
    await this.addButton.click();
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async searchByEmployeeName(name: string): Promise<void> {
    await this.employeeNameInput.fill(name);
    await this.searchButton.click();
    await this.waitForPageLoad();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/viewEmployeeList/);
    await expect(this.pageHeading).toBeVisible();
  }

  async assertEmployeeExistsInList(employeeName: string): Promise<void> {
    await expect(
      this.employeeTable.getByRole('row', { name: new RegExp(employeeName, 'i') })
    ).toBeVisible();
  }

  async assertNoRecordsFound(): Promise<void> {
    await expect(this.noRecordsMessage).toBeVisible();
  }

  async assertAddButtonVisible(): Promise<void> {
    await expect(this.addButton).toBeVisible();
  }
}
