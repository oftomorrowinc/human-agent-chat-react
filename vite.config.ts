import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

const peerExternals = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'firebase',
  'firebase/app',
  'firebase/firestore',
  '@supabase/supabase-js',
];

const radixExternals = [/^@radix-ui\//];

export default defineConfig(({ mode }) => {
  const isExample = mode === 'example';

  if (isExample) {
    return {
      plugins: [react()],
      resolve: {
        alias: { '@': resolve(__dirname, 'src') },
      },
      root: 'examples',
      server: { port: 5173, open: true },
    };
  }

  return {
    plugins: [
      react(),
      dts({
        entryRoot: 'src',
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        exclude: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
        tsconfigPath: './tsconfig.build.json',
      }),
    ],
    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
    },
    build: {
      target: 'es2022',
      sourcemap: true,
      emptyOutDir: true,
      lib: {
        entry: {
          index: resolve(__dirname, 'src/index.ts'),
          'firebase/index': resolve(__dirname, 'src/firebase/index.ts'),
          'supabase/index': resolve(__dirname, 'src/supabase/index.ts'),
        },
        formats: ['es'],
        fileName: (_format, name) => `${name}.js`,
      },
      rollupOptions: {
        external: [...peerExternals, ...radixExternals],
        output: {
          preserveModules: false,
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'styles.css' || assetInfo.name?.endsWith('.css')) {
              return 'styles.css';
            }
            return assetInfo.name ?? 'asset-[hash][extname]';
          },
        },
      },
      cssCodeSplit: false,
    },
  };
});
