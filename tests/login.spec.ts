// tests/login.spec.ts
import { test, expect } from '../fixtures';
import { LoginPage }     from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { readEnv } from '../data/readers';

test.describe('Login', () => {

  const env = readEnv();

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
      await loginPage.login(env.adminUsername, env.adminPassword);
      await dashboardPage.assertPageLoaded();
    }
  );

  test('invalid password shows error message',
    { tag: ['@login', '@regression', '@high'] },
    async () => {
      await loginPage.login(env.adminUsername, 'wrongpassword');
      await loginPage.assertInvalidCredentialsError();
    }
  );

  test('invalid username shows error message',
    { tag: ['@login', '@regression', '@high'] },
    async () => {
      await loginPage.login('nonexistentuser', env.adminPassword);
      await loginPage.assertInvalidCredentialsError();
    }
  );

  test('empty username shows required field error',
    { tag: ['@login', '@regression', '@medium'] },
    async () => {
      await loginPage.fillPassword(env.adminPassword);
      await loginPage.clickLogin();
      await loginPage.assertUsernameRequiredError();
    }
  );

});
