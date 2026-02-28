
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1000
    },
    server: {
      port: 3000,
      host: '0.0.0.0'
    },
    preview: {
      allowedHosts: ['.onrender.com']
    }
  };
});
