interface ProfileNames {
  name: string | null;
  email: string;
}

/** A letter, a digit or an emoji: what makes a good avatar initial. */
const INITIAL_PATTERN = /[\p{L}\p{N}\p{Extended_Pictographic}]/u;

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: 'grapheme',
});

/**
 * The first user-visible character of `text` that is a letter, a digit or an
 * emoji (skipping quotes, brackets, `@` and the like), or null if there is none.
 * Works on whole graphemes, so an emoji with joiners (`👩‍💻`) is not cut apart.
 */
function firstInitial(text: string): string | null {
  for (const { segment } of graphemeSegmenter.segment(text)) {
    if (INITIAL_PATTERN.test(segment)) {
      return segment;
    }
  }
  return null;
}

/** The name to show for a user: the name if set, otherwise the email. */
export function displayName({ name, email }: ProfileNames): string {
  return name?.trim() || email;
}

/**
 * Up to two uppercase initials from the first two words of the name. If the
 * name has none, the first letter of the email.
 */
export function getInitials({ name, email }: ProfileNames): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = words
    .map(firstInitial)
    .filter((initial): initial is string => initial !== null)
    .slice(0, 2);

  if (initials.length === 0) {
    initials.push(firstInitial(email) ?? '');
  }
  return initials.join('').toUpperCase();
}
