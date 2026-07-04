import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  type StartSessionResponse,
  type SubmitResultResponse,
} from "../lib/api";

function shuffled(): number[] {
  const a = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Phase = "loading" | "playing" | "done" | "error";

export function SchulteTable() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [numbers, setNumbers] = useState<number[]>([]);
  const [next, setNext] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<SubmitResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const session = useRef<StartSessionResponse | null>(null);
  const startMs = useRef<number>(0);
  const raf = useRef<number>(0);

  const begin = useCallback(async () => {
    setPhase("loading");
    setNext(1);
    setMistakes(0);
    setResult(null);
    setElapsed(0);
    try {
      const s = await api.startSession("schulte");
      session.current = s;
      setNumbers(shuffled());
      startMs.current = performance.now();
      setPhase("playing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start session");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    begin();
  }, [begin]);

  useEffect(() => {
    if (phase !== "playing") return;
    const tick = () => {
      setElapsed(performance.now() - startMs.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [phase]);

  async function finish() {
    setPhase("loading");
    try {
      const r = await api.submitResult(session.current!.sessionId, {
        completed: true,
        mistakes,
      });
      setResult(r);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit result");
      setPhase("error");
    }
  }

  function tap(n: number) {
    if (phase !== "playing" || n < next) return;
    if (n === next) {
      if (n === 25) {
        setNext(26);
        finish();
      } else {
        setNext(n + 1);
      }
    } else {
      setMistakes((m) => m + 1);
      setWrongCell(n);
      setTimeout(() => setWrongCell(null), 250);
    }
  }

  if (phase === "error") {
    return (
      <div className="result">
        <p className="error">{error}</p>
        <div className="actions">
          <button className="cta" onClick={begin}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done" && result) {
    return (
      <div className="result">
        <div className="time">{(result.elapsedMs / 1000).toFixed(1)}s</div>
        {result.personalBest && <div className="pb">NEW PERSONAL BEST</div>}
        <p className="note" style={{ marginTop: 12 }}>
          {mistakes} mistake{mistakes === 1 ? "" : "s"} · best{" "}
          {(result.bestScore / 1000).toFixed(1)}s
        </p>
        <div className="actions">
          <button className="cta" onClick={begin}>
            Play again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="play-head">
        <div className="timer">{(elapsed / 1000).toFixed(1)}s</div>
        <div className="play-meta">
          <div>
            next <span className="next">{next <= 25 ? next : "—"}</span>
          </div>
          <div>{mistakes} mistakes</div>
        </div>
      </div>

      <div className="grid" aria-busy={phase === "loading"}>
        {numbers.map((n) => {
          const done = n < next;
          const cls =
            "cell" + (done ? " done" : "") + (wrongCell === n ? " wrong" : "");
          return (
            <button
              key={n}
              className={cls}
              onClick={() => tap(n)}
              disabled={done || phase === "loading"}
              aria-label={`number ${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
