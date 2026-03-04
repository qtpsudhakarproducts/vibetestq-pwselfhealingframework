// pages/admin/UserManagementPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage }              from '../BasePage';

export class UserManagementPage extends BasePage {

  private readonly pageHeading:      Locator;
  private readonly usernameInput:    Locator;
  private readonly searchButton:     Locator;
  private readonly addButton:        Locator;
  private readonly userTable:        Locator;
  private readonly noRecordsMessage: Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading      = this.page.getByRole('heading', { name: 'System Users' })
                                     .describe('System users page heading');
    this.usernameInput    = this.page.getByRole('textbox').first()
                                     .describe('Username search input');
    this.searchButton     = this.page.getByRole('button', { name: 'Search' })
                                     .describe('Search users button');
    this.addButton        = this.page.getByRole('button', { name: 'Add' })
                                     .describe('Add new user button');
    this.userTable        = this.page.locator('.oxd-table-body')
                                     .describe('System users table body');
    this.noRecordsMessage = this.page.getByText('No Records Found')
                                     .describe('No records found message');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigate('/web/index.php/admin/viewSystemUsers');
  }

  async clickAddUser(): Promise<void> {
    await this.actions.click(this.addButton);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async searchByUsername(username: string): Promise<void> {
    await this.actions.fill(this.usernameInput, username);
    await this.actions.click(this.searchButton);
    await this.waitForPageLoad();
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async assertPageLoaded(): Promise<void> {
    await this.assertURL(/viewSystemUsers/);
    await expect(this.pageHeading).toBeVisible();
  }

  async assertUserExistsInList(username: string): Promise<void> {
    // .first() avoids strict mode violation when multiple rows contain the username
    // text (e.g. searching "Admin" matches rows whose User Role column = "Admin")
    await expect(
      this.userTable.getByRole('row', { name: new RegExp(username, 'i') }).first()
    ).toBeVisible();
  }

  async assertNoRecordsFound(): Promise<void> {
    // Vue re-renders the table asynchronously; waiting for 0 rows is more reliable
    // than getByText('No Records Found') which appears only after the transition.
    await expect(
      this.userTable.getByRole('row')
    ).toHaveCount(0);
  }
}
