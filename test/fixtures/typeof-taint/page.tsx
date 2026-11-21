import "server-only";
import Client from "./Client";

const value = process.env.INTERNAL_VALUE;
const label = typeof value;
const publicLabel = typeof "public";
export const result = typeof process.env.INTERNAL_VALUE;
export const empty = void process.env.INTERNAL_VALUE;

console.log(typeof value);
console.log(void process.env.INTERNAL_VALUE);
console.log(typeof "public");

export default function Page() {
  return <Client
    direct={typeof process.env.INTERNAL_VALUE}
    stored={label}
    wrapped={typeof (value as unknown)}
    nested={{ label: typeof value }}
    template={`kind=${typeof value}`}
    repeated={typeof typeof value}
    fallback={typeof value || "unknown"}
    publicValue={publicLabel}
    missing={typeof absent}
    discarded={void process.env.INTERNAL_VALUE}
    voidType={typeof (void process.env.INTERNAL_VALUE)}
    comma={typeof (process.env.INTERNAL_VALUE, "public")}
  />;
}
