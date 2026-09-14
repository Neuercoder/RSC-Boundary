import { Card } from "../components/card";
import { getUser } from "../lib/db";
import { loadValue } from "../lib/secrets";

export default async function Page() {
  const user = await getUser(1);
  const sessionId = await process.env.SUPABASE_SESSION_ID;
  const raw = process.env.API_SECRET;
  const checked = raw satisfies string | undefined;
  const value = await loadValue(1);
  const box = { value };
  return (
    <main>
      <Card title={user.email} />
      <Card title={await getUser(2).then((u) => u.email)} apiKey={sessionId} />
      <Card title={checked} />
      <Card title={value} />
      <Card title={box.value} />
      <Card title="static text" />
    </main>
  );
}
