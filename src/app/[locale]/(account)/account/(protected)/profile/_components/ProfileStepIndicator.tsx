import { useTranslations } from "next-intl";
import { CheckLineIcon } from "@/icons";

export default function ProfileStepIndicator({
  step,
  personalSaved,
}: {
  step: 1 | 2;
  personalSaved: boolean;
}) {
  const t = useTranslations("farmerProfile");
  return (
    <div className="relative mx-auto my-5 w-full max-w-xl shrink-0">
      <span
        aria-hidden="true"
        className="absolute inset-x-1/4 top-4.5 h-0.5 bg-gray-300 dark:bg-gray-700"
      />
      <span
        aria-hidden="true"
        className={`bg-success-700 absolute start-1/4 top-4.5 h-0.5 ${step === 1 ? "w-1/4" : "w-1/2"}`}
      />
      <ol aria-label={t("progress")} className="relative flex">
        {([1, 2] as const).map((number) => (
          <li
            key={number}
            aria-current={step === number ? "step" : undefined}
            className="flex w-1/2 flex-col items-center gap-1.5 text-center text-sm font-semibold"
          >
            <span
              className={`flex size-9 items-center justify-center rounded-full border-2 text-lg ${number === step || (number === 1 && personalSaved) ? "border-success-700 bg-success-700 text-white" : "border-gray-300 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"}`}
            >
              {number < step && personalSaved ? (
                <CheckLineIcon aria-hidden="true" className="size-5" />
              ) : (
                number
              )}
            </span>
            <span
              className={
                step === number
                  ? "text-success-800 dark:text-success-300"
                  : "text-gray-500 dark:text-gray-400"
              }
            >
              {number === 1 ? t("personalStep") : t("locationTitle")}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
