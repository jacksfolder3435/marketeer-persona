import type { PersonaResult } from "./personaGenerator";

export async function analyzePersona(username: string): Promise<PersonaResult> {
  const res = await fetch("/marketeer-persona/api/persona", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Analysis failed" }));
    throw new Error(err.error || `Analysis failed (${res.status})`);
  }

  return res.json();
}
