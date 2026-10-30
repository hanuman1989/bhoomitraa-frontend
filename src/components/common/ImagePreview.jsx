"use client";

import Image from "next/image";
import { useState } from "react";

const fallbackImage = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
    <g transform="translate(136 50)" fill="none" stroke="#53699b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="42" height="42" rx="6"/>
      <circle cx="15" cy="15" r="4"/>
      <path d="m3 35 13-13 10 10 7-7 12 12"/>
    </g>
    <text x="160" y="124" text-anchor="middle" fill="#53699b" font-family="Arial, sans-serif" font-size="14">No image available</text>
  </svg>
`)}`;

// Use public image URLs directly; never guess backend storage paths.
export function getImageUrl(value) {
  if (typeof value !== "string") return "";
  const url = value.trim();
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (/^data:image\//i.test(url)) return url;
  try {
    return ["http:", "https:", "blob:"].includes(new URL(url).protocol) ? url : "";
  } catch {
    return "";
  }
}

function PreviewImage({
  src,
  alt = "",
  width,
  height,
  fill = false,
  className = "",
  unoptimized = true,
  onError,
  placeholder,
  overrideSrc,
  srcSet,
  ...props
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  return (
    <Image
      {...props}
      src={showFallback ? fallbackImage : src}
      alt={showFallback ? "No image available" : alt}
      width={fill ? undefined : (width ?? src?.width ?? 320)}
      height={fill ? undefined : (height ?? src?.height ?? 180)}
      fill={fill}
      className={showFallback ? `bg-blue-50 dark:bg-gray-800 ${className}` : className}
      unoptimized={showFallback || unoptimized}
      placeholder={showFallback ? "empty" : placeholder}
      overrideSrc={showFallback ? undefined : overrideSrc}
      srcSet={showFallback ? undefined : srcSet}
      onError={(event) => {
        if (!showFallback) {
          setFailed(true);
          onError?.(event);
        }
      }}
    />
  );
}

/** Accepts next/image props, retaining the same sizing for the SVG fallback. */
export function ImagePreview({ src, ...props }) {
  const image = src?.default ?? src;
  const url = getImageUrl(typeof image === "object" ? image?.src : image);

  // Remount for a new source so an earlier loading error cannot hide it.
  const imageSource = url ? (typeof image === "object" ? image : url) : "";
  return <PreviewImage key={url} {...props} src={imageSource} />;
}

export default ImagePreview;
