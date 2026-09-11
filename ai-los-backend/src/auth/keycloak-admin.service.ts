import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class KeycloakAdminService {

  async getAdminToken(): Promise<string> {
    const url =
      'http://localhost:8080/realms/los/protocol/openid-connect/token';

    const body = new URLSearchParams();

    body.append(
      'client_id',
      process.env.KEYCLOAK_ADMIN_CLIENT_ID!,
    );

    body.append(
      'client_secret',
      process.env.KEYCLOAK_ADMIN_CLIENT_SECRET!,
    );

    body.append(
      'grant_type',
      'client_credentials',
    );

    const response = await fetch(url, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },

      body,
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new InternalServerErrorException(
        `Keycloak error: ${errorText}`,
      );
    }

    const data = await response.json();

    return data.access_token;
  }


  async createUser(
  username: string,
  email: string,
  firstName: string,
  lastName: string,
  password: string,
) {
  const adminToken = await this.getAdminToken();

  const response = await fetch(
    'http://localhost:8080/admin/realms/los/users',
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },

     body: JSON.stringify({
  username: username,
  email: email,
  firstName: firstName,
  lastName: lastName,
  enabled: true,

  credentials: [
          {
            type: 'password',
            value: password,
            temporary: false,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new InternalServerErrorException(
      `Failed to create Keycloak user: ${errorText}`,
    );
  }

  const location = response.headers.get('location');

  if (!location) {
    throw new InternalServerErrorException(
      'Keycloak did not return the created user location',
    );
  }

  const userId = location.split('/').pop();

  if (!userId) {
    throw new InternalServerErrorException(
      'Could not determine Keycloak user ID',
    );
  }

  return {
    message: 'Keycloak user created successfully',
    userId: userId,
  };
}

async assignCustomerRole(userId: string) {
  const adminToken = await this.getAdminToken();

  // Get the "customer" role from Keycloak
  const roleResponse = await fetch(
    'http://localhost:8080/admin/realms/los/roles/customer',
    {
      method: 'GET',

      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    },
  );

  if (!roleResponse.ok) {
    const errorText = await roleResponse.text();

    throw new InternalServerErrorException(
      `Failed to find customer role: ${errorText}`,
    );
  }

  const customerRole = await roleResponse.json();

  // Assign the role to the user
  const assignResponse = await fetch(
    `http://localhost:8080/admin/realms/los/users/${userId}/role-mappings/realm`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },

      body: JSON.stringify([
        {
          id: customerRole.id,
          name: customerRole.name,
        },
      ]),
    },
  );

  if (!assignResponse.ok) {
    const errorText = await assignResponse.text();

    throw new InternalServerErrorException(
      `Failed to assign customer role: ${errorText}`,
    );
  }

  return {
    message: 'Customer role assigned successfully',
  };
}

  async assignRole(userId: string, roleName: string) {
    const adminToken = await this.getAdminToken();

    const roleResponse = await fetch(
      `http://localhost:8080/admin/realms/los/roles/${roleName}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    if (!roleResponse.ok) {
      const errorText = await roleResponse.text();
      throw new InternalServerErrorException(
        `Failed to find role ${roleName}: ${errorText}`,
      );
    }

    const roleData = await roleResponse.json();

    const assignResponse = await fetch(
      `http://localhost:8080/admin/realms/los/users/${userId}/role-mappings/realm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify([
          {
            id: roleData.id,
            name: roleData.name,
          },
        ]),
      },
    );

    if (!assignResponse.ok) {
      const errorText = await assignResponse.text();
      throw new InternalServerErrorException(
        `Failed to assign role ${roleName}: ${errorText}`,
      );
    }

    return {
      message: `Role ${roleName} assigned successfully`,
    };
  }

  async getAllUsersWithRoles(): Promise<
    Array<{
      id: string;
      username: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      roles: string[];
    }>
  > {
    const adminToken = await this.getAdminToken();
    const response = await fetch(
      'http://localhost:8080/admin/realms/los/users?max=250',
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `Failed to fetch Keycloak users: ${errorText}`,
      );
    }

    const users = await response.json();
    if (!Array.isArray(users)) return [];

    const results = [];
    for (const user of users) {
      try {
        const rolesRes = await fetch(
          `http://localhost:8080/admin/realms/los/users/${user.id}/role-mappings/realm`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          },
        );
        const rolesData = rolesRes.ok ? await rolesRes.json() : [];
        const roleNames = Array.isArray(rolesData)
          ? rolesData.map((r: any) => r.name)
          : [];
        results.push({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: roleNames,
        });
      } catch {
        results.push({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: [],
        });
      }
    }
    return results;
  }
}