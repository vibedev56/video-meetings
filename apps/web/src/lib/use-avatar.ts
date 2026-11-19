'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { getAvatar } from './api';
import { getAccessToken } from './session';

/** `thumb` is the small 128 px image for the header; `full` is the original. */
export type AvatarSize = 'thumb' | 'full';

type Entry = {
  key: string;
  promise: Promise<string>;
  url: string | null;
};

/**
 * The avatar needs the Bearer token, so it cannot be a plain `<img src>`. It is
 * fetched as a Blob and shown through an object URL. One copy per size is
 * shared by all avatars of that size on the page, keyed by token and a version
 * that `refreshAvatar` bumps after an upload.
 */
let version = 0;
const entries: Record<AvatarSize, Entry | null> = { thumb: null, full: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getVersion() {
  return version;
}

function fetchAvatar(token: string, size: AvatarSize): Promise<Blob> {
  return size === 'thumb' ? getAvatar(token, 'thumb') : getAvatar(token);
}

function loadAvatarUrl(token: string, size: AvatarSize): Promise<string> {
  const key = `${token}:${version}`;
  const existing = entries[size];
  if (existing?.key === key) {
    return existing.promise;
  }
  const stale = existing;
  const current: Entry = {
    key,
    url: null,
    promise: fetchAvatar(token, size).then((blob) => {
      const url = URL.createObjectURL(blob);
      current.url = url;
      if (entries[size] !== current) {
        // Superseded or cleared while loading: nobody will use this URL.
        URL.revokeObjectURL(url);
      }
      return url;
    }),
  };
  entries[size] = current;
  // The previous URL is released whether the new load succeeded or failed.
  // A failed load must not be cached: the next render may retry.
  current.promise
    .catch(() => {
      if (entries[size] === current) {
        entries[size] = null;
      }
    })
    .finally(() => {
      if (stale?.url) {
        URL.revokeObjectURL(stale.url);
      }
    });
  return current.promise;
}

function dropEntries() {
  for (const size of ['thumb', 'full'] as const) {
    const entry = entries[size];
    if (entry?.url) {
      URL.revokeObjectURL(entry.url);
    }
    entries[size] = null;
  }
  version += 1;
  emit();
}

/** Call after the avatar was uploaded or replaced, so every avatar reloads. */
export function refreshAvatar() {
  version += 1;
  emit();
}

/** Releases the loaded avatar after it was deleted. */
export function forgetAvatar() {
  dropEntries();
}

/** Drops the loaded avatar, for example on logout. */
export function clearAvatarCache() {
  dropEntries();
}

/**
 * Object URL of the current user's avatar, or null when there is none, the
 * first load is pending or loading failed (the caller then shows initials).
 * While a replacement loads, the previous image stays visible.
 */
export function useAvatarUrl(
  hasAvatar: boolean,
  size: AvatarSize = 'full',
): string | null {
  const currentVersion = useSyncExternalStore(subscribe, getVersion, () => 0);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!hasAvatar || !token) {
      return;
    }
    let isCancelled = false;
    loadAvatarUrl(token, size).then(
      (url) => {
        if (!isCancelled) {
          setLoadedUrl(url);
        }
      },
      () => {
        if (!isCancelled) {
          setLoadedUrl(null);
        }
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [hasAvatar, currentVersion, size]);

  return hasAvatar ? loadedUrl : null;
}
