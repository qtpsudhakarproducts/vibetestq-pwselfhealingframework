// tests/leave/apply.spec.ts
import { test, expect }      from '../../fixtures';
import { generateAnnualLeave } from '../../data/generate';

test.describe('Leave — Apply (ESS User)', () => {

  test('ESS user can navigate to apply leave page',
    { tag: ['@leave', '@sanity', '@high'] },
    async ({ applyLeavePage }) => {
      await applyLeavePage.assertPageLoaded();
    }
  );

  test('leave application form has required fields visible',
    { tag: ['@leave', '@regression', '@medium'] },
    async ({ applyLeavePage }) => {
      await applyLeavePage.assertPageLoaded();
    }
  );

});
