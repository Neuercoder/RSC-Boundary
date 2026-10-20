import { Card } from "./card";

export default function Page() {
  let first = "", second = "", third = "", fourth = "", fifth = "";
  let sixth = "", seventh = "", eighth = "", ninth = "";
  let clean = "", untouched = "", nestedClean = "";
  const box = { value: "" };
  const items = [""];
  ({ value: first } = { value: process.env.API_SECRET });
  [second] = [process.env.API_SECRET];
  ({ outer: { value: third } } = { outer: { value: process.env.API_SECRET } });
  [, [fourth]] = ["public", [process.env.API_SECRET]];
  ({ value: box.value } = { value: process.env.API_SECRET });
  [items[0]] = [process.env.API_SECRET];
  ({ value: fifth = process.env.API_SECRET } = {});
  [sixth = process.env.API_SECRET] = [];
  ({ ...seventh } = { value: process.env.API_SECRET });
  [, ...eighth] = ["public", process.env.API_SECRET];
  ({ outer: { value: ninth } = { value: process.env.API_SECRET } } = {});
  ({ value: clean } = { value: "public" });
  [untouched] = ["public"];
  ({ outer: { value: nestedClean } } = { outer: { value: "public" } });
  return <main>
    <Card title={first} />
    <Card title={second} />
    <Card title={third} />
    <Card title={fourth} />
    <Card title={box.value} />
    <Card title={items[0]} />
    <Card title={fifth} />
    <Card title={sixth} />
    <Card title={seventh} />
    <Card title={eighth} />
    <Card title={ninth} />
    <Card title={clean} />
    <Card title={untouched} />
    <Card title={nestedClean} />
    <Card title={items[1]} />
  </main>;
}
