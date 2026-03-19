export interface PersonaResult {
  username: string;
  archetype: { name: string; emoji: string; description: string };
  traits: string[];
  topics: string[];
  engagementStyle: string;
  audienceType: string;
  gradient: { from: string; mid: string; to: string; accent: string };
  stats: {
    analyzed: number;
    engagement: string;
    reach: string;
    cmoScore: number;
    authority: number;
    clarity: number;
    influence: number;
    growth: number;
    voiceConsistency: number;
    engagementScore: number;
  };
}

export function parseUsername(input: string): string {
  input = input.trim();
  const urlMatch = input.match(/(?:twitter\.com|x\.com)\/([^/?#\s]+)/);
  if (urlMatch) return urlMatch[1].toLowerCase();
  if (input.startsWith("@")) return input.slice(1).toLowerCase();
  return input.toLowerCase();
}
