import "server-only";

export interface User {
  id: number;
  email: string;
}

const users: User[] = [{ id: 1, email: "dev@example.com" }];

export function getUser(id: number): User {
  const found = users.find((user) => user.id === id);
  if (!found) {
    throw new Error("user not found");
  }
  return found;
}
