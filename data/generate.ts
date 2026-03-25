// data/generate.ts
import { faker }       from '@faker-js/faker';
import { DateHelpers } from '../helpers/DateHelpers';
import {
  EmployeeData,
  UserData,
  LeaveData,
  PasswordPolicy,
} from './types';

// ─── Password Policy ──────────────────────────────────────────────────────────
// OrangeHRM password requirements — defined once, referenced everywhere.
// Update this when the application's password policy changes.

export const PASSWORD_POLICY: PasswordPolicy = {
  minLength:        8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber:    true,
  requireSpecial:   true,
  specialChars:     '@#$%^&*!',
};

// ─── Password Generator ───────────────────────────────────────────────────────

function generateCompliantPassword(): string {
  // Builds a password that satisfies OrangeHRM's policy requirements
  const upper   = faker.string.alpha({ length: 2, casing: 'upper' });
  const lower   = faker.string.alpha({ length: 2, casing: 'lower' });
  const number  = faker.string.numeric(2);
  const special = faker.helpers.arrayElement(
    PASSWORD_POLICY.specialChars.split('')
  );
  const extra   = faker.string.alphanumeric(3);

  // Shuffle the combined string to avoid predictable patterns
  const combined = (upper + lower + number + special + extra).split('');
  for (let i = combined.length - 1; i > 0; i--) {
    const j         = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join('');
}

// ─── Employee Generator ───────────────────────────────────────────────────────

/**
 * Generates a unique employee record for a single test run.
 * Uses Faker to produce realistic names — different every run to avoid
 * collisions on the shared OrangeHRM demo site.
 *
 * Overrides: pass any fields you need to control (e.g. specific firstName for a UI assertion).
 */
export function generateEmployee(overrides?: Partial<EmployeeData>): EmployeeData {
  const firstName = overrides?.firstName ?? faker.person.firstName();
  const lastName  = overrides?.lastName  ?? faker.person.lastName();
  const suffix    = faker.string.alphanumeric(4).toUpperCase();

  return {
    firstName,
    lastName,
    employeeId:  overrides?.employeeId  ?? `EMP-${suffix}`,
    gender:      overrides?.gender      ?? faker.helpers.arrayElement(['Male', 'Female'] as const),
    nationality: overrides?.nationality ?? 'American',
    dob:         overrides?.dob         ?? DateHelpers.randomAdultDOB(),
  };
}

// ─── User Generator ───────────────────────────────────────────────────────────

/**
 * Generates a unique system user linked to an existing employee.
 * Pass the EmployeeData returned by generateEmployee() — the fullName is
 * derived automatically, preventing mismatches with uninitialized string values.
 */
export function generateUser(
  employee: EmployeeData,
  overrides?: Partial<UserData>
): UserData {
  const suffix = faker.string.alphanumeric(6).toLowerCase();

  return {
    role:         overrides?.role         ?? 'ESS',
    employeeName: overrides?.employeeName ?? `${employee.firstName} ${employee.lastName}`,
    status:       overrides?.status       ?? 'Enabled',
    username:     overrides?.username     ?? `user.${suffix}`,
    password:     overrides?.password     ?? generateCompliantPassword(),
  };
}

// ─── Leave Generator ──────────────────────────────────────────────────────────

/**
 * Generates a leave application for Annual Leave.
 * Dates are always in the future — 3 days from now for 2 days.
 */
export function generateAnnualLeave(overrides?: Partial<LeaveData>): LeaveData {
  return {
    leaveType: overrides?.leaveType ?? 'Annual Leave',
    fromDate:  overrides?.fromDate  ?? DateHelpers.daysFromToday(3),
    toDate:    overrides?.toDate    ?? DateHelpers.daysFromToday(4),
    comment:   overrides?.comment   ?? `Test leave — ${faker.lorem.sentence()}`,
  };
}

/**
 * Generates a leave application for Casual Leave.
 */
export function generateCasualLeave(overrides?: Partial<LeaveData>): LeaveData {
  return {
    leaveType: overrides?.leaveType ?? 'Casual Leave',
    fromDate:  overrides?.fromDate  ?? DateHelpers.daysFromToday(5),
    toDate:    overrides?.toDate    ?? DateHelpers.daysFromToday(5),
    comment:   overrides?.comment   ?? `Casual leave — ${faker.lorem.sentence()}`,
  };
}
