"use client";
import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ActionResult } from "@/types/api";
import type { CropMaturity, CropVariety } from "@/types/account/farmCrop";
import { CheckLineIcon, SproutIcon } from "@/icons";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Date-only arithmetic on a YYYY-MM-DD value in UTC, so time zones never shift the day. */
export function addCropDays(date: string, days: number): string | null {
  const match = ISO_DATE.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(+year, +month - 1, +day + days))
    .toISOString()
    .slice(0, 10);
}

/**
 * Readable, unambiguous date in the interface language using Indian
 * conventions (e.g. "25 Apr 2027", "25 अप्रैल 2027").
 */
export function formatCropDate(date: string, locale: string): string {
  const match = ISO_DATE.exec(date);
  if (!match) return date;
  const [, year, month, day] = match;
  return new Intl.DateTimeFormat(
    locale.includes("-") ? locale : `${locale}-IN`,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(new Date(Date.UTC(+year, +month - 1, +day)));
}

/**
 * Harvest estimate preview using the same rule as the backend: only a variety
 * with verified maturity days and a valid sowing date produces a range.
 */
export function estimateMaturity(
  variety: CropVariety | undefined,
  sowingDate: string | undefined,
): CropMaturity {
  const min = variety?.maturity_days_min ?? null;
  const max = variety?.maturity_days_max ?? null;
  const from = sowingDate ? addCropDays(sowingDate, min ?? max ?? 0) : null;
  const to = sowingDate ? addCropDays(sowingDate, max ?? min ?? 0) : null;
  if (
    !variety?.maturity_verified ||
    !from ||
    !to ||
    (min === null && max === null) ||
    (min !== null && max !== null && max < min)
  )
    return {
      maturity_status: "unavailable",
      maturity_days_min: null,
      maturity_days_max: null,
      expected_harvest_date: null,
      expected_harvest_date_min: null,
      expected_harvest_date_max: null,
    };
  return {
    maturity_status: "available",
    maturity_days_min: min,
    maturity_days_max: max,
    expected_harvest_date: from === to ? from : null,
    expected_harvest_date_min: from,
    expected_harvest_date_max: to,
  };
}

/** Crop duration and expected harvest, or the unavailable message. */
export function CropMaturityDetails({
  maturity,
  timelineGenerated = false,
}: {
  maturity: CropMaturity | null | undefined;
  timelineGenerated?: boolean;
}) {
  const t = useTranslations("farmerCrops");
  const locale = useLocale();
  if (!maturity || maturity.maturity_status !== "available")
    return <CropNotice>{t("maturityUnavailable")}</CropNotice>;
  const min = maturity.maturity_days_min ?? maturity.maturity_days_max;
  const max = maturity.maturity_days_max ?? maturity.maturity_days_min;
  const from = maturity.expected_harvest_date_min;
  const to = maturity.expected_harvest_date_max;
  return (
    <div className="space-y-3">
      {!timelineGenerated && <CropNotice>{t("maturityNote")}</CropNotice>}
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-sm text-gray-500 dark:text-gray-400">
            {t("duration")}
          </dt>
          <dd className="text-success-700 dark:text-success-300 font-bold">
            {min === max
              ? t("daysSingle", { days: min ?? 0 })
              : t("daysRange", { min: min ?? 0, max: max ?? 0 })}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500 dark:text-gray-400">
            {t("expectedHarvest")}
          </dt>
          <dd className="font-bold">
            {from && to && from !== to
              ? `${formatCropDate(from, locale)} – ${formatCropDate(to, locale)}`
              : formatCropDate(from ?? to ?? "", locale)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export const cropControl =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-theme-xs outline-none focus:border-success-500 focus:ring-3 focus:ring-success-500/15 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white";
export const cropButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-success-600 px-4 py-2 text-sm font-semibold text-success-700 transition hover:bg-success-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-success-300 dark:hover:bg-success-950";
export const cropPrimary = `${cropButton} bg-success-700 text-white shadow-theme-xs hover:bg-success-800 dark:text-white dark:hover:bg-success-800`;
export function CropField({
  id,
  label,
  error,
  children,
  required,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
        {required && (
          <span aria-hidden className="text-error-600 ms-1">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-error-600 dark:text-error-400 mt-1 text-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
}
export function CropSection({
  title,
  children,
  number,
  action,
  id,
}: {
  title: string;
  children: ReactNode;
  number?: number;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="mb-3 flex items-center gap-2.5">
        {number && (
          <span className="bg-success-700 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
            {number}
          </span>
        )}
        <h3 className="min-w-0 flex-1 text-base font-bold text-gray-950 dark:text-white">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}
export function CropChoice({
  selected,
  onClick,
  children,
  disabled,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`focus-visible:outline-success-600 relative rounded-xl border p-2.5 text-start transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 ${selected ? "border-success-600 bg-success-50 dark:bg-success-950" : "hover:border-success-400 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"} ${className}`}
    >
      {children}
      {selected && (
        <span className="bg-success-700 absolute end-2 top-2 flex size-5 items-center justify-center rounded-full text-white">
          <CheckLineIcon aria-hidden className="size-3" />
        </span>
      )}
    </button>
  );
}
export function CropImage({
  src,
  name,
  className = "size-12",
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span
      className={`bg-success-50 dark:bg-success-950 inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl ${className}`}
    >
      {src && failed !== src ? (
        <Image
          width={160}
          height={160}
          unoptimized
          src={src}
          alt={name ?? ""}
          onError={() => setFailed(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <SproutIcon aria-hidden className="text-success-600 size-7" />
      )}
    </span>
  );
}
export function CropNotice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl border p-3 text-sm ${error ? "border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300" : "border-blue-light-200 bg-blue-light-50 text-blue-light-800 dark:border-blue-light-800 dark:text-blue-light-200 dark:bg-gray-800"}`}
    >
      {children}
    </p>
  );
}
export function cropFieldErrors<T extends FieldValues>(
  result: ActionResult<unknown>,
  setError: UseFormSetError<T>,
) {
  for (const [name, messages] of Object.entries(result.errors ?? {}))
    setError(name as Path<T>, { type: "server", message: messages.join(" ") });
  if (!result.success) setError("root", { message: result.message });
}
