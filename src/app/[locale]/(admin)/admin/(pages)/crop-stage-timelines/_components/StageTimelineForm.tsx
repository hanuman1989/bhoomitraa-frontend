"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { useModal } from "@/hooks/useModal";
import { saveStageTimeline } from "@/actions/admin/cropStageTimelines";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Badge from "@/components/admin/ui/badge/Badge";
import type {
  StageTimeline,
  StageTimelineFormValues,
  StageTimelineMultiSelections,
  TimelineChoices,
  TimelineSelections,
  TimelineState,
} from "@/types/admin/cropStageTimeline";
import StageTimelineFields from "./StageTimelineFields";
import StageTimelineRegions from "./StageTimelineRegions";
import StageTimelineConfirmDialog from "./StageTimelineConfirmDialog";

const emptyValues: StageTimelineFormValues = {
  crop_id: "",
  crop_stage_id: "",
  variety_scope: "all",
  crop_variety_ids: [],
  season_scope: "all",
  season_ids: [],
  knowledge_source_ids: [],
  days_after_sowing_min: "",
  days_after_sowing_max: "",
  region_scope: "all",
  region_ids: [],
};
const sameIds = (first: number[], second: number[]) =>
  first.length === second.length &&
  first.every((id, index) => id === second[index]);
const cardClass =
  "rounded-xl shadow-theme-xs [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold";
export default function StageTimelineForm({
  timeline,
  choices,
  selections,
  multiSelections = { varieties: [], seasons: [], knowledgeSources: [] },
  states,
}: {
  timeline: StageTimeline | null;
  choices: TimelineChoices;
  selections: TimelineSelections;
  multiSelections?: StageTimelineMultiSelections;
  states: TimelineState[];
}) {
  const t = useTranslations("stageTimelines");
  const router = useRouter();
  const searchParams = useSearchParams();
  const listUrl = `/admin/crop-stage-timelines${searchParams.size ? `?${searchParams.toString()}` : ""}`;
  // A filtered variety/season/source in the list URL pre-selects that single
  // record as a Specific selection, preserving the existing query defaults.
  const createDefaults = useMemo<StageTimelineFormValues>(
    () => ({
      ...emptyValues,
      crop_id: selections.crop ? String(selections.crop.id) : "",
      crop_stage_id: selections.stage ? String(selections.stage.id) : "",
      variety_scope: selections.variety ? "specific" : "all",
      crop_variety_ids: selections.variety ? [selections.variety.id] : [],
      season_scope: selections.season ? "specific" : "all",
      season_ids: selections.season ? [selections.season.id] : [],
      knowledge_source_ids: selections.source ? [selections.source.id] : [],
    }),
    [
      selections.crop,
      selections.stage,
      selections.variety,
      selections.season,
      selections.source,
    ],
  );
  const appliedDefaults = useRef(createDefaults);
  const saving = useRef(false);
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState("");
  const {
    isOpen: statusOpen,
    openModal: openStatus,
    closeModal: closeStatus,
  } = useModal();
  const [version, setVersion] = useState(0);
  const form = useForm<StageTimelineFormValues>({
    defaultValues: timeline
      ? {
          crop_id: timeline.crop_id === null ? "" : String(timeline.crop_id),
          crop_stage_id: String(timeline.crop_stage_id),
          variety_scope: timeline.variety_scope,
          crop_variety_ids: [...timeline.crop_variety_ids],
          season_scope: timeline.season_scope,
          season_ids: [...timeline.season_ids],
          knowledge_source_ids: [...timeline.knowledge_source_ids],
          days_after_sowing_min: String(timeline.days_after_sowing_min),
          days_after_sowing_max: String(timeline.days_after_sowing_max),
          region_scope: timeline.region_scope,
          region_ids: [...timeline.region_ids],
        }
      : createDefaults,
    mode: "onTouched",
  });
  const {
    handleSubmit,
    setError,
    clearErrors,
    reset,
    resetField,
    getValues,
    formState: { isSubmitting },
  } = form;
  const busy = pending || isSubmitting || statusOpen;
  useEffect(() => {
    const previous = appliedDefaults.current;
    if (timeline || busy || saving.current || previous === createDefaults)
      return;
    const cropChanged = previous.crop_id !== createDefaults.crop_id;
    const stageChanged =
      previous.crop_stage_id !== createDefaults.crop_stage_id;
    const varietyChanged = !sameIds(
      previous.crop_variety_ids,
      createDefaults.crop_variety_ids,
    );
    const resetCrop =
      (cropChanged || stageChanged || varietyChanged) &&
      getValues("crop_id") !== createDefaults.crop_id;
    if (cropChanged || resetCrop)
      resetField("crop_id", { defaultValue: createDefaults.crop_id });
    if (cropChanged || resetCrop || stageChanged)
      resetField("crop_stage_id", {
        defaultValue: createDefaults.crop_stage_id,
      });
    if (cropChanged || resetCrop || varietyChanged) {
      resetField("variety_scope", {
        defaultValue: createDefaults.variety_scope,
      });
      resetField("crop_variety_ids", {
        defaultValue: createDefaults.crop_variety_ids,
      });
    }
    if (!sameIds(previous.season_ids, createDefaults.season_ids)) {
      resetField("season_scope", { defaultValue: createDefaults.season_scope });
      resetField("season_ids", { defaultValue: createDefaults.season_ids });
    }
    if (
      !sameIds(
        previous.knowledge_source_ids,
        createDefaults.knowledge_source_ids,
      )
    )
      resetField("knowledge_source_ids", {
        defaultValue: createDefaults.knowledge_source_ids,
      });
    appliedDefaults.current = createDefaults;
  }, [timeline, busy, createDefaults, getValues, resetField]);
  function submit(values: StageTimelineFormValues) {
    if (saving.current) return;
    saving.current = true;
    setFailure("");
    clearErrors();
    startTransition(async () => {
      try {
        const r = await saveStageTimeline(timeline?.id ?? null, {
          crop_stage_id: Number(values.crop_stage_id),
          variety_scope: values.variety_scope,
          crop_variety_ids:
            values.variety_scope === "all"
              ? []
              : [...new Set(values.crop_variety_ids)],
          season_scope: values.season_scope,
          season_ids:
            values.season_scope === "all"
              ? []
              : [...new Set(values.season_ids)],
          knowledge_source_ids: [...new Set(values.knowledge_source_ids)],
          days_after_sowing_min: Number(values.days_after_sowing_min),
          days_after_sowing_max: Number(values.days_after_sowing_max),
          region_scope: values.region_scope,
          region_ids:
            values.region_scope === "all"
              ? []
              : [...new Set(values.region_ids)],
        });
        if (!r.success || !r.data) {
          for (const [field, messages] of Object.entries(r.errors ?? {})) {
            if (!messages[0]) continue;
            switch (field) {
              case "crop_stage_id":
              case "variety_scope":
              case "season_scope":
              case "days_after_sowing_min":
              case "days_after_sowing_max":
              case "region_scope":
                setError(field, { type: "server", message: messages[0] });
                break;
              default: {
                // Indexed array errors (e.g. season_ids.1) belong to their
                // multi-select or district tree.
                const arrayField = (
                  [
                    "crop_variety_ids",
                    "season_ids",
                    "knowledge_source_ids",
                    "region_ids",
                  ] as const
                ).find(
                  (name) => field === name || field.startsWith(`${name}.`),
                );
                if (arrayField)
                  setError(arrayField, {
                    type: "server",
                    message: messages[0],
                  });
              }
            }
          }
          const message = r.message || t("feedback.saveFailed");
          setFailure(message);
          toast.error(message);
          return;
        }
        if (!timeline) {
          reset(createDefaults);
          setVersion((value) => value + 1);
        } else reset(values);
        toast.success(r.message || t("feedback.saved"));
        router.push(listUrl);
      } catch {
        setFailure(t("feedback.saveFailed"));
        toast.error(t("feedback.saveFailed"));
      } finally {
        saving.current = false;
      }
    });
  }
  return (
    <>
      <form
        onSubmit={(event) => {
          void handleSubmit(submit)(event);
        }}
        noValidate
        aria-busy={busy}
        className="space-y-5"
      >
        {failure && (
          <p
            role="alert"
            className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-4 text-sm"
          >
            {failure}
          </p>
        )}
        <fieldset
          disabled={busy}
          className="grid min-w-0 items-start gap-5 disabled:opacity-70 xl:grid-cols-2"
        >
          <legend className="sr-only">{t("form.basic")}</legend>
          <StageTimelineFields
            key={version}
            form={form}
            choices={choices}
            selections={selections}
            multiSelections={multiSelections}
            initialCrop={
              timeline?.crop_id
                ? String(timeline.crop_id)
                : createDefaults.crop_id
            }
            busy={busy}
          />
          <div className="min-w-0 space-y-5">
            <StageTimelineRegions
              key={version}
              form={form}
              states={states}
              savedIds={timeline?.region_ids ?? []}
              busy={busy}
            />
            <ComponentCard title={t("form.publication")} className={cardClass}>
              <Badge color={timeline?.is_active ? "success" : "light"}>
                {timeline?.is_active ? t("active") : t("inactive")}
              </Badge>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t(timeline ? "form.statusHelp" : "form.createInactive")}
              </p>
              {timeline && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!saving.current) openStatus();
                  }}
                  className="border-brand-300 text-brand-600 dark:border-brand-800 dark:text-brand-300 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {t(
                    timeline.is_active
                      ? "actions.deactivate"
                      : "actions.activate",
                  )}
                </button>
              )}
            </ComponentCard>
            <ComponentCard title={t("form.guidelines")} className={cardClass}>
              <ul className="marker:text-brand-500 list-disc space-y-3 ps-5 text-sm leading-6 text-gray-700 dark:text-gray-300">
                <li>{t("form.guideRelations")}</li>
                <li>{t("form.guideApplicability")}</li>
                <li>{t("form.guideDays")}</li>
                <li>{t("form.guideSource")}</li>
                <li>{t("form.guideRegions")}</li>
                <li>{t("form.guideConflicts")}</li>
                <li>{t("form.guideApproximate")}</li>
                <li>{t("form.guideHistory")}</li>
              </ul>
            </ComponentCard>
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!saving.current) router.push(listUrl);
            }}
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 rounded-lg px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
          >
            {pending
              ? t("saving")
              : timeline
                ? t("form.update")
                : t("form.save")}
          </button>
        </div>
      </form>
      {timeline && statusOpen && (
        <StageTimelineConfirmDialog
          timeline={timeline}
          operation={timeline.is_active ? "deactivate" : "activate"}
          name={t("recordName", {
            crop: timeline.crop_name ?? t("notAvailable"),
            stage:
              timeline.crop_stage_name ??
              t("recordId", { id: timeline.crop_stage_id }),
          })}
          onClose={closeStatus}
        />
      )}
    </>
  );
}
