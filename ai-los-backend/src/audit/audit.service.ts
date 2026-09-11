import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepository: Repository<AuditEvent>,
  ) {}

  async recordEvent(params: {
    applicationId: number;
    eventType: string;
    actorId: string;
    actorRole: string;
    details?: Record<string, any> | null;
    beforeState?: string | null;
    afterState?: string | null;
  }): Promise<AuditEvent> {
    const event = this.auditRepository.create({
      applicationId: params.applicationId,
      eventType: params.eventType,
      actorId: params.actorId,
      actorRole: params.actorRole,
      details: params.details || null,
      beforeState: params.beforeState || undefined,
      afterState: params.afterState || undefined,
    });

    return this.auditRepository.save(event);
  }

  async findByApplication(applicationId: number): Promise<AuditEvent[]> {
    return this.auditRepository.find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });
  }

  async exportCsv(applicationId: number): Promise<string> {
    const events = await this.findByApplication(applicationId);

    const headers = [
      'Event ID',
      'Application ID',
      'Event Type',
      'Actor ID',
      'Actor Role',
      'Before State',
      'After State',
      'Details',
      'Timestamp',
    ];

    const rows = events.map((event) => {
      const detailsStr = event.details
        ? JSON.stringify(event.details).replace(/"/g, '""')
        : '';
      return [
        event.id,
        event.applicationId,
        `"${event.eventType}"`,
        `"${event.actorId}"`,
        `"${event.actorRole}"`,
        `"${event.beforeState ?? ''}"`,
        `"${event.afterState ?? ''}"`,
        `"${detailsStr}"`,
        `"${event.createdAt.toISOString()}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
