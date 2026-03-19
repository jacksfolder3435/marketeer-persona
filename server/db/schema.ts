import { getDb } from "./connection.js";

export function initializeDatabase(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      twitter_user_id TEXT,
      tweets_json TEXT NOT NULL,
      persona_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_personas_username ON personas(username);
    CREATE INDEX IF NOT EXISTS idx_personas_expires ON personas(expires_at);

    CREATE TABLE IF NOT EXISTS lookups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      ip_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_lookups_username ON lookups(username);
  `);
}
