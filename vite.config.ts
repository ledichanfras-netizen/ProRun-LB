import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega as envs do sistema (como as do Render)
  // Fix: Cast process to any to resolve 'Property cwd does not exist on type Process' TS error in vite.config.ts
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Removido o bloco 'define' para process.env pois o Vite recomenda import.meta.env
    // e o uso de define estava causando falhas na injeção das chaves em produção.
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1000 // Aumentado para evitar alertas comuns em projetos com Recharts/Firebase
    },
    server: {
      port: 3000
    },
    preview: {
      allowedHosts: ['.onrender.com'] // Permite subdomínios do Render no preview
    }
  };
});
