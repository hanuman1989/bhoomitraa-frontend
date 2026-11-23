"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";
import {
  loadSourceLabels,
  loadTimelineTemplate,
  loadTimelineWorkspace,
} from "@/actions/admin/cropActivityTimelineBuilder";
import { saveCropActivityTemplate } from "@/actions/admin/cropActivityTemplates";
import type { ActionResult } from "@/types/api";
import type {
  CropActivityTemplate,
  CropActivityTemplateListItem,
  CropActivityTemplatePayload,
  TemplateSelectionOption,
} from "@/types/admin/cropActivityTemplate";
import type { TimelineState } from "@/types/admin/cropStageTimeline";
import type {
  ActivityTiming,
  BuilderConfig,
  BuilderFilters,
  BuilderPrefs,
  BuilderWorkspace,
  DayWindow,
  DialogState,
  EditKind,
} from "./types";
import ConfigurationSummary from "./ConfigurationSummary";
import TimelineToolbar from "./TimelineToolbar";
import TimelineEmptyState from "./TimelineEmptyState";
import TimelineList, { type TimelineGroup } from "./TimelineList";
import ConfigurationDialog from "./ConfigurationDialog";
import QuickCreateActivityDialog from "./QuickCreateActivityDialog";
import BasicInfoDialog from "./BasicInfoDialog";
import SchedulingDialog from "./SchedulingDialog";
import ActivityConfigurationDialog from "./ActivityConfigurationDialog";
import SmartActionsDialog from "./SmartActionsDialog";
import TranslationsDialog from "./TranslationsDialog";
import ApplicabilityDialog from "./ApplicabilityDialog";
import PublicationDialog from "./PublicationDialog";
import StageTimelinesDialog from "./StageTimelinesDialog";
import LanguagesDialog from "./LanguagesDialog";
import DuplicateActivityDialog from "./DuplicateActivityDialog";
import DeleteActivityDialog from "./DeleteActivityDialog";
import BulkOperationsDialog from "./BulkOperationsDialog";

const defaultPrefs: BuilderPrefs = {
  searchVisible: true,
  filtersVisible: true,
  configVisible: true,
  view: "stage",
  groupByCategory: false,
  previewDate: "",
  showDates: true,
  locales: [],
};
const defaultFilters: BuilderFilters = {
  search: "",
  status: "all",
  category: "all",
  applicability: "all",
  schedule: "all",
};
// After-harvest work sorts after every sowing-relative window.
const afterHarvest = Number.MAX_SAFE_INTEGER;
const sameIds = (first: number[], second: number[]) =>
  first.length === second.length && first.every((id) => second.includes(id));
const overlaps = (first: number[], second: number[]) =>
  first.some((id) => second.includes(id));

type Stored = {
  config: BuilderConfig | null;
  prefs: BuilderPrefs;
  session: number[];
};

const storageEvent = "bhoomitraa:timeline-builder";
function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(storageEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(storageEvent, callback);
  };
}
function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
/** Malformed or missing storage falls back to empty defaults. */
function parseStored(raw: string): Stored {
  try {
    const saved = JSON.parse(raw || "null");
    if (saved && typeof saved === "object")
      return {
        config:
          Number.isSafeInteger(saved.config?.crop?.id) && saved.config.app
            ? saved.config
            : null,
        prefs: { ...defaultPrefs, ...saved.prefs },
        session: Array.isArray(saved.session) ? saved.session : [],
      };
  } catch {}
  return { config: null, prefs: defaultPrefs, session: [] };
}

/** Full update payload: the saved record with one section replaced. */
export function recordPayload(
  record: CropActivityTemplate,
  patch: Partial<CropActivityTemplatePayload>,
): CropActivityTemplatePayload {
  return {
    crop_id: record.crop_id,
    category_id: record.category_id,
    crop_stage_id: record.crop_stage_id,
    variety_scope: record.variety_scope,
    crop_variety_ids: [...record.crop_variety_ids],
    season_scope: record.season_scope,
    season_ids: [...record.season_ids],
    knowledge_source_ids: [...record.knowledge_source_ids],
    schedule_type: record.schedule_type,
    schedule_basis: record.schedule_basis,
    start_offset_days: record.start_offset_days,
    end_offset_days: record.end_offset_days,
    activity_type: record.activity_type,
    allow_status_update: record.allow_status_update,
    allow_expenses: record.allow_expenses,
    allow_labour: record.allow_labour,
    allow_notes: record.allow_notes,
    allow_attachments: record.allow_attachments,
    allow_rescheduling: record.allow_rescheduling,
    smart_actions: [...record.smart_actions],
    region_scope: record.region_scope,
    region_ids: [...record.region_ids],
    priority: record.priority,
    translations: Object.fromEntries(
      Object.entries(record.translations).map(([locale, value]) => [
        locale,
        {
          title: value.title,
          description: value.description,
          instructions: value.instructions,
        },
      ]),
    ),
    ...patch,
  };
}

export default function TimelineBuilderClient({
  states,
}: {
  states: TimelineState[];
}) {
  const t = useTranslations("timelineBuilder");
  const locale = useLocale();
  const adminId = useAppSelector((state) => state.adminUser.user?.id);
  const storageKey = adminId ? `bhoomitraa:timeline-builder:v1:${adminId}` : "";
  // Per-admin preferences read from localStorage; null until on the client.
  const raw = useSyncExternalStore(
    subscribeStorage,
    () => (storageKey ? (readStorage(storageKey) ?? "") : null),
    () => null,
  );
  // In-memory fallback when the browser blocks storage writes.
  const [memory, setMemory] = useState<Stored | null>(null);
  const stored = useMemo(
    () => memory ?? (raw === null ? null : parseStored(raw)),
    [memory, raw],
  );
  const [workspace, setWorkspace] = useState<BuilderWorkspace | null>(null);
  // null = no error; "" = failed without a backend message (translated at render).
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [configSources, setConfigSources] = useState<TemplateSelectionOption[]>(
    [],
  );
  const [filters, setFilters] = useState(defaultFilters);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const config = stored?.config ?? null;
  const prefs = stored?.prefs ?? defaultPrefs;
  const cropId = config?.crop.id ?? null;

  // Only an explicit admin action opens the configuration dialog.
  const showConfig = dialog?.kind === "config";
  const openConfig = () => setDialog({ kind: "config" });

  function persist(next: Stored) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new Event(storageEvent));
    } catch {
      setMemory(next);
      toast.error(t("feedback.storageUnavailable"));
    }
  }
  const updatePrefs = (patch: Partial<BuilderPrefs>) =>
    stored && persist({ ...stored, prefs: { ...prefs, ...patch } });

  // Crop whose default stage collapse has been applied. Later reloads of the
  // same crop (retry, language switch) keep the admin's open/closed state.
  const collapseInitFor = useRef<number | null>(null);

  // Depends on `locale`, not `t`: `t` gets a new identity whenever a Server
  // Action revalidates (every activity save), which used to refetch the
  // workspace and re-collapse stages after each save.
  useEffect(() => {
    if (!cropId) return;
    let active = true;
    void loadTimelineWorkspace(cropId).then((result) => {
      if (!active) return;
      if (result.success && result.data) {
        setWorkspace(result.data);
        setLoadError(null);
        if (collapseInitFor.current !== result.data.crop.id) {
          collapseInitFor.current = result.data.crop.id;
          setCollapsed(
            new Set(result.data.stages.slice(3).map(({ id }) => id)),
          );
        }
      } else {
        setWorkspace(null);
        setLoadError(result.message || "");
      }
    });
    return () => {
      active = false;
    };
  }, [cropId, attempt, locale]);

  const configSourceKey = config?.app.knowledge_source_ids.join(",") ?? "";
  useEffect(() => {
    const ids = configSourceKey ? configSourceKey.split(",").map(Number) : [];
    if (!ids.length) return;
    let active = true;
    void loadSourceLabels(ids).then((result) => {
      if (active && result.success && result.data)
        setConfigSources(result.data);
    });
    return () => {
      active = false;
    };
  }, [configSourceKey]);

  const templates = useMemo(() => workspace?.templates ?? [], [workspace]);
  const stageWindows = useMemo(() => {
    const windows = new Map<number, DayWindow[]>();
    for (const timeline of workspace?.timelines ?? []) {
      const list = windows.get(timeline.crop_stage_id) ?? [];
      if (
        !list.some(
          (window) =>
            window.min === timeline.days_after_sowing_min &&
            window.max === timeline.days_after_sowing_max,
        )
      )
        list.push({
          min: timeline.days_after_sowing_min,
          max: timeline.days_after_sowing_max,
        });
      windows.set(timeline.crop_stage_id, list);
    }
    return windows;
  }, [workspace]);

  /**
   * Display-only timing from the active Stage Timeline records of the stage.
   * Laravel has no applicability resolver yet (see BACKEND_REQUIREMENTS.md),
   * so every distinct stage window is shown rather than a resolved one.
   */
  function assess(
    item: Pick<
      CropActivityTemplateListItem,
      | "crop_stage_id"
      | "schedule_type"
      | "schedule_basis"
      | "start_offset_days"
      | "end_offset_days"
    >,
  ): ActivityTiming {
    const stage =
      item.crop_stage_id === null
        ? []
        : (stageWindows.get(item.crop_stage_id) ?? []);
    if (item.schedule_basis === "growth_stage")
      return stage.length
        ? {
            code: "valid",
            windows: stage,
            start: Math.min(...stage.map(({ min }) => min)),
          }
        : { code: "missing", windows: [], start: Infinity };
    const start = item.start_offset_days ?? 0;
    const end = item.end_offset_days ?? start;
    if (item.schedule_type === "after_harvesting")
      return {
        code: "afterHarvest",
        windows: [{ min: start, max: end }],
        start: afterHarvest,
      };
    const window =
      item.schedule_type === "before_sowing"
        ? { min: -end, max: -start }
        : { min: start, max: end };
    const base = { windows: [window], start: window.min };
    if (item.crop_stage_id === null) return { code: "valid", ...base };
    if (!stage.length) return { code: "missing", ...base };
    if (stage.every((w) => window.max < w.min || window.min > w.max))
      return { code: "outside", ...base };
    if (!stage.some((w) => window.min >= w.min && window.max <= w.max))
      return { code: "partial", ...base };
    return { code: "valid", ...base };
  }

  function shiftDate(days: number) {
    const date = new Date(`${prefs.previewDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  function formatWindow(window: DayWindow, harvest = false) {
    if (harvest)
      return window.min === window.max
        ? t("timing.afterHarvestDay", { day: window.min })
        : t("timing.afterHarvest", { min: window.min, max: window.max });
    const text =
      window.max < 0
        ? t("timing.before", { from: -window.min, to: -window.max })
        : window.min === window.max
          ? window.min === 0
            ? t("timing.sowingDay")
            : t("timing.das", { day: window.min })
          : t("timing.dasRange", { min: window.min, max: window.max });
    if (!prefs.showDates || !prefs.previewDate) return text;
    return window.min === window.max
      ? `${text} · ${shiftDate(window.min)}`
      : `${text} · ${shiftDate(window.min)} – ${shiftDate(window.max)}`;
  }

  const timing = useMemo(
    () => new Map(templates.map((item) => [item.id, assess(item)])),
    // assess only depends on stageWindows, recomputed with the workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templates, stageWindows],
  );
  const configured = (id: number) => timing.get(id)?.code !== "missing";
  const exception = (id: number) =>
    ["partial", "outside"].includes(timing.get(id)?.code ?? "");

  const visible = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const app = config?.app;
    return templates.filter((item) => {
      const code = timing.get(item.id)?.code;
      const matchesApp = () =>
        !app ||
        ((item.variety_scope === "all" ||
          app.variety_scope === "all" ||
          overlaps(item.crop_variety_ids, app.crop_variety_ids)) &&
          (item.season_scope === "all" ||
            app.season_scope === "all" ||
            overlaps(item.season_ids, app.season_ids)));
      const custom = () =>
        !!app &&
        (item.variety_scope !== app.variety_scope ||
          !sameIds(item.crop_variety_ids, app.crop_variety_ids) ||
          item.season_scope !== app.season_scope ||
          !sameIds(item.season_ids, app.season_ids) ||
          item.region_scope !== app.region_scope ||
          !sameIds(item.knowledge_source_ids, app.knowledge_source_ids));
      return (
        (!query ||
          [item.title, item.category_name, item.crop_stage_name]
            .join(" ")
            .toLowerCase()
            .includes(query)) &&
        (filters.status === "all" ||
          (filters.status === "incomplete" && code === "missing") ||
          (filters.status === "configured" && code !== "missing") ||
          (filters.status === "active" && item.is_active) ||
          (filters.status === "inactive" && !item.is_active) ||
          (filters.status === "exception" && exception(item.id))) &&
        (filters.category === "all" ||
          String(item.category_id) === filters.category) &&
        (filters.applicability === "all" ||
          (filters.applicability === "matching" && matchesApp()) ||
          (filters.applicability === "custom" && custom()) ||
          (filters.applicability === "session" &&
            !!stored?.session.includes(item.id))) &&
        (filters.schedule === "all" ||
          (filters.schedule === "unresolved"
            ? code === "missing"
            : item.schedule_type === filters.schedule))
      );
    });
    // exception reads the same timing map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, timing, filters, config, stored?.session]);

  const groups = useMemo<TimelineGroup[]>(() => {
    if (!workspace) return [];
    const byStart = (
      a: CropActivityTemplateListItem,
      b: CropActivityTemplateListItem,
    ) =>
      (timing.get(a.id)?.start ?? Infinity) -
        (timing.get(b.id)?.start ?? Infinity) || a.id - b.id;
    const titleFor = (item: CropActivityTemplateListItem) => {
      const time = timing.get(item.id);
      if (!time || time.code === "missing") return t("groups.unscheduled");
      if (time.code === "afterHarvest") return t("groups.afterHarvest");
      if (time.start < 0) return t("groups.beforeSowing");
      if (time.start === 0) return t("groups.sowingDay");
      return formatWindow({ min: time.start, max: time.start });
    };
    const single = (item: CropActivityTemplateListItem): TimelineGroup => ({
      key: `a${item.id}`,
      title: titleFor(item),
      items: [item],
      independent: true,
      day: timing.get(item.id)?.start ?? Infinity,
    });
    if (prefs.view === "chronological")
      return [...visible].sort(byStart).map(single);
    const filtered =
      filters.search.trim() !== "" ||
      Object.entries(filters).some(
        ([key, value]) => key !== "search" && value !== "all",
      );
    const stageGroups = workspace.stages
      .map((stage) => {
        const windows = stageWindows.get(stage.id) ?? [];
        return {
          key: `s${stage.id}`,
          stage,
          title: stage.name ?? stage.code,
          items: visible
            .filter((item) => item.crop_stage_id === stage.id)
            .sort(byStart),
          independent: false,
          day: windows.length
            ? Math.min(...windows.map(({ min }) => min))
            : Infinity,
        };
      })
      .filter((group) => !filtered || group.items.length);
    // Stage-less activities sit at their own scheduled start, without a
    // fake stage; biological stage order is kept as in the approved prototype.
    const independent = visible
      .filter((item) => item.crop_stage_id === null)
      .sort(byStart)
      .map(single);
    const merged: TimelineGroup[] = [];
    for (const group of stageGroups) {
      if (Number.isFinite(group.day))
        while (independent.length && independent[0].day <= group.day)
          merged.push(independent.shift() as TimelineGroup);
      merged.push(group);
    }
    return [...merged, ...independent];
    // formatWindow reads prefs which are dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, visible, timing, stageWindows, prefs, filters, t]);

  function upsert(record: CropActivityTemplateListItem) {
    setWorkspace(
      (current) =>
        current && {
          ...current,
          templates: current.templates.some((item) => item.id === record.id)
            ? current.templates.map((item) =>
                item.id === record.id ? record : item,
              )
            : [...current.templates, record],
        },
    );
  }
  function remove(id: number) {
    setWorkspace(
      (current) =>
        current && {
          ...current,
          templates: current.templates.filter((item) => item.id !== id),
        },
    );
    setSelected((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }
  function rememberCreated(id: number) {
    if (stored) persist({ ...stored, session: [...stored.session, id] });
    setExpanded((current) => new Set(current).add(id));
  }

  /** Loads the full record before a section dialog edits it. */
  async function openEdit(kind: EditKind, id: number) {
    setDialog({ kind, id });
    if (kind === "delete") return;
    const result = await loadTimelineTemplate(id);
    if (result.success && result.data) {
      const record = result.data;
      setDialog((current) =>
        current && "id" in current && current.id === id && current.kind === kind
          ? { kind, id, record }
          : current,
      );
    } else {
      toast.error(result.message || t("feedback.loadFailed"));
      setDialog(null);
    }
  }

  async function saveSection(
    record: CropActivityTemplate,
    patch: Partial<CropActivityTemplatePayload>,
    keepOpen = false,
  ): Promise<ActionResult<CropActivityTemplate>> {
    const result = await saveCropActivityTemplate(
      record.id,
      recordPayload(record, patch),
    );
    if (result.success && result.data) {
      upsert(result.data);
      if (!keepOpen) {
        toast.success(result.message || t("feedback.saved"));
        setDialog(null);
      }
    }
    return result;
  }

  function jumpTo(stageId: number) {
    setFilters(defaultFilters);
    updatePrefs({ view: "stage" });
    setCollapsed((current) => {
      const next = new Set(current);
      next.delete(stageId);
      return next;
    });
    setTimeout(
      () =>
        document
          .getElementById(`stage-${stageId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }

  function exportJson() {
    if (!workspace) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(workspace.templates, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `crop-activity-timeline-${workspace.crop.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!stored)
    return (
      <p role="status" className="text-sm text-gray-500">
        {t("loading")}
      </p>
    );

  const stats = {
    stages: workspace?.stages.length ?? 0,
    activities: templates.length,
    configured: templates.filter((item) => configured(item.id)).length,
    incomplete: templates.filter((item) => !configured(item.id)).length,
    stagesWithActivities:
      workspace?.stages.filter((stage) =>
        templates.some((item) => item.crop_stage_id === stage.id),
      ).length ?? 0,
    stagesWithTiming:
      workspace?.stages.filter((stage) => stageWindows.has(stage.id)).length ??
      0,
    exceptions: templates.filter((item) => exception(item.id)).length,
  };
  const editing = dialog && "id" in dialog ? dialog : null;
  const editRecord = editing?.record;
  const sourcesFor = (record: CropActivityTemplate) =>
    record.knowledge_sources.map(({ id, title, is_active }) => ({
      id,
      label: title ?? t("recordId", { id }),
      is_active,
    }));
  const shared = {
    states,
    varieties: workspace?.varieties ?? [],
    seasons: workspace?.seasons ?? [],
  };

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-99999 overflow-y-auto bg-gray-50 p-4 sm:p-6 dark:bg-gray-950"
          : "min-w-0"
      }
    >
      {config && prefs.configVisible && (
        <ConfigurationSummary
          config={config}
          workspace={workspace}
          sources={config.app.knowledge_source_ids.length}
          stats={stats}
          onEdit={openConfig}
          onCreate={() =>
            setDialog({ kind: "create", stageId: null, categoryId: null })
          }
        />
      )}
      {config && (
        <TimelineToolbar
          filters={filters}
          onFilters={setFilters}
          prefs={prefs}
          onPrefs={updatePrefs}
          categories={workspace?.categories ?? []}
          stages={workspace?.stages ?? []}
          fullscreen={fullscreen}
          onFullscreen={() => setFullscreen((value) => !value)}
          onCreate={() =>
            setDialog({ kind: "create", stageId: null, categoryId: null })
          }
          onJump={jumpTo}
          // Opens every stage section and every visible activity card, so it
          // mirrors Collapse all (stage-less groups only have card toggles).
          onExpandAll={() => {
            setCollapsed(new Set());
            setExpanded(new Set(visible.map(({ id }) => id)));
          }}
          onCollapseAll={() => {
            setCollapsed(new Set(workspace?.stages.map(({ id }) => id)));
            setExpanded(new Set());
          }}
          selectedCount={selected.size}
          onSelectVisible={() =>
            setSelected(new Set(visible.map(({ id }) => id)))
          }
          onClearSelection={() => setSelected(new Set())}
          onBulk={() => setDialog({ kind: "bulk" })}
          help={{
            config,
            stats,
            onCreate: () =>
              setDialog({ kind: "create", stageId: null, categoryId: null }),
            onIncomplete: () =>
              setFilters({ ...defaultFilters, status: "incomplete" }),
            onExport: exportJson,
            onLanguages: () => setDialog({ kind: "languages" }),
          }}
        />
      )}
      {!config ? (
        <TimelineEmptyState onStart={openConfig} />
      ) : loadError !== null ? (
        <div
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
        >
          {loadError || t("feedback.loadFailed")}{" "}
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              setAttempt((value) => value + 1);
            }}
            className="font-semibold underline"
          >
            {t("retry")}
          </button>{" "}
          {/* A saved crop that is no longer available can be reconfigured. */}
          <button
            type="button"
            onClick={openConfig}
            className="font-semibold underline"
          >
            {t("emptyState.action")}
          </button>
        </div>
      ) : !workspace || workspace.crop.id !== cropId ? (
        <p role="status" className="p-6 text-sm text-gray-500">
          {t("loadingWorkspace")}
        </p>
      ) : (
        <TimelineList
          groups={groups}
          categories={workspace.categories}
          timing={timing}
          formatWindow={formatWindow}
          stageWindows={stageWindows}
          groupByCategory={prefs.groupByCategory && prefs.view === "stage"}
          collapsed={collapsed}
          searching={filters.search.trim() !== ""}
          onToggleStage={(id) =>
            setCollapsed((current) => {
              const next = new Set(current);
              if (!next.delete(id)) next.add(id);
              return next;
            })
          }
          expanded={expanded}
          onToggleActivity={(id) =>
            setExpanded((current) => {
              const next = new Set(current);
              if (!next.delete(id)) next.add(id);
              return next;
            })
          }
          selected={selected}
          onSelect={(id, checked) =>
            setSelected((current) => {
              const next = new Set(current);
              if (checked) next.add(id);
              else next.delete(id);
              return next;
            })
          }
          isCustom={(item) =>
            !!config &&
            (item.variety_scope !== config.app.variety_scope ||
              !sameIds(item.crop_variety_ids, config.app.crop_variety_ids) ||
              item.season_scope !== config.app.season_scope ||
              !sameIds(item.season_ids, config.app.season_ids) ||
              item.region_scope !== config.app.region_scope)
          }
          onCreate={(stageId, categoryId) =>
            setDialog({ kind: "create", stageId, categoryId })
          }
          onStageTimelines={(stageId) => setDialog({ kind: "stage", stageId })}
          onEdit={openEdit}
        />
      )}

      {showConfig && (
        <ConfigurationDialog
          config={config}
          sources={configSources}
          {...shared}
          onClose={() => setDialog(null)}
          onSave={(next) => {
            if (stored) {
              if (next.crop.id !== cropId) {
                setWorkspace(null);
                setSelected(new Set());
                setFilters(defaultFilters);
              }
              persist({ ...stored, config: next });
            }
            setDialog(null);
            toast.success(t("feedback.configSaved"));
          }}
        />
      )}
      {dialog?.kind === "create" && config && workspace && (
        <QuickCreateActivityDialog
          key={`${dialog.stageId}-${dialog.categoryId}`}
          config={config}
          configSources={configSources}
          workspace={workspace}
          {...shared}
          stageId={dialog.stageId}
          categoryId={dialog.categoryId}
          locales={prefs.locales}
          stageWindows={stageWindows}
          assess={assess}
          formatWindow={formatWindow}
          onClose={() => setDialog(null)}
          onCreated={(record) => {
            upsert(record);
            rememberCreated(record.id);
          }}
          onNext={(stageId, categoryId) =>
            setDialog({ kind: "create", stageId, categoryId })
          }
        />
      )}
      {dialog?.kind === "basic" && workspace && (
        <BasicInfoDialog
          record={editRecord}
          workspace={workspace}
          onClose={() => setDialog(null)}
          onSave={saveSection}
        />
      )}
      {dialog?.kind === "schedule" && (
        <SchedulingDialog
          record={editRecord}
          stageWindows={stageWindows}
          assess={assess}
          formatWindow={formatWindow}
          onClose={() => setDialog(null)}
          onSave={saveSection}
        />
      )}
      {dialog?.kind === "features" && (
        <ActivityConfigurationDialog
          record={editRecord}
          onClose={() => setDialog(null)}
          onSave={saveSection}
        />
      )}
      {dialog?.kind === "actions" && (
        <SmartActionsDialog
          record={editRecord}
          onClose={() => setDialog(null)}
          onSave={saveSection}
        />
      )}
      {dialog?.kind === "translations" && (
        <TranslationsDialog
          record={editRecord}
          locales={prefs.locales}
          onClose={() => setDialog(null)}
          onSave={saveSection}
        />
      )}
      {dialog?.kind === "applicability" && config && (
        <ApplicabilityDialog
          record={editRecord}
          config={config}
          configSources={configSources}
          sources={editRecord ? sourcesFor(editRecord) : []}
          {...shared}
          onClose={() => setDialog(null)}
          onSave={saveSection}
        />
      )}
      {dialog?.kind === "publication" && (
        <PublicationDialog
          record={editRecord}
          timing={editRecord ? assess(editRecord) : undefined}
          onClose={() => setDialog(null)}
          onSave={saveSection}
          onStatus={(record) => {
            upsert(record);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "duplicate" && (
        <DuplicateActivityDialog
          record={editRecord}
          onClose={() => setDialog(null)}
          // New identity and inactive status come from the create endpoint.
          onConfirm={(record) =>
            saveCropActivityTemplate(null, recordPayload(record, {}))
          }
          onDuplicated={(record) => {
            upsert(record);
            rememberCreated(record.id);
            void openEdit("translations", record.id);
          }}
        />
      )}
      {dialog?.kind === "delete" && editing && (
        <DeleteActivityDialog
          item={templates.find(({ id }) => id === editing.id)}
          onClose={() => setDialog(null)}
          onDeleted={(id) => {
            remove(id);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "stage" && workspace && (
        <StageTimelinesDialog
          stage={workspace.stages.find(({ id }) => id === dialog.stageId)}
          timelines={workspace.timelines.filter(
            (timeline) => timeline.crop_stage_id === dialog.stageId,
          )}
          formatWindow={formatWindow}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "languages" && (
        <LanguagesDialog
          locales={prefs.locales}
          onClose={() => setDialog(null)}
          onSave={(locales) => {
            updatePrefs({ locales });
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "bulk" && (
        <BulkOperationsDialog
          count={selected.size}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
