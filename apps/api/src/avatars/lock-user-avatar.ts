import { NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '../generated/prisma/client.js';

/**
 * Locks the user row (`SELECT ... FOR UPDATE`) and returns its current avatar
 * file name. Holding the lock for the rest of the transaction serializes
 * uploads and deletes, so each old file is removed exactly once.
 *
 * Prisma has no `FOR UPDATE`, hence raw SQL. `users` and `"avatarFile"` are
 * the physical names from `schema.prisma` (`@@map("users")`); renaming them
 * there means updating this query.
 */
export async function lockUserAvatar(
  tx: Pick<PrismaClient, '$queryRaw'>,
  userId: string,
): Promise<string | null> {
  const rows = await tx.$queryRaw<{ avatarFile: string | null }[]>`
    SELECT "avatarFile" FROM users WHERE id = ${userId}
    FOR UPDATE`;

  if (rows.length === 0) {
    throw new NotFoundException('User not found');
  }

  return rows[0].avatarFile;
}
