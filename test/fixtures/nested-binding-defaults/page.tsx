import { Card } from "./card";

const { item: { alpha } = { alpha: process.env.PRIVATE_VALUE } } = {};
const [[beta] = [process.env.PRIVATE_VALUE]] = [];
const { item: [{ gamma }] = [{ gamma: process.env.PRIVATE_VALUE }] } = {};
const { item: { delta = "fallback" } = { delta: process.env.PRIVATE_VALUE } } = {};
const { item: { safeOne } = { safeOne: "public" } } = {};
const [[safeTwo] = ["public"]] = [];
const { item: { safeThree } = { safeThree: "public" } } = {};

function ObjectDefault({ item: { epsilon } = { epsilon: process.env.PRIVATE_VALUE } }) {
  return <Card title={epsilon} />;
}
function ArrayDefault([[zeta] = [process.env.PRIVATE_VALUE]]) {
  return <Card title={zeta} />;
}
function CleanDefault({ item: { safeFour } = { safeFour: "public" } }) {
  return <Card title={safeFour} />;
}

export default function Page() {
  return <>
    <Card title={alpha} />
    <Card title={beta} />
    <Card title={gamma} />
    <Card title={delta} />
    <Card title={safeOne} />
    <Card title={safeTwo} />
    <Card title={safeThree} />
  </>;
}
