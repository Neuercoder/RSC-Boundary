import Client from "./Client";

const methods = { read() { return process.env.INTERNAL_VALUE; } };
const getters = { get value() { return process.env.INTERNAL_VALUE; } };
const asyncMethods = { async read() { return process.env.INTERNAL_VALUE; } };
const nested = { inner: { read() { return process.env.INTERNAL_VALUE; } } };
const stored = methods.read();
const publicMethods = { read() { return "public"; } };
const publicGetters = { get value() { return "public"; } };
const unused = {
  read() {
    function hidden() { return process.env.INTERNAL_VALUE; }
    return "public";
  },
  get value() {
    const hidden = () => process.env.INTERNAL_VALUE;
    return "public";
  },
};
const setters = { set value(input: string) { console.info(input); } };

console.log(methods.read());
console.log(publicMethods.read());
console.log(unused.read());

export default function Page() {
  return <Client
    method={methods.read()}
    getter={getters.value}
    asyncMethod={asyncMethods.read()}
    nested={nested.inner.read()}
    stored={stored}
    inline={({ read() { return process.env.INTERNAL_VALUE; } }).read()}
    element={methods["read"]()}
    cleanMethod={publicMethods.read()}
    cleanGetter={publicGetters.value}
    nestedFunction={unused.read()}
    nestedArrow={unused.value}
    setter={setters}
    discarded={(methods.read(), "public")}
  />;
}
