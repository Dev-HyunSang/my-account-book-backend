import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { BlacklistReason } from './blacklist-reason.enum';
import { hashEmail } from './email-hash.util';
import { EmailBlacklist } from './email-blacklist.entity';

const PG_UNIQUE_VIOLATION = '23505';

export interface AddBlacklistInput {
  email: string;
  reason: BlacklistReason;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);

  constructor(
    @InjectRepository(EmailBlacklist)
    private readonly repo: Repository<EmailBlacklist>,
  ) {}

  async add(input: AddBlacklistInput): Promise<void> {
    try {
      await this.repo.insert({
        emailHash: hashEmail(input.email),
        reason: input.reason,
        metadata: input.metadata ?? null,
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        // Already blacklisted — idempotent.
        this.logger.warn(`Email already on blacklist: skip insert`);
        return;
      }
      throw err;
    }
  }

  async isBlacklisted(email: string): Promise<boolean> {
    const count = await this.repo.count({ where: { emailHash: hashEmail(email) } });
    return count > 0;
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof QueryFailedError &&
      (err as QueryFailedError & { code?: string }).code === PG_UNIQUE_VIOLATION
    );
  }
}
