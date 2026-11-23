"use client";

import { useTranslations } from "next-intl";
import Badge from "@/components/admin/ui/badge/Badge";
import { ChevronDownIcon } from "@/icons";
import type { CropActivityTemplateListItem } from "@/types/admin/cropActivityTemplate";
import type {
  ActivityTiming,
  BuilderCategory,
  DayWindow,
  EditKind,
} from "./types";
import { CategoryIcon } from "./TimelineRailMarker";

const actionClass =
  "rounded-lg border border-gray-300 h-9 px-4 text-sm font-medium text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300";
const editActions: EditKind[] = [
  "basic",
  "schedule",
  "features",
  "actions",
  "translations",
  "applicability",
  "publication",
  "duplicate",
];

export function TimingNote({
  timing,
  formatWindow,
}: {
  timing: ActivityTiming;
  formatWindow: (window: DayWindow, harvest?: boolean) => string;
}) {
  const t = useTranslations("timelineBuilder");
  const tone =
    timing.code === "outside"
      ? "bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300"
      : timing.code === "partial" || timing.code === "missing"
        ? "bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300"
        : "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950 dark:text-blue-light-300";
  return (
    <div className={`rounded-lg p-3 text-xs ${tone}`}>
      <p className="font-semibold">{t(`timing.codes.${timing.code}`)}</p>
      {timing.windows.map((window) => (
        <p key={`${window.min}-${window.max}`}>
          {formatWindow(window, timing.code === "afterHarvest")}
        </p>
      ))}
    </div>
  );
}

export default function ActivityCard({
  item,
  category,
  timing,
  formatWindow,
  expanded,
  selected,
  custom,
  onToggle,
  onSelect,
  onEdit,
}: {
  item: CropActivityTemplateListItem;
  category?: BuilderCategory;
  timing: ActivityTiming;
  formatWindow: (window: DayWindow, harvest?: boolean) => string;
  expanded: boolean;
  selected: boolean;
  custom: boolean;
  onToggle: () => void;
  onSelect: (checked: boolean) => void;
  onEdit: (kind: EditKind) => void;
}) {
  const t = useTranslations("timelineBuilder");
  const tt = useTranslations("cropActivityTemplates");
  const title = item.title ?? t("recordId", { id: item.id });
  const summary =
    timing.code === "missing"
      ? t("timing.codes.missing")
      : timing.windows
          .map((window) => formatWindow(window, timing.code === "afterHarvest"))
          .join(" | ");
  const configured = timing.code !== "missing";
  const exception = timing.code === "partial" || timing.code === "outside";
  const scope = (all: boolean, names: (string | null)[], allLabel: string) =>
    all ? allLabel : names.filter(Boolean).join(", ") || "—";
  const features = [
    item.allow_status_update,
    item.allow_expenses,
    item.allow_labour,
    item.allow_notes,
    item.allow_attachments,
    item.allow_rescheduling,
  ].filter(Boolean).length;
  return (
    <article className="hover:border-brand-200 mt-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelect(event.target.checked)}
          aria-label={t("selectActivity", { title })}
          className="accent-brand-600 mt-3 size-4 shrink-0"
        />
        <span
          title={category?.name ?? undefined}
          className="bg-brand-50 text-brand-500 dark:bg-brand-950 flex size-10 shrink-0 items-center justify-center rounded-xl"
        >
          <CategoryIcon category={category} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">{summary}</p>
          <h4 className="font-semibold break-words text-gray-900 dark:text-white">
            {title}
          </h4>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge size="sm" color="primary">
              {item.category_name ?? t("recordId", { id: item.category_id })}
            </Badge>
            <Badge size="sm" color="light">
              {tt(`activityTypes.${item.activity_type}`)}
            </Badge>
            {custom && (
              <Badge size="sm" color="warning">
                {t("badges.custom")}
              </Badge>
            )}
            {exception && (
              <Badge size="sm" color="warning">
                {t("badges.exception")}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge size="sm" color={configured ? "success" : "warning"}>
            {configured ? t("badges.configured") : t("badges.incomplete")}
          </Badge>
          <Badge size="sm" color={item.is_active ? "success" : "light"}>
            {item.is_active ? t("badges.active") : t("badges.inactive")}
          </Badge>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={t(expanded ? "collapseActivity" : "expandActivity", {
              title,
            })}
            className="rounded-lg border border-gray-300 p-2 text-gray-600 dark:border-gray-700 dark:text-gray-300"
          >
            <ChevronDownIcon
              aria-hidden="true"
              className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              [tt("fields.schedule"), tt(`schedule.${item.schedule_type}`)],
              [
                tt("fields.scheduleBasis"),
                tt(`scheduleBases.${item.schedule_basis}`),
              ],
              [t("fields.startOffset"), item.start_offset_days ?? t("derived")],
              [t("fields.endOffset"), item.end_offset_days ?? t("derived")],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <dt className="text-theme-xs text-gray-500">{label}</dt>
                <dd className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <TimingNote timing={timing} formatWindow={formatWindow} />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("detailSummary", {
              varieties: scope(
                item.variety_scope === "all",
                item.varieties.map(({ name }) => name),
                tt("applicability.allVarieties"),
              ),
              seasons: scope(
                item.season_scope === "all",
                item.seasons.map(({ name }) => name),
                tt("applicability.allSeasons"),
              ),
              regions:
                item.region_scope === "all"
                  ? t("allRegions")
                  : t("specificRegions"),
              sources: item.knowledge_source_ids.length,
              features,
              actions: item.smart_actions.length,
              priority: tt(`priorities.${item.priority}`),
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            {editActions.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => onEdit(kind)}
                className={actionClass}
              >
                {t(`edit.${kind}`)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onEdit("delete")}
              className={`${actionClass} text-error-600 dark:text-error-400`}
            >
              {t("edit.delete")}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
