import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');  // repo root (pst-nlm/)

const API_BASE_URL = process.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  root,
  publicDir: resolve(root, 'extension/public'),
  define: {
    'import.meta.env.API_BASE_URL': JSON.stringify(API_BASE_URL),
  },
  build: {
    outDir: resolve(root, 'extension/dist'),
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        popup: resolve(root, 'extension/src/popup/popup.tsx'),
        'content-script': resolve(root, 'extension/src/content/content-script.ts'),
        background: resolve(root, 'extension/src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-chunk.js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
