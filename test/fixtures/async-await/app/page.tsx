import { Card } from "../components/card";
import { fetchSessionData } from "../lib/session-store";

// `record` matches no sensitive-identifier pattern on purpose: the boundary
// finding must come from taint flowing through `await`, not the name.
export default async function Page() {
  const record = await fetchSessionData("abc");
  return (
    <main>
      <Card title={record.id} />
    </main>
  );
}
