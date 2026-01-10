
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import nodePolyfills from 'rollup-plugin-polyfill-node';

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      plugins: [nodePolyfills()],
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'recharts': ['recharts'],
          'vendor': ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'html2pdf.js'],
        },
      },
    }
  },
  server: {
    port: 3000,
    host: true
  },
  preview: {
    allowedHosts: ["prorun-lb.onrender.com"]
  }
});
