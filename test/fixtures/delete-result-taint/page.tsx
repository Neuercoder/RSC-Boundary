import "server-only";
import Client from "./Client";

const value = process.env.INTERNAL_VALUE;
const record: Record<string, unknown> = { public: true };
const environment = process.env;
const removed = delete environment.INTERNAL_VALUE;
const publicRemoved = delete record.public;
const removeValue = () => delete process.env.INTERNAL_VALUE;

export const result = delete process.env.INTERNAL_VALUE;
export const empty = void (delete process.env.INTERNAL_VALUE);
console.log(delete process.env.INTERNAL_VALUE);
console.log(void (delete process.env.INTERNAL_VALUE));
console.log(delete record.public);

export default function Page() {
  return <Client
    direct={delete process.env.INTERNAL_VALUE}
    optional={delete process.env?.INTERNAL_VALUE}
    stored={removed}
    wrapped={(delete process.env.INTERNAL_VALUE) as boolean}
    nested={{ removed: delete process.env.INTERNAL_VALUE }}
    template={`removed=${delete process.env.INTERNAL_VALUE}`}
    keyed={delete record[value]}
    returned={removeValue()}
    publicValue={publicRemoved}
    publicOptional={delete record?.missing}
    discarded={void (delete process.env.INTERNAL_VALUE)}
    comma={(delete process.env.INTERNAL_VALUE, "public")}
  />;
}
