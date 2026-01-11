
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
    rollupOptions: {
      plugins: [nodePolyfills()],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['html2pdf.js', 'recharts']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  },
  preview: {
    allowedHosts: ["prorun-lb.onrender.com", "prorun-lb-ouqk.onrender.com"]
  }
});
