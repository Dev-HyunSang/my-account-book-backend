import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Income } from '../../../src/incomes/income.entity';
import { IncomesService } from '../../../src/incomes/incomes.service';

function buildIncome(overrides: Partial<Income> = {}): Income {
  const now = new Date('2026-05-17T00:00:00.000Z');
  return {
    id: 'i-1',
    userId: 'u-1',
    incomeDate: '2026-05-17',
    amount: 1500000n,
    memo: '5월 월급',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('IncomesService', () => {
  let repo: {
    create: jest.Mock;
    findByIdForUser: jest.Mock;
    listForUser: jest.Mock;
    updateForUser: jest.Mock;
    deleteForUser: jest.Mock;
  };
  let service: IncomesService;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findByIdForUser: jest.fn(),
      listForUser: jest.fn(),
      updateForUser: jest.fn(),
      deleteForUser: jest.fn(),
    };
    service = new IncomesService(repo as never);
  });

  describe('create', () => {
    it('parses the amount to bigint and persists the new entry', async () => {
      repo.create.mockResolvedValue(buildIncome());

      const result = await service.create('u-1', {
        incomeDate: '2026-05-17',
        amount: '1500000',
        memo: '5월 월급',
      });

      expect(repo.create).toHaveBeenCalledWith({
        userId: 'u-1',
        incomeDate: '2026-05-17',
        amount: 1500000n,
        memo: '5월 월급',
      });
      expect(result).toEqual({
        id: 'i-1',
        incomeDate: '2026-05-17',
        amount: '1500000',
        memo: '5월 월급',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('defaults memo to null when omitted', async () => {
      repo.create.mockResolvedValue(buildIncome({ memo: null }));

      await service.create('u-1', { incomeDate: '2026-05-17', amount: '1000' });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ memo: null }));
    });

    it('rejects negative amounts with 400', async () => {
      await expect(
        service.create('u-1', { incomeDate: '2026-05-17', amount: '-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects non-integer strings with 400', async () => {
      await expect(
        service.create('u-1', { incomeDate: '2026-05-17', amount: 'not-a-number' }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('serializes amounts to strings and echoes pagination', async () => {
      repo.listForUser.mockResolvedValue({
        items: [
          buildIncome({ id: 'i-1', amount: 1000n }),
          buildIncome({ id: 'i-2', amount: 2000n }),
        ],
        total: 2,
      });

      const result = await service.list('u-1', { offset: 0, limit: 50 });

      expect(repo.listForUser).toHaveBeenCalledWith('u-1', { offset: 0, limit: 50 });
      expect(result.items.map((i) => i.amount)).toEqual(['1000', '2000']);
      expect(result.total).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(50);
    });
  });

  describe('findOne', () => {
    it('returns the income when owned by the user', async () => {
      repo.findByIdForUser.mockResolvedValue(buildIncome());

      const result = await service.findOne('u-1', 'i-1');

      expect(repo.findByIdForUser).toHaveBeenCalledWith('i-1', 'u-1');
      expect(result.id).toBe('i-1');
    });

    it('throws NotFoundException when the income does not exist or belongs to another user', async () => {
      repo.findByIdForUser.mockResolvedValue(null);

      await expect(service.findOne('u-1', 'i-other')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('applies a partial patch, re-parsing amount to bigint', async () => {
      repo.updateForUser.mockResolvedValue(
        buildIncome({ incomeDate: '2026-06-01', amount: 2000000n, memo: '6월 월급' }),
      );

      const result = await service.update('u-1', 'i-1', {
        incomeDate: '2026-06-01',
        amount: '2000000',
        memo: '6월 월급',
      });

      expect(repo.updateForUser).toHaveBeenCalledWith('i-1', 'u-1', {
        incomeDate: '2026-06-01',
        amount: 2000000n,
        memo: '6월 월급',
      });
      expect(result.amount).toBe('2000000');
    });

    it('only passes provided fields to the repository (omits undefined keys)', async () => {
      repo.updateForUser.mockResolvedValue(buildIncome({ memo: null }));

      await service.update('u-1', 'i-1', { memo: null });

      expect(repo.updateForUser).toHaveBeenCalledWith('i-1', 'u-1', { memo: null });
    });

    it('throws NotFoundException when the row does not exist for the user', async () => {
      repo.updateForUser.mockResolvedValue(null);

      await expect(service.update('u-1', 'i-missing', { memo: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects negative amounts before hitting the repo', async () => {
      await expect(service.update('u-1', 'i-1', { amount: '-5' })).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.updateForUser).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('resolves when the repo confirms deletion', async () => {
      repo.deleteForUser.mockResolvedValue(true);

      await expect(service.remove('u-1', 'i-1')).resolves.toBeUndefined();
      expect(repo.deleteForUser).toHaveBeenCalledWith('i-1', 'u-1');
    });

    it('throws NotFoundException when the row was not found for the user', async () => {
      repo.deleteForUser.mockResolvedValue(false);

      await expect(service.remove('u-1', 'i-missing')).rejects.toThrow(NotFoundException);
    });
  });
});
