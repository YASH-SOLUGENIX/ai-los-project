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

import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {

  constructor(
    private readonly keycloakAdminService: KeycloakAdminService,
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

//   @Get('admin-token-test')
//   async adminTokenTest() {
//     const token =
//       await this.keycloakAdminService.getAdminToken();

//     return {
//       message: 'Keycloak admin authentication successful',
//       token,
//     };
//   }

  @Post('register')
async register(@Body() registerDto: RegisterDto) {
//   console.log('REGISTER BODY:', registerDto);


const user = await this.keycloakAdminService.createUser(
  registerDto.username,
  registerDto.email,
  registerDto.firstName,
  registerDto.lastName,
  registerDto.password,
);


  await this.keycloakAdminService.assignCustomerRole(
    user.userId,
  );

  return {
    message: 'Customer registered successfully',
  };
}
}