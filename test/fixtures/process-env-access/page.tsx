import "server-only";
import Client from "./Client";

const values = process["env"];
export const result = process["env"].INTERNAL_VALUE;
console.log(process["env"]["INTERNAL_VALUE"]);
console.log(process.version);
export const publicResult = process.versions;

export default function Page() {
  return <Client
    dotted={process.env.INTERNAL_VALUE}
    bracket={process["env"].INTERNAL_VALUE}
    nested={process["env"]["INTERNAL_VALUE"]}
    optional={process?.["env"]?.INTERNAL_VALUE}
    template={process[`env`].INTERNAL_VALUE}
    stored={values.INTERNAL_VALUE}
    version={process.version}
    versions={process["versions"]}
    platform={process.platform}
    architecture={process.arch}
    discarded={(process["env"].INTERNAL_VALUE, "public")}
    voidResult={void process["env"].INTERNAL_VALUE}
  />;
}
