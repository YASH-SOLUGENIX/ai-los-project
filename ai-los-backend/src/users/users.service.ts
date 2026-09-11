import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Customer } from './entities/customer.entity';
import { LoanOfficer } from './entities/loan-officer.entity';
import { Manager } from './entities/manager.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(LoanOfficer)
    private readonly officerRepository: Repository<LoanOfficer>,
    @InjectRepository(Manager)
    private readonly managerRepository: Repository<Manager>,
  ) {}

  // ----------------------------------------------------
  // Customers (Borrowers) & Users
  // ----------------------------------------------------
  async createCustomer(data: {
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    keycloakId?: string;
  }): Promise<Customer> {
    const customer = this.customerRepository.create({
      username: data.username,
      email: data.email,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      phone: data.phone || '',
      keycloakId: data.keycloakId,
      isActive: true,
    });
    const savedCustomer = await this.customerRepository.save(customer);

    // Also persist into users table so user is visible in users table
    try {
      let userRec = await this.userRepository.findOne({
        where: [{ username: data.username }, { email: data.email }],
      });
      if (!userRec) {
        userRec = this.userRepository.create({
          id: savedCustomer.id,
          username: data.username,
          email: data.email,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          role: 'customer',
          keycloakId: data.keycloakId,
          isActive: true,
        });
        await this.userRepository.save(userRec);
        this.logger.log(`Persisted user ${data.username} into PostgreSQL users table.`);
      }
    } catch (uErr: any) {
      this.logger.warn(`Could not sync to users table: ${uErr.message}`);
    }

    return savedCustomer;
  }

  async findCustomerByUsername(username: string): Promise<Customer | null> {
    return this.customerRepository.findOne({ where: { username } });
  }

  async findCustomerByKeycloakId(keycloakId: string): Promise<Customer | null> {
    return this.customerRepository.findOne({ where: { keycloakId } });
  }

  async findAllCustomers(): Promise<Customer[]> {
    return this.customerRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findAllUsers(): Promise<User[]> {
    return this.userRepository.find({ order: { createdAt: 'DESC' } });
  }

  // ----------------------------------------------------
  // Loan Officers (Underwriters)
  // ----------------------------------------------------
  async createLoanOfficer(data: {
    employeeId: string;
    username: string;
    email: string;
    fullName: string;
    branchCode?: string;
    department?: string;
    maxReviewAmount?: number;
    keycloakId?: string;
  }): Promise<LoanOfficer> {
    const officer = this.officerRepository.create({
      employeeId: data.employeeId,
      username: data.username,
      email: data.email,
      fullName: data.fullName,
      branchCode: data.branchCode || 'MAIN-BRANCH',
      department: data.department || 'Retail Lending',
      maxReviewAmount: data.maxReviewAmount || 1000000.0,
      keycloakId: data.keycloakId,
      isActive: true,
    });
    return this.officerRepository.save(officer);
  }

  async findOfficerByUsername(username: string): Promise<LoanOfficer | null> {
    return this.officerRepository.findOne({ where: { username } });
  }

  async findOfficerByKeycloakId(keycloakId: string): Promise<LoanOfficer | null> {
    return this.officerRepository.findOne({ where: { keycloakId } });
  }

  async findAllOfficers(): Promise<LoanOfficer[]> {
    return this.officerRepository.find({ order: { createdAt: 'DESC' } });
  }

  // ----------------------------------------------------
  // Credit Managers (Decision Makers)
  // ----------------------------------------------------
  async createManager(data: {
    employeeId: string;
    username: string;
    email: string;
    fullName: string;
    branchCode?: string;
    approvalLimit?: number;
    keycloakId?: string;
  }): Promise<Manager> {
    const manager = this.managerRepository.create({
      employeeId: data.employeeId,
      username: data.username,
      email: data.email,
      fullName: data.fullName,
      branchCode: data.branchCode || 'HQ-DECISIONING',
      approvalLimit: data.approvalLimit || 5000000.0,
      keycloakId: data.keycloakId,
      isActive: true,
    });
    return this.managerRepository.save(manager);
  }

  async findManagerByUsername(username: string): Promise<Manager | null> {
    return this.managerRepository.findOne({ where: { username } });
  }

  async findManagerByKeycloakId(keycloakId: string): Promise<Manager | null> {
    return this.managerRepository.findOne({ where: { keycloakId } });
  }

  async findAllManagers(): Promise<Manager[]> {
    return this.managerRepository.find({ order: { createdAt: 'DESC' } });
  }

  // ----------------------------------------------------
  // Automatic Just-In-Time (JIT) Keycloak Synchronization
  // ----------------------------------------------------
  async syncUserFromToken(tokenPayload: any): Promise<any> {
    if (!tokenPayload) return null;
    const keycloakId = tokenPayload.sub || tokenPayload.id;
    const username = tokenPayload.preferred_username || tokenPayload.username;
    if (!username) return null;

    const email = tokenPayload.email || `${username}@apexbank.local`;
    const fullName =
      tokenPayload.name ||
      `${tokenPayload.given_name || tokenPayload.firstName || ''} ${tokenPayload.family_name || tokenPayload.lastName || ''}`.trim() ||
      username;
    const firstName = tokenPayload.given_name || tokenPayload.firstName || username;
    const lastName = tokenPayload.family_name || tokenPayload.lastName || '';

    const roles: string[] =
      tokenPayload.realm_access?.roles ||
      tokenPayload.roles ||
      [];

    if (roles.includes('manager')) {
      let manager = keycloakId
        ? await this.managerRepository.findOne({ where: { keycloakId } })
        : null;
      if (!manager) {
        manager = await this.managerRepository.findOne({ where: { username } });
      }
      if (!manager) {
        manager = await this.managerRepository.findOne({ where: { email } });
      }

      if (manager) {
        let needsUpdate = false;
        if (keycloakId && manager.keycloakId !== keycloakId) {
          manager.keycloakId = keycloakId;
          needsUpdate = true;
        }
        if (fullName && manager.fullName !== fullName && fullName !== username) {
          manager.fullName = fullName;
          needsUpdate = true;
        }
        if (needsUpdate) {
          await this.managerRepository.save(manager);
        }
        return { ...manager, role: 'manager' };
      }

      // Generate unique employee ID
      const baseSuffix = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      let empId = `EMP-MGR-${baseSuffix}`;
      const existingEmp = await this.managerRepository.findOne({ where: { employeeId: empId } });
      if (existingEmp) {
        empId = `EMP-MGR-${baseSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Ensure unique email
      let targetEmail = email;
      const existingEmail = await this.managerRepository.findOne({ where: { email: targetEmail } });
      if (existingEmail) {
        targetEmail = `${username}+${Date.now()}@apexbank.local`;
      }

      const newManager = this.managerRepository.create({
        employeeId: empId,
        username,
        email: targetEmail,
        fullName,
        branchCode: 'HQ-DECISIONING',
        approvalLimit: 5000000.00,
        keycloakId: keycloakId || undefined,
        isActive: true,
      });
      const saved = await this.managerRepository.save(newManager);
      this.logger.log(`Auto-synced Manager ${username} (${saved.employeeId}) into PostgreSQL.`);
      return { ...saved, role: 'manager' };
    }

    if (roles.includes('loan_officer')) {
      let officer = keycloakId
        ? await this.officerRepository.findOne({ where: { keycloakId } })
        : null;
      if (!officer) {
        officer = await this.officerRepository.findOne({ where: { username } });
      }
      if (!officer) {
        officer = await this.officerRepository.findOne({ where: { email } });
      }

      if (officer) {
        let needsUpdate = false;
        if (keycloakId && officer.keycloakId !== keycloakId) {
          officer.keycloakId = keycloakId;
          needsUpdate = true;
        }
        if (fullName && officer.fullName !== fullName && fullName !== username) {
          officer.fullName = fullName;
          needsUpdate = true;
        }
        if (needsUpdate) {
          await this.officerRepository.save(officer);
        }
        return { ...officer, role: 'loan_officer' };
      }

      // Generate unique employee ID
      const baseSuffix = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      let empId = `EMP-OFF-${baseSuffix}`;
      const existingEmp = await this.officerRepository.findOne({ where: { employeeId: empId } });
      if (existingEmp) {
        empId = `EMP-OFF-${baseSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Ensure unique email
      let targetEmail = email;
      const existingEmail = await this.officerRepository.findOne({ where: { email: targetEmail } });
      if (existingEmail) {
        targetEmail = `${username}+${Date.now()}@apexbank.local`;
      }

      const newOfficer = this.officerRepository.create({
        employeeId: empId,
        username,
        email: targetEmail,
        fullName,
        branchCode: 'MAIN-BRANCH',
        department: 'Retail Underwriting',
        maxReviewAmount: 1000000.00,
        keycloakId: keycloakId || undefined,
        isActive: true,
      });
      const saved = await this.officerRepository.save(newOfficer);
      this.logger.log(`Auto-synced Loan Officer ${username} (${saved.employeeId}) into PostgreSQL.`);
      return { ...saved, role: 'loan_officer' };
    }

    // Default: Customer
    let customer = keycloakId
      ? await this.customerRepository.findOne({ where: { keycloakId } })
      : null;
    if (!customer) {
      customer = await this.customerRepository.findOne({ where: { username } });
    }
    if (!customer) {
      customer = await this.customerRepository.findOne({ where: { email } });
    }

    if (customer) {
      let needsUpdate = false;
      if (keycloakId && customer.keycloakId !== keycloakId) {
        customer.keycloakId = keycloakId;
        needsUpdate = true;
      }
      if (needsUpdate) {
        await this.customerRepository.save(customer);
      }

      // Also ensure present in users table
      try {
        let userRec = await this.userRepository.findOne({
          where: [{ username }, { email: customer.email }],
        });
        if (!userRec) {
          userRec = this.userRepository.create({
            id: customer.id,
            username: customer.username,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            role: 'customer',
            keycloakId: keycloakId || undefined,
            isActive: true,
          });
          await this.userRepository.save(userRec);
        } else if (keycloakId && userRec.keycloakId !== keycloakId) {
          userRec.keycloakId = keycloakId;
          await this.userRepository.save(userRec);
        }
      } catch (uErr: any) {
        this.logger.warn(`Could not sync to users table: ${uErr.message}`);
      }

      return { ...customer, role: 'customer' };
    }

    let targetEmail = email;
    const existingEmail = await this.customerRepository.findOne({ where: { email: targetEmail } });
    if (existingEmail) {
      targetEmail = `${username}+${Date.now()}@los.local`;
    }

    const newCustomer = this.customerRepository.create({
      username,
      email: targetEmail,
      firstName,
      lastName,
      keycloakId: keycloakId || undefined,
      isActive: true,
    });
    const saved = await this.customerRepository.save(newCustomer);

    // Also persist into users table
    try {
      let userRec = await this.userRepository.findOne({
        where: [{ username }, { email: targetEmail }],
      });
      if (!userRec) {
        userRec = this.userRepository.create({
          id: saved.id,
          username,
          email: targetEmail,
          firstName,
          lastName,
          role: 'customer',
          keycloakId: keycloakId || undefined,
          isActive: true,
        });
        await this.userRepository.save(userRec);
      }
    } catch (uErr: any) {
      this.logger.warn(`Could not sync to users table: ${uErr.message}`);
    }

    this.logger.log(`Auto-synced Customer ${username} into PostgreSQL customers & users tables.`);
    return { ...saved, role: 'customer' };
  }

  // ----------------------------------------------------
  // Unified Profile Resolution
  // ----------------------------------------------------
  async findProfileByRole(
    role: string,
    keycloakId: string,
    username: string,
    extraContext?: any,
  ) {
    if (role === 'loan_officer') {
      let officer = await this.findOfficerByKeycloakId(keycloakId);
      if (!officer) officer = await this.findOfficerByUsername(username);
      if (officer) {
        if (!officer.keycloakId && keycloakId) {
          officer.keycloakId = keycloakId;
          await this.officerRepository.save(officer);
        }
        return { ...officer, role: 'loan_officer' };
      }
      return this.syncUserFromToken({
        sub: keycloakId,
        preferred_username: username,
        roles: ['loan_officer'],
        realm_access: { roles: ['loan_officer'] },
        ...extraContext,
      });
    }

    if (role === 'manager') {
      let mgr = await this.findManagerByKeycloakId(keycloakId);
      if (!mgr) mgr = await this.findManagerByUsername(username);
      if (mgr) {
        if (!mgr.keycloakId && keycloakId) {
          mgr.keycloakId = keycloakId;
          await this.managerRepository.save(mgr);
        }
        return { ...mgr, role: 'manager' };
      }
      return this.syncUserFromToken({
        sub: keycloakId,
        preferred_username: username,
        roles: ['manager'],
        realm_access: { roles: ['manager'] },
        ...extraContext,
      });
    }

    // Default: Customer
    let cust = await this.findCustomerByKeycloakId(keycloakId);
    if (!cust) cust = await this.findCustomerByUsername(username);
    if (cust) {
      if (!cust.keycloakId && keycloakId) {
        cust.keycloakId = keycloakId;
        await this.customerRepository.save(cust);
      }
      return { ...cust, role: 'customer' };
    }
    return this.syncUserFromToken({
      sub: keycloakId,
      preferred_username: username,
      roles: ['customer'],
      realm_access: { roles: ['customer'] },
      ...extraContext,
    });
  }
}
