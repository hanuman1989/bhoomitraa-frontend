"use client";
import Image from "next/image";
import { useTranslations } from "next-intl";
export default function FarmIllustration({
  location = false,
}: {
  location?: boolean;
}) {
  const t = useTranslations("farmerFarms.wizard");
  return (
    <aside className="border-success-50 bg-success-50/65 dark:border-success-900 dark:bg-success-950/50 hidden min-h-0 overflow-hidden rounded-2xl border lg:flex lg:flex-col">
      <div className="relative min-h-64 flex-1">
        <Image
          src={location ? "/images/farm/step2.png" : "/images/farm/step1.png"}
          alt=""
          fill
          sizes="(min-width: 1280px) 320px, 28vw"
          className="object-contain"
        />
      </div>
      <div className="shrink-0 px-6 pt-2 pb-8 text-center">
        <h3 className="text-2xl font-bold">
          {t(location ? "locationTitle" : "informationTitle")}
        </h3>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
          {t(location ? "locationDescription" : "informationDescription")}
        </p>
        {!location && (
          <div aria-hidden="true" className="mt-8 flex justify-center gap-3">
            <span className="bg-success-700 size-3 rounded-full" />
            {[1, 2, 3].map((n) => (
              <span key={n} className="bg-success-200 size-3 rounded-full" />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
