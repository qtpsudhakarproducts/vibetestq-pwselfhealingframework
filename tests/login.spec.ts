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
    async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await loginPage.login('Admin', 'admin123');
      await dashboardPage.assertPageLoaded();
    }
  );

  test('invalid password shows error message',
    { tag: ['@login', '@regression', '@high'] },
    async () => {
      await loginPage.login('Admin', 'wrongpassword');
      await loginPage.assertInvalidCredentialsError();
    }
  );

  test('invalid username shows error message',
    { tag: ['@login', '@regression', '@high'] },
    async () => {
      await loginPage.login('nonexistentuser', 'admin123');
      await loginPage.assertInvalidCredentialsError();
    }
  );

  test('empty username shows required field error',
    { tag: ['@login', '@regression', '@medium'] },
    async () => {
      await loginPage.fillPassword('admin123');
      await loginPage.clickLogin();
      await loginPage.assertUsernameRequiredError();
    }
  );

});
