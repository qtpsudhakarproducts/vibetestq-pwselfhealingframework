// api/EmployeeApi.ts
import { ApiClient }    from './ApiClient';
import { EmployeeData } from '../data/types';

interface OrangeHRMEmployee {
  empNumber:  number;
  firstName:  string;
  middleName: string;
  lastName:   string;
  employeeId: string;
}

interface EmployeeListResponse {
  data: OrangeHRMEmployee[];
  meta: { total: number };
}

export class EmployeeApi {

  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Creates an employee via the OrangeHRM API.
   * Returns the empNumber assigned by the system — required to create a linked user.
   */
  async createEmployee(employee: EmployeeData): Promise<number> {
    const raw = await this.client.post(
      '/web/index.php/api/v2/pim/employees',
      {
        firstName:  employee.firstName,
        lastName:   employee.lastName,
        employeeId: employee.employeeId,
      }
    );
    // Gap 4: validate the API response shape before accessing nested fields.
    // If OrangeHRM changes its response structure this throws immediately here
    // rather than as a confusing TypeError deep in test code.
    const response = ApiClient.assertResponseShape<{ data: OrangeHRMEmployee }>(
      raw, ['data'], 'POST /api/v2/pim/employees'
    );

    return response.data.empNumber;
  }

  /**
   * Searches for an employee by first and last name.
   * Returns the empNumber if found, null if not.
   */
  async findByName(firstName: string, lastName: string): Promise<number | null> {
    const response = await this.client.get(
      `/web/index.php/api/v2/pim/employees?nameOrId=${encodeURIComponent(firstName + ' ' + lastName)}&limit=10`
    ) as EmployeeListResponse;

    const match = response.data.find(
      (e) =>
        e.firstName.toLowerCase() === firstName.toLowerCase() &&
        e.lastName.toLowerCase()  === lastName.toLowerCase()
    );

    return match ? match.empNumber : null;
  }

  /**
   * Returns the first employee found on the system.
   * Useful for tests that need an existing, already-indexed employee
   * (freshly-created employees may not be searchable immediately via autocomplete).
   */
  async getFirst(): Promise<{ firstName: string; lastName: string; fullName: string } | null> {
    const raw = await this.client.get(
      '/web/index.php/api/v2/pim/employees?limit=1&offset=0'
    );
    const response = ApiClient.assertResponseShape<EmployeeListResponse>(
      raw, ['data', 'meta'], 'GET /api/v2/pim/employees'
    );
    if (response.data.length === 0) return null;
    const emp = response.data[0];
    // OrangeHRM renders the name as "firstName middleName lastName" (middleName may be empty).
    // Build the display name exactly as OrangeHRM shows it in autocomplete options so the
    // typed search text matches the selected option label — mismatches cause the "Invalid" error.
    // OrangeHRM renders the employee name in autocomplete options as:
    //   firstName + " " + middleName + " " + lastName
    // even when middleName is empty — producing a double space.
    // We must search with the exact same string so the blur-time text comparison passes.
    return {
      firstName: emp.firstName,
      lastName:  emp.lastName,
      fullName:  `${emp.firstName} ${emp.middleName} ${emp.lastName}`.trim(),
    };
  }

  /**
   * Deletes an employee by empNumber.
   * OrangeHRM v2 API only exposes a bulk-delete endpoint — individual DELETE
   * by ID returns 405.  Passing a single-element array handles the teardown case.
   */
  async deleteEmployee(empNumber: number): Promise<void> {
    await this.client.delete(
      '/web/index.php/api/v2/pim/employees',
      { ids: [empNumber] }
    );
  }

}
