import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/starline-ui/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
