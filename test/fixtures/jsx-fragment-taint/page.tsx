import Client from "./Client";

const value = process.env.INTERNAL_VALUE;
const wrapped = <>{value}</>;
const publicFragment = <>public {"text"}{/* no expression */}</>;

export default function Page() {
  return <main>
    <Client inline={<>{process.env.INTERNAL_VALUE}</>} />
    <Client assigned={wrapped} />
    <Client nested={<><>{value}</></>} />
    <Client collection={[<>prefix {value}</>]} />
    <Client>{<>{value}</>}</Client>
    <Client><><>{value}</></></Client>
    <Client><>{value}</></Client>
    <Client clean={publicFragment} />
    <Client><>public {"text"}{/* no expression */}</></Client>
    <Client>{<><>public</></>}</Client>
  </main>;
}
