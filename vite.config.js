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
        cpSync('assets/og-preview.jpg', 'dist/assets/og-preview.jpg');
        cpSync('privacy.html', 'dist/privacy.html');
        cpSync('dashboard.html', 'dist/dashboard.html');
        cpSync('assets/fonts', 'dist/assets/fonts', { recursive: true });
      },
    },
  ],
});
