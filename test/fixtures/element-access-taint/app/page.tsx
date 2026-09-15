import { Card } from "../components/card";
import { loadConfig, loadVault } from "../lib/records";

interface Account {
  owner: string;
  password: string;
}

export default async function Page({ account }: { account: Account }) {
  const vault = await loadVault();
  const cfg = await loadConfig();
  const item = vault["password"];
  return (
    <main>
      <Card title={account["password"]} />
      <Card title={vault["password"]} />
      <Card title={vault['password']} />
      <Card title={vault[`password`]} />
      <Card title={item} />
      <Card title={cfg["apiKey"] ?? "none"} />
    </main>
  );
}
