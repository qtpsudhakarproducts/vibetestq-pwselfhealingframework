// data/readers.ts
// Reads test data from files on disk (CSV, JSON).
// For environment variables and runtime config, see data/config.ts
import * as fs   from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { LeavePolicy } from './types';

// ─── Test Data File Readers ──────────────────────────────────────────────────

/**
 * Reads a CSV file from disk and returns it as an array of objects.
 * Column headers become the object keys.
 *
 * Usage: const employees = readCSV('test-data/employees.csv');
 */
export function readCSV(filePath: string): Record<string, string>[] {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
}

// ─── JSON Reader ──────────────────────────────────────────────────────────────

/**
 * Reads a JSON file from disk and returns the parsed object.
 * Pass the expected shape as a type parameter.
 *
 * Usage: const policy = readJSON<LeavePolicy>('test-data/leave-policy.json');
 */
export function readJSON<T>(filePath: string): T {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`JSON file not found: ${absolutePath}`);
  }
  const content = fs.readFileSync(absolutePath, 'utf-8');
  return JSON.parse(content) as T;
}

// ─── Leave Policy Reader ──────────────────────────────────────────────────────

/**
 * Reads leave policy settings from test-data/leave-policy.json.
 * Falls back to built-in defaults when the file is not present.
 */
export function readLeavePolicy(): LeavePolicy {
  const policyPath = path.resolve('test-data/leave-policy.json');
  if (!fs.existsSync(policyPath)) {
    if (process.env.CI) {
      throw new Error(`leave-policy.json missing in CI — commit test-data/leave-policy.json to the repository`);
    }
    return {
      leaveTypes:           ['Annual Leave', 'Casual Leave', 'Medical Leave'],
      maxConsecutiveDays:   5,
      minAdvanceNoticeDays: 1,
      allowHalfDay:         true,
    };
  }
  return readJSON<LeavePolicy>(policyPath);
}
