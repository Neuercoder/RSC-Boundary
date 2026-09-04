import { Card } from "@/components/card";
import { getSession } from "@/lib/server/session";

export default function Page() {
  const session = getSession();
  const { email } = session;
  return (
    <main>
      <Card title={email} apiKey={session.token} />
    </main>
  );
}
