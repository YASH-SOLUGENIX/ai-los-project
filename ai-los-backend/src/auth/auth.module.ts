import { Module, forwardRef } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KeycloakAdminService } from './keycloak-admin.service';
import { KeycloakAuthService } from './keycloak-auth.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [
    AuthService,
    KeycloakAdminService,
    KeycloakAuthService
  ],
  exports: [AuthService, KeycloakAuthService, KeycloakAdminService],
})
export class AuthModule {}