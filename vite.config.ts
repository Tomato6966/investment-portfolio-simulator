import { defineConfig, loadEnv } from "vite";

import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      proxy: {
        '/yahoo': {
          target: env.VITE_YAHOO_API_URL || 'https://query1.finance.yahoo.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yahoo/, ''),
          headers: {
            'Origin': env.VITE_YAHOO_ORIGIN || 'https://finance.yahoo.com'
          }
        }
      }
    },
    base: env.VITE_BASE_URL || '/',
  };
});
