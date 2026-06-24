import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { bigintTransformer } from '../common/money';

@Entity('expenses')
@Index('idx_expenses_user_date', ['userId', 'expenseDate'])
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate!: string;

  @Column({ type: 'numeric', precision: 20, scale: 0, transformer: bigintTransformer })
  amount!: bigint;

  @Column({ type: 'text', nullable: true })
  memo!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
