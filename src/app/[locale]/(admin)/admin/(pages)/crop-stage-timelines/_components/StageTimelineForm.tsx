"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
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
  crop_variety_id: "",
  season_id: "",
  source_id: "",
  days_after_sowing_min: "",
  days_after_sowing_max: "",
  region_scope: "all",
  region_ids: [],
};
const cardClass =
  "rounded-xl shadow-theme-xs [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold";
export default function StageTimelineForm({
  timeline,
  choices,
  selections,
  states,
}: {
  timeline: StageTimeline | null;
  choices: TimelineChoices;
  selections: TimelineSelections;
  states: TimelineState[];
}) {
  const t = useTranslations("stageTimelines");
  const router = useRouter();
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
          crop_variety_id:
            timeline.crop_variety_id === null
              ? ""
              : String(timeline.crop_variety_id),
          season_id:
            timeline.season_id === null ? "" : String(timeline.season_id),
          source_id: String(timeline.source_id),
          days_after_sowing_min: String(timeline.days_after_sowing_min),
          days_after_sowing_max: String(timeline.days_after_sowing_max),
          region_scope: timeline.region_scope,
          region_ids: [...timeline.region_ids],
        }
      : emptyValues,
    mode: "onTouched",
  });
  const {
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { isSubmitting },
  } = form;
  const busy = pending || isSubmitting || statusOpen;
  function submit(values: StageTimelineFormValues) {
    if (saving.current) return;
    saving.current = true;
    setFailure("");
    clearErrors();
    startTransition(async () => {
      try {
        const r = await saveStageTimeline(timeline?.id ?? null, {
          crop_stage_id: Number(values.crop_stage_id),
          crop_variety_id: values.crop_variety_id
            ? Number(values.crop_variety_id)
            : null,
          season_id: values.season_id ? Number(values.season_id) : null,
          source_id: Number(values.source_id),
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
              case "crop_variety_id":
              case "season_id":
              case "source_id":
              case "days_after_sowing_min":
              case "days_after_sowing_max":
              case "region_scope":
                setError(field, { type: "server", message: messages[0] });
                break;
              default:
                if (field === "region_ids" || field.startsWith("region_ids."))
                  setError("region_ids", {
                    type: "server",
                    message: messages[0],
                  });
            }
          }
          const message = r.message || t("feedback.saveFailed");
          setFailure(message);
          toast.error(message);
          return;
        }
        if (!timeline) {
          reset(emptyValues);
          setVersion((value) => value + 1);
        } else reset(values);
        toast.success(r.message || t("feedback.saved"));
        router.push("/admin/crop-stage-timelines");
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
            initialCrop={timeline?.crop_id ? String(timeline.crop_id) : ""}
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
                <li>{t("form.guideDays")}</li>
                <li>{t("form.guideSource")}</li>
                <li>{t("form.guideRegions")}</li>
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
              if (!saving.current) router.push("/admin/crop-stage-timelines");
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
