import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 开发时把 /api 代理到本地后端 (NestJS, 默认 3000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
