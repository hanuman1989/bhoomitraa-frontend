"use client";
import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import FarmBoundaryMap from "@/components/common/maps/FarmBoundaryMap";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea, fromSquareMeters } from "@/lib/areaUnits";
import {
  FarmFieldIcon,
  LocationPinIcon,
  SproutIcon,
  PencilIcon,
  CheckLineIcon,
  ClipboardListIcon,
  InfoIcon,
  FitMapIcon,
} from "@/icons";
import type { FarmBoundarySession } from "@/hooks/useFarmBoundary";
import type { FarmFormValues } from "./farmFormTypes";
import type { FarmLocationLabels } from "./FarmLocationStep";
export default function FarmReviewStep({
  values,
  location,
  session,
  onEdit,
}: {
  values: FarmFormValues;
  location: FarmLocationLabels;
  session: FarmBoundarySession;
  onEdit: (step: number) => void;
}) {
  const t = useTranslations("farmerFarms");
  const locale = useLocale();
  const metadata = useAreaUnits();
  const [fullscreen, setFullscreen] = useState(false);
  const converted = fromSquareMeters(
    session.area,
    values.area_unit,
    metadata.config,
  );
  const area = session.boundary ? (converted ?? session.area) : null;
  const areaLabel =
    area !== null
      ? `${formatArea(area, locale)} ${metadata.label(converted === null ? "sqm" : values.area_unit)}`
      : t("wizard.notCalculated");
  function card(
    title: string,
    icon: ReactNode,
    step: number,
    children: ReactNode,
  ) {
    return (
      <section className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 border-b border-gray-100 px-3 py-2 dark:border-gray-700">
          <span className="bg-success-50 text-success-700 dark:bg-success-950 rounded-full p-2">
            {icon}
          </span>
          <h4 className="flex-1 text-lg font-bold">{title}</h4>
          <button
            type="button"
            onClick={() => onEdit(step)}
            className="bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-950 dark:text-success-300 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
          >
            <PencilIcon className="size-4" />
            {t("wizard.edit")}
            <span className="sr-only"> {title}</span>
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 bg-gray-50/70 p-4 text-sm dark:bg-gray-800/50">
          {children}
        </dl>
      </section>
    );
  }
  function row(label: string, value: ReactNode) {
    return (
      <>
        <dt className="text-gray-600 dark:text-gray-300">{label}</dt>
        <dd className="min-w-0 font-semibold break-words">
          {value || t("notProvided")}
        </dd>
      </>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="bg-success-50 text-success-700 dark:bg-success-950 rounded-full p-3">
          <ClipboardListIcon className="size-8" />
        </span>
        <div>
          <h3 className="text-2xl font-bold">{t("wizard.reviewTitle")}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("wizard.reviewDescription")}
          </p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-7">
        <div className="space-y-3 lg:col-span-4">
          {card(
            t("wizard.steps.information"),
            <SproutIcon className="size-5" />,
            0,
            <>
              {row(t("fields.name"), values.name)}
              {row(
                t("fields.ownership"),
                values.ownership_type
                  ? t(`ownership.${values.ownership_type}`)
                  : null,
              )}
              {row(
                t("recordedArea"),
                `${formatArea(values.area, locale) ?? values.area} ${values.area_unit ? metadata.label(values.area_unit) : ""}`,
              )}
              {row(t("areaSource"), t("governmentRecord"))}
              {values.description &&
                row(t("fields.description"), values.description)}
            </>,
          )}
          {card(
            t("wizard.steps.location"),
            <LocationPinIcon className="size-5" />,
            1,
            <>
              {row(t("fields.state"), location.state)}
              {row(t("fields.district"), location.district)}
              {row(t("fields.tehsil"), location.tehsil)}
              {row(t("fields.village"), values.village)}
              {row(t("fields.address"), values.address)}
            </>,
          )}
          {card(
            t("boundaryAndArea"),
            <FarmFieldIcon className="size-5" />,
            2,
            <>
              {row(
                t("wizard.boundarySource"),
                session.boundary
                  ? t(
                      session.source === "gps"
                        ? "wizard.gpsBoundary"
                        : "wizard.manualDrawing",
                    )
                  : t("wizard.noBoundary"),
              )}
              {row(
                t("mapActualArea"),
                <span className="text-success-700 dark:text-success-300 text-lg">
                  {areaLabel}
                </span>,
              )}
              {session.source === "gps" &&
                row(
                  t("wizard.gpsAccuracyLabel"),
                  session.accuracy === null
                    ? null
                    : t("wizard.gpsAccuracy", { accuracy: session.accuracy }),
                )}
            </>,
          )}
        </div>
        <div className="space-y-3 lg:col-span-3">
          <div
            className={
              fullscreen
                ? "shadow-theme-xl fixed inset-4 z-99999 rounded-2xl bg-white p-3 dark:bg-gray-900"
                : "relative h-72 overflow-hidden rounded-xl"
            }
          >
            {session.boundary ? (
              <FarmBoundaryMap points={session.points}>
                <button
                  type="button"
                  onClick={() => setFullscreen((value) => !value)}
                  aria-label={t(fullscreen ? "exitFullscreen" : "fullscreen")}
                  className="text-success-700 absolute end-3 top-3 rounded-lg bg-white p-2"
                >
                  <FitMapIcon className="size-5" />
                </button>
              </FarmBoundaryMap>
            ) : (
              <div className="bg-success-50 dark:bg-success-950 flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
                <FarmFieldIcon className="text-success-600 size-12" />
                {t("wizard.noBoundary")}
              </div>
            )}
          </div>
          <section className="bg-success-50 dark:bg-success-950 rounded-xl p-4">
            <h4 className="flex items-center gap-2 font-bold">
              <InfoIcon className="text-success-700 size-5" />
              {t("wizard.summaryTitle")}
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
              {[
                t("reviewInformation"),
                t("reviewLocation"),
                `${t("recordedArea")}: ${formatArea(values.area, locale) ?? values.area} ${values.area_unit ? metadata.label(values.area_unit) : ""}`,
                t(
                  session.boundary
                    ? "wizard.summaryWithBoundary"
                    : "wizard.summaryWithoutBoundary",
                ),
                ...(area !== null
                  ? [`${t("mapActualArea")}: ${areaLabel}`]
                  : []),
              ].map((label, i) => (
                <li key={i} className="flex gap-2">
                  <CheckLineIcon className="text-success-700 size-4 shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
          </section>
          {area !== null && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("areaPreviewDisclaimer")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
