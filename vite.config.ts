import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // Prefer using `import.meta.env.VITE_GEMINI_API_KEY` (available in app code).
      // These define fallbacks for environments that reference `process.env.*`.
      define: {
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ""),
        'process.env.VITE_GOOGLE_API_KEY': JSON.stringify(env.VITE_GOOGLE_API_KEY || ""),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || "")
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },

      build: {
        // Increase warning limit slightly and add explicit manualChunks to split vendor libraries
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks(id: string) {
              if (id.includes('node_modules')) {
                if (id.includes('firebase')) return 'vendor_firebase';
                if (id.includes('@google/genai')) return 'vendor_genai';
                if (id.includes('recharts')) return 'vendor_recharts';
                if (id.includes('lucide-react')) return 'vendor_icons';
                if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor_react';
                return 'vendor';
              }
            }
          }
        }
      },

      base: './',

    };
});
