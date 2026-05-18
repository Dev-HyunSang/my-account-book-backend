import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Income } from './income.entity';

export interface CreateIncomeInput {
  userId: string;
  incomeDate: string;
  amount: bigint;
  memo: string | null;
}

export interface UpdateIncomeInput {
  incomeDate?: string;
  amount?: bigint;
  memo?: string | null;
}

@Injectable()
export class IncomesRepository {
  constructor(
    @InjectRepository(Income)
    private readonly repo: Repository<Income>,
  ) {}

  create(input: CreateIncomeInput): Promise<Income> {
    const entity = this.repo.create({
      userId: input.userId,
      incomeDate: input.incomeDate,
      amount: input.amount,
      memo: input.memo,
    });
    return this.repo.save(entity);
  }

  findByIdForUser(id: string, userId: string): Promise<Income | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async listForUser(
    userId: string,
    pagination: { offset: number; limit: number },
  ): Promise<{ items: Income[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      where: { userId },
      order: { incomeDate: 'DESC', id: 'DESC' },
      skip: pagination.offset,
      take: pagination.limit,
    });
    return { items, total };
  }

  async updateForUser(
    id: string,
    userId: string,
    patch: UpdateIncomeInput,
  ): Promise<Income | null> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return null;
    if (patch.incomeDate !== undefined) existing.incomeDate = patch.incomeDate;
    if (patch.amount !== undefined) existing.amount = patch.amount;
    if (patch.memo !== undefined) existing.memo = patch.memo;
    return this.repo.save(existing);
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}
