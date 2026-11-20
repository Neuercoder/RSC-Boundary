import Client from "./Client";

function prepare() { return "public"; }
const derived = (prepare(), process.env.INTERNAL_VALUE);
const clean = (process.env.INTERNAL_VALUE, "public");

export default function Page() {
  console.log((prepare(), process.env.INTERNAL_VALUE));
  console.log((process.env.INTERNAL_VALUE, "public"));
  return <Client
    direct={(prepare(), process.env.INTERNAL_VALUE)}
    chain={(prepare(), "public", process.env.INTERNAL_VALUE)}
    indirect={derived}
    nested={{ value: (prepare(), process.env.INTERNAL_VALUE) }}
    template={`${(prepare(), process.env.INTERNAL_VALUE)}`}
    clean={clean}
    discarded={(process.env.INTERNAL_VALUE, "public")}
    discardedNested={((prepare(), process.env.INTERNAL_VALUE), "public")}
    publicValue={(prepare(), "public")}
  />;
}
