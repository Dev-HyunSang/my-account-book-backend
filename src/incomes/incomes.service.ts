import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateIncomeDto } from './dto/create-income.dto';
import { IncomeResponseDto } from './dto/income.response';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { Income } from './income.entity';
import { IncomesRepository, UpdateIncomeInput } from './incomes.repository';

@Injectable()
export class IncomesService {
  constructor(private readonly repo: IncomesRepository) {}

  async create(userId: string, dto: CreateIncomeDto): Promise<IncomeResponseDto> {
    const amount = this.parseAmount(dto.amount);
    const created = await this.repo.create({
      userId,
      incomeDate: dto.incomeDate,
      amount,
      memo: dto.memo ?? null,
    });
    return this.toResponse(created);
  }

  async list(
    userId: string,
    pagination: { offset: number; limit: number },
  ): Promise<{ items: IncomeResponseDto[]; total: number; offset: number; limit: number }> {
    const { items, total } = await this.repo.listForUser(userId, pagination);
    return {
      items: items.map((i) => this.toResponse(i)),
      total,
      offset: pagination.offset,
      limit: pagination.limit,
    };
  }

  async findOne(userId: string, id: string): Promise<IncomeResponseDto> {
    const found = await this.repo.findByIdForUser(id, userId);
    if (!found) throw new NotFoundException('Income not found');
    return this.toResponse(found);
  }

  async update(userId: string, id: string, dto: UpdateIncomeDto): Promise<IncomeResponseDto> {
    const patch: UpdateIncomeInput = {};
    if (dto.incomeDate !== undefined) patch.incomeDate = dto.incomeDate;
    if (dto.amount !== undefined) patch.amount = this.parseAmount(dto.amount);
    if (dto.memo !== undefined) patch.memo = dto.memo;
    const updated = await this.repo.updateForUser(id, userId, patch);
    if (!updated) throw new NotFoundException('Income not found');
    return this.toResponse(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const removed = await this.repo.deleteForUser(id, userId);
    if (!removed) throw new NotFoundException('Income not found');
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

  private toResponse(income: Income): IncomeResponseDto {
    return {
      id: income.id,
      incomeDate: income.incomeDate,
      amount: income.amount.toString(),
      memo: income.memo,
      createdAt: income.createdAt,
      updatedAt: income.updatedAt,
    };
  }
}
