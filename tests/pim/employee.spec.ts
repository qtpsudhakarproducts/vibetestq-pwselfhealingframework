// tests/pim/employee.spec.ts
import { test, expect }    from '../../fixtures';
import { generateEmployee } from '../../data/generate';
import { ApiClient, EmployeeApi } from '../../api';
import { readEnv } from '../../data/readers';

test.describe('PIM — Employee Management', () => {

  const employee = generateEmployee(); // unique per run — no collisions on shared site

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

  test('employee appears in the Employee List after creation',
    { tag: ['@pim', '@smoke', '@critical'] },
    async ({ employeeListPage }, testInfo) => {
      testInfo.annotations.push({ type: 'employeeId', description: employee.employeeId });
      testInfo.annotations.push({ type: 'employeeName', description: employee.fullName });

      await employeeListPage.searchByEmployeeName(employee.firstName);
      await employeeListPage.assertEmployeeExistsInList(employee.fullName);
    }
  );

  test('employee list page loads with Add button visible',
    { tag: ['@pim', '@sanity', '@medium'] },
    async ({ employeeListPage }) => {
      await employeeListPage.assertAddButtonVisible();
    }
  );

  test('search with no match shows No Records Found',
    { tag: ['@pim', '@regression', '@low'] },
    async ({ employeeListPage }) => {
      const nonExistentName = 'ZZZZZ_ThisEmployeeDoesNotExist';
      await employeeListPage.searchByEmployeeName(nonExistentName);
      await employeeListPage.assertNoRecordsFound();
    }
  );

  test('Add Employee page loads with form fields visible',
    { tag: ['@pim', '@sanity', '@medium'] },
    async ({ addEmployeePage }) => {
      await addEmployeePage.assertPageLoaded();
    }
  );

});
