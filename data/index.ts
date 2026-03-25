// data/index.ts
// Single import entry point for all data layer exports.
// Test files import from '../../data' — never from individual sub-files.

export * from './types';
export * from './generate';
export * from './readers';
export * from './config';

// ─── Test Data File Paths ─────────────────────────────────────────────────────
// Centralised path constants — if test-data/ is renamed or restructured,
// update here and nowhere else.

export const TEST_DATA = {
  employeesCsv:    'test-data/employees.csv',
  leavePolicyJson: 'test-data/leave-policy.json',
} as const;
