
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use SQLite for local development to avoid DNS issues with Render internal hostnames
const db = new Database("database.sqlite");

async function initDb() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS athletes (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS workouts_library (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS athlete_plans (
        athlete_id TEXT PRIMARY KEY,
        plan_data TEXT NOT NULL
      );
    `);
    console.log("Database initialized (SQLite)");
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
  app.get("/api/athletes", (_req, res) => {
    try {
      const rows = db.prepare("SELECT data FROM athletes").all() as { data: string }[];
      res.json(rows.map(row => JSON.parse(row.data)));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/athletes", (req, res) => {
    const athlete = req.body;
    try {
      const stmt = db.prepare("INSERT OR REPLACE INTO athletes (id, data) VALUES (?, ?)");
      stmt.run(athlete.id, JSON.stringify(athlete));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/athletes/:id", (req, res) => {
    try {
      const deleteAthlete = db.prepare("DELETE FROM athletes WHERE id = ?");
      const deletePlans = db.prepare("DELETE FROM athlete_plans WHERE athlete_id = ?");
      
      const transaction = db.transaction(() => {
        deleteAthlete.run(req.params.id);
        deletePlans.run(req.params.id);
      });
      
      transaction();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Workouts Library
  app.get("/api/workouts", (_req, res) => {
    try {
      const rows = db.prepare("SELECT data FROM workouts_library").all() as { data: string }[];
      res.json(rows.map(row => JSON.parse(row.data)));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/workouts", (req, res) => {
    const workout = req.body;
    try {
      const stmt = db.prepare("INSERT OR REPLACE INTO workouts_library (id, data) VALUES (?, ?)");
      stmt.run(workout.id, JSON.stringify(workout));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/workouts/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM workouts_library WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Athlete Plans
  app.get("/api/plans", (_req, res) => {
    try {
      const rows = db.prepare("SELECT athlete_id, plan_data FROM athlete_plans").all() as { athlete_id: string, plan_data: string }[];
      const plans: Record<string, any> = {};
      rows.forEach(row => {
        plans[row.athlete_id] = JSON.parse(row.plan_data);
      });
      res.json(plans);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/plans/:athleteId", (req, res) => {
    const { athleteId } = req.params;
    const plan = req.body;
    try {
      const stmt = db.prepare("INSERT OR REPLACE INTO athlete_plans (athlete_id, plan_data) VALUES (?, ?)");
      stmt.run(athleteId, JSON.stringify(plan));
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
