import {
  Controller,
  Get,
  Request,
  UseGuards,
  Post,
  Body,
} from '@nestjs/common';

import { KeycloakAuthGuard } from './guards/keycloak-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

import type { AuthenticatedRequest } from './types/authenticated-request.interface';

import { KeycloakAdminService } from './keycloak-admin.service';
import { KeycloakAuthService } from './keycloak-auth.service';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly keycloakAdminService: KeycloakAdminService,
    private readonly keycloakAuthService: KeycloakAuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get('me')
  @UseGuards(KeycloakAuthGuard)
  getMe(@Request() request: AuthenticatedRequest) {
    return {
      message: 'You are authenticated',
      user: request.user,
    };
  }

  @Get('customer-test')
  @Roles('customer')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  customerTest() {
    return {
      message: 'Customer access granted',
    };
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.keycloakAdminService.createUser(
      registerDto.username,
      registerDto.email,
      registerDto.firstName,
      registerDto.lastName,
      registerDto.password,
    );

    await this.keycloakAdminService.assignCustomerRole(user.userId);

    // Save into PostgreSQL customers table
    const dbCustomer = await this.usersService.createCustomer({
      username: registerDto.username,
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      keycloakId: user.userId,
    });

    return {
      message: 'Customer registered successfully',
      customerId: dbCustomer.id,
      keycloakId: user.userId,
    };
  }

  @Post('login')
  async login(
    @Body()
    body: {
      username: string;
      password: string;
    },
  ) {
    const loginResult = await this.keycloakAuthService.login(
      body.username,
      body.password,
    );

    // Automatic Just-in-Time (JIT) sync to PostgreSQL
    try {
      if (loginResult?.access_token) {
        const decoded = this.keycloakAuthService.decodeToken(loginResult.access_token);
        await this.usersService.syncUserFromToken(decoded);
      }
    } catch (syncErr) {
      console.error('Error auto-syncing user to database on login:', syncErr);
    }

    return loginResult;
  }

  @Post('refresh')
  async refresh(
    @Body()
    body?: {
      refreshToken?: string;
    },
  ) {
    return this.keycloakAuthService.refreshToken(body?.refreshToken);
  }

  @Post('logout')
  async logout(
    @Body()
    body?: {
      refreshToken?: string;
    },
  ) {
    return this.keycloakAuthService.logout(body?.refreshToken);
  }
}