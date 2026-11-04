import { Card } from "./card";

export default function Page() {
  let first, second, third, fourth, fifth, sixth, seventh, eighth, ninth, tenth;
  let clean, cleanDefault;
  const box = { value: "", other: "" };
  const items = [""];
  ({ value: first } = { value: process.env.API_SECRET });
  [second] = [process.env.API_SECRET];
  ({ outer: { value: third } } = { outer: { value: process.env.API_SECRET } });
  [, [fourth]] = [0, [process.env.API_SECRET]];
  ({ value: fifth = process.env.API_SECRET } = {});
  [sixth = process.env.API_SECRET] = [];
  ({ ...seventh } = { value: process.env.API_SECRET });
  [, ...eighth] = [0, process.env.API_SECRET];
  ({ value: box.value } = { value: process.env.API_SECRET });
  [items[0]] = [process.env.API_SECRET];
  ({ password: ninth } = {});
  ({ value: tenth = "public" } = { value: process.env.API_SECRET });
  ({ value: clean } = { value: "public" });
  [cleanDefault = "public"] = [];
  return <main>
    <Card title={first} />
    <Card title={second} />
    <Card title={third} />
    <Card title={fourth} />
    <Card title={fifth} />
    <Card title={sixth} />
    <Card title={seventh} />
    <Card title={eighth} />
    <Card title={box.value} />
    <Card title={items[0]} />
    <Card title={ninth} />
    <Card title={tenth} />
    <Card title={clean} />
    <Card title={cleanDefault} />
    <Card title={box.other} />
    <Card title={items[1]} />
  </main>;
}
