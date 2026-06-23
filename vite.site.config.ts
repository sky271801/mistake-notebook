import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];

export default defineConfig({
  root: 'website',
  base: repository ? `/${repository}/` : '/',
  plugins: [react()],
  build: {
    outDir: '../dist-site',
    emptyOutDir: true
  },
  server: {
    port: 5174
  },
  preview: {
    port: 4174
  }
});
