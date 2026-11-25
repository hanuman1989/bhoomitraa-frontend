import type { ReactNode } from "react";

const chipTones = {
  neutral:
    "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
  amber:
    "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-800 dark:bg-warning-950 dark:text-warning-300",
  green:
    "border-success-200 bg-success-50 text-success-700 dark:border-success-800 dark:bg-success-950 dark:text-success-300",
} as const;

/** Small count chip used in the Record and Smart Actions accordion headers. */
export function AccordionChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof chipTones;
}) {
  return (
    <span
      className={`text-theme-xs rounded-full border px-2 py-0.5 font-medium whitespace-nowrap ${chipTones[tone]}`}
    >
      {children}
    </span>
  );
}
