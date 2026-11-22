import "server-only";
import Client from "./Client";

const value = process.env.INTERNAL_VALUE;
const stored = value === "enabled";
export const result = process.env.INTERNAL_VALUE !== undefined;
export const publicResult = 1 < 2;
console.log(value >= "minimum");
console.log(1 <= 2);

export default function Page() {
  return <Client
    equalLeft={value == "public"}
    equalRight={"public" == value}
    notEqualLeft={value != "public"}
    notEqualRight={"public" != value}
    strictEqualLeft={value === "public"}
    strictEqualRight={"public" === value}
    strictNotEqualLeft={value !== "public"}
    strictNotEqualRight={"public" !== value}
    lessLeft={value < "public"}
    lessRight={"public" < value}
    lessEqualLeft={value <= "public"}
    lessEqualRight={"public" <= value}
    greaterLeft={value > "public"}
    greaterRight={"public" > value}
    greaterEqualLeft={value >= "public"}
    greaterEqualRight={"public" >= value}
    memberLeft={value in "public"}
    memberRight={"public" in value}
    instanceLeft={value instanceof "public"}
    instanceRight={"public" instanceof value}
    stored={stored}
    wrapped={(value as unknown) === "public"}
    nested={{ matches: value !== "public" }}
    template={`matches=${value === "public"}`}
    repeated={(value === "public") === true}
    logical={(value === "public") || false}
    publicequal={1 == 2}
    publicnotEqual={1 != 2}
    publicstrictEqual={1 === 2}
    publicstrictNotEqual={1 !== 2}
    publicless={1 < 2}
    publiclessEqual={1 <= 2}
    publicgreater={1 > 2}
    publicgreaterEqual={1 >= 2}
    publicmember={"public" in {}}
    publicinstance={{} instanceof Object}
    discarded={(value === "public", false)}
    voidResult={(void value) === undefined}
    publicType={typeof "public" === "string"}
  />;
}
