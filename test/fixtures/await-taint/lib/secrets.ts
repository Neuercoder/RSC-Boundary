import "server-only";

export async function loadValue(id: number): Promise<string> {
  return `tok-${process.env.API_SECRET}-${id}`;
}

export const SESSION = await Promise.resolve(process.env.SESSION_TOKEN);

export async function getSecret() {
  return await process.env.API_SECRET;
}
