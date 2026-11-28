"use client";
import { useMemo, type ComponentType, type SVGProps } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/utils";
import {
  BorewellIcon,
  CanalIcon,
  LocationPinIcon,
  OpenWellIcon,
  PipelineIcon,
  PondIcon,
  RainwaterIcon,
  ReservoirIcon,
  RiverIcon,
  RouteIcon,
  WaterDropIcon,
  WaterTankIcon,
} from "@/icons";
import type {
  IrrigationAsset,
  IrrigationAssetType,
  IrrigationSourceType,
  IrrigationStatus,
} from "@/types/account/irrigation";

/** Touch-friendly (44 px) controls in the Farm and Crop Manager style; blue marks water. */
export const irrigationControl =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-theme-xs outline-none focus:border-success-500 focus:ring-3 focus:ring-success-500/15 disabled:opacity-50 aria-[invalid=true]:border-error-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white";
const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40";
export const irrigationButton = `${buttonBase} border border-gray-300 bg-white text-gray-800 shadow-theme-xs hover:bg-gray-50 focus-visible:outline-success-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800`;
export const irrigationPrimary = `${buttonBase} bg-success-700 text-white shadow-theme-xs hover:bg-success-800 focus-visible:outline-success-600`;
export const irrigationWater = `${buttonBase} bg-blue-light-600 text-white shadow-theme-xs hover:bg-blue-light-700 focus-visible:outline-blue-light-600`;
export const irrigationGhost = `${buttonBase} text-success-700 hover:bg-success-50 focus-visible:outline-success-600 dark:text-success-300 dark:hover:bg-success-950`;
export const irrigationDangerOutline = `${buttonBase} border border-error-200 bg-white text-error-600 hover:bg-error-50 focus-visible:outline-error-600 dark:border-error-800 dark:bg-gray-900 dark:text-error-400 dark:hover:bg-error-950`;
export const irrigationIconButton =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-success-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white";

const typeIcons: Record<
  IrrigationSourceType | "pipeline",
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  borewell: BorewellIcon,
  open_well: OpenWellIcon,
  canal: CanalIcon,
  pond: PondIcon,
  tank: WaterTankIcon,
  river: RiverIcon,
  reservoir: ReservoirIcon,
  rainwater_collection: RainwaterIcon,
  other: WaterDropIcon,
  pipeline: PipelineIcon,
};
/** Each source type has its own icon; every pipeline shares one. */
export function IrrigationTypeIcon({
  assetType,
  sourceType,
  className,
}: {
  assetType: IrrigationAssetType;
  sourceType?: IrrigationSourceType | null;
  className?: string;
}) {
  const Icon =
    typeIcons[
      assetType === "pipeline" ? "pipeline" : (sourceType ?? "other")
    ] ?? WaterDropIcon;
  return <Icon aria-hidden="true" className={className} />;
}

/** The type icon on a soft blue tile. */
export function IrrigationTypeTile({
  assetType,
  sourceType,
  className = "size-11",
}: {
  assetType: IrrigationAssetType;
  sourceType?: IrrigationSourceType | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950 dark:text-blue-light-300 flex shrink-0 items-center justify-center rounded-xl",
        className,
      )}
    >
      <IrrigationTypeIcon
        assetType={assetType}
        sourceType={sourceType}
        className="size-5"
      />
    </span>
  );
}

const statusTones: Record<IrrigationStatus, string> = {
  operational:
    "bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300",
  needs_maintenance:
    "bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300",
  out_of_service:
    "bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300",
  inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};
/** Status as text with a dot, never colour alone. */
export function IrrigationStatusPill({
  status,
  label,
}: {
  status: IrrigationStatus;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${statusTones[status]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function IrrigationMapChip({
  assetType,
  mapped,
}: {
  assetType: IrrigationAssetType;
  mapped: boolean;
}) {
  const t = useTranslations("farmerIrrigation");
  const Icon = assetType === "source" ? LocationPinIcon : RouteIcon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs whitespace-nowrap ${mapped ? "bg-blue-light-50 text-blue-light-800 dark:bg-blue-light-950 dark:text-blue-light-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {t(mapped ? "list.onMap" : "list.notMapped")}
    </span>
  );
}

/** Numbers and dates in the interface language with Indian conventions. */
export function useIrrigationFormat() {
  const locale = useLocale();
  return useMemo(() => {
    const tag = locale.includes("-") ? locale : `${locale}-IN`;
    const fixed = new Intl.NumberFormat(tag, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const trimmed = new Intl.NumberFormat(tag, { maximumFractionDigits: 2 });
    const coordinate = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
      useGrouping: false,
    });
    const dateTime = new Intl.DateTimeFormat(tag, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    return {
      /** Lengths: always two decimals, e.g. "575.37". */
      fixed: (value: string | number) => fixed.format(Number(value)),
      /** Depth and diameter: "120" rather than "120.00". */
      trimmed: (value: string | number) => trimmed.format(Number(value)),
      coordinate: (value: number) => coordinate.format(value),
      dateTime: (iso: string) => {
        const date = new Date(iso);
        return Number.isNaN(date.getTime()) ? iso : dateTime.format(date);
      },
    };
  }, [locale]);
}

/** "Borewell · Depth 120 m" or "Underground Pipeline · 295.52 m · Ø 90 mm". */
export function useAssetMeta() {
  const t = useTranslations("farmerIrrigation");
  const format = useIrrigationFormat();
  return (asset: IrrigationAsset) => {
    const parts = [asset.type_label ?? ""];
    if (asset.asset_type === "source") {
      if (asset.depth_meters !== null)
        parts.push(
          t("list.depth", { value: format.trimmed(asset.depth_meters) }),
        );
    } else {
      parts.push(
        asset.length_meters === null
          ? t("list.lengthUnknown")
          : t("list.length", { value: format.fixed(asset.length_meters) }),
      );
      if (asset.diameter_mm !== null)
        parts.push(
          t("list.diameter", { value: format.trimmed(asset.diameter_mm) }),
        );
    }
    return parts.filter(Boolean).join(" · ");
  };
}
