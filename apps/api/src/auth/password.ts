import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Compared against when the e-mail is unknown, so a failed login takes about
// as long as a wrong password and doesn't reveal which e-mails are registered.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', SALT_ROUNDS);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(
  password: string,
  passwordHash: string | undefined,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash ?? DUMMY_HASH);
}
