import { Card } from "./card";

export default function Page() {
  const source = process.env.VALUE;
  let first, second, third, fourth, fifth, sixth, seventh, eighth;
  const holder = { value: "", other: "" };
  const entries = ["", ""];
  ({ value: first } = source);
  [second] = source;
  ({ outer: { value: third } } = source);
  [, fourth, ...fifth] = source;
  ({ value: holder.value } = source);
  [entries[0]] = source;
  ({ value: sixth = process.env.FALLBACK } = {});
  ({ seventh = process.env.FALLBACK } = {});
  ({ ...eighth } = source);
  let cleanObject, cleanArray, cleanFallback;
  ({ value: cleanObject } = { value: "public" });
  [cleanArray] = ["public"];
  ({ cleanFallback = "public" } = {});
  return <>
    <Card title={first} />
    <Card title={second} />
    <Card title={third} />
    <Card title={fourth} />
    <Card title={fifth} />
    <Card title={holder.value} />
    <Card title={entries[0]} />
    <Card title={sixth} />
    <Card title={seventh} />
    <Card title={eighth} />
    <Card title={cleanObject} />
    <Card title={cleanArray} />
    <Card title={cleanFallback} />
    <Card title={holder.other} />
    <Card title={entries[1]} />
  </>;
}
