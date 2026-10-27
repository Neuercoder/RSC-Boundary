import { Card } from "./card";

export default function Page() {
  const first = ("public", process.env.API_SECRET);
  const second = ("public", ("public", process.env.API_SECRET));
  const third = (process.env.API_SECRET, "public");
  let fourth = "";
  const fifth = (fourth = process.env.API_SECRET, "public");
  console.log(("public", process.env.API_SECRET));
  console.log((process.env.API_SECRET, "public"));
  return <main>
    <Card value={first} />
    <Card value={second} />
    <Card value={("public", process.env.API_SECRET)} />
    <Card value={third} />
    <Card value={fifth} />
    <Card value={fourth} />
    <Card value={("public", "visible")} />
  </main>;
}
