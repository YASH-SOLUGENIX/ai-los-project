import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class KeycloakAuthService {
  async login(
    username: string,
    password: string,
  ) {
    const body = new URLSearchParams();

    body.append('client_id', 'los-backend');
    body.append('client_secret', process.env.KEYCLOAK_CLIENT_SECRET!);
    body.append('grant_type', 'password');
    body.append('username', username);
    body.append('password', password);

    const response = await fetch(
      'http://localhost:8080/realms/los/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!response.ok) {
      throw new UnauthorizedException(
        'Invalid username or password',
      );
    }

    const data = await response.json();

    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token,
      refresh_expires_in: data.refresh_expires_in,
    };
  }

  async refreshToken(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const body = new URLSearchParams();
    body.append('client_id', 'los-backend');
    body.append('client_secret', process.env.KEYCLOAK_CLIENT_SECRET!);
    body.append('grant_type', 'refresh_token');
    body.append('refresh_token', refreshToken);

    const response = await fetch(
      'http://localhost:8080/realms/los/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!response.ok) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const data = await response.json();

    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token,
      refresh_expires_in: data.refresh_expires_in,
    };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      try {
        const body = new URLSearchParams();
        body.append('client_id', 'los-backend');
        body.append('client_secret', process.env.KEYCLOAK_CLIENT_SECRET!);
        body.append('refresh_token', refreshToken);

        await fetch(
          'http://localhost:8080/realms/los/protocol/openid-connect/logout',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
          },
        );
      } catch {
        // Fallback: If Keycloak revocation fails, continue gracefully
      }
    }

    return {
      message: 'Logged out successfully',
    };
  }

  decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return {};
      const payload = Buffer.from(parts[1], 'base64').toString('utf8');
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }
}