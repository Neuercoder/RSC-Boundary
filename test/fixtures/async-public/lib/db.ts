import "server-only";

export function getUser(id: number) {
  return { id, email: "dev@example.com" };
}
