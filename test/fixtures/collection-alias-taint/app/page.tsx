import { Card } from "../components/card";

export default function Page() {
  const first: string[] = [];
  const firstAlias = first;
  firstAlias.push(process.env.API_SECRET ?? "none");

  const second: string[] = [];
  const secondAlias = second;
  second.push(process.env.API_SECRET ?? "none");

  const third: string[] = [];
  const middle = third;
  const finalAlias = middle;
  finalAlias.unshift(process.env.API_SECRET ?? "none");

  const clean: string[] = [];
  const cleanAlias = clean;
  cleanAlias.push("safe");

  return (
    <main>
      <Card title={first[0]} />
      <Card title={secondAlias[0]} />
      <Card title={third[0]} />
      <Card title={clean[0]} />
    </main>
  );
}
