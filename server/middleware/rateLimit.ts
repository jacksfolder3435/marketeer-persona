import rateLimit from "express-rate-limit";

export const personaRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in a minute." },
  keyGenerator: (req) => {
    return req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
  },
});
