import { spawn } from "child_process";
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

    const proc = spawn("claude", ["-p", "--model", "claude-sonnet-4-20250514"], {
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        console.error("Claude CLI stderr:", stderr.slice(0, 500));
        reject(new Error(`Claude CLI exited with code ${code}`));
        return;
      }
      resolve(stdout.trim());
    });

    proc.on("error", (err) => {
      reject(new Error(`Claude CLI spawn failed: ${err.message}`));
    });

    // Write prompt to stdin and close
    proc.stdin.write(fullPrompt);
    proc.stdin.end();

    // Timeout after 60 seconds
    setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("Claude CLI timed out after 60 seconds"));
    }, 60000);
  });
}

export async function analyzePersona(
  username: string,
  tweets: XTweet[]
): Promise<ClaudePersonaResult> {
  const userPrompt = buildUserPrompt(username, tweets);
  const raw = await runClaude(userPrompt);

  // Extract JSON from response — handle preamble text, code fences, etc.
  let jsonStr = raw;

  // Try code fences first
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  } else {
    // Find the first { and last } to extract the JSON object
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = raw.slice(firstBrace, lastBrace + 1);
    }
  }

  let parsed: ClaudePersonaResult;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse Claude response:", raw.slice(0, 500));
    throw new Error("Claude returned invalid JSON");
  }

  // Basic validation
  if (!parsed.archetype?.name || !parsed.archetype?.emoji || !parsed.stats?.cmoScore) {
    console.error("Claude response missing required fields:", parsed);
    throw new Error("Claude response missing required fields");
  }

  return parsed;
}
