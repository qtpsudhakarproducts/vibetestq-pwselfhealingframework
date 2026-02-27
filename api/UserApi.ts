// api/UserApi.ts
import { ApiClient } from './ApiClient';
import { UserData }  from '../data/types';

interface OrangeHRMUser {
  id:       number;
  userName: string;
  userRole: { id: number; name: string };
}

interface UserListResponse {
  data: OrangeHRMUser[];
}

export class UserApi {

  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Creates a system user via the OrangeHRM API.
   * The employee must already exist in PIM — pass the empNumber.
   * Returns the user ID assigned by the system.
   */
  async createUser(user: UserData, empNumber: number): Promise<number> {
    const response = await this.client.post(
      '/web/index.php/api/v2/admin/users',
      {
        userRole:  { id: user.role === 'Admin' ? 1 : 2 },
        employee:  { empNumber },
        status:    user.status === 'Enabled',
        userName:  user.username,
        password:  user.password,
      }
    ) as { data: OrangeHRMUser };

    return response.data.id;
  }

  /**
   * Finds a user by username.
   * Returns the user ID if found, null if not.
   */
  async findByUsername(username: string): Promise<number | null> {
    const response = await this.client.get(
      `/web/index.php/api/v2/admin/users?userName=${encodeURIComponent(username)}&limit=1`
    ) as UserListResponse;

    const match = response.data.find(
      (u) => u.userName.toLowerCase() === username.toLowerCase()
    );

    return match ? match.id : null;
  }

  /**
   * Deletes a user by ID.
   * Used in test teardown to clean up created users.
   */
  async deleteUser(userId: number): Promise<void> {
    await this.client.delete(
      `/web/index.php/api/v2/admin/users/${userId}`
    );
  }

}
