"use client";

import StatusGate from "@/app/components/StatusGate"; // <— questo percorso
// ...tutti i tuoi import esistenti

export const Share = (props: ShareProps) => {
  const { data, user, comments, views, initialAiData, aiGenerationEnabled } = props;

  // ...tutto il tuo codice esistente (hook, memos, ecc.)

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <div className="overflow-hidden relative p-3 aspect-video new-card-style">
            <div className="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] overflow-hidden rounded-xl">
              {/* ⬇⬇⬇ GATE QUI ⬇⬇⬇ */}
              <StatusGate videoId={data.id} className="p-6">
                <ShareVideo
                  data={{ ...data, transcriptionStatus }}
                  user={user}
                  comments={comments}
                  chapters={aiData?.chapters || []}
                  aiProcessing={aiData?.processing || false}
                  ref={playerRef}
                />
              </StatusGate>
              {/* ⬆⬆⬆ GATE QUI ⬆⬆⬆ */}
            </div>
          </div>
          {/* …resto del file invariato… */}
