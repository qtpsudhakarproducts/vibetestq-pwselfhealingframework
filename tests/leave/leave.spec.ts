// tests/leave/leave.spec.ts
//
// Enterprise Framework Concepts demonstrated here:
//
//   1. File-based test data (JSON) — readLeavePolicy() loads config from
//                                    test-data/leave-policy.json at runtime
//   2. Config-driven assertions    — test behaviour is controlled by external
//                                    data, not hard-coded values
//   3. Admin role access           — admin storageState injected by fixture
//
import { test, expect }   from '../../fixtures';
import { readLeavePolicy } from '../../data/readers';

// ─── 1 & 2. JSON File-Based Test Data + Config-Driven Assertions ─────────────
// The leave policy (max days, types, etc.) is externalized to a JSON file.
// Tests read that config and assert against its values — changing the policy
// file is all that's needed when business rules change; no test code edits.

test('JSON: leave-policy.json is readable and contains expected structure',
  { tag: ['@leave', '@data', '@sanity'] },
  async () => {
    const policy = readLeavePolicy();

    expect(policy).toBeDefined();
    // Verify every field the application depends on is present and valid
    expect(Array.isArray(policy.leaveTypes)).toBe(true);
    expect(policy.leaveTypes.length).toBeGreaterThan(0);
    expect(typeof policy.maxConsecutiveDays).toBe('number');
    expect(policy.maxConsecutiveDays).toBeGreaterThan(0);
    expect(typeof policy.minAdvanceNoticeDays).toBe('number');
  }
);

// ─── 3. Admin Role Access via Fixture ────────────────────────────────────────

test.describe('Leave — Admin View', () => {

  test('leave list page loads for admin user',
    { tag: ['@leave', '@sanity', '@medium'] },
    async ({ leaveListPage }) => {
      await leaveListPage.assertPageLoaded();
    }
  );

});
