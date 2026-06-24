import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Expense } from '../../../src/expenses/expense.entity';
import { ExpensesService } from '../../../src/expenses/expenses.service';

function buildExpense(overrides: Partial<Expense> = {}): Expense {
  const now = new Date('2026-05-17T00:00:00.000Z');
  return {
    id: 'e-1',
    userId: 'u-1',
    expenseDate: '2026-05-17',
    amount: 12000n,
    memo: '점심 식대',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ExpensesService', () => {
  let repo: {
    create: jest.Mock;
    findByIdForUser: jest.Mock;
    listForUser: jest.Mock;
    updateForUser: jest.Mock;
    deleteForUser: jest.Mock;
  };
  let service: ExpensesService;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findByIdForUser: jest.fn(),
      listForUser: jest.fn(),
      updateForUser: jest.fn(),
      deleteForUser: jest.fn(),
    };
    service = new ExpensesService(repo as never);
  });

  describe('create', () => {
    it('parses the amount to bigint and persists the new entry', async () => {
      repo.create.mockResolvedValue(buildExpense());

      const result = await service.create('u-1', {
        expenseDate: '2026-05-17',
        amount: '12000',
        memo: '점심 식대',
      });

      expect(repo.create).toHaveBeenCalledWith({
        userId: 'u-1',
        expenseDate: '2026-05-17',
        amount: 12000n,
        memo: '점심 식대',
      });
      expect(result).toEqual({
        id: 'e-1',
        expenseDate: '2026-05-17',
        amount: '12000',
        memo: '점심 식대',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('defaults memo to null when omitted', async () => {
      repo.create.mockResolvedValue(buildExpense({ memo: null }));

      await service.create('u-1', { expenseDate: '2026-05-17', amount: '1000' });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ memo: null }));
    });

    it('rejects negative amounts with 400', async () => {
      await expect(
        service.create('u-1', { expenseDate: '2026-05-17', amount: '-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects non-integer strings with 400', async () => {
      await expect(
        service.create('u-1', { expenseDate: '2026-05-17', amount: 'not-a-number' }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('serializes amounts to strings and echoes pagination', async () => {
      repo.listForUser.mockResolvedValue({
        items: [
          buildExpense({ id: 'e-1', amount: 1000n }),
          buildExpense({ id: 'e-2', amount: 2000n }),
        ],
        total: 2,
      });

      const result = await service.list('u-1', { offset: 0, limit: 50 });

      expect(repo.listForUser).toHaveBeenCalledWith('u-1', { offset: 0, limit: 50 });
      expect(result.items.map((e) => e.amount)).toEqual(['1000', '2000']);
      expect(result.total).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(50);
    });
  });

  describe('findOne', () => {
    it('returns the expense when owned by the user', async () => {
      repo.findByIdForUser.mockResolvedValue(buildExpense());

      const result = await service.findOne('u-1', 'e-1');

      expect(repo.findByIdForUser).toHaveBeenCalledWith('e-1', 'u-1');
      expect(result.id).toBe('e-1');
    });

    it('throws NotFoundException when the expense does not exist or belongs to another user', async () => {
      repo.findByIdForUser.mockResolvedValue(null);

      await expect(service.findOne('u-1', 'e-other')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('applies a partial patch, re-parsing amount to bigint', async () => {
      repo.updateForUser.mockResolvedValue(
        buildExpense({ expenseDate: '2026-06-01', amount: 24000n, memo: '저녁 회식' }),
      );

      const result = await service.update('u-1', 'e-1', {
        expenseDate: '2026-06-01',
        amount: '24000',
        memo: '저녁 회식',
      });

      expect(repo.updateForUser).toHaveBeenCalledWith('e-1', 'u-1', {
        expenseDate: '2026-06-01',
        amount: 24000n,
        memo: '저녁 회식',
      });
      expect(result.amount).toBe('24000');
    });

    it('only passes provided fields to the repository (omits undefined keys)', async () => {
      repo.updateForUser.mockResolvedValue(buildExpense({ memo: null }));

      await service.update('u-1', 'e-1', { memo: null });

      expect(repo.updateForUser).toHaveBeenCalledWith('e-1', 'u-1', { memo: null });
    });

    it('throws NotFoundException when the row does not exist for the user', async () => {
      repo.updateForUser.mockResolvedValue(null);

      await expect(service.update('u-1', 'e-missing', { memo: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects negative amounts before hitting the repo', async () => {
      await expect(service.update('u-1', 'e-1', { amount: '-5' })).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.updateForUser).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('resolves when the repo confirms deletion', async () => {
      repo.deleteForUser.mockResolvedValue(true);

      await expect(service.remove('u-1', 'e-1')).resolves.toBeUndefined();
      expect(repo.deleteForUser).toHaveBeenCalledWith('e-1', 'u-1');
    });

    it('throws NotFoundException when the row was not found for the user', async () => {
      repo.deleteForUser.mockResolvedValue(false);

      await expect(service.remove('u-1', 'e-missing')).rejects.toThrow(NotFoundException);
    });
  });
});
