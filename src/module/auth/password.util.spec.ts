import { describe, expect, it } from 'bun:test';
import { hashPassword, verifyPassword } from './password.util';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct-horse-battery');

    expect(stored.startsWith('scrypt:')).toBe(true);
    expect(stored).not.toContain('correct-horse-battery');
    expect(await verifyPassword('correct-horse-battery', stored)).toBe(true);
    expect(await verifyPassword('wrong-horse-battery', stored)).toBe(false);
  });

  it('salts every hash, so equal passwords give different hashes', async () => {
    expect(await hashPassword('same-password-twice')).not.toBe(
      await hashPassword('same-password-twice'),
    );
  });

  it('rejects a stored value in an unknown format', async () => {
    expect(await verifyPassword('anything', 'plain-text')).toBe(false);
  });
});
