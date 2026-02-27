// tests/pim/employee.spec.ts
import { test, expect }    from '../../fixtures';
import { generateEmployee } from '../../data/generate';
import { EmployeeListPage } from '../../pages/pim/EmployeeListPage';
import { AddEmployeePage }  from '../../pages/pim/AddEmployeePage';

test.describe('PIM — Employee Management', () => {

  const employee = generateEmployee(); // unique per run — no collisions on shared site

  test.beforeAll(async ({ browser }) => {
    // Create the employee once before all tests in this block (beforeAll UI setup)
    const context         = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    });
    const page            = context.newPage();
    const addEmployeePage = new AddEmployeePage(await page);

    await addEmployeePage.goto();
    await addEmployeePage.assertPageLoaded();
    await addEmployeePage.addEmployee(employee);
    // Wait for redirect to personal details — confirms save succeeded
    await (await page).waitForURL(/viewPersonalDetails/, { timeout: 15_000 });

    await context.close();
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
