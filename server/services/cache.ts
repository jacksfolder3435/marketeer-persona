import { getDb } from "../db/connection.js";
import crypto from "crypto";

const CACHE_TTL_HOURS = parseInt(process.env.CACHE_TTL_HOURS || "168", 10); // 7 days default

export interface CachedPersona {
  persona_json: string;
  tweets_json: string;
  created_at: string;
}

export function getCachedPersona(username: string): CachedPersona | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT persona_json, tweets_json, created_at
       FROM personas
       WHERE username = ? AND expires_at > datetime('now')`
    )
    .get(username.toLowerCase()) as CachedPersona | undefined;

  return row || null;
}

export function cachePersona(
  username: string,
  twitterUserId: string | null,
  tweetsJson: string,
  personaJson: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO personas (username, twitter_user_id, tweets_json, persona_json, created_at, expires_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+${CACHE_TTL_HOURS} hours'))`
  ).run(username.toLowerCase(), twitterUserId, tweetsJson, personaJson);
}

export function recordLookup(username: string, ip: string): void {
  const db = getDb();
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
  db.prepare(
    `INSERT INTO lookups (username, ip_hash, created_at) VALUES (?, ?, datetime('now'))`
  ).run(username.toLowerCase(), ipHash);
}
