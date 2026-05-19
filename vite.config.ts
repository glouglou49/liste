import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import electron from 'vite-plugin-electron/simple';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(), 
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            build: {
              rollupOptions: {
                external: [
                  'better-sqlite3'
                ]
              }
            }
          }
        },
        preload: {
          input: 'electron/preload.ts',
        },
      }),
    ],
    build: {
      minify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-pdf':   ['jspdf', 'jspdf-autotable'],
            'vendor-xlsx':  ['xlsx'],
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion'],
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: { ignored: ['**/*.list', '**/*.db', '**/*.sqlite', '**/config.json'] }
    },
  };
});
