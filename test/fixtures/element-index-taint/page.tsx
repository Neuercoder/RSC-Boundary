import "server-only";
import Client from "./Client";

const choice = process.env.INTERNAL_VALUE;
const labels = { yes: "enabled", no: "disabled" };
const options = ["disabled", "enabled"];
const stored = labels[choice];
let assigned;
assigned = labels[choice];
export const result = labels[process.env.INTERNAL_VALUE];
export const publicResult = labels["yes"];
console.log(labels[choice]);
console.log(labels["yes"]);

export default function Page() {
  return <Client
    direct={labels[choice]}
    array={options[Number(choice)]}
    optional={labels?.[choice]}
    stored={stored}
    assigned={assigned}
    wrapped={labels[(choice as string)!]}
    nested={{ label: labels[choice] }}
    template={`label=${labels[choice]}`}
    repeated={{ enabled: "yes", disabled: "no" }[labels[choice]]}
    base={choice[0]}
    publicObject={labels["yes"]}
    publicArray={options[0]}
    publicOptional={labels?.["yes"]}
    discarded={labels[(choice, "yes")]}
    voidResult={labels[void choice]}
  />;
}
