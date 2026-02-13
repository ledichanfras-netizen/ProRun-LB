
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega as envs do sistema (como as do Render)
  // Fix: Cast process to any to resolve 'Property cwd does not exist on type Process' TS error in vite.config.ts
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Importante: Isso substitui process.env.API_KEY no código pelo valor real no momento do build
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false
    },
    server: {
      port: 3000
    }
  };
});
