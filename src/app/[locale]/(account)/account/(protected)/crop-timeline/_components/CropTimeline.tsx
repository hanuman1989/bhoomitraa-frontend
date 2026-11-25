"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  addActivityNote,
  deleteActivityNote,
  generateCropTimeline,
  markTimelineAlertSeen,
  rescheduleActivity,
  updateActivityStatus,
} from "@/actions/account/farm-crop-timeline";
import type { ActionResult } from "@/types/api";
import type {
  ActivityMutationData,
  ActivityRecordType,
  CropTimelineData,
  TimelineActivity,
  TimelineNote,
  TimelineSection,
  TimelineSmartAction,
} from "@/types/account/cropTimeline";
import { useAccountFarms } from "../../_components/AccountFarmContext";
import CropConfirmDialog from "../../crops/_components/CropConfirmDialog";
import { cropButton } from "../../crops/_components/CropUi";
import {
  TimelineActionsContext,
  type TimelineActionsValue,
} from "./TimelineActions";
import TimelineHeader from "./TimelineHeader";
import TimelineReadyAlert from "./TimelineReadyAlert";
import TimelineSummary from "./TimelineSummary";
import TimelineToolbar, {
  type TimelineFilters,
  type TimelineView,
} from "./TimelineToolbar";
import TimelineRail, { type VisibleSection } from "./TimelineRail";
import TimelineCalendarList from "./TimelineCalendarList";
import TimelineEmptyState from "./TimelineEmptyState";
import TimelineGeneratingLoader from "./TimelineGeneratingLoader";
import AddNoteDialog from "./AddNoteDialog";
import RescheduleDialog from "./RescheduleDialog";
import UnderProgressDialog from "./UnderProgressDialog";
import SmartActionDialog from "./SmartActionDialog";

type DialogState =
  | { kind: "note" | "reschedule" | "reopen"; activity: TimelineActivity }
  | { kind: "deleteNote"; activity: TimelineActivity; note: TimelineNote }
  | {
      kind: "placeholder";
      activity: TimelineActivity;
      type: Exclude<ActivityRecordType, "notes">;
    }
  | {
      kind: "smart";
      activity: TimelineActivity;
      action: TimelineSmartAction;
    };

const placeholderLabels = {
  expenses: "addExpense",
  labour: "addLabour",
  photos: "addPhoto",
} as const;

const noFilters: TimelineFilters = {
  search: "",
  status: "all",
  category: "all",
};

/**
 * Default open state: every In progress activity and its section are open, plus
 * the current stage. The scroll target is the requested activity, else the
 * earliest In progress one, else the first due one.
 */
function initialOpenState(timeline: CropTimelineData, focusId?: number) {
  const entries = timeline.sections.flatMap((section) =>
    section.activities.map((activity) => ({ section, activity })),
  );
  const byStart = (
    a: { activity: TimelineActivity },
    b: { activity: TimelineActivity },
  ) =>
    a.activity.start_date.localeCompare(b.activity.start_date) ||
    a.activity.id - b.activity.id;
  const inProgress = entries
    .filter(({ activity }) => activity.status === "in_progress")
    .sort(byStart);
  const target =
    entries.find(({ activity }) => activity.id === focusId) ??
    inProgress[0] ??
    entries
      .filter(({ activity }) => activity.time_state === "due")
      .sort(byStart)[0];
  const opened = [...inProgress, ...(target ? [target] : [])];
  return {
    target: target?.activity.id ?? null,
    activities: new Set(opened.map(({ activity }) => activity.id)),
    sections: new Set([
      ...opened.map(({ section }) => section.key),
      ...timeline.sections
        .filter((section) => section.stage?.state === "current")
        .map((section) => section.key),
    ]),
  };
}

function matches(
  filters: TimelineFilters,
  section: TimelineSection,
  activity: TimelineActivity,
): boolean {
  const query = filters.search.trim().toLocaleLowerCase();
  if (
    query &&
    ![
      activity.title,
      activity.other_title,
      activity.category?.name,
      section.title,
      section.other_title,
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query)
  )
    return false;
  if (
    filters.category !== "all" &&
    String(activity.category?.id) !== filters.category
  )
    return false;
  switch (filters.status) {
    case "due":
    case "upcoming":
      return activity.time_state === filters.status;
    case "late":
      return activity.time_state === "late" || activity.time_state === "passed";
    case "in_progress":
    case "completed":
      return activity.status === filters.status;
    default:
      return true;
  }
}

/**
 * The Crop Timeline, shared by the dialog (from Crop Manager or right after
 * generation) and the /account/crop-timeline/{id} page. It keeps only UI state
 * and replaces activities and totals with each server response.
 */
export default function CropTimeline({
  timeline,
  variant,
  onClose,
  focusActivityId,
}: {
  timeline: CropTimelineData;
  variant: "page" | "dialog";
  onClose?: () => void;
  focusActivityId?: number;
}) {
  const t = useTranslations("farmerCropTimeline");
  const workspace = useAccountFarms();
  const [data, setData] = useState(timeline);
  const [initial] = useState(() => initialOpenState(timeline, focusActivityId));
  const [openActivities, setOpenActivities] = useState(initial.activities);
  const [openSections, setOpenSections] = useState(initial.sections);
  const [closedPanels, setClosedPanels] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<TimelineFilters>(noFilters);
  const [view, setView] = useState<TimelineView>("stages");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [alertVisible, setAlertVisible] = useState(timeline.alert.show);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [scrollTarget, setScrollTarget] = useState<number | null>(
    initial.target,
  );
  const pending = useRef(false);
  const alertShown = useRef(alertVisible);
  const mounted = useRef(false);
  const id = data.id;
  const titleId = `crop-timeline-title-${id}`;

  // The alert is shown once: closing the dialog or leaving the page marks it seen.
  // The deferred check skips React's development remount.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (alertShown.current)
        setTimeout(() => {
          if (!mounted.current) void markTimelineAlertSeen(id);
        }, 0);
    };
  }, [id]);

  useEffect(() => {
    if (scrollTarget === null) return;
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`timeline-activity-${scrollTarget}`)
        ?.scrollIntoView({ block: "start" });
      setScrollTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollTarget]);

  function dismissAlert() {
    setAlertVisible(false);
    alertShown.current = false;
    void markTimelineAlertSeen(id);
  }

  function apply(result: ActivityMutationData) {
    setData((current) => ({
      ...current,
      stats: result.stats,
      current_stage_id: result.current_stage_id,
      sections: current.sections.map((section) => ({
        ...section,
        ...(section.key === result.section.key
          ? {
              done_count: result.section.done_count,
              total_count: result.section.total_count,
            }
          : {}),
        activities: section.activities.map((activity) =>
          activity.id === result.activity.id ? result.activity : activity,
        ),
      })),
    }));
  }

  async function mutate(
    activityId: number,
    request: () => Promise<ActionResult<ActivityMutationData>>,
    fallback: string,
  ): Promise<ActionResult<ActivityMutationData>> {
    if (pending.current) return { success: false, message: t("saveFailed") };
    pending.current = true;
    setBusyId(activityId);
    try {
      const result = await request();
      if (result.success && result.data) {
        apply(result.data);
        toast.success(result.message || fallback);
      } else if (!result.errors) toast.error(result.message);
      return result;
    } catch {
      toast.error(t("saveFailed"));
      return { success: false, message: t("saveFailed") };
    } finally {
      pending.current = false;
      setBusyId(null);
    }
  }

  async function closeOnSuccess(
    activityId: number,
    request: () => Promise<ActionResult<ActivityMutationData>>,
    fallback: string,
  ) {
    const result = await mutate(activityId, request, fallback);
    if (result.success) setDialog(null);
    return result;
  }

  async function generate() {
    if (pending.current) return;
    pending.current = true;
    setGenerating(true);
    try {
      const result = await generateCropTimeline(id);
      if (result.success && result.data) {
        const next = initialOpenState(result.data);
        setData(result.data);
        setAlertVisible(result.data.alert.show);
        alertShown.current = result.data.alert.show;
        setOpenActivities(next.activities);
        setOpenSections(next.sections);
        setScrollTarget(next.target);
        workspace.crops.refresh();
      } else toast.error(result.message || t("generateFailed"));
    } catch {
      toast.error(t("generateFailed"));
    } finally {
      pending.current = false;
      setGenerating(false);
    }
  }

  const toggleIn = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const actions: TimelineActionsValue = {
    editable: data.editable,
    busyId,
    isOpen: (activityId) => openActivities.has(activityId),
    toggle: (activityId) =>
      setOpenActivities((current) => toggleIn(current, activityId)),
    isPanelOpen: (activityId, panel) =>
      !closedPanels.has(`${activityId}:${panel}`),
    togglePanel: (activityId, panel) =>
      setClosedPanels((current) => toggleIn(current, `${activityId}:${panel}`)),
    complete: (activity) =>
      void mutate(
        activity.id,
        () => updateActivityStatus(activity.id, "complete"),
        t("toasts.completed"),
      ),
    askReopen: (activity) => setDialog({ kind: "reopen", activity }),
    addNote: (activity) => setDialog({ kind: "note", activity }),
    askDeleteNote: (activity, note) =>
      setDialog({ kind: "deleteNote", activity, note }),
    reschedule: (activity) => setDialog({ kind: "reschedule", activity }),
    placeholder: (activity, type) =>
      setDialog({ kind: "placeholder", activity, type }),
    smartAction: (activity, action) =>
      setDialog({ kind: "smart", activity, action }),
  };

  const categories = useMemo(() => {
    const found = new Map<number, string>();
    for (const section of data.sections)
      for (const activity of section.activities)
        if (activity.category?.name)
          found.set(activity.category.id, activity.category.name);
    return [...found].map(([categoryId, name]) => ({ id: categoryId, name }));
  }, [data.sections]);

  const filtered =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.category !== "all";
  const visible: VisibleSection[] = data.sections
    .map((section) => ({
      section,
      activities: section.activities.filter((activity) =>
        matches(filters, section, activity),
      ),
    }))
    .filter(({ activities }) => !filtered || activities.length > 0);

  const body = !data.generated ? (
    <TimelineEmptyState
      timeline={data}
      busy={generating}
      onGenerate={generate}
      onContinueSetup={() => {
        onClose?.();
        workspace.crops.open({ id });
      }}
    />
  ) : (
    <>
      {alertVisible && (
        <TimelineReadyAlert
          activities={data.stats.activities}
          stages={data.stats.growth_stages}
          sowingDate={data.crop.sowing_date_label ?? ""}
          onDismiss={dismissAlert}
        />
      )}
      <TimelineSummary crop={data.crop} stats={data.stats} />
      {data.stats.activities === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {t("empty.noActivities")}
        </p>
      ) : (
        <>
          <TimelineToolbar
            filters={filters}
            categories={categories}
            view={view}
            onFilters={setFilters}
            onView={setView}
            onExpandAll={() =>
              setOpenSections(new Set(data.sections.map((s) => s.key)))
            }
            onCollapseAll={() => {
              setOpenSections(new Set());
              setOpenActivities(new Set());
            }}
          />
          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("toolbar.noMatches")}
              </p>
              <button
                type="button"
                className={`${cropButton} mt-3`}
                onClick={() => setFilters(noFilters)}
              >
                {t("toolbar.clearFilters")}
              </button>
            </div>
          ) : view === "stages" ? (
            <TimelineRail
              sections={visible}
              isSectionOpen={(key) => filtered || openSections.has(key)}
              onToggleSection={(key) =>
                setOpenSections((current) => toggleIn(current, key))
              }
            />
          ) : (
            <TimelineCalendarList
              activities={visible.flatMap(({ activities }) => activities)}
            />
          )}
        </>
      )}
    </>
  );

  const header = (
    <TimelineHeader
      titleId={titleId}
      cycleId={id}
      crop={data.crop}
      variant={variant}
      onClose={onClose}
    />
  );

  return (
    <TimelineActionsContext.Provider value={actions}>
      {variant === "dialog" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-gray-200 px-4 py-3 sm:px-6 dark:border-gray-800">
            {header}
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-gray-50 p-3 sm:p-5 dark:bg-gray-950">
            {body}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {header}
          {body}
        </div>
      )}
      {dialog?.kind === "note" && (
        <AddNoteDialog
          activity={dialog.activity}
          onClose={() => setDialog(null)}
          onSave={(values) =>
            closeOnSuccess(
              dialog.activity.id,
              () => addActivityNote(dialog.activity.id, values),
              t("noteDialog.saved"),
            )
          }
        />
      )}
      {dialog?.kind === "reschedule" && (
        <RescheduleDialog
          activity={dialog.activity}
          onClose={() => setDialog(null)}
          onSave={(values) =>
            closeOnSuccess(
              dialog.activity.id,
              () => rescheduleActivity(dialog.activity.id, values),
              t("rescheduleDialog.saved"),
            )
          }
        />
      )}
      {dialog?.kind === "reopen" && (
        <CropConfirmDialog
          title={t("confirm.reopenTitle")}
          description={t(
            dialog.activity.records_total > 0
              ? "confirm.reopenWithRecords"
              : "confirm.reopenWithoutRecords",
            { title: dialog.activity.title ?? "" },
          )}
          busy={busyId === dialog.activity.id}
          cancelLabel={t("confirm.cancel")}
          confirmLabel={t("confirm.reopen")}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            void closeOnSuccess(
              dialog.activity.id,
              () => updateActivityStatus(dialog.activity.id, "reopen"),
              t("toasts.reopened"),
            )
          }
        />
      )}
      {dialog?.kind === "deleteNote" && (
        <CropConfirmDialog
          title={t("confirm.deleteNoteTitle")}
          description={t("confirm.deleteNoteDescription", {
            date: dialog.note.date_label,
          })}
          busy={busyId === dialog.activity.id}
          cancelLabel={t("confirm.cancel")}
          confirmLabel={t("confirm.delete")}
          danger
          onClose={() => setDialog(null)}
          onConfirm={() =>
            void closeOnSuccess(
              dialog.activity.id,
              () => deleteActivityNote(dialog.note.id),
              t("toasts.noteDeleted"),
            )
          }
        />
      )}
      {dialog?.kind === "placeholder" && (
        <UnderProgressDialog
          title={t(`records.${placeholderLabels[dialog.type]}`)}
          subtitle={dialog.activity.title ?? undefined}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "smart" && (
        <SmartActionDialog
          action={dialog.action}
          activity={dialog.activity}
          crop={data.crop}
          onClose={() => setDialog(null)}
        />
      )}
      {generating && <TimelineGeneratingLoader />}
    </TimelineActionsContext.Provider>
  );
}
