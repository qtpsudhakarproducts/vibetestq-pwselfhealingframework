// fixtures/index.ts
// All custom fixtures are defined here and exported as an extended `test` object.
// Every test file imports `test` from this file instead of from @playwright/test directly.
import { test as base, expect } from '@playwright/test';

import { DashboardPage }       from '../pages/DashboardPage';
import { EmployeeListPage }    from '../pages/pim/EmployeeListPage';
import { AddEmployeePage }     from '../pages/pim/AddEmployeePage';
import { PersonalDetailsPage } from '../pages/pim/PersonalDetailsPage';
import { UserManagementPage }  from '../pages/admin/UserManagementPage';
import { AddUserPage }         from '../pages/admin/AddUserPage';
import { ApplyLeavePage }      from '../pages/leave/ApplyLeavePage';
import { LeaveListPage }       from '../pages/leave/LeaveListPage';

// ─── Fixture Type Definitions ─────────────────────────────────────────────────

type OrangeHRMFixtures = {
  // Authenticated sessions
  adminDashboard: DashboardPage;
  essDashboard:   DashboardPage;

  // PIM fixtures — admin authenticated, page navigated
  employeeListPage:    EmployeeListPage;
  addEmployeePage:     AddEmployeePage;
  personalDetailsPage: PersonalDetailsPage;

  // Admin fixtures — admin authenticated, page navigated
  userManagementPage: UserManagementPage;
  addUserPage:        AddUserPage;

  // Leave fixtures
  applyLeavePage: ApplyLeavePage;  // ESS user authenticated
  leaveListPage:  LeaveListPage;   // admin authenticated
};

// ─── Extended Test Object ─────────────────────────────────────────────────────

const test = base.extend<OrangeHRMFixtures>({

  // ─── Authenticated Session Fixtures ──────────────────────────────────────────

  adminDashboard: async ({ page }, use) => {
    const dashboard = new DashboardPage(page);
    await dashboard.assertPageLoaded();
    await use(dashboard);
  },

  essDashboard: async ({ page }, use) => {
    const dashboard = new DashboardPage(page);
    await dashboard.assertPageLoaded();
    await use(dashboard);
  },

  // ─── PIM Fixtures ─────────────────────────────────────────────────────────────

  employeeListPage: async ({ page }, use) => {
    const employeeList = new EmployeeListPage(page);
    await employeeList.goto();
    await employeeList.assertPageLoaded();
    await use(employeeList);
  },

  addEmployeePage: async ({ page }, use) => {
    const addEmployee = new AddEmployeePage(page);
    await addEmployee.goto();
    await addEmployee.assertPageLoaded();
    await use(addEmployee);
  },

  personalDetailsPage: async ({ page }, use) => {
    const personalDetails = new PersonalDetailsPage(page);
    await use(personalDetails);
  },

  // ─── Admin Fixtures ───────────────────────────────────────────────────────────

  userManagementPage: async ({ page }, use) => {
    const userManagement = new UserManagementPage(page);
    await userManagement.goto();
    await userManagement.assertPageLoaded();
    await use(userManagement);
  },

  addUserPage: async ({ page }, use) => {
    const addUser = new AddUserPage(page);
    await addUser.goto();
    await addUser.assertPageLoaded();
    await use(addUser);
  },

  // ─── Leave Fixtures ───────────────────────────────────────────────────────────

  applyLeavePage: async ({ page }, use) => {
    const applyLeave = new ApplyLeavePage(page);
    await applyLeave.goto();
    await applyLeave.assertPageLoaded();
    await use(applyLeave);
  },

  leaveListPage: async ({ page }, use) => {
    const leaveList = new LeaveListPage(page);
    await leaveList.goto();
    await leaveList.assertPageLoaded();
    await use(leaveList);
  },

});

// Re-export expect so test files only need one import
export { test, expect };
