"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import clsx from "clsx";

type VideoThumbnailProps = {
  userId: string;
  videoId: string;
  alt?: string;
  /** classi applicate all’<img/> */
  imageClass?: string;
  /** classi del wrapper */
  className?: string;

  /** opzionali: override espliciti se li hai già a disposizione */
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
};

/**
 * Mostra la cover di un video con fallback robusto.
 * Ordine tentativi:
 *  1) props.thumbnail
 *  2) props.thumbnailUrl
 *  3) s3 .../screenshot/screen-capture.jpg
 *  4) s3 .../result.jpg
 *  5) s3 .../frame-00001.jpg
 */
export function VideoThumbnail({
  userId,
  videoId,
  alt = "Video thumbnail",
  imageClass,
  className,
  thumbnail,
  thumbnailUrl,
}: VideoThumbnailProps) {
  const sources = useMemo(() => {
    const arr = [
      thumbnail ?? undefined,
      thumbnailUrl ?? undefined,
      userId && videoId
        ? `https://s3.workflowexpert.io/cap-uploads/${userId}/${videoId}/screenshot/screen-capture.jpg`
        : undefined,
      userId && videoId
        ? `https://s3.workflowexpert.io/cap-uploads/${userId}/${videoId}/result.jpg`
        : undefined,
      userId && videoId
        ? `https://s3.workflowexpert.io/cap-uploads/${userId}/${videoId}/frame-00001.jpg`
        : undefined,
    ]
      .filter(Boolean) as string[];

    // deduplica conservando l’ordine
    return Array.from(new Set(arr));
  }, [userId, videoId, thumbnail, thumbnailUrl]);

  const [idx, setIdx] = useState(0);
  const src = sources[idx];

  // Wrapper: mantiene aspect-ratio e bordi coerenti con le card
  return (
    <div
      className={clsx(
        "relative w-full aspect-video overflow-hidden rounded-t-xl bg-black",
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={clsx(
            "object-cover w-full h-full",
            imageClass
          )}
          // evitiamo problemi con domini non whitelisted
          unoptimized
          onError={() => {
            // prova la prossima sorgente; se finite, lascia il placeholder
            setIdx((prev) => (prev + 1 < sources.length ? prev + 1 : prev));
          }}
        />
      ) : (
        // Placeholder finale se tutti i fallback falliscono
        <div className={clsx(
          "absolute inset-0 bg-[linear-gradient(120deg,rgba(30,30,30,.9),rgba(10,10,10,.9))]"
        )}/>
      )}
    </div>
  );
}
