// tests/admin/user.spec.ts
//
// Enterprise Framework Concepts demonstrated here:
//
//   1. Direct API test     — call the REST API directly with no browser open
//   2. File-based test data — read static rows from a CSV via readCSV()
//   3. Fixture injection    — userManagementPage fixture delivers an
//                             authenticated, navigated page object
//   4. Role-based access    — admin-only page hidden behind storageState auth
//   5. Positive assertion   — search for a known user, assert it appears
//   6. Negative assertion   — search for a non-existent user, assert empty state
//
import { test, expect }           from '../../fixtures';
import { EmployeeApi }            from '../../api';
import { readCSV, TEST_DATA }         from '../../data';

// ─── 1. Direct API Test ──────────────────────────────────────────────────────
// No browser. Authenticates via stored session cookies and calls the
// OrangeHRM v2 REST API directly. This is the same pattern used in
// beforeAll hooks across the suite to set up test data without UI overhead.

test('API: EmployeeApi returns at least one employee from the system',
  { tag: ['@admin', '@api', '@smoke'] },
  async ({ adminApiClient }) => {
    const first = await new EmployeeApi(adminApiClient).getFirst();

    expect(first).not.toBeNull();
    expect(first!.firstName).toBeTruthy();
    expect(first!.lastName).toBeTruthy();
  }
);

// ─── 2. File-Based Test Data (CSV) ────────────────────────────────────────────
// Static test data lives in test-data/employees.csv and is read once at
// runtime. This avoids hard-coding values in test code and lets a non-
// technical team member update test inputs without touching TypeScript.

test('CSV: test-data/employees.csv is readable and contains valid rows',
  { tag: ['@admin', '@data', '@sanity'] },
  () => {
    const rows = readCSV(TEST_DATA.employeesCsv);

    expect(rows.length).toBeGreaterThan(0);
    // Every row must have the columns our data layer expects
    for (const row of rows) {
      expect(row).toHaveProperty('firstName');
      expect(row).toHaveProperty('lastName');
      expect(row).toHaveProperty('employeeId');
    }
  }
);

// ─── 3 – 6. Fixture Injection + Role-Based Access + Assertions ───────────────
// The userManagementPage fixture (fixtures/index.ts) handles:
//   • injecting the admin storageState (role-based access)
//   • navigating to the page
//   • asserting it loaded — before the test body even starts
// Tests receive a ready-to-use page object with zero boilerplate.

test.describe('Admin — User Management', () => {

  // 3. Fixture injection — authenticated admin page delivered ready to use
  test('fixture delivers authenticated admin page with Add button visible',
    { tag: ['@admin', '@smoke', '@critical'] },
    async ({ userManagementPage }) => {
      await userManagementPage.assertPageLoaded();
    }
  );

  // 5. Positive assertion — search for a known user, assert the row appears
  test('search returns matching row for a known existing username',
    { tag: ['@admin', '@regression', '@high'] },
    async ({ userManagementPage }) => {
      await userManagementPage.searchByUsername('Admin');
      await userManagementPage.assertUserExistsInList('Admin');
    }
  );

  // 6. Negative assertion — same search action, different assertion branch
  test('search with no match shows No Records Found',
    { tag: ['@admin', '@regression', '@medium'] },
    async ({ userManagementPage }) => {
      await userManagementPage.searchByUsername('ZZZZZ_NoSuchUser_XYZ');
      await userManagementPage.assertNoRecordsFound();
    }
  );

});
