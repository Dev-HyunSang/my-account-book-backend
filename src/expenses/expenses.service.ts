import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseResponseDto } from './dto/expense.response';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense } from './expense.entity';
import { ExpensesRepository, UpdateExpenseInput } from './expenses.repository';

@Injectable()
export class ExpensesService {
  constructor(private readonly repo: ExpensesRepository) {}

  async create(userId: string, dto: CreateExpenseDto): Promise<ExpenseResponseDto> {
    const amount = this.parseAmount(dto.amount);
    const created = await this.repo.create({
      userId,
      expenseDate: dto.expenseDate,
      amount,
      memo: dto.memo ?? null,
    });
    return this.toResponse(created);
  }

  async list(
    userId: string,
    pagination: { offset: number; limit: number },
  ): Promise<{ items: ExpenseResponseDto[]; total: number; offset: number; limit: number }> {
    const { items, total } = await this.repo.listForUser(userId, pagination);
    return {
      items: items.map((e) => this.toResponse(e)),
      total,
      offset: pagination.offset,
      limit: pagination.limit,
    };
  }

  async findOne(userId: string, id: string): Promise<ExpenseResponseDto> {
    const found = await this.repo.findByIdForUser(id, userId);
    if (!found) throw new NotFoundException('Expense not found');
    return this.toResponse(found);
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto): Promise<ExpenseResponseDto> {
    const patch: UpdateExpenseInput = {};
    if (dto.expenseDate !== undefined) patch.expenseDate = dto.expenseDate;
    if (dto.amount !== undefined) patch.amount = this.parseAmount(dto.amount);
    if (dto.memo !== undefined) patch.memo = dto.memo;
    const updated = await this.repo.updateForUser(id, userId, patch);
    if (!updated) throw new NotFoundException('Expense not found');
    return this.toResponse(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const removed = await this.repo.deleteForUser(id, userId);
    if (!removed) throw new NotFoundException('Expense not found');
  }

  private parseAmount(raw: string): bigint {
    let parsed: bigint;
    try {
      parsed = BigInt(raw);
    } catch {
      throw new BadRequestException('amount must be a valid integer string');
    }
    if (parsed < 0n) {
      throw new BadRequestException('amount must be greater than or equal to 0');
    }
    return parsed;
  }

  private toResponse(expense: Expense): ExpenseResponseDto {
    return {
      id: expense.id,
      expenseDate: expense.expenseDate,
      amount: expense.amount.toString(),
      memo: expense.memo,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }
}
