import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'path';
import type { Plugin } from 'vite';

// SuperCloud workplace (`--mode platform`): the page runs in a sandboxed frame whose CSP allows no inline scripts and no
// other origins. The theme-store sets the theme, so the inline theme script and the Google Fonts link go.
const platformHtml: Plugin = {
  name: 'monty-platform-html',
  apply: 'build',
  transformIndexHtml: (html) =>
    html
      .replace(/\s*<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '')
      .replace(/\s*<script>[\s\S]*?<\/script>/, ''),
};

export default defineConfig(({ mode }) => ({
  plugins: [solidPlugin(), ...(mode === 'platform' ? [platformHtml] : [])],
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
}));
