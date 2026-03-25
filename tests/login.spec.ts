// tests/login.spec.ts
import { test, expect } from '../fixtures';
import { LoginPage }     from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Login', () => {

  test.use({ storageState: { cookies: [], origins: [] } }); // no auth for login tests

  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.assertPageLoaded();
  });

  test('valid admin credentials redirect to dashboard',
    { tag: ['@login', '@smoke', '@critical'] },
    async ({ page, credentials }) => {
      const dashboardPage = new DashboardPage(page);
      await loginPage.login(credentials.adminUsername, credentials.adminPassword);
      await dashboardPage.assertPageLoaded();
    }
  );

  test('invalid password shows error message',
    { tag: ['@login', '@regression', '@high'] },
    async ({ credentials }) => {
      await loginPage.login(credentials.adminUsername, 'wrongpassword');
      await loginPage.assertInvalidCredentialsError();
    }
  );

  test('invalid username shows error message',
    { tag: ['@login', '@regression', '@high'] },
    async ({ credentials }) => {
      await loginPage.login('nonexistentuser', credentials.adminPassword);
      await loginPage.assertInvalidCredentialsError();
    }
  );

  test('empty username shows required field error',
    { tag: ['@login', '@regression', '@medium'] },
    async ({ credentials }) => {
      await loginPage.fillPassword(credentials.adminPassword);
      await loginPage.clickLogin();
      await loginPage.assertUsernameRequiredError();
    }
  );

});
