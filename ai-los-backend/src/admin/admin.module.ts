import { Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { KeycloakAdminService } from '../auth/keycloak-admin.service';
import { UsersService } from '../users/users.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [AdminController],
})
export class AdminModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminModule.name);

  constructor(
    private readonly keycloakAdminService: KeycloakAdminService,
    private readonly usersService: UsersService,
  ) {}

  async onApplicationBootstrap() {
    try {
      this.logger.log('Starting automated Keycloak-to-PostgreSQL synchronization...');
      const users = await this.keycloakAdminService.getAllUsersWithRoles();
      let count = 0;
      for (const u of users) {
        const res = await this.usersService.syncUserFromToken({
          sub: u.id,
          preferred_username: u.username,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
          realm_access: { roles: u.roles },
        });
        if (res) count++;
      }
      this.logger.log(`Keycloak synchronization completed successfully (${count} users active in database).`);
    } catch (err: any) {
      this.logger.warn(`Keycloak initial sync skipped or encountered an error: ${err.message}`);
    }
  }
}
