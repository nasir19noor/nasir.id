import { useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { amplifyConfig } from "../lib/amplify";
import { api } from "../lib/api";

Amplify.configure(amplifyConfig);

function TopBar({ signOut }: { signOut?: () => void }) {
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    api.profile()
      .then((p) => setStreak(p.streak))
      .catch(() => setStreak(null));
  }, []);

  return (
    <header className="topbar">
      <a href="/" className="brand">
        as<span>a</span>h
      </a>
      <nav>
        <a href="/play">Play</a>
        <a href="/leaderboard">Leaderboard</a>
        {streak !== null && (
          <span className="streak-chip">{streak}-day streak</span>
        )}
        <button className="linkbtn" onClick={signOut}>
          Sign out
        </button>
      </nav>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Authenticator.Provider>
      <Authenticator>
        {({ signOut }) => (
          <div className="shell">
            <TopBar signOut={signOut} />
            {children}
          </div>
        )}
      </Authenticator>
    </Authenticator.Provider>
  );
}
