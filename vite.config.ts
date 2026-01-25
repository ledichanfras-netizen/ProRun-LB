
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'recharts'],
          'pdf-vendor': ['html2pdf.js'],
          'ai-vendor': ['@google/genai']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  },
  preview: {
    allowedHosts: ['.onrender.com']
  }
});
