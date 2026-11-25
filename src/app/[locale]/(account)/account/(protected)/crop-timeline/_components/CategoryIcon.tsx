import {
  activityCategoryIcons,
  isActivityCategoryIcon,
} from "@/icons/activityCategoryIcons";
import { MapLayersIcon, SproutIcon } from "@/icons";
import type { TimelineTone } from "@/types/account/cropTimeline";

/** Background and foreground classes for the fixed tones the API sends. */
export const toneClasses: Record<TimelineTone, string> = {
  green:
    "bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300",
  amber:
    "bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300",
  blue: "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950 dark:text-blue-light-300",
  red: "bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300",
  violet:
    "bg-theme-purple-500/10 text-theme-purple-500 dark:bg-theme-purple-500/20",
};

/**
 * Renders an icon key from the API (Activity Category master data or the smart
 * action map). Only known icons resolve; anything else falls back to a sprout.
 */
export default function CategoryIcon({
  icon,
  className = "size-5",
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  const Icon =
    icon === "MapLayersIcon"
      ? MapLayersIcon
      : icon && isActivityCategoryIcon(icon)
        ? activityCategoryIcons[icon]
        : SproutIcon;
  return <Icon aria-hidden="true" className={className} />;
}

/** A rounded, tone-coloured tile holding an icon. */
export function IconTile({
  icon,
  tone,
  className = "size-10.5 rounded-xl",
  iconClassName = "size-5",
}: {
  icon: string | null | undefined;
  tone: TimelineTone | undefined;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${toneClasses[tone ?? "green"]} ${className}`}
    >
      <CategoryIcon icon={icon} className={iconClassName} />
    </span>
  );
}
