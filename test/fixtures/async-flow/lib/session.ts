import "server-only";

export async function loadSessionRecord(): Promise<string> {
  return process.env.SESSION_ID ?? "anon";
}
