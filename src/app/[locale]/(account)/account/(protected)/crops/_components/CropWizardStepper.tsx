"use client";
import { useTranslations } from "next-intl";
import { CheckLineIcon } from "@/icons";
import type { CropDetail } from "@/types/account/farmCrop";
export const cropSteps = [
  "crop_selection",
  "boundary",
  "seed_sowing",
  "soil_assessment",
  "fertilizer_planning",
  "review",
] as const;
export default function CropWizardStepper({
  step,
  crop,
  busy,
  onStep,
}: {
  step: number;
  crop: CropDetail | null;
  busy: boolean;
  onStep: (step: number) => void;
}) {
  const t = useTranslations("farmerCrops");
  return (
    <nav
      aria-label={t("wizardProgress")}
      className="custom-scrollbar shrink-0 overflow-x-auto overflow-y-hidden px-4 pt-1 pb-3 sm:px-8"
    >
      <ol className="flex min-w-[42rem] items-start sm:min-w-0">
        {cropSteps.map((key, index) => {
          const number = index + 1;
          const completed =
            key !== "review" &&
            ["completed", "skipped"].includes(crop?.wizard_progress[key] ?? "");
          const accessible =
            number === 1 ||
            Boolean(crop && (number <= (crop.next_step ?? 6) || completed));
          return (
            <li
              key={key}
              className="relative isolate flex min-w-28 flex-1 flex-col items-center gap-2 px-1 text-center"
            >
              {index > 0 && (
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-4 z-0 -translate-x-1/2 border-t rtl:translate-x-1/2 ${completed || number <= step ? "border-success-600" : "border-gray-300 dark:border-gray-600"}`}
                />
              )}
              <button
                type="button"
                disabled={busy || !accessible}
                onClick={() => onStep(number)}
                aria-current={step === number ? "step" : undefined}
                className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold disabled:cursor-not-allowed ${step === number ? "border-success-600 bg-success-700 ring-success-100 dark:ring-success-900 text-white ring-4" : completed ? "border-success-600 bg-success-700 text-white" : "border-gray-300 bg-white text-gray-500 dark:bg-gray-900"}`}
              >
                {completed && number !== step ? (
                  <CheckLineIcon className="size-5" />
                ) : (
                  number
                )}
              </button>
              <span
                className={`block min-h-10 max-w-32 text-xs leading-5 font-semibold sm:text-sm ${step === number ? "text-success-700 dark:text-success-300" : "text-gray-600 dark:text-gray-300"}`}
              >
                {t(`steps.${key}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
