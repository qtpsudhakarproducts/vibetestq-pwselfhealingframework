// tests/leave/apply.spec.ts
//
// Enterprise Framework Concepts demonstrated here:
//
//   1. Multi-role auth     — ESS user storageState (different from admin)
//   2. Fixture isolation   — applyLeavePage fixture uses the ESS auth context,
//                            completely separate from admin-role fixtures
//   3. Field-level assertions — assert individual form elements are present,
//                               not just the page heading
//
import { test, expect } from '../../fixtures';

test.describe('Leave — Apply (ESS User)', () => {

  // 1 & 2. ESS role auth is injected automatically by the applyLeavePage
  // fixture — the test body gets a ready-to-use page with no login code.
  test('ESS user can navigate to apply leave page',
    { tag: ['@leave', '@sanity', '@high'] },
    async ({ applyLeavePage }) => {
      await applyLeavePage.assertPageLoaded();
    }
  );

  // 3. Field-level assertions — verify the actual form inputs are rendered,
  // not just the page title. Catches regressions where the layout loads
  // but the Vue component fails to mount its form fields.
  //
  // Note: date inputs (.oxd-date-input) only appear after a Leave Type is selected
  // (OrangeHRM conditionally renders them). We assert the always-present fields:
  // the Leave Type dropdown, comment textarea, and Apply button.
  test('apply leave form renders required form fields',
    { tag: ['@leave', '@regression', '@medium'] },
    async ({ applyLeavePage, page }) => {
      const leaveTypeDropdown = page.locator('.oxd-select-text').first();
      const commentBox        = page.locator('textarea.oxd-textarea');
      const applyButton       = page.getByRole('button', { name: 'Apply' });

      await expect(leaveTypeDropdown).toBeVisible();
      await expect(commentBox).toBeVisible();
      await expect(applyButton).toBeVisible();
    }
  );

});
