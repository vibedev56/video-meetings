interface ProfileNames {
  name: string | null;
  email: string;
}

/** The name to show for a user: the name if set, otherwise the email. */
export function displayName({ name, email }: ProfileNames): string {
  return name?.trim() || email;
}

/** Up to two uppercase initials from the name, or the first letter of the email. */
export function getInitials({ name, email }: ProfileNames): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const source = words.length > 0 ? words.slice(0, 2) : [email];
  return source
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase();
}
