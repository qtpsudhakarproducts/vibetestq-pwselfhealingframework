// tests/admin/user.spec.ts
import { test, expect }    from '../../fixtures';
import { generateEmployee, generateUser } from '../../data/generate';
import { AddEmployeePage }  from '../../pages/pim/AddEmployeePage';

test.describe('Admin — User Management', () => {

  const employee = generateEmployee();
  const user     = generateUser(employee.fullName);

  test.beforeAll(async ({ browser }) => {
    // Create the employee first — a user must be linked to an existing employee
    const context = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    });
    const page            = context.newPage();
    const addEmployeePage = new AddEmployeePage(await page);

    await addEmployeePage.goto();
    await addEmployeePage.assertPageLoaded();
    await addEmployeePage.addEmployee(employee);
    await (await page).waitForURL(/viewPersonalDetails/, { timeout: 15_000 });
    await context.close();
  });

  test('admin can add a new system user',
    { tag: ['@admin', '@smoke', '@critical'] },
    async ({ addUserPage }, testInfo) => {
      testInfo.annotations.push({ type: 'username',     description: user.username });
      testInfo.annotations.push({ type: 'employeeName', description: user.employeeName });

      await addUserPage.addUser(user);
      await addUserPage.assertUserSavedSuccessfully();
    }
  );

  test('newly created user appears in user management list',
    { tag: ['@admin', '@regression', '@high'] },
    async ({ userManagementPage }, testInfo) => {
      testInfo.annotations.push({ type: 'username', description: user.username });

      await userManagementPage.searchByUsername(user.username);
      await userManagementPage.assertUserExistsInList(user.username);
    }
  );

  test('user management list loads with Add button visible',
    { tag: ['@admin', '@sanity', '@medium'] },
    async ({ userManagementPage }) => {
      await userManagementPage.assertPageLoaded();
    }
  );

});
