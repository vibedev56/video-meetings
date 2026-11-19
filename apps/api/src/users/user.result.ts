import { avatarVersion } from '../avatars/avatar.policy.js';

export interface UserResult {
  id: string;
  email: string;
}

/** Columns `toProfileResult` needs; pass it as `select`. */
export const PROFILE_SELECT = {
  email: true,
  name: true,
  avatarFile: true,
} as const;

/** The profile of the current user, as sent to the client. */
export interface ProfileResult {
  email: string;
  name: string | null;
  hasAvatar: boolean;
  /** Changes with every upload; null without an avatar. Lets clients cache the image. */
  avatarVersion: string | null;
}

/** Builds the client profile from a row selected with `PROFILE_SELECT`. */
export function toProfileResult(user: {
  email: string;
  name: string | null;
  avatarFile: string | null;
}): ProfileResult {
  return {
    email: user.email,
    name: user.name,
    hasAvatar: user.avatarFile !== null,
    avatarVersion: user.avatarFile && avatarVersion(user.avatarFile),
  };
}

/**
 * Returned only to the auth module so it can verify a password. Never send
 * this type to a client.
 */
export interface UserCredentialsResult extends UserResult {
  passwordHash: string;
}
