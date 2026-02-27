// tests/leave/leave.spec.ts
import { test, expect }      from '../../fixtures';
import { generateAnnualLeave } from '../../data/generate';

test.describe('Leave — Admin View', () => {

  test('leave list page loads',
    { tag: ['@leave', '@sanity', '@medium'] },
    async ({ leaveListPage }) => {
      await leaveListPage.assertPageLoaded();
    }
  );

});
