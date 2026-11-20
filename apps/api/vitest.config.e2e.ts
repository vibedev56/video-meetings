import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Startup recovery is global (it resets every PROCESSING row), so apps
    // booted by parallel spec files would disturb running transcriptions.
    fileParallelism: false,
  },
});
