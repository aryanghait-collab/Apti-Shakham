import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Base URL for the app (for deployment under subpath)
    // Set VITE_BASE_URL in .env.local to change (e.g., '/assessment/')
    base: env.VITE_BASE_URL || '/',

    plugins: [react()],

    server: {
      // Expose to local network
      host: '0.0.0.0',
      port: 5173,
      // Proxy API requests to backend
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:8000',
          changeOrigin: true,
        }
      }
    },

    build: {
      outDir: 'dist',
      sourcemap: true,
    }
  };
});
