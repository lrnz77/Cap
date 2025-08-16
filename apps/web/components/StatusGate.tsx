'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  videoId: string;
  // Elemento da mostrare quando pronto (es. il player)
  children: React.ReactNode;
  // UI alternativa durante il processing (opzionale)
  processingFallback?: React.ReactNode;
  // intervallo di polling in ms (default 2000)
  intervalMs?: number;
  // timeout massimo in ms per dichiarare errore (default 2 minuti)
  timeoutMs?: number;
};

export default function StatusGate({
  videoId,
  children,
  processingFallback,
  intervalMs = 2000,
  timeoutMs = 120_000,
}: Props) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number>(Date.now());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let stopped = false;

    async function tick() {
      if (stopped) return;
      if (Date.now() - startedAt.current > timeoutMs) {
        setError('Timeout while preparing the video. Try refresh.');
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch(`/api/video-status?id=${videoId}`, {
          method: 'GET',
          signal: ac.signal,
          cache: 'no-store',
        });

        if (!res.ok) {
          // 404 → non trovato (ancora), riprova; altri errori → mostra messaggio
          if (res.status !== 404) {
            const t = await res.text();
            setError(`Status check failed: ${res.status} ${t}`);
            return;
          }
        } else {
          const data = await res.json();
          if (data?.ready === true) {
            setReady(true);
            return;
          } else {
            setReady(false);
          }
        }
      } catch (e: any) {
        // rete momentanea: non bloccare, ritenta
        console.warn('status poll error:', e?.message || e);
      }

      // ripeti
      setTimeout(tick, intervalMs);
    }

    tick();

    return () => {
      stopped = true;
      abortRef.current?.abort();
    };
  }, [videoId, intervalMs, timeoutMs]);

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
        {error}{' '}
        <button
          className="ml-2 underline"
          onClick={() => {
            // reset e riparti
            startedAt.current = Date.now();
            setError(null);
            setReady(null);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (ready === true) return <>{children}</>;

  // UI “processing”
  return (
    <>
      {processingFallback ?? (
        <div className="p-6 rounded-2xl border bg-gray-50">
          <div className="animate-pulse">
            <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-60 bg-gray-200 rounded" />
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Stiamo preparando il tuo video (di solito pochi secondi). Si aggiorna da solo.
          </p>
        </div>
      )}
    </>
  );
}
