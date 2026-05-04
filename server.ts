
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Routes (Legacy - now handled by Supabase on client)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", database: "supabase" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Mode: Development (using Vite middleware)");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Add a catch-all for troubleshooting dev image 404s
    app.use((req, res, next) => {
      if (req.url.endsWith('.png')) {
        console.warn(`[Dev] PNG request not caught by Vite: ${req.url}`);
      }
      next();
    });
  } else {
    // Serve static files in production
    const rootPath = process.cwd();
    const distPath = path.join(rootPath, "dist");
    
    console.log(`[Server] Mode: Production. Serving from: ${distPath}`);
    
    // In production, everything from public is in dist/
    app.use(express.static(distPath, { 
      redirect: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    
    app.get("*", (req, res) => {
      const isFile = req.path.includes('.');
      if (isFile && !req.path.endsWith('.html')) {
        console.warn(`[Production] 404 static file: ${req.path}`);
        return res.status(404).send('Not found');
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
