import {
  activityCategoryIcons,
  isActivityCategoryIcon,
} from "@/icons/activityCategoryIcons";
import { MapLayersIcon, SproutIcon } from "@/icons";
import type { BuilderCategory } from "./types";

/** Activity Category master icon with an accessible sprout fallback. */
export function CategoryIcon({
  category,
  className = "size-5",
}: {
  category?: BuilderCategory;
  className?: string;
}) {
  const Icon =
    category?.icon && isActivityCategoryIcon(category.icon)
      ? activityCategoryIcons[category.icon]
      : SproutIcon;
  return <Icon aria-hidden="true" className={className} />;
}

/**
 * Rail marker: one category shows its icon, several show a layers icon with
 * small category indicators, and an empty stage shows a neutral sprout.
 */
export default function TimelineRailMarker({
  categories,
  label,
}: {
  categories: BuilderCategory[];
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={`absolute -start-19 top-3 flex size-14 items-center justify-center rounded-2xl border-4 border-gray-50 max-sm:-start-12 max-sm:size-10 max-sm:rounded-xl dark:border-gray-950 ${
        categories.length
          ? "bg-brand-50 text-brand-500 ring-brand-100 dark:bg-brand-950 dark:ring-brand-900 ring-1"
          : "bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      }`}
    >
      {categories.length === 1 ? (
        <CategoryIcon
          category={categories[0]}
          className="size-7 max-sm:size-5"
        />
      ) : categories.length > 1 ? (
        <MapLayersIcon aria-hidden="true" className="size-7 max-sm:size-5" />
      ) : (
        <SproutIcon aria-hidden="true" className="size-7 max-sm:size-5" />
      )}
      {categories.length > 1 && (
        <span className="shadow-theme-xs absolute top-full mt-1 flex items-center gap-0.5 rounded-md border border-gray-200 bg-white p-1 max-sm:flex-col dark:border-gray-700 dark:bg-gray-900">
          {categories.slice(0, 3).map((category) => (
            <CategoryIcon
              key={category.id}
              category={category}
              className="text-brand-500 size-4"
            />
          ))}
          {categories.length > 3 && (
            <span className="text-theme-xs text-gray-500">
              +{categories.length - 3}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
