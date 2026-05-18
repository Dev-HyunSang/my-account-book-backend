import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction } from './audit-action.enum';
import { AuditLog } from './audit-log.entity';

export interface AuditRecordInput {
  userId?: string | null;
  action: AuditAction;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async record(input: AuditRecordInput): Promise<void> {
    try {
      await this.repo.insert({
        userId: input.userId ?? null,
        action: input.action,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata ?? null,
      });
    } catch (err) {
      // Audit failures must never block auth — log and swallow.
      this.logger.error(`Failed to record audit event ${input.action}: ${(err as Error).message}`);
    }
  }
}
