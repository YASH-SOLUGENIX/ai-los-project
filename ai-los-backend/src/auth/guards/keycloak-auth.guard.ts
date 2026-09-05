import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  private readonly keycloakIssuer =
    'http://localhost:8080/realms/los';

  private readonly jwks = createRemoteJWKSet(
    new URL(
      `${this.keycloakIssuer}/protocol/openid-connect/certs`,
    ),
  );

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header missing');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.keycloakIssuer,
      });

      request.user = payload;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}