export interface UserResult {
  id: string;
  email: string;
}

/**
 * Returned only to the auth module so it can verify a password. Never send
 * this type to a client.
 */
export interface UserCredentialsResult extends UserResult {
  passwordHash: string;
}
