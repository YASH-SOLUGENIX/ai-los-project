import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KeycloakAdminService } from './keycloak-admin.service';
import { KeycloakAuthService } from './keycloak-auth.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    KeycloakAdminService,
    KeycloakAuthService
  ],
})
export class AuthModule {}