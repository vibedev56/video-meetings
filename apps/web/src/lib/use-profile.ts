'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getProfile, type ProfileResponse } from './api';
import { displayName } from './profile';
import { clearAvatarCache } from './use-avatar';
import {
  getAccessToken,
  getEmailFromToken,
  redirectToLoginIfSessionInvalid,
  requireAccessToken,
} from './session';

export type ProfileState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; profile: ProfileResponse };

/**
 * One shared copy of the profile for every page, so moving between `/`,
 * `/profile` and `/profile/edit` does not refetch it. It is keyed by the access
 * token, so a different login never sees the previous user's profile.
 */
let cache: { token: string; profile: ProfileResponse } | null = null;
let inflight: { token: string; promise: Promise<ProfileResponse> } | null =
  null;
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

function getSnapshot(): ProfileResponse | null {
  return cache && cache.token === getAccessToken() ? cache.profile : null;
}

function getServerSnapshot(): ProfileResponse | null {
  return null;
}

/** Fetches the profile once even when several components ask at the same time. */
function fetchProfile(token: string): Promise<ProfileResponse> {
  if (inflight?.token === token) {
    return inflight.promise;
  }
  const tracked: Promise<ProfileResponse> = getProfile(token)
    .then((profile) => {
      cache = { token, profile };
      emit();
      return profile;
    })
    .finally(() => {
      if (inflight?.promise === tracked) {
        inflight = null;
      }
    });
  inflight = { token, promise: tracked };
  return tracked;
}

/** Stores a profile returned by the API (for example after `updateProfile`). */
export function setCachedProfile(profile: ProfileResponse) {
  const token = getAccessToken();
  if (token) {
    cache = { token, profile };
    emit();
  }
}

/** Changes fields of the cached profile, keeping the rest as they are now. */
export function patchCachedProfile(patch: Partial<ProfileResponse>) {
  if (cache && cache.token === getAccessToken()) {
    cache = { token: cache.token, profile: { ...cache.profile, ...patch } };
    emit();
  }
}

/**
 * Drops the cached profile, for example on logout. Also drops the cached
 * avatar (`clearAvatarCache`), so the two never go out of step.
 */
export function clearProfileCache() {
  clearAvatarCache();
  cache = null;
  inflight = null;
  emit();
}

/**
 * The current user's profile. Handles the missing token, 401 and 404 (all
 * redirect to login) and shares one cached copy between all callers.
 * `reload` retries after a failed load.
 */
export function useProfile(): { state: ProfileState; reload: () => void } {
  const router = useRouter();
  const profile = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [hasFailed, setHasFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const token = requireAccessToken(router);
    if (!token || getSnapshot()) {
      return;
    }

    let isCancelled = false;
    fetchProfile(token).catch((error: unknown) => {
      if (isCancelled || redirectToLoginIfSessionInvalid(error, router)) {
        return;
      }
      setHasFailed(true);
    });
    return () => {
      isCancelled = true;
    };
  }, [router, reloadKey]);

  const reload = useCallback(() => {
    setHasFailed(false);
    setReloadKey((key) => key + 1);
  }, []);

  const state: ProfileState = profile
    ? { status: 'ready', profile }
    : hasFailed
      ? { status: 'error' }
      : { status: 'loading' };
  return { state, reload };
}

function subscribeNever() {
  return () => {};
}

function getTokenEmail(): string | null {
  const token = getAccessToken();
  return token ? getEmailFromToken(token) : null;
}

function getServerTokenEmail(): string | null {
  return null;
}

/**
 * The name to show for the current user: the display name once the profile is
 * loaded. Until then (or if it fails) the email from the token, so the text
 * does not jump. Null when neither is known. Safe for server rendering: the
 * token only exists in the browser.
 */
export function useDisplayName(): string | null {
  const { state } = useProfile();
  const tokenEmail = useSyncExternalStore(
    subscribeNever,
    getTokenEmail,
    getServerTokenEmail,
  );
  return state.status === 'ready' ? displayName(state.profile) : tokenEmail;
}
