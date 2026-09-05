import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KeycloakAdminService } from './keycloak-admin.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    KeycloakAdminService,
  ],
})
export class AuthModule {}