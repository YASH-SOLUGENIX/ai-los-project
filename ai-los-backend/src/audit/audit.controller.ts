import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('applications')
@UseGuards(KeycloakAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get(':id/audit')
  @Roles('loan_officer', 'manager', 'auditor', 'admin')
  async getAuditHistory(@Param('id', ParseIntPipe) id: number) {
    return this.auditService.findByApplication(id);
  }

  @Get(':id/audit/csv')
  @Roles('loan_officer', 'manager', 'auditor', 'admin')
  async exportAuditCsv(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const csv = await this.auditService.exportCsv(id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=application-${id}-audit-trail.csv`,
    );
    return res.send(csv);
  }
}
