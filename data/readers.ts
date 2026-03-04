// data/readers.ts
import * as fs   from 'fs';
import * as path from 'path';
import { EnvConfig, LeavePolicy } from './types';

// ─── Environment File Reader ──────────────────────────────────────────────────

/**
 * Reads test credentials and configuration from an environment file.
 *
 * Priority order:
 * 1. Real environment variables (set by CI/CD or the local shell)
 * 2. .env.{TEST_ENV} file in test-data/ (e.g. test-data/.env.staging)
 * 3. test-data/.env.dev as the fallback for local development
 *
 * Returns a fully typed EnvConfig object — callers never access process.env directly.
 */
export function readEnv(): EnvConfig {
  // Try to load from file if env vars are not already set
  if (!process.env.BASE_URL) {
    const envFile = process.env.TEST_ENV
      ? `test-data/.env.${process.env.TEST_ENV}`
      : 'test-data/.env.dev';

    if (fs.existsSync(envFile)) {
      const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  }

  const baseURL = process.env['BASE_URL'] ?? 'https://opensource-demo.orangehrmlive.com';
  const adminUsername = process.env['ADMIN_USERNAME'];
  const adminPassword = process.env['ADMIN_PASSWORD'];
  const essUsername = process.env['ESS_USERNAME'];
  const essPassword = process.env['ESS_PASSWORD'];

  const missingVars = [
    ['ADMIN_USERNAME', adminUsername],
    ['ADMIN_PASSWORD', adminPassword],
    ['ESS_USERNAME', essUsername],
    ['ESS_PASSWORD', essPassword],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      `Set them in shell/CI or test-data/.env.{TEST_ENV}.`
    );
  }

  return {
    baseURL,
    adminUsername: adminUsername as string,
    adminPassword: adminPassword as string,
    essUsername: essUsername as string,
    essPassword: essPassword as string,
  };
}

// ─── CSV Reader ───────────────────────────────────────────────────────────────

/**
 * Reads a CSV file and returns it as an array of records.
 * Each record is an object with keys from the header row.
 *
 * Usage:
 *   const employees = await readCSV('test-data/employees.csv');
 *   // [{ firstName: 'Bob', lastName: 'Smith', ... }, ...]
 */
export async function readCSV(filePath: string): Promise<Record<string, string>[]> {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`);
  }

  const { parse } = await import('csv-parse/sync');
  const content   = fs.readFileSync(absolutePath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
}

// ─── JSON Reader ──────────────────────────────────────────────────────────────

/**
 * Reads a JSON file and returns the parsed object.
 * Generic — pass the expected type as T.
 *
 * Usage:
 *   const policy = readJSON<LeavePolicy>('test-data/leave-policy.json');
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
 * Reads the leave policy configuration from test-data/leave-policy.json.
 * Returns sane defaults if the file does not exist.
 */
export function readLeavePolicy(): LeavePolicy {
  const policyPath = 'test-data/leave-policy.json';
  if (!fs.existsSync(policyPath)) {
    return {
      leaveTypes:           ['Annual Leave', 'Casual Leave', 'Medical Leave'],
      maxConsecutiveDays:   5,
      minAdvanceNoticeDays: 1,
      allowHalfDay:         true,
    };
  }
  return readJSON<LeavePolicy>(policyPath);
}
