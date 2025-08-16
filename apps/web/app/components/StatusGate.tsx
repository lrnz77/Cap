"use client";

type Props = {
  ready: boolean;
  isDesktopMP4?: boolean;
  children: React.ReactNode;
};

export function StatusGate({ ready, isDesktopMP4, children }: Props) {
  if (ready) return <>{children}</>;

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-xl">
      <div className="max-w-xl w-full p-6">
        <div className="animate-pulse space-y-3 mb-4">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-full" />
        </div>

        <div className="text-sm text-gray-600">
          <p className="mb-2">
            We’re preparing your video. This usually takes a few seconds.
            The page will refresh automatically as soon as it’s ready.
          </p>
          {isDesktopMP4 && (
            <p>
              If it takes too long, try refreshing the page. Make sure the
              uploader finished sending the file.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
