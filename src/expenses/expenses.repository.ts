import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';

export interface CreateExpenseInput {
  userId: string;
  expenseDate: string;
  amount: bigint;
  memo: string | null;
}

export interface UpdateExpenseInput {
  expenseDate?: string;
  amount?: bigint;
  memo?: string | null;
}

@Injectable()
export class ExpensesRepository {
  constructor(
    @InjectRepository(Expense)
    private readonly repo: Repository<Expense>,
  ) {}

  create(input: CreateExpenseInput): Promise<Expense> {
    const entity = this.repo.create({
      userId: input.userId,
      expenseDate: input.expenseDate,
      amount: input.amount,
      memo: input.memo,
    });
    return this.repo.save(entity);
  }

  findByIdForUser(id: string, userId: string): Promise<Expense | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async listForUser(
    userId: string,
    pagination: { offset: number; limit: number },
  ): Promise<{ items: Expense[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      where: { userId },
      order: { expenseDate: 'DESC', id: 'DESC' },
      skip: pagination.offset,
      take: pagination.limit,
    });
    return { items, total };
  }

  async updateForUser(
    id: string,
    userId: string,
    patch: UpdateExpenseInput,
  ): Promise<Expense | null> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return null;
    if (patch.expenseDate !== undefined) existing.expenseDate = patch.expenseDate;
    if (patch.amount !== undefined) existing.amount = patch.amount;
    if (patch.memo !== undefined) existing.memo = patch.memo;
    return this.repo.save(existing);
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}
