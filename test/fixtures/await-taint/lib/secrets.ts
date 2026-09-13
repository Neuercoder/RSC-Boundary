import "server-only";

export async function loadValue(id: number): Promise<string> {
  return `tok-${process.env.API_SECRET}-${id}`;
}
