import { afterEach } from 'vitest';

// The profile is cached between pages; tests must not share it. The module is
// imported lazily so that each test file's `vi.mock('next/navigation')` applies.
afterEach(async () => {
  const { clearProfileCache } = await import('@/lib/use-profile');
  clearProfileCache();
});
