// pages/leave/ApplyLeavePage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';
import { LeaveData }             from '../../data/types';

export class ApplyLeavePage extends BasePage {

  private readonly pageHeading:       Locator;
  private readonly leaveTypeDropdown: Locator;
  private readonly fromDateInput:     Locator;
  private readonly toDateInput:       Locator;
  private readonly commentInput:      Locator;
  private readonly applyButton:       Locator;
  private readonly successToast:      Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading       = this.page.getByRole('heading', { name: 'Apply Leave' })
                                      .describe('Apply leave page heading');
    this.leaveTypeDropdown = this.page.locator('.oxd-select-text').first()
                                      .describe('Leave type dropdown');
    this.fromDateInput     = this.page.locator('.oxd-date-input input').first()
                                      .describe('Leave from date input');
    this.toDateInput       = this.page.locator('.oxd-date-input input').nth(1)
                                      .describe('Leave to date input');
    this.commentInput      = this.page.locator('textarea.oxd-textarea')
                                      .describe('Leave application comment textarea');
    this.applyButton       = this.page.getByRole('button', { name: 'Apply' })
                                      .describe('Submit leave application button');
    this.successToast      = this.page.locator('.oxd-toast-content')
                                      .describe('Success toast notification');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/leave/applyLeave');
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async selectLeaveType(leaveType: string): Promise<void> {
    await this.controls.selectDropdown(this.leaveTypeDropdown, leaveType);
  }

  async fillFromDate(date: string): Promise<void> {
    await this.controls.fillDateInput(this.fromDateInput, date);
  }

  async fillToDate(date: string): Promise<void> {
    await this.controls.fillDateInput(this.toDateInput, date);
  }

  async fillComment(comment: string): Promise<void> {
    await this.actions.fill(this.commentInput, comment);
  }

  async submitLeaveApplication(): Promise<void> {
    await this.actions.click(this.applyButton);
    await this.controls.waitForToast();
  }

  async applyForLeave(leave: LeaveData): Promise<void> {
    await this.selectLeaveType(leave.leaveType);
    await this.fillFromDate(leave.fromDate);
    await this.fillToDate(leave.toDate);
    if (leave.comment) await this.fillComment(leave.comment);
    await this.submitLeaveApplication();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/applyLeave/);
    await expect(this.pageHeading).toBeVisible();
    // Note: leave type dropdown only appears when the user has leave types with balance
  }

  async assertLeaveApplicationSubmitted(): Promise<void> {
    await expect(this.successToast).toBeVisible({ timeout: 15_000 });
  }
}
