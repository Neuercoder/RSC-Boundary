import "server-only";

const API_TOKEN = process.env.API_TOKEN;

export const SUPABASE_KEY = process.env.SUPABASE_KEY;

export function buildAuthHeader(token = process.env.AUTH_COOKIE_NAME) {
  return `Bearer ${token}`;
}

export { SUPABASE_KEY as publicKey };
