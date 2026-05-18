import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BlacklistReason } from './blacklist-reason.enum';

@Entity('email_blacklist')
export class EmailBlacklist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'email_hash', type: 'varchar', length: 64 })
  emailHash!: string;

  @Column({ type: 'varchar', length: 32 })
  reason!: BlacklistReason;

  @CreateDateColumn({ name: 'blocked_at', type: 'timestamptz' })
  blockedAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: object | null;
}
