"use client";

import clsx from "clsx";
import { memo, useState } from "react";

interface VideoThumbnailProps {
  userId: string;
  videoId: string;
  alt: string;
  imageClass?: string;
  objectFit?: string;
  containerClass?: string;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = memo(
  ({
    userId,
    videoId,
    alt,
    imageClass,
    objectFit = "cover",
    containerClass,
  }) => {
    const [hasError, setHasError] = useState(false);
    
    // URL DIRETTO - niente API, niente query
    const imageUrl = `https://s3.workflowexpert.io/cap-uploads/${userId}/${videoId}/screenshot/screen-capture.jpg`;
    
    return (
      <div
        className={clsx(
          `overflow-hidden relative mx-auto w-full h-full bg-gray-900 rounded-t-xl border-b border-gray-3 aspect-video`,
          containerClass
        )}
      >
        {!hasError ? (
          <img
            src={imageUrl}
            alt={alt}
            className={clsx("w-full h-full object-cover", imageClass)}
            style={{ objectFit: objectFit as any }}
            onError={() => {
              console.log(`Failed to load thumbnail: ${imageUrl}`);
              setHasError(true);
            }}
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-800">
            <span className="text-gray-500">No preview</span>
          </div>
        )}
      </div>
    );
  }
);

VideoThumbnail.displayName = "VideoThumbnail";
