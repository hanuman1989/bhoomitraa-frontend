"use client";

import { useTranslations } from "next-intl";
import type { CropActivityTemplateListItem } from "@/types/admin/cropActivityTemplate";
import type {
  ActivityTiming,
  BuilderCategory,
  BuilderStage,
  DayWindow,
  EditKind,
} from "./types";
import StageSection from "./StageSection";
import ActivityCard from "./ActivityCard";

export interface TimelineGroup {
  key: string;
  stage?: BuilderStage;
  title: string;
  items: CropActivityTemplateListItem[];
  independent: boolean;
  day: number;
}

export default function TimelineList({
  groups,
  categories,
  timing,
  formatWindow,
  stageWindows,
  groupByCategory,
  collapsed,
  searching,
  onToggleStage,
  expanded,
  onToggleActivity,
  selected,
  onSelect,
  isCustom,
  onCreate,
  onStageTimelines,
  onEdit,
}: {
  groups: TimelineGroup[];
  categories: BuilderCategory[];
  timing: Map<number, ActivityTiming>;
  formatWindow: (window: DayWindow, harvest?: boolean) => string;
  stageWindows: Map<number, DayWindow[]>;
  groupByCategory: boolean;
  collapsed: Set<number>;
  searching: boolean;
  onToggleStage: (stageId: number) => void;
  expanded: Set<number>;
  onToggleActivity: (id: number) => void;
  selected: Set<number>;
  onSelect: (id: number, checked: boolean) => void;
  isCustom: (item: CropActivityTemplateListItem) => boolean;
  onCreate: (stageId: number | null, categoryId: number | null) => void;
  onStageTimelines: (stageId: number) => void;
  onEdit: (kind: EditKind, id: number) => void;
}) {
  const t = useTranslations("timelineBuilder");
  if (!groups.length)
    return (
      <p className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
        {t("noResults")}
      </p>
    );
  const renderCard = (item: CropActivityTemplateListItem) => (
    <ActivityCard
      key={item.id}
      item={item}
      category={categories.find(({ id }) => id === item.category_id)}
      timing={
        timing.get(item.id) ?? { code: "missing", windows: [], start: Infinity }
      }
      formatWindow={formatWindow}
      expanded={expanded.has(item.id)}
      selected={selected.has(item.id)}
      custom={isCustom(item)}
      onToggle={() => onToggleActivity(item.id)}
      onSelect={(checked) => onSelect(item.id, checked)}
      onEdit={(kind) => onEdit(kind, item.id)}
    />
  );
  return (
    <div className="relative ps-22 pt-1 max-sm:ps-12">
      <span
        aria-hidden="true"
        className="absolute start-9.5 top-8 bottom-6 w-1 rounded-full bg-gray-300 max-sm:start-4.5 dark:bg-gray-700"
      />
      {groups.map((group) => (
        <StageSection
          key={group.key}
          id={group.stage ? `stage-${group.stage.id}` : group.key}
          title={group.title}
          stage={group.stage}
          items={group.items}
          categories={categories}
          windows={group.stage ? (stageWindows.get(group.stage.id) ?? []) : []}
          formatWindow={formatWindow}
          closed={!!group.stage && !searching && collapsed.has(group.stage.id)}
          groupByCategory={groupByCategory}
          renderCard={renderCard}
          onToggle={() => group.stage && onToggleStage(group.stage.id)}
          onCreate={(categoryId) =>
            onCreate(group.stage?.id ?? null, categoryId)
          }
          onStageTimelines={() =>
            group.stage && onStageTimelines(group.stage.id)
          }
        />
      ))}
    </div>
  );
}
