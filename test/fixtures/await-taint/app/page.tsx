import { Card } from "../components/card";
import { loadValue } from "../lib/secrets";

export default async function Page() {
  const raw = process.env.API_SECRET;
  const checked = raw satisfies string | undefined;
  const value = await loadValue(1);
  const box = { value };
  return (
    <main>
      <Card title={checked} />
      <Card title={value} />
      <Card title={box.value} />
    </main>
  );
}
