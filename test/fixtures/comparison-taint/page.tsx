import Client from "./Client";

const derived = process.env.INTERNAL_VALUE === "public";

export default function Page() {
  console.log("public" !== process.env.INTERNAL_VALUE);
  console.log("public" === "public");
  return <Client
    equalLeft={process.env.INTERNAL_VALUE == "public"}
    equalRight={"public" == process.env.INTERNAL_VALUE}
    notEqualLeft={process.env.INTERNAL_VALUE != "public"}
    notEqualRight={"public" != process.env.INTERNAL_VALUE}
    strictEqualLeft={process.env.INTERNAL_VALUE === "public"}
    strictEqualRight={"public" === process.env.INTERNAL_VALUE}
    strictNotEqualLeft={process.env.INTERNAL_VALUE !== "public"}
    strictNotEqualRight={"public" !== process.env.INTERNAL_VALUE}
    lessLeft={process.env.INTERNAL_VALUE < "public"}
    lessRight={"public" < process.env.INTERNAL_VALUE}
    lessEqualLeft={process.env.INTERNAL_VALUE <= "public"}
    lessEqualRight={"public" <= process.env.INTERNAL_VALUE}
    greaterLeft={process.env.INTERNAL_VALUE > "public"}
    greaterRight={"public" > process.env.INTERNAL_VALUE}
    greaterEqualLeft={process.env.INTERNAL_VALUE >= "public"}
    greaterEqualRight={"public" >= process.env.INTERNAL_VALUE}
    derived={derived}
    nested={{ value: process.env.INTERNAL_VALUE === "public" }}
    template={`${process.env.INTERNAL_VALUE !== "public"}`}
    clean={[
      "public" == "public",
      "public" != "public",
      "public" === "public",
      "public" !== "public",
      "public" < "public",
      "public" <= "public",
      "public" > "public",
      "public" >= "public",
    ]}
  />;
}
