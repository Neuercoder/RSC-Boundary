import Client from "./Client";

const concise = { read: () => process.env.INTERNAL_VALUE };
const block = { read: () => { return process.env.INTERNAL_VALUE; } };
const ordinary = { read: function () { return process.env.INTERNAL_VALUE; } };
const asyncRead = { read: async () => process.env.INTERNAL_VALUE };
const wrapped = { read: (() => process.env.INTERNAL_VALUE) };
const nested = { inner: { read: () => process.env.INTERNAL_VALUE } };
const publicRead = { read: () => "public" };
const discarded = { read: () => (process.env.INTERNAL_VALUE, "public") };
const hidden = { read: () => {
  const uncalled = () => process.env.INTERNAL_VALUE;
  return "public";
} };
const stored = concise.read();

console.log(ordinary.read());
console.log(publicRead.read());
console.log(hidden.read());

export default function Page() {
  return <Client
    concise={concise.read()}
    block={block.read()}
    ordinary={ordinary.read()}
    asyncResult={asyncRead.read()}
    wrapped={wrapped.read()}
    nested={nested.inner.read()}
    element={concise["read"]()}
    stored={stored}
    callable={concise.read}
    inline={({ read: () => process.env.INTERNAL_VALUE }).read()}
    clean={publicRead.read()}
    discarded={discarded.read()}
    hidden={hidden.read()}
  />;
}
