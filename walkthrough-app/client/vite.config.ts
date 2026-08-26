import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:4001', changeOrigin: true },
      '/media': { target: 'http://localhost:4001', changeOrigin: true },
      '/media-assets': { target: 'http://localhost:4001', changeOrigin: true },
    },
  },
});
