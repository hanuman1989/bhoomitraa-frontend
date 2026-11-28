"use client";
import { useId, type ElementType } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import {
  CloseLineIcon,
  CrosshairIcon,
  InfoIcon,
  LocationPinIcon,
  PencilIcon,
  RouteIcon,
  TrashBinIcon,
} from "@/icons";
import { cn } from "@/utils";
import type {
  IrrigationAsset,
  IrrigationOptions,
  IrrigationStatus,
} from "@/types/account/irrigation";
import { supportsDepth } from "./irrigationForm";
import {
  IrrigationStatusPill,
  IrrigationTypeTile,
  irrigationButton,
  irrigationControl,
  irrigationDangerOutline,
  irrigationIconButton,
  irrigationPrimary,
  useIrrigationFormat,
} from "./IrrigationUi";

export interface IrrigationSelection {
  id: string;
  asset: IrrigationAsset | null;
  status: "loading" | "ready" | "error";
}
interface Props {
  selection: IrrigationSelection | null;
  options: IrrigationOptions | null;
  mapReady: boolean;
  statusBusy: boolean;
  onClose: () => void;
  onRetry: (id: string) => void;
  onEdit: (asset: IrrigationAsset) => void;
  onLocate: (asset: IrrigationAsset) => void;
  onEditLocation: (asset: IrrigationAsset) => void;
  onDelete: (asset: IrrigationAsset) => void;
  onStatus: (asset: IrrigationAsset, status: IrrigationStatus) => void;
}

function DetailsBody({
  selection,
  options,
  mapReady,
  statusBusy,
  onClose,
  onRetry,
  onEdit,
  onLocate,
  onEditLocation,
  onDelete,
  onStatus,
  Title,
}: Props & { selection: IrrigationSelection; Title: ElementType }) {
  const t = useTranslations("farmerIrrigation");
  const format = useIrrigationFormat();
  const statusId = useId();
  const close = (
    <button
      type="button"
      aria-label={t("actions.close")}
      onClick={onClose}
      className={cn(irrigationIconButton, "-me-2 -mt-2")}
    >
      <CloseLineIcon aria-hidden="true" className="size-5" />
    </button>
  );
  const { asset } = selection;
  if (!asset)
    return (
      <div
        className="flex items-start gap-3"
        aria-busy={selection.status === "loading"}
      >
        {selection.status === "loading" ? (
          <div role="status" className="flex-1 animate-pulse space-y-3">
            <div className="h-6 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
            <span className="sr-only">{t("loading")}</span>
          </div>
        ) : (
          <div role="alert" className="flex-1 space-y-3">
            <Title className="text-base font-semibold text-gray-950 dark:text-white">
              {t("details.loadError")}
            </Title>
            <button
              type="button"
              onClick={() => onRetry(selection.id)}
              className={irrigationPrimary}
            >
              {t("actions.retry")}
            </button>
          </div>
        )}
        {close}
      </div>
    );
  const source = asset.asset_type === "source";
  const notProvided = (
    <span className="font-normal text-gray-500 dark:text-gray-400">
      {t("details.notProvided")}
    </span>
  );
  const category =
    options?.asset_types.find((option) => option.key === asset.asset_type)
      ?.label ?? t(source ? "categories.source" : "categories.pipeline");
  const LocationIcon = source ? LocationPinIcon : RouteIcon;
  return (
    <div>
      <div className="flex items-start gap-3">
        <IrrigationTypeTile
          assetType={asset.asset_type}
          sourceType={asset.source_type}
        />
        <div className="min-w-0 flex-1">
          <Title className="text-lg font-semibold break-words text-gray-950 dark:text-white">
            {asset.name}
          </Title>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {[category, asset.type_label].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-1.5">
            <IrrigationStatusPill
              status={asset.status}
              label={asset.status_label}
            />
          </div>
        </div>
        {close}
      </div>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-gray-500 dark:text-gray-400">
          {t("details.category")}
        </dt>
        <dd className="font-medium">{category}</dd>
        <dt className="text-gray-500 dark:text-gray-400">
          {t("details.type")}
        </dt>
        <dd className="font-medium">{asset.type_label ?? notProvided}</dd>
        {source ? (
          <>
            {supportsDepth(options, asset.source_type) && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">
                  {t("details.depth")}
                </dt>
                <dd className="font-medium tabular-nums">
                  {asset.depth_meters === null
                    ? notProvided
                    : t("units.meters", {
                        value: format.trimmed(asset.depth_meters),
                      })}
                </dd>
              </>
            )}
            <dt className="text-gray-500 dark:text-gray-400">
              {t("details.availability")}
            </dt>
            <dd className="font-medium">
              {asset.water_availability_label ?? notProvided}
            </dd>
          </>
        ) : (
          <>
            <dt className="text-gray-500 dark:text-gray-400">
              {t("details.length")}
            </dt>
            <dd className="font-medium tabular-nums">
              {asset.length_meters === null ? (
                <span className="font-normal text-gray-500 dark:text-gray-400">
                  {t("list.lengthUnknown")}
                </span>
              ) : (
                <>
                  {t("units.meters", {
                    value: format.fixed(asset.length_meters),
                  })}{" "}
                  <span className="font-normal text-gray-500 dark:text-gray-400">
                    (
                    {t(
                      asset.length_source === "calculated"
                        ? "details.calculated"
                        : "details.manual",
                    )}
                    )
                  </span>
                </>
              )}
            </dd>
            <dt className="text-gray-500 dark:text-gray-400">
              {t("details.diameter")}
            </dt>
            <dd className="font-medium tabular-nums">
              {asset.diameter_mm === null
                ? notProvided
                : t("units.millimetres", {
                    value: format.trimmed(asset.diameter_mm),
                  })}
            </dd>
          </>
        )}
        <dt className="text-gray-500 dark:text-gray-400">
          {t("details.ownership")}
        </dt>
        <dd className="font-medium">{asset.ownership_label ?? notProvided}</dd>
      </dl>
      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-800">
        <p className="mb-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <LocationIcon aria-hidden="true" className="size-3.5" />
          {t(source ? "details.location" : "details.route")}
        </p>
        {asset.geometry?.type === "Point" ? (
          <p>
            {t("details.locationSet")}{" "}
            <span dir="ltr" className="font-mono text-xs tabular-nums">
              {format.coordinate(asset.geometry.coordinates[1])},{" "}
              {format.coordinate(asset.geometry.coordinates[0])}
            </span>
          </p>
        ) : asset.geometry?.type === "LineString" ? (
          <p>
            {t("details.routeSet", {
              count: asset.geometry.coordinates.length,
            })}
          </p>
        ) : (
          <p>{t(source ? "details.noLocation" : "details.noRoute")}</p>
        )}
      </div>
      {asset.notes && (
        <div className="mt-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-800">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
            {t("details.notes")}
          </p>
          <p className="break-words whitespace-pre-wrap">{asset.notes}</p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(asset)}
          className={irrigationButton}
        >
          <PencilIcon aria-hidden="true" className="size-4" />
          {t("actions.edit")}
        </button>
        {asset.geometry && (
          <button
            type="button"
            disabled={!mapReady}
            onClick={() => onLocate(asset)}
            className={irrigationButton}
          >
            <CrosshairIcon aria-hidden="true" className="size-4" />
            {t("actions.locate")}
          </button>
        )}
        <button
          type="button"
          disabled={!mapReady}
          onClick={() => onEditLocation(asset)}
          className={irrigationButton}
        >
          <LocationIcon aria-hidden="true" className="size-4" />
          {t(
            asset.geometry
              ? source
                ? "actions.editLocation"
                : "actions.editRoute"
              : source
                ? "actions.addLocation"
                : "actions.addRoute",
          )}
        </button>
        <button
          type="button"
          onClick={() => onDelete(asset)}
          className={irrigationDangerOutline}
        >
          <TrashBinIcon aria-hidden="true" className="size-4" />
          {t("actions.delete")}
        </button>
      </div>
      {!mapReady && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {t("map.unavailableShort")}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={statusId} className="font-medium">
          {t("actions.changeStatus")}
        </label>
        <select
          id={statusId}
          value={asset.status}
          disabled={statusBusy || !options}
          onChange={(event) =>
            onStatus(asset, event.target.value as IrrigationStatus)
          }
          className={cn(irrigationControl, "w-auto min-w-44")}
        >
          {options?.statuses.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          )) ?? <option value={asset.status}>{asset.status_label}</option>}
        </select>
      </div>
      <p className="mt-4 border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {t("details.added", { date: format.dateTime(asset.created_at) })} ·{" "}
        {t("details.updated", { date: format.dateTime(asset.updated_at) })}
      </p>
    </div>
  );
}

/**
 * The selected asset with only the fields its category uses, and its actions.
 * Inline beside the list on large screens; a bottom sheet on smaller ones.
 */
export default function IrrigationDetails({
  variant,
  ...props
}: Props & { variant: "panel" | "sheet" }) {
  const t = useTranslations("farmerIrrigation");
  if (variant === "sheet")
    return (
      <Dialog
        open={Boolean(props.selection)}
        onClose={props.onClose}
        className="relative z-99999"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-950/45" />
        <div className="fixed inset-x-0 bottom-0 flex justify-center">
          <DialogPanel className="custom-scrollbar shadow-theme-xl max-h-[86dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
            {props.selection && (
              <DetailsBody
                {...props}
                selection={props.selection}
                Title={DialogTitle}
              />
            )}
          </DialogPanel>
        </div>
      </Dialog>
    );
  return (
    <section
      aria-label={t("details.label")}
      aria-live="polite"
      className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
    >
      {props.selection ? (
        <DetailsBody {...props} selection={props.selection} Title="h3" />
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <InfoIcon aria-hidden="true" className="size-5" />
          <p>{t("details.prompt")}</p>
        </div>
      )}
    </section>
  );
}
