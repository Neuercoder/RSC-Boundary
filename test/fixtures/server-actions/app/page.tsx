import { deleteAccount } from "../lib/actions";
import { Card } from "../components/card";

export default function Page() {
  const note = deleteAccount("user-1");
  return (
    <main>
      <Card title={note} />
    </main>
  );
}
