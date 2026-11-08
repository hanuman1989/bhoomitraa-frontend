"use client";

import { CheckLineIcon } from "@/icons";

export default function ProductWizardSteps<Step extends number>({
  steps,
  step,
  completedStep,
  maximumStep,
  hasRecord,
  busy,
  label,
  stepLabel,
  onSelect,
}: {
  steps: readonly Step[];
  step: Step;
  completedStep: number;
  maximumStep: number;
  hasRecord: boolean;
  busy: boolean;
  label: string;
  stepLabel: (step: Step) => string;
  onSelect: (step: Step) => void;
}) {
  return (
    <nav
      aria-label={label}
      className="shadow-theme-xs rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
    >
      <ol
        className={`grid grid-cols-2 gap-3 ${steps.length === 5 ? "md:grid-cols-5" : "md:grid-cols-4"}`}
      >
        {steps.map((number) => (
          <li key={number} className="min-w-0">
            <button
              type="button"
              aria-current={step === number ? "step" : undefined}
              disabled={
                busy || number > maximumStep || number === step || !hasRecord
              }
              onClick={() => onSelect(number)}
              className={`flex w-full items-center gap-3 rounded-full px-3 py-2 text-start text-sm disabled:cursor-default ${number === step ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 font-semibold" : "text-gray-600 dark:text-gray-400"}`}
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${number === step ? "bg-brand-500 text-white" : number <= completedStep ? "bg-success-600 text-white" : "border border-gray-300 dark:border-gray-700"}`}
              >
                {number !== step && number <= completedStep ? (
                  <CheckLineIcon aria-hidden="true" className="size-5" />
                ) : (
                  number
                )}
              </span>
              {stepLabel(number)}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
