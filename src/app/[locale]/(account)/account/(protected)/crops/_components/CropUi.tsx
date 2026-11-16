"use client";
import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea } from "@/lib/areaUnits";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ActionResult } from "@/types/api";
import { CheckLineIcon, SproutIcon } from "@/icons";

export const cropControl =
  "h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-theme-xs outline-none focus:border-success-500 focus:ring-3 focus:ring-success-500/15 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white";
export const cropButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-success-600 px-5 py-2.5 text-sm font-semibold text-success-700 transition hover:bg-success-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-success-300 dark:hover:bg-success-950";
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
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
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
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="mb-4 flex items-center gap-3">
        {number && (
          <span className="bg-success-700 flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-white">
            {number}
          </span>
        )}
        <h3 className="min-w-0 flex-1 text-lg font-bold text-gray-950 dark:text-white">
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
      className={`focus-visible:outline-success-600 relative rounded-xl border p-3 text-start transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 ${selected ? "border-success-600 bg-success-50 dark:bg-success-950" : "hover:border-success-400 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"} ${className}`}
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
  className = "size-16",
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
        <SproutIcon aria-hidden className="text-success-600 size-9" />
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
export function CropSummaryStrip({
  crop,
}: {
  crop: import("@/types/account/farmCrop").CropCycle;
}) {
  const t = useTranslations("farmerCrops");
  const units = useAreaUnits();
  const locale = useLocale();
  return (
    <dl className="bg-success-50 dark:bg-success-950 grid grid-cols-2 gap-4 rounded-2xl p-4 sm:grid-cols-3 lg:grid-cols-5">
      {[
        [t("crop"), crop.crop.name],
        [t("variety"), crop.crop_variety?.name],
        [t("season"), crop.season.name],
        [
          t("sowingMethod"),
          crop.sowing_method ? t(`methods.${crop.sowing_method}`) : null,
        ],
        [
          t("area"),
          crop.cultivated_area
            ? `${formatArea(crop.cultivated_area, locale)} ${units.label(crop.area_unit)}`
            : null,
        ],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
          <dd className="mt-1 font-semibold">{value || t("unavailable")}</dd>
        </div>
      ))}
    </dl>
  );
}
export function CropMoney({
  value,
  currency = "INR",
}: {
  value?: string | number | null;
  currency?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("farmerCrops");
  return (
    <>
      {value === null || value === undefined || value === ""
        ? t("priceUnavailable")
        : new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
          }).format(Number(value))}
    </>
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
