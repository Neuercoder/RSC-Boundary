import { Card } from "./card";
import { render } from "./lib/db";

function format() { return process.env.PRIVATE_VALUE; }
function plain(parts: TemplateStringsArray, ...values: unknown[]) { return parts.join("") + values.join(""); }
const alias = render;
const box = { apply: render };
const imported = render`fixed`;
const aliased = alias`fixed`;
const member = box.apply`fixed`;
const returned = format`fixed`;
const interpolated = plain`prefix ${process.env.PRIVATE_VALUE}`;
const source = sql`select 1`;
const clean = plain`fixed`;
const publicValue = plain`prefix ${"hello"}`;
console.log(render`fixed`);

export default function Page() {
  return <Card imported={imported} aliased={aliased} member={member}
    returned={returned} interpolated={interpolated} source={source}
    clean={clean} publicValue={publicValue} />;
}
