"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

const tags = {
  b: (chunks: ReactNode) => (
    <strong className="font-semibold text-gray-950 dark:text-white">
      {chunks}
    </strong>
  ),
  red: (chunks: ReactNode) => (
    <strong className="text-error-600 dark:text-error-400 font-semibold">
      {chunks}
    </strong>
  ),
  orange: (chunks: ReactNode) => (
    <strong className="font-semibold text-orange-600 dark:text-orange-400">
      {chunks}
    </strong>
  ),
};

/** "How to Draw" popover content. Crops add whole-farm reuse, partial
 * redraws and the farm/crop limits on top of the farm instructions. */
export default function BoundaryDrawHelp({ kind }: { kind: "farm" | "crop" }) {
  const tf = useTranslations("farmerFarms");
  const tc = useTranslations("farmerCrops");
  // Button names come from the buttons' own labels, so they always match.
  const values = {
    ...tags,
    draw: tf("drawPolygon"),
    redraw: tf("redrawBoundary"),
    confirm: tf("confirmBoundary"),
    undo: tf("wizard.undoPoint"),
    clear: tf("wizard.clearBoundary"),
    edit: tf("editBoundary"),
    useFarm: tc("useFarmBoundary"),
  };
  const title = kind === "crop" ? tc("drawHelp.title") : tf("drawHelp.title");
  const steps =
    kind === "crop"
      ? [
          tc.rich("drawHelp.wholeFarm", values),
          tc.rich("drawHelp.partFarm", values),
          tc.rich("drawHelp.close", values),
          tc.rich("drawHelp.limits", values),
          tc.rich("drawHelp.fix", values),
        ]
      : [
          tf.rich("drawHelp.start", values),
          tf.rich("drawHelp.close", values),
          tf.rich("drawHelp.fix", values),
          tf.rich("drawHelp.edit", values),
        ];
  const tip =
    kind === "crop"
      ? tc.rich("drawHelp.tip", values)
      : tf.rich("drawHelp.tip", values);
  return (
    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
      <p className="text-base font-bold text-gray-950 dark:text-white">
        {title}
      </p>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-2">
            <span className="bg-success-100 text-success-800 dark:bg-success-950 dark:text-success-200 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {index + 1}
            </span>
            <span className="min-w-0">{step}</span>
          </li>
        ))}
      </ol>
      <p className="bg-success-50 text-success-800 dark:bg-success-950 dark:text-success-200 rounded-lg px-3 py-2 text-xs">
        {tip}
      </p>
    </div>
  );
}
