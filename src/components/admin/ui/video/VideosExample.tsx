import React from "react";
import YouTubeEmbed from "./YouTubeEmbed";
import ComponentCard from "@/components/admin/common/ComponentCard";
import { useTranslations } from "next-intl";

export default function VideosExample() {
  const tUi = useTranslations("ui.videosExample");

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-2">
        <div className="space-y-5 sm:space-y-6">
          <ComponentCard title={tUi("videoRatio169")}>
            <YouTubeEmbed videoId="dQw4w9WgXcQ" />
          </ComponentCard>
          <ComponentCard title={tUi("videoRatio43")}>
            <YouTubeEmbed videoId="dQw4w9WgXcQ" aspectRatio="4:3" />
          </ComponentCard>
        </div>
        <div className="space-y-5 sm:space-y-6">
          <ComponentCard title={tUi("videoRatio219")}>
            <YouTubeEmbed videoId="dQw4w9WgXcQ" aspectRatio="21:9" />
          </ComponentCard>
          <ComponentCard title={tUi("videoRatio11")}>
            <YouTubeEmbed videoId="dQw4w9WgXcQ" aspectRatio="1:1" />
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}
