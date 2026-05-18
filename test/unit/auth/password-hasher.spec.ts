import { PasswordHasher } from '../../../src/auth/services/password-hasher';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('produces an argon2id hash', async () => {
    const hash = await hasher.hash('correct-horse-battery');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('verifies a correct password', async () => {
    const hash = await hasher.hash('correct-horse-battery');
    expect(await hasher.verify(hash, 'correct-horse-battery')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hasher.hash('correct-horse-battery');
    expect(await hasher.verify(hash, 'wrong-password')).toBe(false);
  });

  it('returns false for malformed hashes instead of throwing', async () => {
    expect(await hasher.verify('not-a-hash', 'whatever')).toBe(false);
  });
});
