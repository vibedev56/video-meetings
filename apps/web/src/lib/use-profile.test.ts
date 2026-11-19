import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, saveAccessToken } from './session';
import {
  clearProfileCache,
  patchCachedProfile,
  setCachedProfile,
  useProfile,
} from './use-profile';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const profile = { email: 'a@b.c', name: 'Ann', hasAvatar: false };

describe('patchCachedProfile', () => {
  beforeEach(() => {
    saveAccessToken('token-1');
  });
  afterEach(() => {
    clearAccessToken();
    clearProfileCache();
  });

  it('changes only the given fields and notifies subscribers', () => {
    setCachedProfile(profile);
    const { result } = renderHook(() => useProfile());

    act(() => patchCachedProfile({ hasAvatar: true }));

    expect(result.current.state).toEqual({
      status: 'ready',
      profile: { ...profile, hasAvatar: true },
    });
  });

  it('does nothing when no profile is cached', () => {
    patchCachedProfile({ hasAvatar: true });
    const { result } = renderHook(() => useProfile());

    expect(result.current.state.status).not.toBe('ready');
  });
});
