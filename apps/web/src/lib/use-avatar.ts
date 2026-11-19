'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { getAvatar } from './api';
import { getAccessToken } from './session';

/**
 * The avatar needs the Bearer token, so it cannot be a plain `<img src>`. It is
 * fetched as a Blob and shown through an object URL. One copy is shared by all
 * avatars on the page (header and profile), keyed by token and a version that
 * `refreshAvatar` bumps after an upload.
 */
let version = 0;
let entry: {
  key: string;
  promise: Promise<string>;
  url: string | null;
} | null = null;
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

function loadAvatarUrl(token: string): Promise<string> {
  const key = `${token}:${version}`;
  if (entry?.key === key) {
    return entry.promise;
  }
  const stale = entry;
  const current: NonNullable<typeof entry> = {
    key,
    url: null,
    promise: getAvatar(token).then((blob) => {
      const url = URL.createObjectURL(blob);
      current.url = url;
      if (entry !== current) {
        // Superseded or cleared while loading: nobody will use this URL.
        URL.revokeObjectURL(url);
      }
      if (stale?.url) {
        URL.revokeObjectURL(stale.url);
      }
      return url;
    }),
  };
  entry = current;
  // A failed load must not be cached: the next render may retry.
  current.promise.catch(() => {
    if (entry === current) {
      entry = null;
    }
  });
  return current.promise;
}

/** Call after the avatar was uploaded or replaced, so every avatar reloads. */
export function refreshAvatar() {
  version += 1;
  emit();
}

/** Drops the loaded avatar, for example on logout. */
export function clearAvatarCache() {
  if (entry?.url) {
    URL.revokeObjectURL(entry.url);
  }
  entry = null;
  version += 1;
  emit();
}

/**
 * Object URL of the current user's avatar, or null when there is none, it is
 * still loading or loading failed (the caller then shows initials).
 */
export function useAvatarUrl(hasAvatar: boolean): string | null {
  const currentVersion = useSyncExternalStore(subscribe, getVersion, () => 0);
  const [loaded, setLoaded] = useState<{
    version: number;
    url: string | null;
  } | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!hasAvatar || !token) {
      return;
    }
    let isCancelled = false;
    loadAvatarUrl(token).then(
      (url) => {
        if (!isCancelled) {
          setLoaded({ version: currentVersion, url });
        }
      },
      () => {
        if (!isCancelled) {
          setLoaded({ version: currentVersion, url: null });
        }
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [hasAvatar, currentVersion]);

  return hasAvatar && loaded?.version === currentVersion ? loaded.url : null;
}
