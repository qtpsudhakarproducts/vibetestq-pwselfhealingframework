// tests/admin/user.spec.ts
import { test, expect }    from '../../fixtures';
import { generateEmployee, generateUser } from '../../data/generate';
import { ApiClient, EmployeeApi } from '../../api';
import { readEnv } from '../../data/readers';

test.describe('Admin — User Management', () => {

  const employee = generateEmployee();
  const user     = generateUser(employee.fullName);

  test.beforeAll(async () => {
    const env = readEnv();
    const client = await ApiClient.create(
      env.baseURL,
      env.adminUsername,
      env.adminPassword
    );
    const employeeApi = new EmployeeApi(client);
    await employeeApi.createEmployee(employee);
    await client.dispose();
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
