import { Card } from "./card";

const { item: { first } = process.env.DATA } = {};
const [{ second } = process.env.DATA] = [];
const { password: { third } } = {};
const { "apiKey": [fourth] } = {};
const { password: fifth } = {};
const { password: { sixth = "public" } } = process.env.DATA;
const { item: { seventh } = { value: process.env.DATA } } = {};
const { item: { plain } = { value: "public" } } = {};
const [{ other } = { value: "public" }] = [];
const { item: { eighth, ...remaining } = process.env.DATA } = {};
const [, { ninth } = process.env.DATA] = [];
const { item: { nested: { tenth } = process.env.DATA } = {} } = {};

function View({ item: { eleventh } = process.env.DATA }, { password: { twelfth } }) {
  return <><Card title={eleventh} /><Card title={twelfth} /></>;
}

export default function Page() {
  return <>
    <Card title={first} />
    <Card title={second} />
    <Card title={third} />
    <Card title={fourth} />
    <Card title={fifth} />
    <Card title={sixth} />
    <Card title={seventh} />
    <Card title={eighth} />
    <Card title={remaining} />
    <Card title={ninth} />
    <Card title={tenth} />
    <Card title={plain} />
    <Card title={other} />
  </>;
}
