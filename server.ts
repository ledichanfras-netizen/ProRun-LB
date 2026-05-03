
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const rootPath = process.cwd();
    const distPath = path.join(rootPath, "dist");
    const publicPath = path.join(rootPath, "public");
    
    console.log(`[Production] Serving static files from: ${distPath}`);
    
    // Priority 1: Dist folder (Build assets)
    app.use(express.static(distPath, { 
      redirect: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        }
      }
    }));

    // Priority 2: Public folder (Fallbacks/Raw assets)
    if (path.resolve(distPath) !== path.resolve(publicPath)) {
      app.use(express.static(publicPath, { 
        redirect: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
          }
        }
      }));
    }
    
    app.get("*", (req, res) => {
      // In production, everything from public should be in dist. 
      // If it's a file request that reached here, it's a true 404.
      const isFile = req.path.includes('.');
      const isHtml = req.path.endsWith('.html') || !isFile;

      if (isFile && !isHtml) {
        console.log(`[Production] 404 Resource Not Found: ${req.path}`);
        return res.status(404).send(`Resource not found: ${req.path}`);
      }

      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
