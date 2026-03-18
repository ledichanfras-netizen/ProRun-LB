
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Use the provided database URL
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://prorunlb_user:TorY4TqPzBDnJmLL2da2Tra44PjgidMQ@dpg-d6l41crh46gs73djpoeg-a/prorunlb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Render PostgreSQL
  }
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS athletes (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS workouts_library (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS athlete_plans (
        athlete_id TEXT PRIMARY KEY,
        plan_data JSONB NOT NULL
      );
    `);
    console.log("Database initialized");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
}

async function startServer() {
  await initDb();
  
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  
  // Athletes
  app.get("/api/athletes", async (_req, res) => {
    try {
      const result = await pool.query("SELECT data FROM athletes");
      res.json(result.rows.map(row => row.data));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/athletes", async (req, res) => {
    const athlete = req.body;
    try {
      await pool.query(
        "INSERT INTO athletes (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2",
        [athlete.id, athlete]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/athletes/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM athletes WHERE id = $1", [req.params.id]);
      await pool.query("DELETE FROM athlete_plans WHERE athlete_id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Workouts Library
  app.get("/api/workouts", async (_req, res) => {
    try {
      const result = await pool.query("SELECT data FROM workouts_library");
      res.json(result.rows.map(row => row.data));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/workouts", async (req, res) => {
    const workout = req.body;
    try {
      await pool.query(
        "INSERT INTO workouts_library (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2",
        [workout.id, workout]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/workouts/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM workouts_library WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Athlete Plans
  app.get("/api/plans", async (_req, res) => {
    try {
      const result = await pool.query("SELECT athlete_id, plan_data FROM athlete_plans");
      const plans: Record<string, any> = {};
      result.rows.forEach(row => {
        plans[row.athlete_id] = row.plan_data;
      });
      res.json(plans);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/plans/:athleteId", async (req, res) => {
    const { athleteId } = req.params;
    const plan = req.body;
    try {
      await pool.query(
        "INSERT INTO athlete_plans (athlete_id, plan_data) VALUES ($1, $2) ON CONFLICT (athlete_id) DO UPDATE SET plan_data = $2",
        [athleteId, plan]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
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
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
