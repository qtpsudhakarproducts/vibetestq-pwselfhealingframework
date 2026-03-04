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
    const response = await this.client.post(
      '/web/index.php/api/v2/pim/employees',
      {
        firstName:  employee.firstName,
        lastName:   employee.lastName,
        employeeId: employee.employeeId,
      }
    ) as { data: OrangeHRMEmployee };

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
    const response = await this.client.get(
      '/web/index.php/api/v2/pim/employees?limit=1&offset=0'
    ) as EmployeeListResponse;
    if (!response.data || response.data.length === 0) return null;
    const emp = response.data[0];
    // OrangeHRM renders the name as "firstName middleName lastName" (middleName may be empty).
    // Build the display name exactly as OrangeHRM shows it in autocomplete options so the
    // typed search text matches the selected option label — mismatches cause the "Invalid" error.
    const parts = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean);
    return {
      firstName: emp.firstName,
      lastName:  emp.lastName,
      fullName:  parts.join(' '),
    };
  }

  /**
   * Deletes an employee by empNumber.
   * Used in test teardown to clean up created employees.
   */
  async deleteEmployee(empNumber: number): Promise<void> {
    await this.client.delete(
      `/web/index.php/api/v2/pim/employees/${empNumber}`
    );
  }

}
