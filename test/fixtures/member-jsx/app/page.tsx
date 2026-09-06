import { Card } from "../components/card";
import * as Panel from "../components/panel";

export default function Page() {
  const sessionId = process.env.SUPABASE_SESSION_ID ?? "local";
  const accessKey = process.env.ACCESS_KEY;
  return (
    <main>
      <Card.Header title={sessionId} />
      <Panel.Item apiKey={accessKey} />
      <Card.Body>{sessionId}</Card.Body>
      <Card subtitle="static text" />
    </main>
  );
}
