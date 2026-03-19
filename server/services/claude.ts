import { execFile } from "child_process";
import { SYSTEM_PROMPT, buildUserPrompt } from "../prompt.js";
import type { XTweet } from "./twitter.js";

export interface ClaudePersonaResult {
  archetype: { name: string; emoji: string; description: string };
  traits: string[];
  topics: string[];
  engagementStyle: string;
  audienceType: string;
  gradient: { from: string; mid: string; to: string; accent: string };
  stats: {
    cmoScore: number;
    authority: number;
    clarity: number;
    influence: number;
    growth: number;
    voiceConsistency: number;
    engagementScore: number;
  };
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`;

    execFile(
      "claude",
      ["-p", fullPrompt, "--model", "claude-sonnet-4-20250514"],
      {
        timeout: 60000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env },
      },
      (err, stdout, stderr) => {
        if (err) {
          console.error("Claude CLI error:", stderr);
          reject(new Error(`Claude CLI failed: ${err.message}`));
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}

export async function analyzePersona(
  username: string,
  tweets: XTweet[]
): Promise<ClaudePersonaResult> {
  const userPrompt = buildUserPrompt(username, tweets);
  const raw = await runClaude(userPrompt);

  // Strip any markdown code fences if Claude wraps the JSON
  let jsonStr = raw;
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  let parsed: ClaudePersonaResult;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse Claude response:", raw);
    throw new Error("Claude returned invalid JSON");
  }

  // Basic validation
  if (!parsed.archetype?.name || !parsed.archetype?.emoji || !parsed.stats?.cmoScore) {
    console.error("Claude response missing required fields:", parsed);
    throw new Error("Claude response missing required fields");
  }

  return parsed;
}
