import "server-only";
import Client from "./Client";

const choice = process.env.INTERNAL_VALUE;
const table = { first: "one", second: "two" };
const values = ["one", "two"];
const stored = table[choice];
const key = choice;
const read = () => table[choice];
export const result = table[choice];
export const publicResult = table["first"];
console.log(table[choice]);
console.log(table["first"]);

export default function Page() {
  return <Client
    direct={table[process.env.INTERNAL_VALUE]}
    stored={stored}
    array={values[choice]}
    optional={table?.[choice]}
    nested={{ entry: table }["entry"][choice]}
    wrapped={table[(choice as string)!]}
    derived={table[choice === "first" ? "first" : "second"]}
    template={`chosen: ${table[choice]}`}
    repeated={table[choice]}
    alias={table[key]}
    returned={read()}
    base={process.env["INTERNAL_VALUE"]}
    publicObject={table["first"]}
    publicArray={values[0]}
    publicOptional={table?.["second"]}
    publicDynamic={table[1 === 1 ? "first" : "second"]}
    discarded={table[(choice, "first")]}
    voidKey={table[void choice]}
    discardedRead={(table[choice], "public")}
    voidRead={void table[choice]}
  />;
}
