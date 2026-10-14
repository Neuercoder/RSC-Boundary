import { Card } from "./card";

export default function Page() {
  let first = "";
  let second = "ready";
  let third = "";
  const box = { value: "" };
  const items = [""];
  const clean = [""];
  let direct = "";
  let joined = "";
  let fallback = "";
  let gated = "ready";
  first ||= process.env.API_SECRET;
  second &&= process.env.API_SECRET;
  third ??= process.env.API_SECRET;
  box.value ||= process.env.API_SECRET;
  items[0] += process.env.API_SECRET;
  clean[0] += "public";
  return <main>
    <Card title={first} />
    <Card title={second} />
    <Card title={third} />
    <Card title={box.value} />
    <Card title={items[0]} />
    <Card title={direct = process.env.API_SECRET} />
    <Card title={joined += process.env.API_SECRET} />
    <Card title={fallback ||= process.env.API_SECRET} />
    <Card title={gated &&= process.env.API_SECRET} />
    <Card title={clean[0]} />
    <Card title={direct = "public"} />
    <Card title={items[1]} />
  </main>;
}
