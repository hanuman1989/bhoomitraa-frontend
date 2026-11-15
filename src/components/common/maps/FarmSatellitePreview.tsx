"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FarmLandscapeIcon } from "@/icons";
import { cn } from "@/utils";
import {
  farmStaticMapPreview,
  STATIC_MAP_HEIGHT,
  STATIC_MAP_SCALE,
  STATIC_MAP_WIDTH,
  type FarmStaticMapOptions,
} from "./farmStaticMap";

interface Props extends FarmStaticMapOptions {
  name: string;
  className?: string;
  /** Optional server-signed URL; explicit null means use the illustration. */
  src?: string | null;
}

export default function FarmSatellitePreview({
  name,
  className,
  src,
  boundary,
  latitude,
  longitude,
  strokeColor,
}: Props) {
  const preview = useMemo(
    () =>
      src === undefined
        ? farmStaticMapPreview(
            { boundary, latitude, longitude, strokeColor },
            process.env.NEXT_PUBLIC_GOOGLE_MAPS_STATIC_API_KEY ||
              process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          )
        : { url: src, reason: src ? null : "server-preview-unavailable" },
    [src, boundary, latitude, longitude, strokeColor],
  );
  // A different saved geometry/appearance starts a new image lifecycle.
  return (
    <PreviewImage
      key={preview.url}
      src={preview.url}
      reason={preview.reason}
      name={name}
      className={className}
    />
  );
}

function PreviewImage({
  src,
  name,
  className,
  reason,
}: Pick<Props, "name" | "className"> & {
  src: string | null;
  reason: string | null;
}) {
  const t = useTranslations("farmerFarms");
  const [status, setStatus] = useState<
    "loading" | "loaded" | "image-error" | "unexpected-image-size"
  >("loading");
  const failed = status === "image-error" || status === "unexpected-image-size";
  const showImage = Boolean(src) && !failed;
  return (
    <span
      className={cn(
        "bg-success-50 relative block overflow-hidden rounded-xl",
        className,
      )}
      role={showImage ? undefined : "img"}
      aria-label={showImage ? undefined : t("previewUnavailable", { name })}
      data-farm-preview={src ? (failed ? "error" : status) : "unavailable"}
      data-farm-preview-reason={failed ? status : (reason ?? undefined)}
    >
      <FarmLandscapeIcon
        aria-hidden="true"
        className="text-success-600 h-full w-full"
      />
      {showImage && (
        <Image
          src={src!}
          alt={t("satellitePreview", { name })}
          width={STATIC_MAP_WIDTH * STATIC_MAP_SCALE}
          height={STATIC_MAP_HEIGHT * STATIC_MAP_SCALE}
          unoptimized
          loading="lazy"
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full object-contain",
            status !== "loaded" && "opacity-0",
          )}
          onLoad={(event) => {
            const image = event.currentTarget;
            // Some Google authorization/quota error images have a different size.
            setStatus(
              image.naturalWidth === STATIC_MAP_WIDTH * STATIC_MAP_SCALE &&
                image.naturalHeight === STATIC_MAP_HEIGHT * STATIC_MAP_SCALE
                ? "loaded"
                : "unexpected-image-size",
            );
          }}
          onError={() => setStatus("image-error")}
        />
      )}
    </span>
  );
}
