import { Card } from "./card";

export default function Page() {
  let renamed, plain, deep, first, inner, tail, remaining;
  let fallback, short, arrayDefault, nestedDefault, sibling;
  let fromMember, quoted, nestedMember, resultTarget, cleanObject, cleanArray;
  const holder = {};
  const slots = [];
  const data = {};

  ({ DATA: renamed, plain } = process.env);
  ({ entry: { value: deep } } = { entry: { value: process.env.DATA } });
  [first, , [inner], ...tail] = [process.env.DATA];
  ({ ...remaining } = process.env);
  ({ entry: holder.value, other: slots[0] } = process.env);
  ({ entry: fallback = process.env.DATA, other: sibling } = { other: "ok" });
  ({ short = process.env.DATA } = {});
  [arrayDefault = process.env.DATA] = [];
  ({ entry: { value: nestedDefault } = { value: process.env.DATA } } = {});
  ({ password: fromMember, "apiKey": quoted, credentials: { value: nestedMember } } = data);
  ({ entry: cleanObject } = { entry: "ok" });
  [cleanArray] = ["ok"];

  return <main>
    <Card objectAlias={renamed} />
    <Card shorthand={plain} />
    <Card nested={deep} />
    <Card arrayFirst={first} />
    <Card arrayNested={inner} />
    <Card arrayRest={tail} />
    <Card objectRest={remaining} />
    <Card propertyTarget={holder.value} />
    <Card elementTarget={slots[0]} />
    <Card objectDefault={fallback} />
    <Card shorthandDefault={short} />
    <Card arrayDefault={arrayDefault} />
    <Card nestedDefault={nestedDefault} />
    <Card sensitiveMember={fromMember} />
    <Card quotedMember={quoted} />
    <Card nestedMember={nestedMember} />
    <Card expressionResult={({ entry: resultTarget } = process.env)} />
    <Card assignedResult={resultTarget} />
    <Card cleanSibling={sibling} />
    <Card cleanIndex={slots[1]} />
    <Card cleanObject={cleanObject} />
    <Card cleanArray={cleanArray} />
  </main>;
}
