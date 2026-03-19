import type { Request, Response, NextFunction } from "express";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{1,15}$/;

export function validateUsername(req: Request, res: Response, next: NextFunction): void {
  let { username } = req.body;

  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  // Strip leading @ if present
  username = username.replace(/^@/, "").trim();

  // Handle full URLs like x.com/username or twitter.com/username
  const urlMatch = username.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
  if (urlMatch) {
    username = urlMatch[1];
  }

  if (!USERNAME_REGEX.test(username)) {
    res.status(400).json({ error: "Invalid X username format" });
    return;
  }

  req.body.username = username;
  next();
}
