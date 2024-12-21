import { defineConfig, loadEnv } from "vite";

import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: isDev ? {
      proxy: {
        '/yahoo': {
          target: 'https://query1.finance.yahoo.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yahoo/, ''),
          headers: {
            'Origin': 'https://finance.yahoo.com'
          }
        }
      }
    } : undefined,
    base: env.VITE_BASE_URL || '/',
  };
});
