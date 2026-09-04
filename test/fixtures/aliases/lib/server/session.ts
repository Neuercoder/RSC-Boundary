import "server-only";

export interface Session {
  email: string;
  token: string;
}

export function getSession(): Session {
  return {
    email: "dev@example.com",
    token: process.env.SESSION_ID ?? "local",
  };
}
