import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowRightIcon,
  CheckLineIcon,
  DropletsIcon,
  SowingIcon,
  SproutIcon,
} from "@/icons";
import { accountModules } from "../../_config/accountModules";

const timelines = [
  {
    crop: "wheat",
    area: "2.40",
    activity: "irrigation",
    status: "overdue",
    icon: DropletsIcon,
    activeStep: 2,
    stages: ["sowing", "germination", "irrigation", "fertilizer", "harvest"],
  },
  {
    crop: "soybean",
    area: "3.20",
    activity: "vegetativeGrowth",
    status: "current",
    icon: SproutIcon,
    activeStep: 2,
    stages: ["sowing", "germination", "vegetative", "flowering", "harvest"],
  },
  {
    crop: "maize",
    area: "1.80",
    activity: "sowing",
    status: "pending",
    icon: SowingIcon,
    activeStep: 0,
    stages: ["sowing", "germination", "vegetative", "flowering", "harvest"],
  },
] as const;

const statuses = {
  overdue: {
    count: 2,
    row: "from-white to-error-25 dark:from-gray-900 dark:to-error-950/30",
    badge: "bg-error-50 text-error-600 dark:bg-error-950 dark:text-error-300",
    marker:
      "border-error-500 text-error-600 dark:bg-gray-900 dark:text-error-300",
    step: "border-error-500 text-error-600 dark:text-error-300",
    chip: "border-error-400 text-error-600 dark:border-error-500 dark:text-error-300",
  },
  current: {
    count: 4,
    row: "from-success-25 to-success-50/80 dark:from-gray-900 dark:to-success-950/40",
    badge:
      "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300",
    marker: "border-success-500 text-success-600 dark:bg-gray-900",
    step: "border-success-500 text-success-700 dark:text-success-300",
    chip: "border-success-500 text-success-700 dark:text-success-300",
  },
  pending: {
    count: 2,
    row: "from-blue-light-25 to-blue-light-50 dark:from-gray-900 dark:to-blue-light-950/40",
    badge:
      "bg-blue-light-100 text-blue-light-600 dark:bg-blue-light-900 dark:text-blue-light-300",
    marker: "border-blue-light-500 text-blue-light-500 dark:bg-gray-900",
    step: "border-blue-light-500 text-blue-light-600 dark:text-blue-light-300",
    chip: "border-blue-light-400 text-blue-light-600 dark:text-blue-light-300",
  },
} as const;

export default async function DashboardCropTimeline() {
  const t = await getTranslations("farmerDashboard.cropTimeline");
  return (
    <section
      aria-labelledby="dashboard-crop-timeline"
      className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <SproutIcon
            aria-hidden="true"
            className="text-success-700 dark:text-success-400 size-7 shrink-0"
          />
          <div>
            <h3
              id="dashboard-crop-timeline"
              className="text-lg leading-6 font-bold text-gray-950 dark:text-white"
            >
              {t("title")}
            </h3>
            <p className="text-theme-xs text-gray-600 dark:text-gray-400">
              {t("description")}
            </p>
          </div>
        </div>
        <div
          role="group"
          aria-label={t("statusOverview")}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="border-success-600 bg-success-700 text-theme-xs rounded-full border px-5 py-1 font-semibold text-white">
            {t("counts.all", { count: 8 })}
          </span>
          {(["overdue", "current", "pending"] as const).map((status) => (
            <span
              key={status}
              className={`text-theme-xs rounded-full border px-4 py-1 font-semibold ${statuses[status].chip}`}
            >
              {t(`counts.${status}`, { count: statuses[status].count })}
            </span>
          ))}
        </div>
      </div>

      <div className="relative ps-10">
        <span
          aria-hidden="true"
          className="absolute start-5 top-7 bottom-7 w-px bg-gray-200 dark:bg-gray-700"
        />
        <div className="space-y-1">
          {timelines.map(
            ({
              crop,
              area,
              activity,
              status,
              icon: Icon,
              activeStep,
              stages,
            }) => (
              <article
                key={crop}
                aria-labelledby={`dashboard-crop-${crop}`}
                className={`relative grid items-center gap-x-3 gap-y-2 rounded-lg bg-linear-to-r px-2 py-1 sm:grid-cols-2 lg:grid-cols-12 ${statuses[status].row}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute -start-7 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-white text-xs leading-none font-bold ${statuses[status].marker}`}
                >
                  {status === "overdue" ? "!" : null}
                </span>
                <div className="flex min-w-0 items-center gap-3 lg:col-span-3 xl:gap-8">
                  <Image
                    src={`/images/account/dashboard/${crop}.webp`}
                    alt=""
                    width={48}
                    height={48}
                    sizes="44px"
                    className="size-11 shrink-0 rounded-md object-cover"
                  />
                  <div>
                    <h4
                      id={`dashboard-crop-${crop}`}
                      className="text-sm leading-5 font-bold text-gray-950 dark:text-white"
                    >
                      {t(`crops.${crop}.name`)}
                    </h4>
                    <p className="text-theme-sm text-gray-600 dark:text-gray-400">
                      {t(`crops.${crop}.field`, { area })}
                    </p>
                  </div>
                </div>
                <div className="min-w-0 lg:col-span-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon
                      aria-hidden="true"
                      className={`size-5 shrink-0 ${status === "overdue" ? "text-blue-light-600" : status === "current" ? "text-success-500" : "text-blue-light-500"}`}
                    />
                    <p className="text-sm font-bold text-gray-950 dark:text-white">
                      {t(`activities.${activity}`)}
                    </p>
                    <span
                      className={`text-theme-xs rounded-full px-2.5 font-semibold ${statuses[status].badge}`}
                    >
                      {t(`statuses.${status}`)}
                    </span>
                  </div>
                  <p
                    className={`text-theme-sm mt-0.5 ${status === "overdue" ? "text-error-600 dark:text-error-300" : "text-gray-600 dark:text-gray-400"}`}
                  >
                    {t.rich(`crops.${crop}.schedule`, {
                      date: (chunks) => (
                        <span className="text-gray-600 dark:text-gray-400">
                          {chunks}
                        </span>
                      ),
                    })}
                  </p>
                </div>
                <ol
                  aria-label={t("stageProgress", {
                    crop: t(`crops.${crop}.name`),
                  })}
                  className="flex min-w-0 items-start py-1 sm:col-span-2 lg:col-span-6"
                >
                  {stages.map((stage, index) => {
                    const completed = index < activeStep;
                    const active = index === activeStep;
                    return (
                      <li
                        key={stage}
                        aria-current={active ? "step" : undefined}
                        className="relative flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
                      >
                        {index < stages.length - 1 && (
                          <span
                            aria-hidden="true"
                            className={`absolute start-1/2 top-2 h-px w-full ${completed ? "bg-success-400" : "bg-gray-200 dark:bg-gray-700"}`}
                          />
                        )}
                        <span
                          aria-hidden="true"
                          className={`relative z-1 flex size-4 items-center justify-center rounded-full border-2 ${completed ? "border-success-600 bg-success-600 text-white" : active ? (status === "pending" ? "border-blue-light-500 bg-blue-light-500 text-white" : `bg-white dark:bg-gray-900 ${statuses[status].step}`) : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"}`}
                        >
                          {completed ? (
                            <CheckLineIcon className="size-3" />
                          ) : active && status === "pending" ? (
                            <span className="size-1 rotate-45 bg-white" />
                          ) : null}
                        </span>
                        <span
                          className={`text-theme-xs max-w-full leading-4 break-words ${active ? statuses[status].step : "text-gray-700 dark:text-gray-300"}`}
                        >
                          {t(`stages.${stage}`)}
                          {completed && (
                            <span className="sr-only"> — {t("completed")}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </article>
            ),
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-gray-600 dark:text-gray-400">
          {t("showing", { visible: 3, total: 8 })}
        </p>
        <Link
          href={accountModules["crop-manager"].href}
          className="text-success-700 focus-visible:outline-success-600 dark:text-success-400 inline-flex items-center gap-1 font-bold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t("viewAll")}
          <ArrowRightIcon
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-4 rtl:rotate-180"
          />
        </Link>
      </div>
    </section>
  );
}
