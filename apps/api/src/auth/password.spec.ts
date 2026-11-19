import { hashPassword, verifyPassword } from './password.js';

describe('password helpers', () => {
  it('hashes with bcrypt and never returns the plain password', async () => {
    const hash = await hashPassword('secret-password');

    expect(hash).not.toBe('secret-password');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('produces a different hash for the same password each time', async () => {
    const first = await hashPassword('secret-password');
    const second = await hashPassword('secret-password');

    expect(first).not.toBe(second);
  });

  it('verifies a matching password and rejects a wrong one', async () => {
    const hash = await hashPassword('secret-password');

    await expect(verifyPassword('secret-password', hash)).resolves.toBe(true);
    await expect(verifyPassword('other-password', hash)).resolves.toBe(false);
  });

  it('returns false when there is no stored hash', async () => {
    await expect(verifyPassword('secret-password', undefined)).resolves.toBe(
      false,
    );
  });
});
