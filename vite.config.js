import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './', // chemins relatifs : le build peut être servi depuis n'importe quel dossier
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // maplibre-gl (≈ 1 Mo) est chargé à part, en import dynamique.
    chunkSizeWarningLimit: 2000,
  },
});
