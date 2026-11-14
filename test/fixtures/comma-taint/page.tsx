import { Card } from "./card";

export default function Page() {
  let current = "public";
  const finalValue = ("public", process.env.API_SECRET);
  const nestedValue = ("first", "second", process.env.API_SECRET);
  const discardedValue = (process.env.API_SECRET, "public");
  const nestedDiscarded = (("first", process.env.API_SECRET), "public");
  const sideEffectResult = (current = process.env.API_SECRET, "public");
  console.log(("public", process.env.API_SECRET));
  console.log((process.env.API_SECRET, "public"));
  return <>
    <Card title={finalValue} />
    <Card title={nestedValue} />
    <Card title={("public", process.env.API_SECRET)} />
    <Card title={current} />
    <Card title={discardedValue} />
    <Card title={nestedDiscarded} />
    <Card title={sideEffectResult} />
    <Card title={(process.env.API_SECRET, "public")} />
    <Card title={("first", "public")} />
  </>;
}
