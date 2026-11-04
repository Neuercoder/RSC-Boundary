import { Card } from "./card";

export default function Page() {
  const rows = [process.env.API_SECRET];
  const record = { value: process.env.API_SECRET };
  let first = "", renamed = "", nested = "", fallback = "", shorthand = "";
  let later = "", earlier = "", selected = "";
  let rest = [], tail = [];
  const box = { value: "" };
  const items = ["", ""];
  let clean = "", cleanDefault = "", untouched = "";
  [first] = rows;
  ({ value: renamed } = record);
  ({ value: [nested] } = { value: rows });
  ({ value: box.value } = record);
  [, items[0]] = rows;
  ({ ...rest } = record);
  [, ...tail] = rows;
  [fallback = process.env.API_SECRET] = [];
  ({ shorthand = process.env.API_SECRET } = {});
  ({ value: selected = process.env.API_SECRET } = {});
  [earlier] = [later];
  [later] = rows;
  [clean] = ["public"];
  ({ value: cleanDefault = "public" } = {});
  [untouched] = ["public"];
  return <main>
    <Card title={first} />
    <Card title={renamed} />
    <Card title={nested} />
    <Card title={box.value} />
    <Card title={items[0]} />
    <Card title={JSON.stringify(rest)} />
    <Card title={JSON.stringify(tail)} />
    <Card title={fallback} />
    <Card title={shorthand} />
    <Card title={selected} />
    <Card title={earlier} />
    <Card title={clean} />
    <Card title={cleanDefault} />
    <Card title={untouched} />
    <Card title={items[1]} />
  </main>;
}
