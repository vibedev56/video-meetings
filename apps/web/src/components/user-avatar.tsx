'use client';

import type { ProfileResponse } from '@/lib/api';
import { getInitials } from '@/lib/profile';
import { useAvatarUrl } from '@/lib/use-avatar';

const SIZE_CLASSES = {
  sm: 'size-9 text-sm',
  lg: 'size-16 text-xl',
} as const;

/** The user's avatar image, or the initials while there is none. Decorative: the name is next to it. */
export function UserAvatar({
  profile,
  size = 'lg',
}: {
  profile: ProfileResponse;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const url = useAvatarUrl(profile.hasAvatar, size === 'sm' ? 'thumb' : 'full');
  const classes = `${SIZE_CLASSES[size]} shrink-0 rounded-full`;

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a blob: URL, next/image cannot optimize it
      <img src={url} alt="" aria-hidden className={`${classes} object-cover`} />
    );
  }
  return (
    <div
      aria-hidden
      className={`${classes} flex items-center justify-center bg-indigo-600 font-semibold text-white`}
    >
      {getInitials(profile)}
    </div>
  );
}
