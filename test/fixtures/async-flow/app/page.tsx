import { loadSessionRecord } from "../lib/session";
import { Card } from "../components/card";

export default async function Page() {
  const record = await loadSessionRecord();
  const fallback = process.env.API_SECRET;
  let options = "";
  options ||= fallback;
  let current = "ready";
  current &&= record;
  return (
    <main>
      <Card title={record} />
      <Card title={options} />
      <Card title={current} />
      <Card title="static text" />
    </main>
  );
}
