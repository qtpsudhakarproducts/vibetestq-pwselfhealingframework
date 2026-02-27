// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0].use.baseURL ?? 'https://opensource-demo.orangehrmlive.com';

  // Ensure .auth directory exists
  const authDir = path.join('playwright', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();

  // ─── Save Admin Authentication State ───────────────────────────────────────

  console.log('⏳ Saving Admin authentication state...');
  try {
    const adminContext = await browser.newContext();
    const adminPage    = await adminContext.newPage();

    await adminPage.goto(`${baseURL}/web/index.php/auth/login`);
    await adminPage.getByPlaceholder('Username').fill('Admin');
    await adminPage.getByPlaceholder('Password').fill('admin123');
    await adminPage.getByRole('button', { name: 'Login' }).click();

    // Wait until we are on the dashboard — confirms login succeeded
    await adminPage.waitForURL(/dashboard/, { timeout: 30_000 });

    await adminContext.storageState({ path: 'playwright/.auth/admin.json' });
    await adminContext.close();
    console.log('✅ Admin authentication state saved');
  } catch (error) {
    console.warn('⚠️  Admin auth state save failed — tests requiring auth may fail:', error);
  }

  // ─── Save ESS User Authentication State ────────────────────────────────────

  console.log('⏳ Saving ESS user authentication state...');
  try {
    const essContext = await browser.newContext();
    const essPage    = await essContext.newPage();

    await essPage.goto(`${baseURL}/web/index.php/auth/login`);
    await essPage.getByPlaceholder('Username').fill('alice.johnson');
    await essPage.getByPlaceholder('Password').fill('Alice@1234');
    await essPage.getByRole('button', { name: 'Login' }).click();

    await essPage.waitForURL(/dashboard/, { timeout: 30_000 });

    await essContext.storageState({ path: 'playwright/.auth/ess.json' });
    await essContext.close();
    console.log('✅ ESS user authentication state saved');
  } catch (error) {
    console.warn('⚠️  ESS auth state save failed — ESS tests may fall back to UI login:', error);
    // Write empty state so Playwright does not error on missing file
    fs.writeFileSync('playwright/.auth/ess.json', JSON.stringify({ cookies: [], origins: [] }));
  }

  await browser.close();
  console.log('🚀 Global setup complete — test run starting');
}

export default globalSetup;
