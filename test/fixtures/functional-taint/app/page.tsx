import { Card } from "../components/card";

export default function Page() {
  const immediate = (() => process.env.API_SECRET ?? "none")();
  const blockImmediate = (() => {
    return process.env.API_SECRET ?? "none";
  })();
  const mapped = ["safe"].map(() => process.env.API_SECRET ?? "none");
  const flattened = ["safe"].flatMap(() => [process.env.API_SECRET ?? "none"]);

  return (
    <main>
      <Card title={immediate} />
      <Card title={blockImmediate} />
      <Card title={mapped[0]} />
      <Card title={flattened[0]} />
    </main>
  );
}
