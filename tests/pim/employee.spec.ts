// tests/pim/employee.spec.ts
import { test, expect }                    from '../../fixtures';
import { generateEmployee, fullName } from '../../data';
import { EmployeeApi }                     from '../../api';

test.describe('PIM — Employee Management', () => {

  const employee  = generateEmployee(); // unique per run — no collisions on shared site
  let   empNumber = 0;                  // recorded in beforeAll, used in afterAll for cleanup

  test.beforeAll(async ({ adminApiClient }) => {
    empNumber = await new EmployeeApi(adminApiClient).createEmployee(employee);
  });

  // ─── Gap 1: Teardown ──────────────────────────────────────────────────
  // Delete the API-created employee after all tests finish.
  // This keeps the shared OrangeHRM demo site clean between runs —
  // without teardown, test employees accumulate and pollute search results.
  test.afterAll(async ({ adminApiClient }) => {
    if (!empNumber) return; // nothing created (beforeAll failed or was skipped)
    await new EmployeeApi(adminApiClient).deleteEmployee(empNumber);
  });

  test('employee appears in the Employee List after creation',
    { tag: ['@pim', '@smoke', '@critical'] },
    async ({ employeeListPage }, testInfo) => {
      testInfo.annotations.push({ type: 'employeeId', description: employee.employeeId });
      testInfo.annotations.push({ type: 'employeeName', description: fullName(employee) });

      await employeeListPage.searchByEmployeeName(employee.firstName);
      await employeeListPage.assertEmployeeExistsInList(fullName(employee));
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
