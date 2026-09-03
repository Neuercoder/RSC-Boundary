import { Card } from "./card";

interface User {
  id: number;
  name: string;
  password: string;
}

interface PageProps {
  user: User;
}

export default function Page({ user }: PageProps) {
  return (
    <main>
      <Card title={user.name} pin={user.password} />
    </main>
  );
}
