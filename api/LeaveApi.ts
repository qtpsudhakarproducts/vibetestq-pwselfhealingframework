// api/LeaveApi.ts
import { ApiClient } from './ApiClient';

interface LeaveRequest {
  id:            number;
  status:        { id: number; name: string };
  employee:      { empNumber: number; firstName: string; lastName: string };
  leaveType:     { id: number; name: string };
  fromDate:      string;
  toDate:        string;
}

interface LeaveListResponse {
  data: LeaveRequest[];
}

export class LeaveApi {

  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Returns all pending leave requests.
   */
  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    const response = await this.client.get(
      '/web/index.php/api/v2/leave/leave-requests?statuses[]=PENDING_APPROVAL&limit=50'
    ) as LeaveListResponse;
    return response.data;
  }

  /**
   * Returns all leave requests for a specific employee by empNumber.
   */
  async getLeaveRequestsByEmployee(empNumber: number): Promise<LeaveRequest[]> {
    const response = await this.client.get(
      `/web/index.php/api/v2/leave/leave-requests?empNumber=${empNumber}&limit=50`
    ) as LeaveListResponse;
    return response.data;
  }

}
