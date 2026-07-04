import { useEffect, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { AppShell } from "../AppShell";
import { api, type LeaderboardEntry } from "../../lib/api";

function Board() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setMe(u.username))
      .catch(() => {});
    api
      .leaderboard("schulte")
      .then((r) => setEntries(r.entries))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <main>
      <p className="eyebrow">Schulte table · today</p>
      <h1 style={{ marginBottom: 28 }}>Fastest times</h1>

      {error && <p className="error">{error}</p>}
      {!entries && !error && <p className="note">Loading…</p>}
      {entries?.length === 0 && (
        <p className="note">No times yet today. Be the first.</p>
      )}

      {entries?.map((e) => (
        <div key={e.rank} className={"row" + (e.username === me ? " me" : "")}>
          <span className="rank">{e.rank}</span>
          <span>{e.username}</span>
          <span className="score">{(e.score / 1000).toFixed(1)}s</span>
        </div>
      ))}
    </main>
  );
}

export default function Leaderboard() {
  return (
    <AppShell>
      <Board />
    </AppShell>
  );
}
