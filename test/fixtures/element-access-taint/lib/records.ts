import "server-only";

export interface Vault {
  owner: string;
  password: string;
}

export async function loadVault(): Promise<Vault> {
  return { owner: "ada", password: `tok-${process.env.API_SECRET}` };
}

export async function loadConfig(): Promise<Record<string, string>> {
  return { region: `${process.env.API_SECRET}` };
}
