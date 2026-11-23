import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@mirror/core': fileURLToPath(new URL('../core/src', import.meta.url)),
      '@mirror/sync': fileURLToPath(new URL('../sync/src', import.meta.url)),
    },
  },
});
