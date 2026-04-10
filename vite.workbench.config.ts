/**
 * Vite config for the standalone LTspice Workbench dev server.
 * Proxies /api to the workbench-server on port 3002.
 *
 * Usage: npm run workbench:dev
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
});
