/** localStorage key for the access token. Shared by the login, register and home pages. */
const ACCESS_TOKEN_KEY = 'accessToken';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    // Storage can be blocked (private mode, disabled cookies). Treat as logged out.
    return null;
  }
}

export function saveAccessToken(token: string) {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // Without storage the user will simply be asked to log in again.
  }
}

export function clearAccessToken() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/**
 * Reads the `email` claim from the JWT payload for display only. The signature
 * is not checked here: the API verifies the token on every protected request.
 * Returns null when the token is malformed.
 */
export function getEmailFromToken(token: string): string | null {
  const payloadPart = token.split('.')[1];
  if (!payloadPart) {
    return null;
  }

  try {
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
      email?: unknown;
    };
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}
