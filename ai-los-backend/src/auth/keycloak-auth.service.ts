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
}