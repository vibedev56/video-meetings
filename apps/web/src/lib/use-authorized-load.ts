'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { redirectToLoginIfUnauthorized, requireAccessToken } from './session';

export type LoadState<T> =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

/**
 * Loads data that needs the access token. A missing token or a 401 sends the
 * user to the login page; other failures give the `error` state, and `reload`
 * tries again. `load` must be a stable reference (a module-level function).
 */
export function useAuthorizedLoad<T>(load: (token: string) => Promise<T>) {
  const router = useRouter();
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const token = requireAccessToken(router);
    if (!token) {
      return;
    }

    let isCancelled = false;
    load(token).then(
      (data) => {
        if (!isCancelled) {
          setState({ status: 'ready', data });
        }
      },
      (error: unknown) => {
        if (isCancelled || redirectToLoginIfUnauthorized(error, router)) {
          return;
        }
        setState({ status: 'error' });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [router, load, reloadKey]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setReloadKey((key) => key + 1);
  }, []);

  return { state, reload };
}
