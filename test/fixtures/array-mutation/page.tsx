import { Card } from "./card";

export default function Page() {
  const inserted = [];
  const filled = [];
  const box = { values: [] };
  const cleanSplice = [];
  const cleanFill = [];
  const absent = [];
  const copied = [];
  inserted.splice(0, 0, "public", process.env.API_SECRET);
  filled.fill(process.env.API_SECRET, 0, 2);
  box.values.splice(0, 0, process.env.API_SECRET);
  cleanSplice.splice(Number(process.env.API_SECRET), Number(process.env.API_SECRET), "public");
  cleanFill.fill("public", Number(process.env.API_SECRET), Number(process.env.API_SECRET));
  absent.splice(0, 1);
  absent.fill();
  copied.toSpliced(0, 0, process.env.API_SECRET);
  return <main>
    <Card title={inserted[0]} />
    <Card title={filled[0]} />
    <Card title={box.values[0]} />
    <Card title={cleanSplice[0]} />
    <Card title={cleanFill[0]} />
    <Card title={absent[0]} />
    <Card title={copied[0]} />
  </main>;
}
