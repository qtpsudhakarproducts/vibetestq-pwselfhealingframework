// api/EmployeeApi.ts
import { ApiClient }    from './ApiClient';
import { EmployeeData } from '../data/types';

interface OrangeHRMEmployee {
  empNumber:  number;
  firstName:  string;
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
   * Deletes an employee by empNumber.
   * Used in test teardown to clean up created employees.
   */
  async deleteEmployee(empNumber: number): Promise<void> {
    await this.client.delete(
      `/web/index.php/api/v2/pim/employees/${empNumber}`
    );
  }

}
