import {
  Body,
  Controller,
  Get,
  Post,
  BadRequestException,
} from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { KeycloakAdminService } from '../auth/keycloak-admin.service';
import { UsersService } from '../users/users.service';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  role: 'loan_officer' | 'manager';

  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsOptional()
  branchCode?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsNumber()
  @IsOptional()
  approvalLimit?: number;

  @IsNumber()
  @IsOptional()
  maxReviewAmount?: number;
}

@Controller('admin')
export class AdminController {
  constructor(
    private readonly keycloakAdminService: KeycloakAdminService,
    private readonly usersService: UsersService,
  ) {}

  @Post('staff')
  async createStaff(@Body() dto: CreateStaffDto) {
    if (!dto.username || !dto.email || !dto.password || !dto.role || !dto.employeeId || !dto.fullName) {
      throw new BadRequestException('Missing required fields for staff provisioning');
    }

    if (!['loan_officer', 'manager'].includes(dto.role)) {
      throw new BadRequestException('Role must be either loan_officer or manager');
    }

    const nameParts = dto.fullName.trim().split(' ');
    const firstName = nameParts[0] || dto.username;
    const lastName = nameParts.slice(1).join(' ') || 'Staff';

    // 1. Create User in Keycloak
    const kcUser = await this.keycloakAdminService.createUser(
      dto.username,
      dto.email,
      firstName,
      lastName,
      dto.password,
    );

    // 2. Assign Realm Role in Keycloak
    await this.keycloakAdminService.assignRole(kcUser.userId, dto.role);

    // 3. Persist in dedicated PostgreSQL staff table
    if (dto.role === 'loan_officer') {
      const officer = await this.usersService.createLoanOfficer({
        employeeId: dto.employeeId,
        username: dto.username,
        email: dto.email,
        fullName: dto.fullName,
        branchCode: dto.branchCode || 'MAIN-BRANCH',
        department: dto.department || 'Retail Lending',
        maxReviewAmount: dto.maxReviewAmount || 1000000.0,
        keycloakId: kcUser.userId,
      });
      return {
        message: 'Loan Officer provisioned successfully',
        staff: officer,
      };
    } else {
      const manager = await this.usersService.createManager({
        employeeId: dto.employeeId,
        username: dto.username,
        email: dto.email,
        fullName: dto.fullName,
        branchCode: dto.branchCode || 'HQ-DECISIONING',
        approvalLimit: dto.approvalLimit || 5000000.0,
        keycloakId: kcUser.userId,
      });
      return {
        message: 'Credit Manager provisioned successfully',
        staff: manager,
      };
    }
  }

  @Get('staff')
  async getAllStaff() {
    const officers = await this.usersService.findAllOfficers();
    const managers = await this.usersService.findAllManagers();
    return {
      loanOfficers: officers,
      managers: managers,
    };
  }

  @Get('customers')
  async getAllCustomers() {
    return this.usersService.findAllCustomers();
  }

  @Get('users')
  async getAllUsers() {
    return this.usersService.findAllUsers();
  }

  @Post('sync-keycloak')
  async syncKeycloak() {
    const kcUsers = await this.keycloakAdminService.getAllUsersWithRoles();
    const synced = [];
    for (const u of kcUsers) {
      const res = await this.usersService.syncUserFromToken({
        sub: u.id,
        preferred_username: u.username,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        realm_access: { roles: u.roles },
      });
      if (res) {
        synced.push({
          username: u.username,
          role: res.role,
          id: res.id,
          employeeId: res.employeeId,
        });
      }
    }
    return {
      message: `Successfully evaluated and synchronized ${kcUsers.length} Keycloak users into database`,
      count: synced.length,
      synced,
    };
  }
}
