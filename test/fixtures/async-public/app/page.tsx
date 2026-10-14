import { Card } from "../components/card";
import { getUser } from "../lib/db";

export default async function Page() {
  // Awaited server data stays tainted through `await`.
  const user = await getUser(1);
  const secret = await Promise.resolve(process.env.SECRET_KEY);
  // NEXT_PUBLIC_* vars are inlined into the client bundle by design.
  const pub = process.env.NEXT_PUBLIC_API_KEY;
  const bracket = process.env["NEXT_PUBLIC_BRACKET_KEY"];
  return (
    <main>
      <Card title={user} />
      <Card title={secret} />
      <Card title={pub} />
      <Card title={bracket} />
      <Card title={process.env.NEXT_PUBLIC_INLINE_KEY} />
      <Card title="static text" />
    </main>
  );
}
