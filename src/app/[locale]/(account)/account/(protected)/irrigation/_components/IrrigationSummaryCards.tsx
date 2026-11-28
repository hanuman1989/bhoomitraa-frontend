"use client";
import type { ComponentType, SVGProps } from "react";
import { useTranslations } from "next-intl";
import { MapLayersIcon, RouteIcon, RulerIcon, WaterDropIcon } from "@/icons";
import type { IrrigationSummary } from "@/types/account/irrigation";
import { useIrrigationFormat } from "./IrrigationUi";

interface Card {
  key: string;
  label: string;
  value: string;
  muted?: boolean;
  sub: string | null;
  warn?: boolean;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  water: boolean;
}

/** Unfiltered totals: every asset counts, inactive ones included. */
export default function IrrigationSummaryCards({
  summary,
}: {
  summary: IrrigationSummary | null;
}) {
  const t = useTranslations("farmerIrrigation.summary");
  const format = useIrrigationFormat();
  const unknown = summary?.pipelines_with_unknown_length ?? 0;
  const length = summary?.total_pipeline_length_meters ?? null;
  const cards: Card[] = [
    {
      key: "total",
      label: t("totalAssets"),
      value: summary ? format.trimmed(summary.total_assets) : "—",
      sub: summary
        ? t("mapped", {
            mapped: summary.mapped_assets,
            unmapped: summary.unmapped_assets,
          })
        : null,
      Icon: MapLayersIcon,
      water: false,
    },
    {
      key: "sources",
      label: t("waterSources"),
      value: summary ? format.trimmed(summary.water_sources) : "—",
      sub: !summary
        ? null
        : summary.water_sources_needing_attention
          ? t("attention", { count: summary.water_sources_needing_attention })
          : t("allGood"),
      warn: Boolean(summary?.water_sources_needing_attention),
      Icon: WaterDropIcon,
      water: true,
    },
    {
      key: "pipelines",
      label: t("pipelines"),
      value: summary ? format.trimmed(summary.pipelines) : "—",
      sub: summary
        ? t("withRoute", { count: summary.pipelines_with_route })
        : null,
      Icon: RouteIcon,
      water: true,
    },
    {
      key: "length",
      label: t("totalLength"),
      value: !summary
        ? "—"
        : length === null
          ? t("unavailable")
          : t("meters", { value: format.fixed(length) }),
      muted: Boolean(summary) && length === null,
      sub: !summary
        ? null
        : !summary.pipelines
          ? t("noPipelines")
          : length === null
            ? t("allUnknown", { count: unknown })
            : unknown
              ? t("partial", { count: unknown })
              : t("allKnown"),
      warn: Boolean(summary?.pipelines) && unknown > 0,
      Icon: RulerIcon,
      water: false,
    },
  ];
  return (
    <div
      aria-live="polite"
      className="xsm:grid-cols-2 grid grid-cols-1 gap-3 xl:grid-cols-4"
    >
      {cards.map(({ key, label, value, muted, sub, warn, Icon, water }) => (
        <div
          key={key}
          className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 dark:border-gray-700 dark:bg-gray-900"
        >
          <span
            aria-hidden="true"
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${water ? "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950 dark:text-blue-light-300" : "bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300"}`}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm text-gray-500 dark:text-gray-400">
              {label}
            </h3>
            <p
              className={`leading-tight font-semibold tabular-nums ${muted ? "text-lg text-gray-500 dark:text-gray-400" : "text-2xl text-gray-950 dark:text-white"}`}
            >
              {value}
            </p>
            {sub && (
              <p
                className={`mt-0.5 text-xs ${warn ? "text-warning-700 dark:text-warning-400" : "text-gray-500 dark:text-gray-400"}`}
              >
                {sub}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
