import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initializeDatabase } from "./db/schema.js";
import personaRouter from "./routes/persona.js";
import healthRouter from "./routes/health.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3001", 10);
const BASE = "/marketeer-persona";

// Initialize database
initializeDatabase();
console.log("Database initialized");

const app = express();

// Trust proxy for rate limiting behind nginx
app.set("trust proxy", 1);

// Parse JSON bodies
app.use(express.json());

// API routes
app.use(`${BASE}/api/persona`, personaRouter);
app.use(`${BASE}/api/health`, healthRouter);

// Serve static frontend build
const distPath = path.resolve(__dirname, "../dist");
app.use(BASE, express.static(distPath));

// SPA fallback — serve index.html for any non-API route under /marketeer-persona
app.get(`${BASE}/*`, (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Also handle /marketeer-persona without trailing slash
app.get(BASE, (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Marketeer Persona server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}${BASE}/`);
  console.log(`API:      http://localhost:${PORT}${BASE}/api/health`);
});
