import { useTranslations } from "next-intl";

/** Loading placeholder for the timeline page and dialog. */
export default function CropTimelineSkeleton() {
  const t = useTranslations("farmerCropTimeline");
  return (
    <div role="status" className="animate-pulse space-y-4">
      <div className="h-10 w-64 rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="h-40 rounded-2xl bg-gray-100 dark:bg-gray-800" />
      <div className="h-11 rounded-lg bg-gray-100 dark:bg-gray-800" />
      {[1, 2, 3].map((row) => (
        <div
          key={row}
          className="ms-11.5 h-24 rounded-2xl bg-gray-100 sm:ms-21 dark:bg-gray-800"
        />
      ))}
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
