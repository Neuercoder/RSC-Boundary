import Client from "./Client";
import render from "@/server/render";

function localTag() { return process.env.INTERNAL_VALUE; }
function publicTag() { return "public"; }
const tags = { render };
const stored = render`public`;
const nested = { value: localTag`public ${42}` };
console.log(render`public`);

export default function Page() {
  return <Client
    imported={render`public`}
    interpolated={render`public ${42}`}
    local={localTag`public`}
    member={tags.render`public`}
    element={tags["render"]`public`}
    stored={stored}
    nested={nested}
    interpolation={publicTag`value ${process.env.INTERNAL_VALUE}`}
    configured={sql`public`}
    clean={publicTag`public`}
    cleanInterpolation={publicTag`public ${42}`}
    discarded={(render`public`, "public")}
  />;
}
