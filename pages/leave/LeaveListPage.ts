// pages/leave/LeaveListPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';

export class LeaveListPage extends BasePage {

  private readonly pageHeading:      Locator;
  private readonly leaveTable:       Locator;
  private readonly noRecordsMessage: Locator;
  private readonly confirmButton:    Locator;
  private readonly successToast:     Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading      = this.page.getByRole('heading', { name: 'Leave List' })
                                     .describe('Leave list page heading');
    this.leaveTable       = this.page.locator('.oxd-table-body')
                                     .describe('Leave requests table body');
    this.noRecordsMessage = this.page.getByText('No Records Found')
                                     .describe('No records found message');
    this.confirmButton    = this.page.getByRole('button', { name: 'Ok' })
                                     .describe('Confirm action dialog button');
    this.successToast     = this.page.locator('.oxd-toast-content')
                                     .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/leave/viewLeaveList');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async approveLeaveRequest(employeeName: string): Promise<void> {
    const row = this.leaveTable
      .getByRole('row', { name: new RegExp(employeeName, 'i') });
    await row.getByRole('button', { name: 'Approve' }).click();
    await this.confirmButton.click();
  }

  async rejectLeaveRequest(employeeName: string): Promise<void> {
    const row = this.leaveTable
      .getByRole('row', { name: new RegExp(employeeName, 'i') });
    await row.getByRole('button', { name: 'Reject' }).click();
    await this.confirmButton.click();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/viewLeaveList/);
    await expect(this.pageHeading).toBeVisible();
  }

  async assertLeaveRequestExists(employeeName: string): Promise<void> {
    await expect(
      this.leaveTable.getByRole('row', { name: new RegExp(employeeName, 'i') })
    ).toBeVisible();
  }

  async assertLeaveApproved(): Promise<void> {
    await expect(this.successToast).toBeVisible({ timeout: 15_000 });
  }

  async assertNoRecordsFound(): Promise<void> {
    await expect(this.noRecordsMessage).toBeVisible();
  }
}
