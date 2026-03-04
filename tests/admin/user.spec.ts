// tests/admin/user.spec.ts
import { test, expect }    from '../../fixtures';
import { generateUser }    from '../../data/generate';
import { UserData }        from '../../data/types';
import { ApiClient, EmployeeApi } from '../../api';
import { readRuntimeConfig } from '../../data/config';

test.describe('Admin — User Management', () => {

  let user: UserData;

  test.beforeAll(async () => {
    const client = await ApiClient.create(
      readRuntimeConfig().env.baseURL,
      'playwright/.auth/admin.json'
    );
    const employeeApi = new EmployeeApi(client);
    const existing = await employeeApi.getFirst();
    if (!existing) throw new Error('No employees found — cannot run user creation test');
    user = generateUser(existing.fullName);
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
