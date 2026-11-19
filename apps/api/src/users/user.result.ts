export interface UserResult {
  id: string;
  email: string;
}

/** The profile of the current user, as sent to the client. */
export interface ProfileResult {
  email: string;
  name: string | null;
  hasAvatar: boolean;
}

/**
 * Returned only to the auth module so it can verify a password. Never send
 * this type to a client.
 */
export interface UserCredentialsResult extends UserResult {
  passwordHash: string;
}
