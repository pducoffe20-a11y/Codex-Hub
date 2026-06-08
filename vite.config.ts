import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic'
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});
