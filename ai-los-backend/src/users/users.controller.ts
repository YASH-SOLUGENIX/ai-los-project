import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(KeycloakAuthGuard)
  async getMe(@Request() req: AuthenticatedRequest) {
    const keycloakUser = req.user;
    const roles = keycloakUser.realm_access?.roles || [];
    let role = 'customer';
    if (roles.includes('manager')) role = 'manager';
    else if (roles.includes('loan_officer')) role = 'loan_officer';

    const profile = await this.usersService.findProfileByRole(
      role,
      keycloakUser.sub,
      keycloakUser.preferred_username,
      keycloakUser,
    );

    return profile || keycloakUser;
  }
}
