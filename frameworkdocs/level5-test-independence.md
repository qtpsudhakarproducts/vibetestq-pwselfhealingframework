# Level 5 — Test Independence & State Setup
### Playwright · TypeScript · OrangeHRM Demo Application

> **Prerequisites:** Levels 1–4 must be complete. You should have a working helper layer, fixtures, and passing tests across login, PIM, Admin, and Leave modules.
> **What you will have by the end:** Every test creates exactly the preconditions it needs before running and is completely independent of every other test. Tests pass in any order. A failure in one test does not affect any other.
> **What changes:** Test files and fixtures. Page objects and helpers do not change.
> **Next level:** Level 6 introduces test data management — replacing hardcoded values with generated, unique, realistic data.

---

## 📋 Table of Contents

- [Part 1 — The Problem Level 4 Left Behind](#part-1--the-problem-level-4-left-behind)
- [Part 2 — What Test Independence Means](#part-2--what-test-independence-means)
- [Part 3 — Approach 1: beforeAll UI Setup](#part-3--approach-1-beforeall-ui-setup)
- [Part 4 — Approach 2: API State Setup](#part-4--approach-2-api-state-setup)
- [Part 5 — Building the API Client](#part-5--building-the-api-client)
- [Part 6 — API Modules](#part-6--api-modules)
- [Part 7 — Integrating API Setup into Fixtures](#part-7--integrating-api-setup-into-fixtures)
- [Part 8 — Rewriting Tests to Be Independent](#part-8--rewriting-tests-to-be-independent)
- [Part 9 — Choosing the Right Approach](#part-9--choosing-the-right-approach)
- [Part 10 — What Level 5 Does Not Solve](#part-10--what-level-5-does-not-solve)

---

## Part 1 — The Problem Level 4 Left Behind

Open `tests/admin/user.spec.ts`. At the top it has:

```typescript
const employee = generateEmployee();
const user     = generateUser(employee);
```

And inside the first test:

```typescript
test('admin can add a new system user', async ({ addUserPage }) => {
  await addUserPage.addUser(user);
  // ...
});
```

This test requires an employee named `employee.fullName` to already exist in OrangeHRM. That employee is created by `tests/pim/employee.spec.ts`. So the user test depends on the employee test having run first.

Now imagine this scenario on a Monday morning:

```
09:00 — employee.spec.ts   PASS   ✅  Alice Johnson created
09:00 — user.spec.ts       FAIL   ❌  Employee "Alice Johnson" not found
09:00 — leave.spec.ts      FAIL   ❌  No ESS user to apply leave with
```

The employee test passed. But the shared demo site reset overnight — Alice Johnson no longer exists. The user test fails not because the user creation flow is broken, but because its precondition was not met. The leave test fails for the same cascading reason.

**One root cause. Three red tests. Completely misleading failure report.**

This is the test dependency problem. It has nothing to do with the feature being tested. It is a framework design problem — and Level 5 fixes it.

---

## Part 2 — What Test Independence Means

A fully independent test has three characteristics:

**It creates everything it needs.** If a test needs an employee to exist, it creates that employee itself before the scenario runs. It does not assume another test created it.

**It runs in any order.** An independent test passes whether it runs first, last, or in the middle. The test suite can be shuffled, parallelised, or partially executed without consequence.

**It cleans up after itself.** If a test creates data, it removes that data when it finishes — or the framework removes it. The next test starts from a clean state.

### Two Ways to Achieve This

The approach depends on what your application exposes:

**`beforeAll` UI setup** — if there is no API, drive the UI once at the start of a describe block to create the required state. All tests in that block share it. No API needed, no database access needed.

**API state setup** — if the application has an API, use it to create preconditions via HTTP before the browser opens. Faster, more reliable, completely separate from the UI being tested.

Both approaches are shown in this level. OrangeHRM has an API so the final test implementations use API setup — but the `beforeAll` approach is fully documented for teams whose application does not expose one.

---

## Part 3 — Approach 1: beforeAll UI Setup

### What `beforeAll` is

`test.beforeEach()` runs before every single test. If you have 10 tests and each needs an employee, it creates 10 employees — most of them unnecessary.

`test.beforeAll()` runs once before the entire describe block. All tests in that block share the state it creates. One employee created, ten tests use it.

```typescript
test.describe('Admin — User Management', () => {

  let employee: EmployeeData;
  let user:     UserData;

  // Runs ONCE before all tests in this block
  // Creates the employee via UI that all user tests need
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    });
    const page            = await context.newPage();
    const addEmployeePage = new AddEmployeePage(page);

    employee = generateEmployee();
    await addEmployeePage.goto();
    await addEmployeePage.addEmployee(employee);
    await addEmployeePage.assertRedirectedToPersonalDetails();

    user = generateUser(employee);
    await context.close();
  });

  test('admin can add a new system user', async ({ addUserPage }) => {
    // employee is guaranteed to exist — created in beforeAll above
    await addUserPage.addUser(user);
    await addUserPage.assertUserSavedSuccessfully();
  });

  test('newly created user appears in user management list', async ({ userManagementPage }) => {
    await userManagementPage.searchByUsername(user.username);
    await userManagementPage.assertUserExistsInList(user.username);
  });

});
```

### What this solves

The user tests no longer depend on `employee.spec.ts` having run first. They create their own employee in `beforeAll`. The tests are isolated within their own describe block.

### What this does not solve

The `beforeAll` setup itself drives the UI. It is slower than an API call. It has the same flakiness risks as any UI interaction. And it still creates a dependency — if the `beforeAll` fails, every test in the block fails with it.

For most teams without API access, this is the right approach. It is pragmatic, requires no external dependencies, and significantly improves on the previous test ordering dependency.

### When to use `beforeAll` UI setup

- The application has no API, or the API does not expose the endpoints you need
- You need a moderate improvement in independence without changing infrastructure
- The UI flow for creating preconditions is stable and fast

---

## Part 4 — Approach 2: API State Setup

When the application exposes an API, use it to create preconditions directly via HTTP. The browser never opens for setup. No UI flakiness. Milliseconds instead of seconds.

```
beforeAll UI setup:
  Open browser → Load auth state → Navigate → Fill form → Submit → Wait for response
  ~3-5 seconds per precondition

API state setup:
  POST /api/v2/pim/employees with JSON body
  ~200-500ms per precondition
```

### The principle

The API and the browser are two separate clients to the same application. The API creates the state. The browser tests the UI that displays and interacts with that state. They are independent — using the API for setup does not compromise the UI test at all.

### What we build

```
api/
  ApiClient.ts       ← HTTP wrapper — handles auth, base URL, response validation
  EmployeeApi.ts     ← create, delete, getByName
  UserApi.ts         ← create, delete
  LeaveApi.ts        ← createRequest, getByEmployee
  index.ts           ← exports everything
```

---

## Part 5 — Building the API Client

`ApiClient` is a thin wrapper around Playwright's `request` context. It handles the base URL, admin authentication header, and response validation in one place. All API modules use it — they never construct HTTP requests directly.

```typescript
// api/ApiClient.ts
import { APIRequestContext, request } from '@playwright/test';

export class ApiClient {

  private readonly context:  APIRequestContext;
  private readonly baseURL:  string;
  private readonly authHeader: string;

  private constructor(context: APIRequestContext, baseURL: string, authHeader: string) {
    this.context    = context;
    this.baseURL    = baseURL;
    this.authHeader = authHeader;
  }

  // Creates an ApiClient using admin credentials.
  // Uses Playwright's request context — completely independent of any browser page.
  // Call this in fixtures or beforeAll blocks that need API access.
  //
  // Usage:
  //   const api = await ApiClient.create(
  //     'https://opensource-demo.orangehrmlive.com',
  //     'Admin',
  //     'admin123'
  //   );
  static async create(
    baseURL:  string,
    username: string,
    password: string
  ): Promise<ApiClient> {
    const context = await request.newContext({ baseURL });

    // OrangeHRM API uses HTTP Basic Authentication
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    const authHeader  = `Basic ${credentials}`;

    return new ApiClient(context, baseURL, authHeader);
  }

  // ─── HTTP Methods ─────────────────────────────────────────────────────────────

  async get(path: string): Promise<unknown> {
    const response = await this.context.get(path, {
      headers: { Authorization: this.authHeader },
    });
    return this.handleResponse(response, `GET ${path}`);
  }

  async post(path: string, body: unknown): Promise<unknown> {
    const response = await this.context.post(path, {
      headers: {
        Authorization:  this.authHeader,
        'Content-Type': 'application/json',
      },
      data: body,
    });
    return this.handleResponse(response, `POST ${path}`);
  }

  async delete(path: string): Promise<void> {
    const response = await this.context.delete(path, {
      headers: { Authorization: this.authHeader },
    });
    if (!response.ok()) {
      throw new Error(
        `DELETE ${path} failed with status ${response.status()}: ${await response.text()}`
      );
    }
  }

  // Validates the response status and returns the parsed JSON body.
  // Throws a descriptive error if the request failed — includes the
  // operation name, status code, and response body for easy debugging.
  private async handleResponse(response: Awaited<ReturnType<APIRequestContext['get']>>, operation: string): Promise<unknown> {
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `API ${operation} failed.\n` +
        `Status: ${response.status()}\n` +
        `Response: ${body}`
      );
    }
    return response.json();
  }

  async dispose(): Promise<void> {
    await this.context.dispose();
  }

}
```

---

## Part 6 — API Modules

Each module wraps the OrangeHRM API endpoints for one entity. They translate between our `EmployeeData`, `UserData`, `LeaveData` types and the API's request/response shapes.

### api/EmployeeApi.ts

```typescript
// api/EmployeeApi.ts
import { ApiClient }   from './ApiClient';
import { EmployeeData } from '../data/types';

export class EmployeeApi {

  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  // Creates an employee via the OrangeHRM API.
  // Returns the employee number assigned by OrangeHRM —
  // needed for subsequent operations like creating users or leave requests.
  //
  // Usage:
  //   const empNumber = await employeeApi.create(employee);
  async create(employee: EmployeeData): Promise<string> {
    const response = await this.client.post('/api/v2/pim/employees', {
      firstName:  employee.firstName,
      lastName:   employee.lastName,
      employeeId: employee.employeeId,
    }) as { data: { empNumber: string } };

    return response.data.empNumber;
  }

  // Deletes an employee by their employee number.
  // Called in afterAll/afterEach blocks to clean up test data.
  async delete(empNumber: string): Promise<void> {
    await this.client.delete(`/api/v2/pim/employees/${empNumber}`);
  }

  // Finds an employee by name and returns their employee number.
  // Used when you need the empNumber for an employee created via UI.
  async getEmpNumberByName(fullName: string): Promise<string | null> {
    const response = await this.client.get(
      `/api/v2/pim/employees?nameOrId=${encodeURIComponent(fullName)}`
    ) as { data: Array<{ empNumber: string; firstName: string; lastName: string }> };

    const match = response.data.find(
      emp => `${emp.firstName} ${emp.lastName}` === fullName
    );

    return match?.empNumber ?? null;
  }

}
```

---

### api/UserApi.ts

```typescript
// api/UserApi.ts
import { ApiClient } from './ApiClient';
import { UserData }  from '../data/types';

export class UserApi {

  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  // Creates a system user linked to an existing employee.
  // empNumber must be obtained from EmployeeApi.create() or getEmpNumberByName().
  // Returns the new user's ID for cleanup.
  //
  // Usage:
  //   const userId = await userApi.create(user, empNumber);
  async create(user: UserData, empNumber: string): Promise<number> {
    const response = await this.client.post('/api/v2/core/users', {
      userRole:   user.role,
      empNumber,
      status:     user.status === 'Enabled' ? '1' : '0',
      userName:   user.username,
      password:   user.password,
    }) as { data: { id: number } };

    return response.data.id;
  }

  // Deletes a system user by their ID.
  async delete(userId: number): Promise<void> {
    await this.client.delete(`/api/v2/core/users/${userId}`);
  }

}
```

---

### api/LeaveApi.ts

```typescript
// api/LeaveApi.ts
import { ApiClient } from './ApiClient';
import { LeaveData } from '../data/types';

export class LeaveApi {

  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  // Creates a leave request for an employee.
  // empNumber must belong to an employee who has an active ESS user account.
  // Returns the leave request ID for cleanup or status checks.
  //
  // Usage:
  //   const leaveId = await leaveApi.createRequest(leave, empNumber);
  async createRequest(leave: LeaveData, empNumber: string): Promise<number> {
    const response = await this.client.post('/api/v2/leave/leaveRequests', {
      type:      { id: await this.getLeaveTypeId(leave.leaveType) },
      fromDate:  leave.fromDate,
      toDate:    leave.toDate,
      comment:   leave.comment,
      empNumber,
    }) as { data: { id: number } };

    return response.data.id;
  }

  // Returns pending leave requests for a given employee.
  // Used in approval tests to verify the request was created.
  async getPendingByEmployee(empNumber: string): Promise<unknown[]> {
    const response = await this.client.get(
      `/api/v2/leave/leaveRequests?empNumber=${empNumber}&statuses[]=PENDING`
    ) as { data: unknown[] };

    return response.data;
  }

  // Resolves a leave type name to its OrangeHRM internal ID.
  // OrangeHRM stores leave types with numeric IDs — we look up by name.
  private async getLeaveTypeId(leaveTypeName: string): Promise<number> {
    const response = await this.client.get('/api/v2/leave/leaveTypes?limit=50') as {
      data: Array<{ id: number; name: string }>;
    };

    const match = response.data.find(lt => lt.name === leaveTypeName);
    if (!match) {
      throw new Error(
        `LeaveApi: leave type "${leaveTypeName}" not found.\n` +
        `Available types: ${response.data.map(lt => lt.name).join(', ')}`
      );
    }

    return match.id;
  }

}
```

---

### api/index.ts

```typescript
// api/index.ts
export { ApiClient }   from './ApiClient';
export { EmployeeApi } from './EmployeeApi';
export { UserApi }     from './UserApi';
export { LeaveApi }    from './LeaveApi';
```

---

## Part 7 — Integrating API Setup into Fixtures

The API setup integrates into the fixture system from Level 3. A new `apiContext` fixture creates the `ApiClient` and exposes `EmployeeApi`, `UserApi`, and `LeaveApi` to any test that needs them.

Tests that need preconditions use the API fixture in their `beforeAll` block rather than driving the UI.

### Updated fixtures/index.ts

```typescript
// fixtures/index.ts — additions only, existing fixtures unchanged
import { test as base, expect } from '@playwright/test';
import { ApiClient, EmployeeApi, UserApi, LeaveApi } from '../api';
import { readEnv } from '../data/readers';

// ... existing fixture type definitions and implementations ...

// ─── API Fixture Types ────────────────────────────────────────────────────────

type ApiFixtures = {
  employeeApi: EmployeeApi;
  userApi:     UserApi;
  leaveApi:    LeaveApi;
};

// ─── API Fixtures ─────────────────────────────────────────────────────────────

// Provides an EmployeeApi instance ready for creating and deleting employees.
// The underlying ApiClient is created and disposed per test automatically.
employeeApi: async ({}, use) => {
  const env    = readEnv();
  const client = await ApiClient.create(env.baseURL, env.adminUsername, env.adminPassword);
  await use(new EmployeeApi(client));
  await client.dispose();
},

userApi: async ({}, use) => {
  const env    = readEnv();
  const client = await ApiClient.create(env.baseURL, env.adminUsername, env.adminPassword);
  await use(new UserApi(client));
  await client.dispose();
},

leaveApi: async ({}, use) => {
  const env    = readEnv();
  const client = await ApiClient.create(env.baseURL, env.adminUsername, env.adminPassword);
  await use(new LeaveApi(client));
  await client.dispose();
},
```

---

## Part 8 — Rewriting Tests to Be Independent

### tests/pim/employee.spec.ts

PIM tests test the Add Employee UI flow — so they still create employees via the UI. But they clean up after themselves and do not depend on any other test file.

```typescript
// tests/pim/employee.spec.ts
import { test, expect }     from '../../fixtures';
import { generateEmployee } from '../../data/generate';

test.describe('PIM — Employee Management', () => {

  test('admin can add a new employee via UI', async ({ addEmployeePage, employeeListPage }) => {
    const employee = generateEmployee();

    await addEmployeePage.addEmployee(employee);
    await addEmployeePage.assertEmployeeSavedSuccessfully();
    await addEmployeePage.assertRedirectedToPersonalDetails();

    // Verify it appears in the list
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

### tests/admin/user.spec.ts

User tests now create their own employee via API before any UI interaction. The test is fully independent — it does not care whether `employee.spec.ts` ran or not.

```typescript
// tests/admin/user.spec.ts
import { test, expect }                from '../../fixtures';
import { generateEmployee, generateUser } from '../../data/generate';

test.describe('Admin — User Management', () => {

  let empNumber: string;
  let employee:  ReturnType<typeof generateEmployee>;
  let user:      ReturnType<typeof generateUser>;

  // Create employee via API once before all user tests
  // No UI, no dependency on employee.spec.ts
  test.beforeAll(async ({ employeeApi }) => {
    employee  = generateEmployee();
    empNumber = await employeeApi.create(employee);
    user      = generateUser(employee);
  });

  // Clean up the employee after all user tests complete
  test.afterAll(async ({ employeeApi }) => {
    if (empNumber) await employeeApi.delete(empNumber);
  });

  test('admin can add a new system user linked to the employee', async ({ userManagementPage, addUserPage }) => {
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
    const phantom = generateUser(generateEmployee());
    await userManagementPage.searchByUsername(phantom.username + 'NOTEXIST');
    await userManagementPage.assertNoRecordsFound();
  });

});
```

---

### tests/leave/leave.spec.ts

Leave tests create both the employee and the leave request via API. The ESS user still needs to exist from global setup — but the employee and leave request are owned by this test.

```typescript
// tests/leave/leave.spec.ts
import { test, expect }                from '../../fixtures';
import { generateEmployee, generateLeave } from '../../data/generate';

test.describe('Leave — Apply Workflow (ESS)', () => {

  test('ESS user can submit a leave application via UI', async ({ applyLeavePage }) => {
    const leave = generateLeave();
    await applyLeavePage.applyForLeave(leave);
    await applyLeavePage.assertLeaveApplicationSubmitted();
  });

});

test.describe('Leave — Approve Workflow (Admin)', () => {

  let empNumber: string;
  let leaveId:   number;

  // Create employee and leave request via API before approval tests
  // The approval test does not depend on the apply test having run
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
```

---

### `beforeAll` fallback — for teams without API access

If your application does not have an API, use `beforeAll` UI setup instead. The structure is identical — only the mechanism for creating the employee changes:

```typescript
// tests/admin/user.spec.ts — beforeAll UI approach (no API required)
import { test, expect }                from '../../fixtures';
import { generateEmployee, generateUser } from '../../data/generate';
import { AddEmployeePage }             from '../../pages/pim/AddEmployeePage';

test.describe('Admin — User Management', () => {

  let employee: ReturnType<typeof generateEmployee>;
  let user:     ReturnType<typeof generateUser>;

  test.beforeAll(async ({ browser }) => {
    // Create a separate browser context for setup
    const context = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    });
    const page            = await context.newPage();
    const addEmployeePage = new AddEmployeePage(page);

    employee = generateEmployee();
    await addEmployeePage.goto();
    await addEmployeePage.addEmployee(employee);

    user = generateUser(employee);
    await context.close();
  });

  test('admin can add a new system user', async ({ addUserPage }) => {
    await addUserPage.addUser(user);
    await addUserPage.assertUserSavedSuccessfully();
  });

  // ... remaining tests unchanged

});
```

The test body is identical in both approaches. Only the `beforeAll` implementation differs.

---

## Part 9 — Choosing the Right Approach

| Situation | Approach | Speed | Reliability |
|-----------|---------|-------|-------------|
| Application has a usable API | API state setup | ⚡ Fast (~200ms) | ✅ High |
| No API or endpoints not available | `beforeAll` UI setup | 🐢 Slower (~3-5s) | ⚠️ Medium |

**Use API setup when:** the application exposes REST endpoints for creating the entities your tests depend on. OrangeHRM qualifies — it has endpoints for employees, users, and leave requests.

**Use `beforeAll` UI setup when:** there is no API, or the API does not expose the data you need. This covers the majority of legacy applications and internal tools.

**Never use `beforeEach` for preconditions** — creating a new employee before every single test that needs one is wasteful and slow. `beforeAll` creates it once per describe block. API setup creates it once with no UI overhead at all.

---

## Part 10 — What Level 5 Does Not Solve

### Test data is still hardcoded

Employee names, leave dates, and passwords are still written as string literals or simple generated values inline in test files. There is no centralised data layer, no Faker integration, no file-based dataset support, no environment-specific configuration.

**Level 6** introduces the full test data layer — `generate.ts` with Faker, `readers.ts` for CSV, JSON, Excel, and environment files. Data is centralised, unique per run, and environment-aware.

---

> **You are ready for Level 6** when your tests are independent and you are frustrated by data collisions, hardcoded credentials, and the same employee names appearing in every test file.

---

### Quick Reference — What Changed at Level 5

| File | Change |
|------|--------|
| `api/ApiClient.ts` | Created — HTTP wrapper for OrangeHRM API |
| `api/EmployeeApi.ts` | Created — create, delete, getByName |
| `api/UserApi.ts` | Created — create, delete |
| `api/LeaveApi.ts` | Created — createRequest, getPendingByEmployee |
| `api/index.ts` | Created — exports all API modules |
| `fixtures/index.ts` | Updated — employeeApi, userApi, leaveApi fixtures added |
| `tests/pim/employee.spec.ts` | Updated — self-contained, no cross-file dependency |
| `tests/admin/user.spec.ts` | Updated — beforeAll API setup, afterAll cleanup |
| `tests/leave/leave.spec.ts` | Updated — apply and approve split into independent describe blocks |
| `pages/**` | No changes |
| `helpers/**` | No changes |
| `playwright.config.ts` | No changes |

---

*Level 5 of 9 — Playwright TypeScript · OrangeHRM · Enterprise POM Framework*
*(Level 0 covers theory and setup — this series runs from Level 0 through Level 9)*
