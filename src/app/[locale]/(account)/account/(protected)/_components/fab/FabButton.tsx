import type { ComponentProps, ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/utils";

/**
 * One map action: a white pill label to the left of a round icon button the
 * size of the panel button (32 px). On phones the whole row is at least 44 px
 * tall, so it stays easy to tap. `main` marks the Draw and group buttons; a
 * toggle that is off shows a grey circle.
 */
export default function FabButton({
  label,
  labelClassName,
  icon: Icon,
  iconClassName,
  color,
  main = false,
  pressed,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  label: ReactNode;
  labelClassName?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconClassName?: string;
  /** Background class of the icon circle. */
  color: string;
  main?: boolean;
  /** Toggle buttons only (`aria-pressed`). */
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "group focus-visible:outline-success-700 flex min-h-11 shrink-0 items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:min-h-0",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "shadow-theme-md group-hover:bg-success-50 flex items-center gap-1.5 rounded-xl bg-white/95 px-2.5 py-1.5 text-xs whitespace-nowrap text-gray-950 dark:bg-gray-900 dark:text-gray-100 dark:group-hover:bg-gray-800",
          main ? "font-semibold" : "font-medium",
          labelClassName,
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "shadow-theme-lg flex size-8 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none",
          pressed === false ? "bg-gray-400 dark:bg-gray-600" : color,
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn("block size-4 shrink-0", iconClassName)}
        />
      </span>
    </button>
  );
}
