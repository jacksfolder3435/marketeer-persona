import { Router } from "express";
import { validateUsername } from "../middleware/validate.js";
import { personaRateLimit } from "../middleware/rateLimit.js";
import { fetchTweets } from "../services/twitter.js";
import { analyzePersona } from "../services/claude.js";
import { getCachedPersona, cachePersona, recordLookup } from "../services/cache.js";

const router = Router();

router.post("/", personaRateLimit, validateUsername, async (req, res) => {
  const { username } = req.body;
  const clientIp = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";

  try {
    // Record the lookup for analytics
    recordLookup(username, clientIp);

    // Check cache first
    const cached = getCachedPersona(username);
    if (cached) {
      console.log(`Cache hit for @${username}`);
      const persona = JSON.parse(cached.persona_json);
      return res.json({ ...persona, cached: true, analyzedAt: cached.created_at });
    }

    console.log(`Cache miss for @${username} — fetching tweets...`);

    // Fetch tweets from X API
    const tweets = await fetchTweets(username);
    console.log(`Fetched ${tweets.length} tweets for @${username}`);

    // Analyze with Claude CLI
    console.log(`Analyzing persona for @${username} with Claude...`);
    const claudeResult = await analyzePersona(username, tweets);

    // Calculate real engagement metrics from tweet data
    const totalLikes = tweets.reduce((s, t) => s + (t.public_metrics?.like_count || 0), 0);
    const totalRts = tweets.reduce((s, t) => s + (t.public_metrics?.retweet_count || 0), 0);
    const totalImpressions = tweets.reduce((s, t) => s + (t.public_metrics?.impression_count || 0), 0);
    const engagementRate = totalImpressions > 0
      ? ((totalLikes + totalRts) / totalImpressions * 100).toFixed(1) + "%"
      : "N/A";

    // Build the full PersonaResult matching the frontend interface
    const personaResult = {
      username,
      archetype: claudeResult.archetype,
      traits: claudeResult.traits,
      topics: claudeResult.topics,
      engagementStyle: claudeResult.engagementStyle,
      audienceType: claudeResult.audienceType,
      gradient: claudeResult.gradient,
      stats: {
        analyzed: tweets.length,
        engagement: engagementRate,
        reach: totalImpressions > 1000
          ? `${Math.round(totalImpressions / 1000)}K`
          : String(totalImpressions),
        cmoScore: claudeResult.stats.cmoScore,
        authority: claudeResult.stats.authority,
        clarity: claudeResult.stats.clarity,
        influence: claudeResult.stats.influence,
        growth: claudeResult.stats.growth,
        voiceConsistency: claudeResult.stats.voiceConsistency,
        engagementScore: claudeResult.stats.engagementScore,
      },
    };

    // Cache the result
    cachePersona(
      username,
      null,
      JSON.stringify(tweets),
      JSON.stringify(personaResult)
    );

    console.log(`Persona generated for @${username}: ${claudeResult.archetype.name}`);
    res.json({ ...personaResult, cached: false, analyzedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error(`Error analyzing @${username}:`, err.message);

    if (err.message.includes("not found")) {
      return res.status(404).json({ error: `User @${username} not found on X` });
    }
    if (err.message.includes("No public tweets")) {
      return res.status(404).json({ error: `No public tweets found for @${username}` });
    }
    if (err.message.includes("X API error 429")) {
      return res.status(502).json({ error: "X API rate limit reached. Try again in a few minutes." });
    }
    if (err.message.includes("Claude")) {
      return res.status(502).json({ error: "AI analysis temporarily unavailable. Try again shortly." });
    }

    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
