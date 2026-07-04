import { AppShell } from "../AppShell";
import { SchulteTable } from "../SchulteTable";

export default function Play() {
  return (
    <AppShell>
      <main>
        <p className="eyebrow">Schulte table</p>
        <h1 style={{ marginBottom: 24 }}>Tap 1 to 25, in order, fast.</h1>
        <SchulteTable />
      </main>
    </AppShell>
  );
}
