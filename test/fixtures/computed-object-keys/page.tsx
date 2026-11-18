import Client from "./Client";

const label = process.env.INTERNAL_VALUE;
const direct = { [process.env.INTERNAL_VALUE]: "public" };
const indirect = { [label]: 0 };
const nested = { outer: { [label]: false } };
const spread = { ...indirect };
const method = { [label]() { return "public"; } };
const getter = { get [label]() { return "public"; } };
const setter = { set [label](value: string) {} };
const clean = { ["public"]: "public" };
const ordinary = { secret: "public" };
const cleanMethod = { ["public"]() { return "public"; } };

export default function Page() {
  return <Client direct={direct} indirect={indirect} nested={nested} spread={spread}
    method={method} getter={getter} setter={setter}
    inline={{ [process.env.INTERNAL_VALUE]: "public" }}
    clean={clean} ordinary={ordinary} cleanMethod={cleanMethod} />;
}
