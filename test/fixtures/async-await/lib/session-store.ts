import "server-only";

// Multi-hop async chain: Page awaits fetchSessionData, which awaits
// lookupSession, which awaits querySessions. Every hop must unwrap `await`
// for the sensitive token to reach the client boundary.
export async function fetchSessionData(sessionId: string) {
  const record = await lookupSession(sessionId);
  return record.token ?? process.env.API_TOKEN;
}

async function lookupSession(sessionId: string) {
  const row = await querySessions(sessionId);
  return row;
}

async function querySessions(sessionId: string) {
  return { id: sessionId, token: process.env.SESSION_ID ?? "local" };
}
