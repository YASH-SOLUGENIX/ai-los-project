import { Request } from 'express';
import { KeycloakUser } from './keycloak-user.interface';

export interface AuthenticatedRequest extends Request {
  user: KeycloakUser;
}