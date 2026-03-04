// pages/DashboardPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from './BasePage';

export class DashboardPage extends BasePage {

  private readonly dashboardHeading: Locator;
  private readonly pimMenuItem:      Locator;
  private readonly adminMenuItem:    Locator;
  private readonly leaveMenuItem:    Locator;
  private readonly userDropdown:     Locator;
  private readonly logoutOption:     Locator;

  constructor(page: Page) {
    super(page);
    this.dashboardHeading = this.page.getByRole('heading', { name: 'Dashboard' })
                                     .describe('Dashboard page heading');
    this.pimMenuItem      = this.page.getByRole('link', { name: 'PIM' })
                                     .describe('PIM navigation menu item');
    this.adminMenuItem    = this.page.getByRole('link', { name: 'Admin' })
                                     .describe('Admin navigation menu item');
    this.leaveMenuItem    = this.page.getByRole('link', { name: 'Leave' })
                                     .describe('Leave navigation menu item');
    this.userDropdown     = this.page.locator('.oxd-userdropdown-tab')
                                     .describe('User account dropdown trigger');
    this.logoutOption     = this.page.getByRole('menuitem', { name: 'Logout' })
                                     .describe('Logout menu option');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async navigateToPIM(): Promise<void> {
    await this.actions.click(this.pimMenuItem);
    await this.waitForPageLoad();
  }

  async navigateToAdmin(): Promise<void> {
    await this.actions.click(this.adminMenuItem);
    await this.waitForPageLoad();
  }

  async navigateToLeave(): Promise<void> {
    await this.actions.click(this.leaveMenuItem);
    await this.waitForPageLoad();
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async logout(): Promise<void> {
    await this.actions.click(this.userDropdown);
    await this.actions.click(this.logoutOption);
    await this.waitForPageLoad();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/dashboard/);
    await expect(this.dashboardHeading).toBeVisible();
  }

  async assertLoggedInAs(expectedUsername: string): Promise<void> {
    await expect(this.userDropdown).toContainText(expectedUsername);
  }
}
