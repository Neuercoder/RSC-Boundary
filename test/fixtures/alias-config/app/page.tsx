import { Badge } from "@ui/badge";

export default function Page() {
  return (
    <main>
      <Badge text={process.env.SERVICE_PASSWORD} />
    </main>
  );
}
