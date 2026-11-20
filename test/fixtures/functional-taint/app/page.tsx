import { Card } from "../components/card";

export default function Page() {
  const stored = (() => process.env.API_SECRET)();
  console.log((() => process.env.API_SECRET)());
  return <main>
    <Card direct={(() => process.env.API_SECRET)()} />
    <Card block={(() => { return process.env.API_SECRET; })()} />
    <Card ordinary={(function () { return process.env.API_SECRET; })()} />
    <Card wrapped={(((() => process.env.API_SECRET)))()} />
    <Card asyncResult={(async () => process.env.API_SECRET)()} />
    <Card nested={(() => (() => process.env.API_SECRET)())()} />
    <Card mapped={["safe"].map(() => process.env.API_SECRET)} />
    <Card flattened={["safe"].flatMap(() => [process.env.API_SECRET])} />
    <Card functionMap={["safe"].map(function () { return process.env.API_SECRET; })} />
    <Card withThis={["safe"].map(() => process.env.API_SECRET, {})} />
    <Card stored={stored} />
    <Card publicValue={(() => "public")()} />
    <Card discarded={(() => (process.env.API_SECRET, "public"))()} />
    <Card uncalled={(() => { const unused = () => process.env.API_SECRET; return "public"; })()} />
    <Card forEach={["safe"].forEach(() => process.env.API_SECRET)} />
    <Card filtered={["safe"].filter(() => process.env.API_SECRET)} />
    <Card ignoredThis={["safe"].map(() => "public", () => process.env.API_SECRET)} />
  </main>;
}
