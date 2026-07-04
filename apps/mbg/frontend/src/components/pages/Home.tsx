import { useEffect, useState } from "react";
import { AppShell } from "../AppShell";
import { api, type Profile } from "../../lib/api";

function formatMs(ms?: number) {
  if (ms === undefined) return "—";
  return (ms / 1000).toFixed(1) + "s";
}

function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.profile().then(setProfile).catch((e) => setError(e.message));
  }, []);

  return (
    <main>
      <p className="eyebrow">Today&apos;s session</p>
      <h1>One set. Three minutes.</h1>
      <p className="lede">
        A short daily rep for focus and speed. Beat the clock on the Schulte
        table, then hold your streak.
      </p>

      <div className="cards">
        <div className="card">
          <div className="k">Streak</div>
          <div className="v amber">{profile?.streak ?? "—"}</div>
        </div>
        <div className="card">
          <div className="k">Games played</div>
          <div className="v">{profile?.totalGames ?? "—"}</div>
        </div>
        <div className="card">
          <div className="k">Best time</div>
          <div className="v">{formatMs(profile?.bestScores?.schulte)}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <a href="/play" className="cta">
          Start today&apos;s set
        </a>
        <a href="/leaderboard" className="cta ghost">
          Leaderboard
        </a>
      </div>

      {error && <p className="error" style={{ marginTop: 20 }}>{error}</p>}
    </main>
  );
}

export default function Home() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}
