import "server-only";

export const API_TOKEN = process.env.API_TOKEN;

export function getSession() {
  return process.env.SESSION_ID;
}
