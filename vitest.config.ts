import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['backend/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      all: false,
      include: ['src/utils/**/*.ts'],
      exclude: ['**/*.test.ts', 'backend/**', 'node_modules/**', 'dist/**']
    }
  }
});
