import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { User } from '../../../src/users/user.entity';
import { UsersRepository } from '../../../src/users/users.repository';

function buildUser(overrides: Partial<User> = {}): User {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'u-1',
    email: 'alice@example.com',
    passwordHash: 'hashed',
    nickname: 'Alice',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('UsersRepository', () => {
  let qb: {
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let repo: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let users: UsersRepository;

  beforeEach(() => {
    qb = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    repo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((input) => input),
      save: jest.fn(),
    };
    users = new UsersRepository(repo as never);
  });

  describe('findByEmail', () => {
    it('queries with case-insensitive comparison and returns the user', async () => {
      const found = buildUser({ email: 'alice@example.com' });
      qb.getOne.mockResolvedValue(found);

      const result = await users.findByEmail('Alice@Example.com');

      expect(qb.where).toHaveBeenCalledWith('LOWER(u.email) = LOWER(:email)', {
        email: 'Alice@Example.com',
      });
      expect(result).toBe(found);
    });

    it('returns null when no user matches', async () => {
      qb.getOne.mockResolvedValue(null);

      await expect(users.findByEmail('missing@x.com')).resolves.toBeNull();
      expect(qb.where).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('looks up by id via findOne and returns the user', async () => {
      const found = buildUser();
      repo.findOne.mockResolvedValue(found);

      const result = await users.findById('u-1');

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'u-1' } });
      expect(result).toBe(found);
    });

    it('returns null when id does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(users.findById('nope')).resolves.toBeNull();
    });
  });

  describe('deleteById', () => {
    it('delegates to repo.delete with the id and resolves void', async () => {
      await expect(users.deleteById('u-1')).resolves.toBeUndefined();

      expect(repo.delete).toHaveBeenCalledWith({ id: 'u-1' });
    });
  });

  describe('create', () => {
    it('lowercases email, builds the entity, and saves it', async () => {
      const saved = buildUser({ id: 'u-new', email: 'a@b.com' });
      repo.save.mockResolvedValue(saved);

      const result = await users.create({
        email: 'A@B.com',
        passwordHash: 'hashed',
        nickname: 'Alice',
      });

      expect(repo.create).toHaveBeenCalledWith({
        email: 'a@b.com',
        passwordHash: 'hashed',
        nickname: 'Alice',
      });
      expect(repo.save).toHaveBeenCalledWith({
        email: 'a@b.com',
        passwordHash: 'hashed',
        nickname: 'Alice',
      });
      expect(result).toBe(saved);
    });

    it('throws ConflictException on Postgres unique violation (23505)', async () => {
      const err = Object.assign(new QueryFailedError('q', [], new Error()), { code: '23505' });
      repo.save.mockRejectedValue(err);

      await expect(
        users.create({ email: 'dup@x.com', passwordHash: 'h', nickname: 'Dup' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        users.create({ email: 'dup@x.com', passwordHash: 'h', nickname: 'Dup' }),
      ).rejects.toThrow('Email already registered');
    });

    it('rethrows QueryFailedError with non-unique code untouched', async () => {
      const err = Object.assign(new QueryFailedError('q', [], new Error()), { code: '23502' });
      repo.save.mockRejectedValue(err);

      await expect(
        users.create({ email: 'x@y.com', passwordHash: 'h', nickname: 'X' }),
      ).rejects.toBe(err);
    });

    it('rethrows non-QueryFailedError errors untouched', async () => {
      const err = new Error('connection lost');
      repo.save.mockRejectedValue(err);

      await expect(
        users.create({ email: 'x@y.com', passwordHash: 'h', nickname: 'X' }),
      ).rejects.toBe(err);
    });
  });
});
