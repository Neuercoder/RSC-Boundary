import { API_TOKEN } from "../lib/barrel";
import { getSession } from "../lib/named";
import * as secrets from "../lib/ns";
import { Card } from "../lib/ui-barrel";

const direct = secrets.API_TOKEN;

export default function Page() {
  return (
    <main>
      <Card apiKey={API_TOKEN} title={getSession()} />
      <p>{direct}</p>
    </main>
  );
}
