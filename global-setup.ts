// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { readEnv } from './data/config';
import { LoginPage } from './pages/LoginPage';

async function globalSetup(config: FullConfig): Promise<void> {
  // Credentials are required only for auth setup — skip gracefully during IDE
  // test discovery (e.g. VS Code extension running --list without env vars set).
  let env: ReturnType<typeof readEnv>;
  try {
    env = readEnv();
  } catch {
    console.warn('⚠️  Auth credentials not set — skipping global setup (test discovery mode).');
    return;
  }

  const baseURL = config.projects[0]?.use?.baseURL;
  if (typeof baseURL !== 'string' || baseURL.trim() === '') {
    throw new Error('Playwright baseURL must be configured in playwright.config.ts use.baseURL');
  }

  // Ensure .auth directory exists
  const authDir = path.join('playwright', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();

  const saveAuthState = async (
    username: string,
    password: string,
    storagePath: string,
    label: string
  ): Promise<void> => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(username, password);
    await page.waitForURL(/dashboard/, { timeout: 30_000 });

    await context.storageState({ path: storagePath });
    await context.close();
    console.log(`✅ ${label} authentication state saved`);
  };

  // ─── Save Admin Authentication State ───────────────────────────────────────

  console.log('⏳ Saving Admin authentication state...');
  try {
    await saveAuthState(
      env.adminUsername,
      env.adminPassword,
      'playwright/.auth/admin.json',
      'Admin'
    );
  } catch (error) {
    console.warn('⚠️  Admin auth state save failed — tests requiring auth may fail:', error);
  }

  // ─── Save ESS User Authentication State ────────────────────────────────────

  console.log('⏳ Saving ESS user authentication state...');
  try {
    await saveAuthState(
      env.essUsername,
      env.essPassword,
      'playwright/.auth/ess.json',
      'ESS user'
    );
  } catch (error) {
    console.warn('⚠️  ESS auth state save failed — ESS tests may fall back to UI login:', error);
    // Write empty state so Playwright does not error on missing file
    fs.writeFileSync('playwright/.auth/ess.json', JSON.stringify({ cookies: [], origins: [] }));
  }

  await browser.close();
  console.log('🚀 Global setup complete — test run starting');
}

export default globalSetup;
