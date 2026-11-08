import { useTranslations } from "next-intl";
import {
  activityCategoryIcons,
  isActivityCategoryIcon,
} from "@/icons/activityCategoryIcons";

export default function ActivityIconPreview({
  value,
}: {
  value: string | null;
}) {
  const t = useTranslations("activityCategories");
  const Icon =
    value && isActivityCategoryIcon(value)
      ? activityCategoryIcons[value]
      : null;
  return (
    <span
      aria-hidden="true"
      className="text-brand-500 dark:text-brand-400 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
    >
      {Icon ? (
        <Icon className="size-5" />
      ) : (
        <span className="text-gray-400">{t("notAvailable")}</span>
      )}
    </span>
  );
}
