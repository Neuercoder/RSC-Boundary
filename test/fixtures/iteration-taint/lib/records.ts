import "server-only";

export async function loadEntries(): Promise<string[]> {
  return [`tok-${process.env.API_SECRET}`];
}

export async function loadConfig(): Promise<Record<string, string>> {
  return { region: `${process.env.API_SECRET}` };
}
