import Client from "./Client";

const values = { first: "public", second: "also public" };
const items = ["public", "also public"];
const key = process.env.INTERNAL_VALUE;
const derived = values[key];
let assigned = "public";
assigned = values[key];

export default function Page() {
  console.log(values[process.env.INTERNAL_VALUE]);
  console.log(values["first"]);
  return <Client
    direct={values[process.env.INTERNAL_VALUE]}
    array={items[process.env.INTERNAL_VALUE]}
    optional={values?.[process.env.INTERNAL_VALUE]}
    indirect={derived}
    assigned={assigned}
    nested={{ value: values[key] }}
    template={`${values[key]}`}
    receiver={process.env["INTERNAL_VALUE"]}
    both={process.env[process.env.OTHER_VALUE]}
    clean={values["first"]}
    cleanOptional={values?.["first"]}
    cleanArray={items[0]}
    discarded={values[(process.env.INTERNAL_VALUE, "first")]}
  />;
}
