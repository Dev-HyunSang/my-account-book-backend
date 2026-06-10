import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './user.entity';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async create(input: {
    email: string;
    passwordHash: string;
    nickname: string;
    termsAgreedAt: Date;
    privacyAgreedAt: Date;
  }): Promise<User> {
    const entity = this.repo.create({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      nickname: input.nickname,
      termsAgreedAt: input.termsAgreedAt,
      privacyAgreedAt: input.privacyAgreedAt,
    });
    try {
      return await this.repo.save(entity);
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof QueryFailedError &&
      (err as QueryFailedError & { code?: string }).code === PG_UNIQUE_VIOLATION
    );
  }
}
