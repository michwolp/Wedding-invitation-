import { defineConfig } from 'vite';
import { cpSync } from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
  },
  publicDir: false,
  plugins: [
    {
      name: 'copy-static-assets',
      closeBundle() {
        cpSync('assets/red', 'dist/assets/red', { recursive: true });
        cpSync('assets/watercolor', 'dist/assets/watercolor', { recursive: true });
      },
    },
  ],
});
