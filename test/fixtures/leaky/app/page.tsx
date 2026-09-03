import { headers } from "next/headers";
import { Card } from "../components/card";
import { getUser } from "../lib/db";

export default function Page() {
  const user = getUser(1);
  const sessionId = process.env.SUPABASE_SESSION_ID ?? "local";
  const { email } = user;
  const requestHeader = headers();

  const message = `hello ${email}`;

  return (
    <main>
      <Card title={message} apiKey={sessionId} />
      <Card title="static text" />
      <p>{requestHeader.get("x-forwarded-host")}</p>
      <button onClick={() => console.log(process.env.API_SECRET)}>log</button>
    </main>
  );
}
