import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev playground only.
 *
 * The library itself is built with `tsup` (see `tsup.config.ts`). This
 * config exists so `pnpm dev` can serve `examples/` with HMR.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  root: 'examples',
  server: { port: 5173, open: true },
});
