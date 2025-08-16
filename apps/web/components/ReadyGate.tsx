// apps/web/components/ReadyGate.tsx
"use client";
import { useEffect, useState } from "react";

type Props = {
  videoId: string;
  pollMs?: number;
  children: React.ReactNode;
  onReady?: () => void;
};

export default function ReadyGate({ videoId, pollMs = 3000, children, onReady }: Props) {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const check = async () => {
      try {
        const r = await fetch(`/api/video-status?id=${encodeURIComponent(videoId)}`, { cache: "no-store" });
        const j = await r.json();
        if (canceled) return;
        if (j.ok && j.ready) {
          setReady(true);
          setChecking(false);
          onReady?.();
        } else {
          setReady(false);
          setChecking(false);
          setTimeout(check, pollMs);
        }
      } catch (e: any) {
        if (!canceled) {
          setError(e?.message || "Network error");
          setTimeout(check, pollMs);
        }
      }
    };
    check();
    return () => { canceled = true; };
  }, [videoId, pollMs, onReady]);

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
        <div className="text-sm opacity-80">Stiamo preparando il tuo video…</div>
        <div className="text-xs opacity-60">Il link si attiverà automaticamente quando è pronto.</div>
        {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
      </div>
    );
  }

  return <>{children}</>;
}
