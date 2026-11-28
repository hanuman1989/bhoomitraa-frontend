"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Pagination from "@/components/admin/tables/Pagination";
import {
  AlertIcon,
  ReopenIcon,
  RouteIcon,
  SearchIcon,
  SproutIcon,
  WaterDropIcon,
} from "@/icons";
import type {
  IrrigationAsset,
  IrrigationAssetType,
  IrrigationListResponse,
} from "@/types/account/irrigation";
import IrrigationListItem from "./IrrigationListItem";
import {
  irrigationButton,
  irrigationPrimary,
  irrigationWater,
  useIrrigationFormat,
} from "./IrrigationUi";

function ListState({
  icon,
  tone = "green",
  title,
  description,
  children,
}: {
  icon: ReactNode;
  tone?: "green" | "red";
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "red" ? "alert" : undefined}
      className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center dark:border-gray-700 dark:bg-gray-900"
    >
      <span
        aria-hidden="true"
        className={`mx-auto mb-3 flex size-13 items-center justify-center rounded-xl ${tone === "red" ? "bg-error-50 text-error-600 dark:bg-error-950 dark:text-error-400" : "bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300"}`}
      >
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-gray-950 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-1 mb-4 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}

/** The paginated list with its loading, empty, no-results and error states. */
export default function IrrigationList({
  list,
  state,
  emptyInventory,
  selectedId,
  mapReady,
  canAdd,
  onAdd,
  onRetry,
  onReset,
  onPage,
  onSelect,
  onLocate,
  onEdit,
  onDelete,
}: {
  list: IrrigationListResponse | null;
  state: "loading" | "ready" | "error";
  /** The farmer has no assets at all, whatever the filters. */
  emptyInventory: boolean;
  selectedId: string | null;
  mapReady: boolean;
  canAdd: boolean;
  onAdd: (category: IrrigationAssetType) => void;
  onRetry: () => void;
  onReset: () => void;
  onPage: (page: number) => void;
  onSelect: (asset: IrrigationAsset) => void;
  onLocate: (asset: IrrigationAsset) => void;
  onEdit: (asset: IrrigationAsset) => void;
  onDelete: (asset: IrrigationAsset) => void;
}) {
  const t = useTranslations("farmerIrrigation");
  const format = useIrrigationFormat();
  if (state === "loading")
    return (
      <div role="status" className="animate-pulse space-y-2">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-17 rounded-xl bg-gray-100 dark:bg-gray-800"
          />
        ))}
        <span className="sr-only">{t("loading")}</span>
      </div>
    );
  if (state === "error" || !list)
    return (
      <ListState
        tone="red"
        icon={<AlertIcon className="size-6" />}
        title={t("states.loadError")}
        description={t("states.loadErrorDescription")}
      >
        <button type="button" onClick={onRetry} className={irrigationPrimary}>
          <ReopenIcon aria-hidden="true" className="size-4" />
          {t("actions.retry")}
        </button>
      </ListState>
    );
  if (emptyInventory)
    return (
      <ListState
        icon={<SproutIcon className="size-6" />}
        title={t("states.emptyTitle")}
        description={t("states.emptyDescription")}
      >
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => onAdd("source")}
          className={irrigationWater}
        >
          <WaterDropIcon aria-hidden="true" className="size-4" />
          {t("actions.addSource")}
        </button>
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => onAdd("pipeline")}
          className={irrigationPrimary}
        >
          <RouteIcon aria-hidden="true" className="size-4" />
          {t("actions.addPipeline")}
        </button>
      </ListState>
    );
  if (!list.data.length)
    return (
      <ListState
        icon={<SearchIcon className="size-6" />}
        title={t("states.noResults")}
        description={t("states.noResultsDescription")}
      >
        <button type="button" onClick={onReset} className={irrigationButton}>
          <ReopenIcon aria-hidden="true" className="size-4" />
          {t("toolbar.reset")}
        </button>
      </ListState>
    );
  const { pagination } = list;
  return (
    <div className="space-y-3">
      <ul aria-label={t("list.label")} className="space-y-2">
        {list.data.map((asset) => (
          <IrrigationListItem
            key={asset.id}
            asset={asset}
            selected={asset.id === selectedId}
            mapReady={mapReady}
            onSelect={onSelect}
            onLocate={onLocate}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("list.showing", {
            from: format.trimmed(pagination.from ?? 0),
            to: format.trimmed(pagination.to ?? 0),
            total: format.trimmed(pagination.total),
          })}
        </p>
        {pagination.last_page > 1 && (
          <Pagination
            currentPage={pagination.current_page}
            totalPages={pagination.last_page}
            onPageChange={onPage}
          />
        )}
      </div>
    </div>
  );
}
