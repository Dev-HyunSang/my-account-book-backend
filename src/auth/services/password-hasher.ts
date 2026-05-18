import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordHasher {
  private dummyHashPromise: Promise<string> | null = null;

  async hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  // Spend the same CPU as a real verify when the user is missing, so login
  // latency does not reveal whether the email is registered.
  async verifyAgainstDummy(): Promise<void> {
    const dummy = await this.dummyHash();
    await this.verify(dummy, 'invalid-password-for-timing-equalization');
  }

  private dummyHash(): Promise<string> {
    if (!this.dummyHashPromise) {
      this.dummyHashPromise = argon2.hash('dummy-password-for-timing-equalization', ARGON2_OPTIONS);
    }
    return this.dummyHashPromise;
  }
}
