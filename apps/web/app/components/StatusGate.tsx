"use client";

import { useEffect, useRef, useState } from "react";

type StatusResp =
  | { ok: true; id: string; jobStatus: string | null; ready: boolean; updatedAt?: string }
  | { ok: false; error?: string };

export default function StatusGate({
  videoId,
  children,
  pollMs = 2000,
  maxMs = 120000, // 2 min
  className,
}: {
  videoId: string;
  children: React.ReactNode;
  pollMs?: number;
  maxMs?: number;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number>(Date.now());

  // bypass manuale: ?force=1
  const force = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("force") === "1";

  useEffect(() => {
    if (force) {
      setReady(true);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const tick = async () => {
      try {
        const r = await fetch(`/api/video-status?id=${videoId}`, { cache: "no-store" });
        const json: StatusResp = await r.json();
        console.debug("[StatusGate]", json);

        if ("ok" in json && json.ok === true) {
          if (json.ready === true || json.jobStatus === "ready" || json.jobStatus === "COMPLETE") {
            setReady(true);
            return;
          }
        } else if ("error" in json) {
          setError(json.error || "Unknown error");
        }
      } catch (e: any) {
        setError(e?.message || "Network error");
      }

      if (!cancelled && Date.now() - startedAt.current < maxMs) {
        timer = setTimeout(tick, pollMs);
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [videoId, pollMs, maxMs, force]);

  if (ready || force) return <>{children}</>;

  // stato di attesa / eventuale errore
  return (
    <div className={className}>
      <div className="animate-pulse">
        <div className="h-4 w-64 bg-gray-200 rounded mb-2" />
        <div className="h-3 w-44 bg-gray-200 rounded mb-6" />
        <div className="h-3 w-full max-w-xl bg-gray-100 rounded" />
      </div>
      <p className="mt-4 text-sm text-gray-500">
        We’re preparing your video. This usually takes a few seconds. The page will refresh automatically as soon as it’s ready.
        {error ? <> <br /><span className="text-red-500">Note:</span> {error}</> : null}
      </p>
    </div>
  );
}
