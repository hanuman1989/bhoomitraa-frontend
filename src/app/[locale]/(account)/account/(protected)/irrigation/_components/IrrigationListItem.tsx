"use client";
import { useId } from "react";
import { useTranslations } from "next-intl";
import Tooltip from "@/components/common/Tooltip";
import { cn } from "@/utils";
import {
  CrosshairIcon,
  LocationPinIcon,
  PencilIcon,
  RouteIcon,
  TrashBinIcon,
} from "@/icons";
import type { IrrigationAsset } from "@/types/account/irrigation";
import {
  IrrigationMapChip,
  IrrigationStatusPill,
  IrrigationTypeTile,
  irrigationIconButton,
  useAssetMeta,
} from "./IrrigationUi";

export default function IrrigationListItem({
  asset,
  selected,
  mapReady,
  onSelect,
  onLocate,
  onEdit,
  onDelete,
}: {
  asset: IrrigationAsset;
  selected: boolean;
  mapReady: boolean;
  onSelect: (asset: IrrigationAsset) => void;
  onLocate: (asset: IrrigationAsset) => void;
  onEdit: (asset: IrrigationAsset) => void;
  onDelete: (asset: IrrigationAsset) => void;
}) {
  const t = useTranslations("farmerIrrigation");
  const meta = useAssetMeta();
  const unavailableId = useId();
  const mapped = Boolean(asset.geometry);
  const source = asset.asset_type === "source";
  // Without a location the button adds one; that opens the form, which also works without the map.
  const locateLabel = mapped
    ? t("actions.locate")
    : t(source ? "actions.addLocation" : "actions.addRoute");
  const locateBlocked = mapped && !mapReady;
  const LocateIcon = mapped
    ? CrosshairIcon
    : source
      ? LocationPinIcon
      : RouteIcon;
  return (
    <li
      className={`flex items-center rounded-xl border bg-white transition dark:bg-gray-900 ${selected ? "border-success-600 ring-success-500/15 ring-3" : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"}`}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(asset)}
        className="focus-visible:outline-success-600 flex min-w-0 flex-1 items-center gap-3 rounded-xl p-3 text-start focus-visible:outline-2"
      >
        <IrrigationTypeTile
          assetType={asset.asset_type}
          sourceType={asset.source_type}
        />
        <span
          className={`min-w-0 flex-1 ${asset.status === "inactive" ? "opacity-70" : ""}`}
        >
          <span className="block truncate font-semibold text-gray-950 dark:text-white">
            {asset.name}
          </span>
          <span className="block truncate text-sm text-gray-500 dark:text-gray-400">
            {meta(asset)}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <IrrigationStatusPill
            status={asset.status}
            label={asset.status_label}
          />
          <IrrigationMapChip assetType={asset.asset_type} mapped={mapped} />
        </span>
      </button>
      {/* On phones these actions are in the details sheet. */}
      <span className="hidden shrink-0 items-center gap-0.5 pe-2 md:flex">
        <Tooltip
          content={locateBlocked ? t("map.unavailableShort") : locateLabel}
          id={locateBlocked ? unavailableId : undefined}
        >
          <button
            type="button"
            aria-label={t("actions.forAsset", {
              action: locateLabel,
              name: asset.name,
            })}
            aria-disabled={locateBlocked}
            aria-describedby={locateBlocked ? unavailableId : undefined}
            onClick={() => {
              if (!locateBlocked) onLocate(asset);
            }}
            className={irrigationIconButton}
          >
            <LocateIcon aria-hidden="true" className="size-5" />
          </button>
        </Tooltip>
        <Tooltip content={t("actions.edit")}>
          <button
            type="button"
            aria-label={t("actions.forAsset", {
              action: t("actions.edit"),
              name: asset.name,
            })}
            onClick={() => onEdit(asset)}
            className={irrigationIconButton}
          >
            <PencilIcon aria-hidden="true" className="size-5" />
          </button>
        </Tooltip>
        <Tooltip content={t("actions.delete")}>
          <button
            type="button"
            aria-label={t("actions.forAsset", {
              action: t("actions.delete"),
              name: asset.name,
            })}
            onClick={() => onDelete(asset)}
            className={cn(
              irrigationIconButton,
              "hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-950 dark:hover:text-error-400",
            )}
          >
            <TrashBinIcon aria-hidden="true" className="size-5" />
          </button>
        </Tooltip>
      </span>
    </li>
  );
}
