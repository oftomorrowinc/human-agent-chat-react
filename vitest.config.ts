import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/index.ts',
        'src/components/ui/**',
        'src/types/**',
      ],
      thresholds: {
        // Strict gate for the core renderer + helpers.
        'src/components/Chat.tsx': { lines: 80, functions: 80, branches: 75, statements: 80 },
        'src/components/MessageItem.tsx': {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
        'src/utils/**': { lines: 80, functions: 80, branches: 75, statements: 80 },
        // Optional backend hooks ship at a lower bar — they're opt-in surfaces.
        'src/firebase/**': { lines: 60, functions: 60, branches: 25, statements: 60 },
        'src/supabase/**': { lines: 60, functions: 60, branches: 25, statements: 60 },
      },
    },
  },
});
