import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * Static-only build. Emits a plain dist-static/ folder of HTML/CSS/JS that can
 * be dropped on any static host (Cloudflare Pages, Netlify, Vercel, GitHub Pages,
 * or plain nginx). No Express server, no database, no API key on the server.
 *
 * Relative base ("./") keeps asset URLs working when hosted under a
 * subdirectory such as GitHub Pages' /<repo>/ path.
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      // Static hosts only auto-serve index.html, so rename our entry file.
      name: 'rename-static-entry',
      closeBundle() {
        const dir = path.resolve(__dirname, 'dist-static');
        const from = path.join(dir, 'index_static.html');
        const to = path.join(dir, 'index.html');
        if (fs.existsSync(from)) fs.renameSync(from, to);
      },
    },
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist-static',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index_static.html'),
    },
  },
});