import { Card } from "./card";

export default function Page() {
  let shorthand = "", renamed = "", nested = "", array = "", rest = [];
  let objectRest = {}, fallback = "", arrayDefault = "", nestedDefault = "";
  let clean = "", publicDefault = "";
  const box = { value: "" }, items = [""];
  const data = { value: process.env.API_SECRET };
  ({ shorthand } = data);
  ({ value: renamed } = data);
  ({ value: { deep: nested } } = data);
  [array] = [process.env.API_SECRET];
  [, ...rest] = [process.env.API_SECRET];
  ({ ...objectRest } = data);
  ({ value: box.value } = data);
  [items[0]] = [process.env.API_SECRET];
  ({ value: fallback = process.env.API_SECRET } = {});
  [arrayDefault = process.env.API_SECRET] = [];
  ({ value: { deep: nestedDefault } = { deep: process.env.API_SECRET } } = {});
  ({ value: clean } = { value: "public" });
  [publicDefault = "public"] = [];
  let shortDefault = "";
  ({ shortDefault = process.env.API_SECRET } = {});
  return <main>
    <Card title={shorthand} />
    <Card title={renamed} />
    <Card title={nested} />
    <Card title={array} />
    <Card title={rest} />
    <Card title={objectRest} />
    <Card title={box.value} />
    <Card title={items[0]} />
    <Card title={fallback} />
    <Card title={arrayDefault} />
    <Card title={nestedDefault} />
    <Card title={shortDefault} />
    <Card title={clean} />
    <Card title={publicDefault} />
    <Card title={items[1]} />
  </main>;
}
