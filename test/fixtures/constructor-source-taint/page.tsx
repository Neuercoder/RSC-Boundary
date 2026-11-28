import "server-only";
import Client from "./Client";

class Vault {}
class PublicBox {}
const providers = { open: Vault };
const stored = new Vault();
const build = () => new Vault();

export const result = new Vault();
export const empty = void (new Vault());
console.log(new Vault());
console.log(new PublicBox());
console.log(void (new Vault()));

export default function Page() {
  return <Client
    direct={new Vault()}
    bare={new Vault}
    member={new providers.open()}
    stored={stored}
    wrapped={(new Vault()) as unknown}
    nested={{ value: new Vault() }}
    template={`value=${new Vault()}`}
    returned={build()}
    defaultSource={new createClient()}
    argument={new PublicBox(process.env.INTERNAL_VALUE)}
    publicValue={new PublicBox()}
    discarded={void (new Vault())}
    comma={(new Vault(), "public")}
    publicRequest={new cookies()}
  />;
}
