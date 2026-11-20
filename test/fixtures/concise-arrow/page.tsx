import Client from "./Client";

const read = () => process.env.INTERNAL_VALUE;
const asyncRead = async () => process.env.INTERNAL_VALUE;
const wrapped = () => (process.env.INTERNAL_VALUE);
const derived = () => `value: ${process.env.INTERNAL_VALUE}`;
const objectRead = () => ({ value: process.env.INTERNAL_VALUE });
const alias = read;
const stored = read();
const publicRead = () => "public";
const discarded = () => (process.env.INTERNAL_VALUE, "public");
const hidden = () => {
  const uncalled = () => process.env.INTERNAL_VALUE;
  return "public";
};

console.log(read());
console.log(publicRead());
console.log(hidden());

export default function Page() {
  return <Client
    direct={read()}
    asyncResult={asyncRead()}
    wrapped={wrapped()}
    derived={derived()}
    objectResult={objectRead()}
    alias={alias()}
    stored={stored}
    callable={read}
    clean={publicRead()}
    discarded={discarded()}
    nested={hidden()}
  />;
}
