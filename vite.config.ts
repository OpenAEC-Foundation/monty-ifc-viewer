import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3005,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['web-ifc'],
  },
});
