import Image from "next/image";
import React from "react";
import { useTranslations } from "next-intl";

export default function ResponsiveImage() {
  const tUi = useTranslations("ui.responsiveImage");

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <Image
          src="/images/grid-image/image-01.png"
          alt={tUi("cover")}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-800"
          width={1054}
          height={600}
        />
      </div>
    </div>
  );
}
