import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = import.meta.env.PUBLIC_API_BASE_URL ?? "";

export type Game = "schulte";

export interface StartSessionResponse {
  sessionId: string;
  game: Game;
  startedAt: number;
}

export interface SubmitResultResponse {
  score: number;
  elapsedMs: number;
  personalBest: boolean;
  bestScore: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

export interface Profile {
  username: string;
  streak: number;
  totalGames: number;
  bestScores: Partial<Record<Game, number>>;
}

async function idToken(): Promise<string> {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() ?? "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await idToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${detail || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  startSession: (game: Game) =>
    request<StartSessionResponse>("/sessions", {
      method: "POST",
      body: JSON.stringify({ game }),
    }),

  submitResult: (
    sessionId: string,
    payload: { completed: boolean; mistakes: number }
  ) =>
    request<SubmitResultResponse>(`/sessions/${sessionId}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  leaderboard: (game: Game) =>
    request<{ entries: LeaderboardEntry[] }>(
      `/leaderboard?game=${encodeURIComponent(game)}`
    ),

  profile: () => request<Profile>("/profile"),
};
