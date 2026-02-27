# Level 6 — Test Data Management
### Playwright · TypeScript · OrangeHRM Demo Application

> **Prerequisites:** Levels 1–5 must be complete. You should have a working helper layer, fixtures, and passing tests across all three modules.
> **What you will have by the end:** A test data layer with three files — `types.ts`, `generate.ts`, and `readers.ts`. Hardcoded test data disappears from every test file. Generators produce unique realistic data per run. Readers load data from CSV, JSON, Excel, and environment files.
> **What changes:** Test files and three page object method signatures. All hardcoded data objects are replaced with generator and reader calls. Page object composite methods (`addEmployee`, `addUser`, `applyForLeave`) are updated to accept data objects directly instead of individual parameters.
> **Next level:** Level 7 introduces custom reporting and test organisation — tagging tests by module and severity, structuring runs for different audiences.

---

## 📋 Table of Contents

- [Part 1 — The Problem Level 4 Left Behind](#part-1--the-problem-level-4-left-behind)
- [Part 2 — The Design](#part-2--the-design)
- [Part 3 — Project Structure at Level 6](#part-3--project-structure-at-level-6)
- [Part 4 — Installing Dependencies](#part-4--installing-dependencies)
- [Part 5 — types.ts](#part-5--typests)
- [Part 6 — generate.ts](#part-6--generatets)
- [Part 7 — readers.ts](#part-7--readersts)
- [Part 8 — Sample Data Files](#part-8--sample-data-files)
- [Part 9 — Updating Page Object Method Signatures](#part-9--updating-page-object-method-signatures)
- [Part 10 — Updating Tests to Use the Data Layer](#part-10--updating-tests-to-use-the-data-layer)
- [Part 11 — What Level 6 Does Not Solve](#part-11--what-level-6-does-not-solve)

---

## Part 1 — The Problem Level 4 Left Behind

Open any test file from Level 4. Every one has hardcoded data sitting at the top:

```typescript
// tests/pim/employee.spec.ts
const newEmployee = {
  firstName:  'Bob',
  lastName:   'Williams',
  employeeId: 'EMP-L3-001',
  fullName:   'Bob Williams',
};
```

```typescript
// tests/admin/user.spec.ts
const newUser = {
  role:         'ESS',
  employeeName: 'Alice Johnson',
  status:       'Enabled',
  username:     'alice.johnson2',
  password:     'Alice@1234',
};
```

This creates three problems:

**Data conflicts on the shared demo site** — two developers running tests simultaneously both try to create `alice.johnson2`. One succeeds. The other fails for the wrong reason. Hardcoded names guarantee collisions on a shared environment.

**Brittle cross-file dependencies** — `user.spec.ts` hardcodes `employeeName: 'Alice Johnson'` expecting that `employee.spec.ts` already created that exact employee. One name change breaks the other silently.

**Scattered maintenance** — when OrangeHRM's password policy changes you hunt through every test file. Miss one and it fails at runtime.

---

## Part 2 — The Design

Test data has exactly two sources. The solution matches the source.

**Generation** — data that must be unique per run. Employee names, usernames, IDs — anything created in the application. Use Faker to produce realistic, random data. Each run produces different values — no collisions.

**Reading** — data that lives in files. Large datasets for data-driven tests, environment credentials, shared configuration. A dedicated reader function per file.

The entire data layer is three files:

| File | Responsibility |
|------|---------------|
| `data/types.ts` | Type definitions for all data shapes |
| `data/generate.ts` | All generator functions — one per scenario |
| `data/readers.ts` | All file reader functions — one per file |

**No generics.** Every function has a specific name, a specific purpose, and a specific return type. A test author reads the function name and knows exactly what they get — no type parameters, no annotations to write.

**No sub-folders.** Three files, one import path. The data layer is small enough to stay flat.

**Specific function names.** `generateAnnualLeave()` not `generateLeave({ leaveType: 'Annual Leave' })`. The scenario is encoded in the name. OrangeHRM constraints are enforced internally. Test authors never think about password rules, date formats, or ID structure.

---

## Part 3 — Project Structure at Level 6

```
orangehrm-automation/
│
├── data/                               ← NEW — entire test data layer
│   ├── types.ts                        ← all type definitions
│   ├── generate.ts                     ← all generator functions
│   └── readers.ts                      ← all file reader functions
│
├── test-data/                          ← NEW — file-based test data
│   ├── employees.csv
│   ├── leave-policy.json
│   ├── bulk-import.xlsx
│   ├── .env.dev
│   └── .env.staging
│
├── helpers/                            ← no changes
├── pages/                              ← no changes
├── fixtures/                           ← no changes
│
├── tests/                              ← updated — hardcoded data replaced
│   ├── login.spec.ts
│   ├── pim/employee.spec.ts
│   ├── admin/user.spec.ts
│   └── leave/leave.spec.ts
│
├── global-setup.ts                     ← updated — credentials from readEnv()
└── playwright.config.ts                ← no changes
```

### Add `test-data/.env.*` to `.gitignore`

Environment files contain credentials — never commit them:

```
# .gitignore
test-data/.env.*
playwright/.auth/
```

CSV, JSON, and Excel files can be committed — they contain test data, not secrets.

---

## Part 4 — Installing Dependencies

```bash
# Faker — realistic data generation
npm install --save-dev @faker-js/faker

# csv-parse — CSV file reading
npm install --save-dev csv-parse

# xlsx — Excel file reading
npm install --save-dev xlsx
```

### Faker Seeding

By default Faker generates different data every run — which is what we want to avoid collisions. When a test fails and you need to reproduce it with the same data, seed Faker with the run's seed value:

```bash
# Reproduce a specific run
FAKER_SEED=12345 npx playwright test

# Random run — different data every time (default)
npx playwright test
```

The seed is logged by `global-setup.ts` so every run records what seed it used.

---

## Part 5 — types.ts

All type definitions in one place. Every generator and reader returns one of these types. TypeScript enforces that test files, generators, readers, and page objects all agree on the data structure.

```typescript
// data/types.ts

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface EmployeeData {
  firstName:   string;
  lastName:    string;
  fullName:    string;    // computed: `${firstName} ${lastName}`
  employeeId:  string;
  gender:      'Male' | 'Female';
  nationality: string;
  dob:         string;    // OrangeHRM format: yyyy-dd-mm
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserData {
  role:         'Admin' | 'ESS';
  employeeName: string;   // must match an existing employee fullName in OrangeHRM
  status:       'Enabled' | 'Disabled';
  username:     string;
  password:     string;
}

// ─── Leave ────────────────────────────────────────────────────────────────────

export interface LeaveData {
  leaveType: string;
  fromDate:  string;   // OrangeHRM format: yyyy-dd-mm
  toDate:    string;   // OrangeHRM format: yyyy-dd-mm
  comment:   string;
}

// ─── Environment Config ───────────────────────────────────────────────────────

export interface EnvConfig {
  baseURL:       string;
  adminUsername: string;
  adminPassword: string;
  essUsername:   string;
  essPassword:   string;
}

// ─── Leave Policy ─────────────────────────────────────────────────────────────

export interface LeavePolicy {
  leaveTypes:           string[];
  maxConsecutiveDays:   number;
  minAdvanceNoticeDays: number;
  allowHalfDay:         boolean;
}

// ─── Password Policy ──────────────────────────────────────────────────────────

export interface PasswordPolicy {
  minLength:        number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber:    boolean;
  requireSpecial:   boolean;
  specialChars:     string;
}
```

---

## Part 6 — generate.ts

Four functions. One per entity. Optional overrides for the rare test that needs a specific value. Everything else is random and unique — Faker handles it.

```typescript
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
  specialChars:     '!@#$%^&*',
};

// ─── Password ─────────────────────────────────────────────────────────────────

// Generates a password that satisfies OrangeHRM's policy.
// Structure: Uppercase letter + lowercase word + number + special char
// Example output: 'Brave42wolf!'
export function generatePassword(): string {
  const upper   = faker.string.alpha({ length: 1, casing: 'upper' });
  const lower   = faker.word.noun().toLowerCase().slice(0, 6).padEnd(4, 'x');
  const number  = faker.number.int({ min: 10, max: 99 });
  const special = faker.helpers.arrayElement(PASSWORD_POLICY.specialChars.split(''));
  return `${upper}${lower}${number}${special}`;
}

// ─── Employee ─────────────────────────────────────────────────────────────────

// Generates a unique employee record with random data.
// Pass overrides for any field your test specifically cares about —
// everything else stays random.
//
// Usage:
//   const employee = generateEmployee();
//   const employee = generateEmployee({ nationality: 'Indian' });
//   const employee = generateEmployee({ gender: 'Female' });
export function generateEmployee(overrides?: Partial<EmployeeData>): EmployeeData {
  const firstName = overrides?.firstName ?? faker.person.firstName();
  const lastName  = overrides?.lastName  ?? faker.person.lastName();
  const dobDate   = faker.date.birthdate({ min: 22, max: 55, mode: 'age' });

  return {
    firstName,
    lastName,
    fullName:    `${firstName} ${lastName}`,
    employeeId:  `EMP-${faker.string.alphanumeric(8).toUpperCase()}`,
    gender:      faker.helpers.arrayElement(['Male', 'Female'] as const),
    nationality: faker.location.country(),
    dob:         DateHelpers.formatToOrangeHRM(dobDate),
    ...overrides,
    // Recompute fullName after spread in case firstName or lastName was overridden
    fullName:    `${overrides?.firstName ?? firstName} ${overrides?.lastName ?? lastName}`,
  };
}

// ─── User ─────────────────────────────────────────────────────────────────────

// Generates a unique system user linked to an employee.
// employeeName defaults to the given employee's fullName.
// Pass overrides for any field your test specifically cares about.
//
// Usage:
//   const user = generateUser(employee);
//   const user = generateUser(employee, { role: 'Admin' });
//   const user = generateUser(employee, { status: 'Disabled' });
export function generateUser(employee: EmployeeData, overrides?: Partial<UserData>): UserData {
  const username =
    `${employee.firstName.toLowerCase()}.${employee.lastName.toLowerCase()}`
      .replace(/[^a-z.]/g, '')
    + `.${faker.number.int({ min: 1000, max: 9999 })}`;

  return {
    role:         'ESS',
    employeeName: employee.fullName,
    status:       'Enabled',
    username,
    password:     generatePassword(),
    ...overrides,
  };
}

// ─── Leave ────────────────────────────────────────────────────────────────────

// OrangeHRM leave types available on the demo site.
// Exported so tests can validate against this list.
export const LEAVE_TYPES = [
  'Annual Leave',
  'Casual Leave',
  'Maternity Leave',
  'Personal Leave',
  'Sick Leave',
] as const;

// Generates a leave application with random future dates.
// Dates are always in the future — applying for past leave causes validation errors.
// Pass overrides for any field your test specifically cares about.
//
// Usage:
//   const leave = generateLeave();
//   const leave = generateLeave({ leaveType: 'Sick Leave' });
//   const leave = generateLeave({ leaveType: 'Annual Leave', comment: 'Planned holiday' });
export function generateLeave(overrides?: Partial<LeaveData>): LeaveData {
  // Pick a future start date — minimum 7 days ahead, maximum 60 days ahead
  const fromDate = faker.date.soon({ days: 60 });
  fromDate.setDate(fromDate.getDate() + 7);

  // End date is same day by default — override for multi-day leave
  const toDate = new Date(fromDate);

  return {
    leaveType: faker.helpers.arrayElement(LEAVE_TYPES),
    fromDate:  DateHelpers.formatToOrangeHRM(fromDate),
    toDate:    DateHelpers.formatToOrangeHRM(toDate),
    comment:   faker.lorem.sentence(),
    ...overrides,
  };
}
```

---

### How overrides work in practice

Most tests need nothing specific — the defaults are fine:

```typescript
const employee = generateEmployee();
const user     = generateUser(employee);
const leave    = generateLeave();
```

A test that cares about one specific field overrides only that field:

```typescript
// Gender matters for this test
const employee = generateEmployee({ gender: 'Female' });

// Role matters for this test
const user = generateUser(employee, { role: 'Admin' });

// Leave type matters for this test
const leave = generateLeave({ leaveType: 'Sick Leave' });

// Duration matters — override both dates
const leave = generateLeave({
  leaveType: 'Annual Leave',
  fromDate:  DateHelpers.fromISO('2025-12-01'),
  toDate:    DateHelpers.fromISO('2025-12-05'),
});
```

Everything not mentioned stays random and unique. The test communicates exactly what it cares about — no more, no less.

---

## Part 7 — readers.ts

All file reader functions in one file. Each function has a specific name and returns a specific type — no generics, no type parameters. The implementation handles file resolution, parsing, and validation internally. Errors are descriptive — they tell you exactly what is missing and where to put it.

```typescript
// data/readers.ts
import * as fs   from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { EmployeeData, LeavePolicy, EnvConfig } from './types';

// Resolves a path relative to the project root.
function resolvePath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}

// Asserts a file exists — throws a clear error if it does not.
function assertFileExists(filePath: string, callerName: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `${callerName}: file not found at "${filePath}".\n` +
      `Ensure the file exists relative to the project root.`
    );
  }
}

// ─── CSV Readers ──────────────────────────────────────────────────────────────

// Reads employees.csv and returns an array of EmployeeData records.
// CSV columns required: firstName, lastName, employeeId, gender, nationality.
// Used in data-driven tests that create multiple employees from a file.
//
// Usage:
//   const employees = readEmployees();
//   for (const emp of employees) { ... }
export function readEmployees(): EmployeeData[] {
  const filePath = resolvePath('test-data/employees.csv');
  assertFileExists(filePath, 'readEmployees');

  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parse(content, {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
  }) as Array<{
    firstName:   string;
    lastName:    string;
    employeeId:  string;
    gender:      'Male' | 'Female';
    nationality: string;
  }>;

  return rows.map(row => ({
    ...row,
    fullName: `${row.firstName} ${row.lastName}`,
    dob:      '1990-15-06',   // CSV does not include dob — use default
  }));
}

// ─── Excel Readers ────────────────────────────────────────────────────────────

// Reads the Employees sheet from bulk-import.xlsx.
// Used for bulk employee creation and import testing.
// Sheet must have columns: firstName, lastName, employeeId, gender, nationality.
//
// Usage:
//   const dataset = readBulkEmployees();
export function readBulkEmployees(): EmployeeData[] {
  const filePath = resolvePath('test-data/bulk-import.xlsx');
  assertFileExists(filePath, 'readBulkEmployees');

  const workbook = XLSX.readFile(filePath);
  const sheet    = workbook.Sheets['Employees'];

  if (!sheet) {
    throw new Error(
      `readBulkEmployees: sheet "Employees" not found in bulk-import.xlsx.\n` +
      `Available sheets: ${workbook.SheetNames.join(', ')}`
    );
  }

  const rows = XLSX.utils.sheet_to_json<{
    firstName:   string;
    lastName:    string;
    employeeId:  string;
    gender:      'Male' | 'Female';
    nationality: string;
  }>(sheet, { defval: '' });

  return rows.map(row => ({
    ...row,
    fullName: `${row.firstName} ${row.lastName}`,
    dob:      '1990-15-06',
  }));
}

// ─── JSON Readers ─────────────────────────────────────────────────────────────

// Reads leave-policy.json and returns the leave policy configuration.
// Used in tests that verify leave type availability, maximum duration,
// and advance notice requirements.
//
// Usage:
//   const policy = readLeavePolicy();
//   expect(policy.leaveTypes).toContain('Annual Leave');
export function readLeavePolicy(): LeavePolicy {
  const filePath = resolvePath('test-data/leave-policy.json');
  assertFileExists(filePath, 'readLeavePolicy');

  const content = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(content) as LeavePolicy;
  } catch (error) {
    throw new Error(
      `readLeavePolicy: failed to parse leave-policy.json.\n` +
      `Cause: ${(error as Error).message}`
    );
  }
}

// ─── Environment Reader ───────────────────────────────────────────────────────

// Returns environment configuration for the current test run.
// Reads from test-data/.env.{TEST_ENV} — defaults to test-data/.env.dev.
// Throws immediately if any required variable is missing.
//
// Usage:
//   const env = readEnv();
//   await page.goto(env.baseURL);
//
// Switch environments:
//   TEST_ENV=staging npx playwright test
export function readEnv(): EnvConfig {
  const environment = process.env.TEST_ENV ?? 'dev';
  const filePath    = resolvePath(`test-data/.env.${environment}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `readEnv: environment file not found: "${filePath}".\n` +
      `Set TEST_ENV to a valid environment name (dev, staging) ` +
      `and ensure test-data/.env.${environment} exists.`
    );
  }

  const content  = fs.readFileSync(filePath, 'utf-8');
  const parsed   = parseEnvFile(content);
  const required = ['BASE_URL', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ESS_USERNAME', 'ESS_PASSWORD'];
  const missing  = required.filter(key => !parsed[key]);

  if (missing.length > 0) {
    throw new Error(
      `readEnv: missing required variables in ".env.${environment}": ${missing.join(', ')}`
    );
  }

  return {
    baseURL:       parsed['BASE_URL'],
    adminUsername: parsed['ADMIN_USERNAME'],
    adminPassword: parsed['ADMIN_PASSWORD'],
    essUsername:   parsed['ESS_USERNAME'],
    essPassword:   parsed['ESS_PASSWORD'],
  };
}

// Parses a .env file into a key-value map.
// Skips blank lines and lines starting with #.
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key) result[key.trim()] = valueParts.join('=').trim();
  }
  return result;
}
```

---

## Part 8 — Sample Data Files

### test-data/employees.csv

```csv
firstName,lastName,employeeId,gender,nationality
Sarah,Mitchell,EMP-FILE-001,Female,American
James,Okafor,EMP-FILE-002,Male,Nigerian
Mei,Zhang,EMP-FILE-003,Female,Chinese
Carlos,Rivera,EMP-FILE-004,Male,Mexican
Priya,Sharma,EMP-FILE-005,Female,Indian
```

### test-data/leave-policy.json

```json
{
  "leaveTypes": [
    "Annual Leave",
    "Casual Leave",
    "Maternity Leave",
    "Personal Leave",
    "Sick Leave"
  ],
  "maxConsecutiveDays": 14,
  "minAdvanceNoticeDays": 1,
  "allowHalfDay": true
}
```

### test-data/.env.dev

```
BASE_URL=https://opensource-demo.orangehrmlive.com
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=admin123
ESS_USERNAME=alice.johnson
ESS_PASSWORD=Alice@1234
```

### test-data/.env.staging

```
BASE_URL=https://staging.orangehrmlive.com
ADMIN_USERNAME=staging.admin
ADMIN_PASSWORD=Staging@SecurePass1
ESS_USERNAME=staging.ess
ESS_PASSWORD=Staging@EssPass1
```

---

## Part 9 — Updating Page Object Method Signatures

Now that `EmployeeData`, `UserData`, and `LeaveData` exist as proper types, the page object composite methods should accept the data object directly rather than individual fields.

This is a small change in each page object — only the composite `add*` and `applyForLeave` methods change. All other methods remain the same.

### Why this matters

**Before** — method takes five individual parameters. Adding one new field requires updating the signature, every call site, and every test:

```typescript
// Old signature — AddUserPage.ts
async addUser(
  role: 'Admin' | 'ESS',
  employeeName: string,
  status: 'Enabled' | 'Disabled',
  username: string,
  password: string
): Promise<void>

// Old call site — verbose, fragile
await addUserPage.addUser(
  user.role,
  user.employeeName,
  user.status,
  user.username,
  user.password
);
```

**After** — method takes the typed data object. Adding a new field to `UserData` requires no changes to the method signature or call sites:

```typescript
// New signature — AddUserPage.ts
async addUser(user: UserData): Promise<void>

// New call site — clean, self-documenting
await addUserPage.addUser(user);
```

### Updated AddEmployeePage.ts — composite method

Import `EmployeeData` from the data layer and update `addEmployee`:

```typescript
// pages/pim/AddEmployeePage.ts — updated method signature
import { EmployeeData } from '../../data/types';

// Replaces: addEmployee(firstName: string, lastName: string, employeeId: string)
async addEmployee(employee: EmployeeData): Promise<void> {
  await this.fillFirstName(employee.firstName);
  await this.fillLastName(employee.lastName);
  await this.fillEmployeeId(employee.employeeId);
  await this.saveEmployee();
}
```

### Updated AddUserPage.ts — composite method

```typescript
// pages/admin/AddUserPage.ts — updated method signature
import { UserData } from '../../data/types';

// Replaces: addUser(role, employeeName, status, username, password)
async addUser(user: UserData): Promise<void> {
  await this.selectUserRole(user.role);
  await this.fillEmployeeName(user.employeeName);
  await this.selectStatus(user.status);
  await this.fillUsername(user.username);
  await this.fillPassword(user.password);
  await this.fillConfirmPassword(user.password);
  await this.saveUser();
}
```

### Updated ApplyLeavePage.ts — composite method

```typescript
// pages/leave/ApplyLeavePage.ts — updated method signature
import { LeaveData } from '../../data/types';

// Replaces: applyForLeave(leaveType, fromDate, toDate, comment?)
async applyForLeave(leave: LeaveData): Promise<void> {
  await this.selectLeaveType(leave.leaveType);
  await this.fillFromDate(leave.fromDate);
  await this.fillToDate(leave.toDate);
  if (leave.comment) await this.fillComment(leave.comment);
  await this.submitLeaveApplication();
}
```

---

## Part 10 — Updating Tests to Use the Data Layer

### global-setup.ts — Updated

Credentials now come from `readEnv()`. The Faker seed is logged so failing runs can be reproduced.

```typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';
import { faker }                from '@faker-js/faker';
import { readEnv }              from './data/readers';

async function globalSetup(config: FullConfig): Promise<void> {
  const env = readEnv();

  // Log seed — reproduce a failing run with FAKER_SEED=<logged value>
  if (process.env.FAKER_SEED) {
    faker.seed(Number(process.env.FAKER_SEED));
    console.log(`🌱 Faker seed: ${process.env.FAKER_SEED} (reproducible run)`);
  } else {
    console.log(`🌱 Faker seed: none (random run)`);
  }

  const browser = await chromium.launch();

  // ─── Admin Auth State ─────────────────────────────────────────────────────────

  const adminContext = await browser.newContext();
  const adminPage    = await adminContext.newPage();

  await adminPage.goto(`${env.baseURL}/web/index.php/auth/login`);
  await adminPage.getByPlaceholder('Username').fill(env.adminUsername);
  await adminPage.getByPlaceholder('Password').fill(env.adminPassword);
  await adminPage.getByRole('button', { name: 'Login' }).click();
  await adminPage.waitForURL(/dashboard/);

  await adminContext.storageState({ path: 'playwright/.auth/admin.json' });
  await adminContext.close();
  console.log('✅ Admin authentication state saved');

  // ─── ESS Auth State ───────────────────────────────────────────────────────────

  const essContext = await browser.newContext();
  const essPage    = await essContext.newPage();

  await essPage.goto(`${env.baseURL}/web/index.php/auth/login`);
  await essPage.getByPlaceholder('Username').fill(env.essUsername);
  await essPage.getByPlaceholder('Password').fill(env.essPassword);
  await essPage.getByRole('button', { name: 'Login' }).click();
  await essPage.waitForURL(/dashboard/);

  await essContext.storageState({ path: 'playwright/.auth/ess.json' });
  await essContext.close();
  console.log('✅ ESS authentication state saved');

  await browser.close();
}

export default globalSetup;
```

---

### tests/pim/employee.spec.ts — Updated

PIM tests test the UI creation flow — they still create employees via the UI. Each test is self-contained: it generates its own data, creates what it needs, and does not share state with other tests.

```typescript
// tests/pim/employee.spec.ts
import { test, expect }     from '../../fixtures';
import { generateEmployee } from '../../data/generate';

test.describe('PIM — Employee Management', () => {

  test('admin can add a new employee via UI', async ({ addEmployeePage, employeeListPage }) => {
    // Each test generates its own unique data — no module-level shared state
    const employee = generateEmployee();

    await addEmployeePage.addEmployee(employee);
    await addEmployeePage.assertEmployeeSavedSuccessfully();
    await addEmployeePage.assertRedirectedToPersonalDetails();

    // Verify it appears in the list within the same test
    await employeeListPage.goto();
    await employeeListPage.searchByEmployeeName(employee.firstName);
    await employeeListPage.assertEmployeeExistsInList(employee.fullName);
  });

  test('search with non-existent name shows no records found', async ({ employeeListPage }) => {
    const phantom = generateEmployee();
    await employeeListPage.searchByEmployeeName(phantom.firstName + phantom.employeeId);
    await employeeListPage.assertNoRecordsFound();
  });

});
```

---

### tests/admin/user.spec.ts — Updated

Level 5 solved the dependency problem. The employee is now created via API in `beforeAll` — no dependency on `employee.spec.ts` having run. The data generators from Level 6 produce the employee and user data. The test body receives fully typed objects and passes them directly to page object methods.

```typescript
// tests/admin/user.spec.ts
import { test, expect }                from '../../fixtures';
import { generateEmployee, generateUser } from '../../data/generate';

test.describe('Admin — User Management', () => {

  let empNumber: string;
  let employee:  ReturnType<typeof generateEmployee>;
  let user:      ReturnType<typeof generateUser>;

  // Employee created via API — independent of employee.spec.ts
  // generateEmployee() produces unique, realistic data for this run
  test.beforeAll(async ({ employeeApi }) => {
    employee  = generateEmployee();
    empNumber = await employeeApi.create(employee);
    user      = generateUser(employee);
  });

  test.afterAll(async ({ employeeApi }) => {
    if (empNumber) await employeeApi.delete(empNumber);
  });

  test('admin can add a new system user', async ({ userManagementPage, addUserPage }) => {
    await userManagementPage.clickAddUser();
    await addUserPage.assertPageLoaded();
    await addUserPage.addUser(user);
    await addUserPage.assertUserSavedSuccessfully();
  });

  test('newly created user appears in user management list', async ({ userManagementPage }) => {
    await userManagementPage.searchByUsername(user.username);
    await userManagementPage.assertUserExistsInList(user.username);
  });

  test('search with non-existent username shows no records found', async ({ userManagementPage }) => {
    // generateUser generates a unique username — appending NOTEXIST ensures it is absent
    const phantom = generateUser(generateEmployee());
    await userManagementPage.searchByUsername(phantom.username + 'NOTEXIST');
    await userManagementPage.assertNoRecordsFound();
  });

});
```

---

### tests/leave/leave.spec.ts — Updated

The apply and approve workflows are split into independent describe blocks. The ESS apply test is self-contained — it generates its own leave data and submits it. The admin approval block uses API setup to create the leave request precondition — it does not depend on the apply test having run.

```typescript
// tests/leave/leave.spec.ts
import { test, expect }                from '../../fixtures';
import { generateEmployee, generateLeave } from '../../data/generate';
import { readLeavePolicy, readEmployees }  from '../../data/readers';

// Leave policy loaded once — used for policy validation tests
const policy = readLeavePolicy();

// ─── Apply Workflow ───────────────────────────────────────────────────────────

test.describe('Leave — Apply Workflow (ESS)', () => {

  test('ESS user can submit a leave application', async ({ applyLeavePage }) => {
    // Each test generates its own leave data — unique dates every run
    const leave = generateLeave();
    await applyLeavePage.applyForLeave(leave);
    await applyLeavePage.assertLeaveApplicationSubmitted();
  });

  test('generated leave type is valid according to policy', () => {
    const leave = generateLeave();
    // Policy-driven assertion — leave types come from the file, not hardcoded
    expect(policy.leaveTypes).toContain(leave.leaveType);
  });

});

// ─── Approve Workflow ─────────────────────────────────────────────────────────

test.describe('Leave — Approve Workflow (Admin)', () => {

  let empNumber: string;
  let leaveId:   number;

  // Create employee and leave request via API — independent of the apply test
  // generateEmployee() and generateLeave() produce unique data for this run
  test.beforeAll(async ({ employeeApi, leaveApi }) => {
    const employee = generateEmployee();
    empNumber      = await employeeApi.create(employee);
    const leave    = generateLeave();
    leaveId        = await leaveApi.createRequest(leave, empNumber);
  });

  test.afterAll(async ({ employeeApi }) => {
    if (empNumber) await employeeApi.delete(empNumber);
  });

  test('admin can see pending leave request in leave list', async ({ leaveListPage }) => {
    await leaveListPage.assertLeaveRequestVisible('Alice Johnson');
    await leaveListPage.assertLeaveRequestStatus('Alice Johnson', 'Pending');
  });

  test('admin can approve a leave request', async ({ leaveListPage }) => {
    await leaveListPage.approveLeaveRequest('Alice Johnson');
    await leaveListPage.assertLeaveApproved();
  });

});

// ─── Data-Driven Test ─────────────────────────────────────────────────────────
// Reads employee rows from CSV — same test logic, different data, no duplication.

const employeeDataset = readEmployees();

test.describe('PIM — Data-Driven Employee Creation', () => {

  for (const emp of employeeDataset) {
    test(`can add employee: ${emp.firstName} ${emp.lastName}`, async ({ addEmployeePage }) => {
      await addEmployeePage.addEmployee(emp);
      await addEmployeePage.assertEmployeeSavedSuccessfully();
    });
  }

});
```

---

## Part 11 — What Level 6 Does Not Solve

### Test results are hard to interpret at scale

With six levels of framework behind you, the test suite is growing. When 80 tests run in CI and 12 fail, you need to answer quickly: are these all in the same module? Are they all critical path tests? Is this a regression or a known flaky test?

Right now all tests look the same — no tags, no grouping by severity, no way to run just the smoke suite without manually listing test files.

**Level 7** introduces test organisation — tagging by module, type, and severity, structured runs for different purposes, and reports shaped for different audiences.

---

> **You are ready for Level 7** when your data layer is working and test results are growing harder to interpret at scale — too many tests, no clear grouping, no way to run just the smoke suite.

---

### Quick Reference — What Changed at Level 6

| File | Change |
|------|--------|
| `data/types.ts` | Created — all type definitions |
| `data/generate.ts` | Created — all generator functions using Faker |
| `data/readers.ts` | Created — all file reader functions |
| `test-data/employees.csv` | Created — sample CSV dataset |
| `test-data/leave-policy.json` | Created — leave policy configuration |
| `test-data/.env.dev` | Created — dev environment credentials |
| `test-data/.env.staging` | Created — staging environment credentials |
| `global-setup.ts` | Updated — uses readEnv() instead of hardcoded credentials |
| `pages/pim/AddEmployeePage.ts` | Updated — addEmployee(employee: EmployeeData) |
| `pages/admin/AddUserPage.ts` | Updated — addUser(user: UserData) |
| `pages/leave/ApplyLeavePage.ts` | Updated — applyForLeave(leave: LeaveData) |
| `tests/pim/employee.spec.ts` | Updated — self-contained, generateEmployee() per test |
| `tests/admin/user.spec.ts` | Updated — beforeAll API setup + generateEmployee() + generateUser() |
| `tests/leave/leave.spec.ts` | Updated — split into independent blocks + generateLeave() + readLeavePolicy() |
| `helpers/**` | No changes |
| `fixtures/**` | No changes (employeeApi, userApi, leaveApi already added in Level 5) |
| `playwright.config.ts` | No changes |

---

*Level 6 of 9 — Playwright TypeScript · OrangeHRM · Enterprise POM Framework*
*(Level 0 covers theory and setup — this series runs from Level 0 through Level 9)*
