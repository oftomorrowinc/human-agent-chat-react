import { defineConfig } from 'tsup';

/**
 * Library build — dual ESM + CJS with per-format declaration files.
 *
 * Mirrors `~/Github/effective`'s pattern: a single config, `format: ['esm',
 * 'cjs']`, `dts: true` produces both `.d.ts` (for ESM consumers) and `.d.cts`
 * (for CJS / `moduleResolution: 'node16'` consumers).
 *
 * Tailwind preflight + the bundled `dist/styles.css` are produced by the
 * follow-on `build:css` step that runs after tsup.
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'firebase/index': 'src/firebase/index.ts',
    'supabase/index': 'src/supabase/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  platform: 'browser',
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'firebase',
    'firebase/app',
    'firebase/firestore',
    '@supabase/supabase-js',
    /^@radix-ui\//,
  ],
});
