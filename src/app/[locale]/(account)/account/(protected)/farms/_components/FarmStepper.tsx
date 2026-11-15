"use client";
import { useTranslations } from "next-intl";
import { CheckLineIcon } from "@/icons";
export default function FarmStepper({
  step,
  reached,
  onStep,
  disabled,
  isEditing = false,
}: {
  step: number;
  reached: number;
  onStep: (step: number) => void;
  disabled: boolean;
  isEditing?: boolean;
}) {
  const t = useTranslations("farmerFarms.wizard");
  return (
    <nav
      aria-label={t("progress")}
      className="shrink-0 px-2 pt-3 pb-4 sm:px-6 sm:pt-4"
    >
      <ol className="flex">
        {["information", "location", "boundary", "review"].map((key, index) => {
          const completed = isEditing || index < step;
          return (
            <li key={key} className="relative flex flex-1 justify-center">
              {index < 3 && (
                <span
                  aria-hidden="true"
                  className={`absolute start-1/2 top-4 h-px w-full sm:top-5 ${completed ? "bg-success-600" : "bg-gray-300 dark:bg-gray-600"}`}
                />
              )}
              <button
                type="button"
                disabled={disabled || index > reached}
                onClick={() => onStep(index)}
                aria-current={step === index ? "step" : undefined}
                aria-label={
                  completed
                    ? t("completedStep", { step: t(`steps.${key}`) })
                    : t(`steps.${key}`)
                }
                className="relative flex w-full flex-col items-center gap-2 text-center disabled:cursor-default"
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-full border text-base font-bold sm:size-10 sm:text-lg ${completed || index === step ? "border-success-600 bg-success-700 text-white" : "border-gray-300 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-900"} ${isEditing && index === step ? "ring-success-100 dark:ring-success-900 ring-4" : ""}`}
                >
                  {completed ? (
                    <CheckLineIcon aria-hidden="true" className="size-6" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`text-xs font-semibold sm:text-sm ${step === index ? "text-success-700 dark:text-success-300" : "text-gray-600 dark:text-gray-300"}`}
                >
                  {t(`steps.${key}`)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
