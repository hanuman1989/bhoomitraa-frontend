import type { ComponentType, SVGProps } from "react";
import { SeasonLeafIcon, SeasonSproutIcon, SeasonSunIcon } from "@/icons";
import { cn } from "@/utils";
import type { SeasonIcon as SeasonIconValue } from "@/types/season";

const iconMap: Record<
  SeasonIconValue,
  { Icon: ComponentType<SVGProps<SVGSVGElement>>; className: string }
> = {
  sprout: { Icon: SeasonSproutIcon, className: "text-success-600" },
  sun: { Icon: SeasonSunIcon, className: "text-warning-500" },
  leaf: { Icon: SeasonLeafIcon, className: "text-success-600" },
};

export default function SeasonIcon({
  icon,
  size = 24,
  className,
}: {
  icon: SeasonIconValue | null | undefined;
  size?: number;
  className?: string;
}) {
  if (!icon || !Object.hasOwn(iconMap, icon)) return null;
  const { Icon, className: color } = iconMap[icon];
  return (
    <Icon
      aria-hidden="true"
      width={size}
      height={size}
      className={cn("shrink-0", color, className)}
    />
  );
}
