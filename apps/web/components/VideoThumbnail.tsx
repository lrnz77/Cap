"use client";

import clsx from "clsx";
import Image from "next/image";
import { memo, useState } from "react";

interface VideoThumbnailProps {
  userId: string;
  videoId: string;
  alt: string;
  imageClass?: string;
  objectFit?: string;
  containerClass?: string;
}

function generateRandomGrayScaleColor() {
  const minGrayScaleValue = 190;
  const maxGrayScaleValue = 235;
  const grayScaleValue = Math.floor(
    Math.random() * (maxGrayScaleValue - minGrayScaleValue) + minGrayScaleValue
  );
  return `rgb(${grayScaleValue}, ${grayScaleValue}, ${grayScaleValue})`;
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
    const [imageStatus, setImageStatus] = useState<"loading" | "error" | "success">("loading");
    
    // URL diretto S3
    const imageUrl = `https://s3.workflowexpert.io/cap-uploads/${userId}/${videoId}/screenshot/screen-capture.jpg`;
    
    const randomGradient = `linear-gradient(to right, ${generateRandomGrayScaleColor()}, ${generateRandomGrayScaleColor()})`;

    return (
      <div
        className={clsx(
          `overflow-hidden relative mx-auto w-full h-full bg-black rounded-t-xl border-b border-gray-3 aspect-video`,
          containerClass
        )}
      >
        {/* Fallback gradient for error state */}
        {imageStatus === "error" && (
          <div
            className="absolute inset-0 w-full h-full"
            style={{ backgroundImage: randomGradient }}
          />
        )}
        
        <Image
          src={imageUrl}
          fill={true}
          sizes="(max-width: 768px) 100vw, 33vw"
          alt={alt}
          style={{ objectFit: objectFit as any }}
          className={clsx(
            "w-full h-full",
            imageClass,
            imageStatus === "loading" && "opacity-0"
          )}
          onLoad={() => setImageStatus("success")}
          onError={() => setImageStatus("error")}
          unoptimized // Importante per domini esterni
        />
      </div>
    );
  }
);

VideoThumbnail.displayName = "VideoThumbnail";
