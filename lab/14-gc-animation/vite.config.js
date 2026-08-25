import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/tools/GCjourney/' : '/',
  server: {
    port: 3014,
    host: true,
  },
});
