"use client";

import { useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { languages } from "@/i18n/languages";
import { useModal } from "@/hooks/useModal";
import { saveCropActivityTemplate } from "@/actions/admin/cropActivityTemplates";
import ComponentCard from "@/components/admin/common/ComponentCard";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Badge from "@/components/admin/ui/badge/Badge";
import RegionScopeSelector, {
  validDistrictSelection,
} from "@/components/admin/common/RegionScopeSelector";
import {
  templatePriorities,
  requiredTemplateLocales,
  type CropActivityTemplate,
  type CropActivityTemplateFormValues,
  type TemplateSelectionOption,
} from "@/types/admin/cropActivityTemplate";
import type {
  TimelineChoices,
  TimelineSelections,
  TimelineState,
} from "@/types/admin/cropStageTimeline";
import CropActivityTemplateFields from "./CropActivityTemplateFields";
import CropActivityTemplateTranslations from "./CropActivityTemplateTranslations";
import CropActivityTemplateConfirmDialog from "./CropActivityTemplateConfirmDialog";

const cardClass =
  "rounded-xl shadow-theme-xs [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold";
const emptyValues: CropActivityTemplateFormValues = {
  crop_id: "",
  category_id: "",
  crop_stage_id: "",
  variety_scope: "all",
  crop_variety_ids: [],
  season_scope: "all",
  season_ids: [],
  knowledge_source_ids: [],
  schedule_type: "after_sowing",
  schedule_basis: "fixed_offsets",
  start_offset_days: "",
  end_offset_days: "",
  activity_type: "task",
  allow_status_update: true,
  allow_expenses: false,
  allow_labour: false,
  allow_notes: true,
  allow_attachments: false,
  allow_rescheduling: false,
  smart_actions: [],
  priority: "medium",
  region_scope: "all",
  region_ids: [],
  translations: Object.fromEntries(
    languages.map(({ id }) => [
      id,
      { title: "", description: "", instructions: "" },
    ]),
  ),
};
export default function CropActivityTemplateForm({
  template,
  choices,
  selections,
  multiSelections,
  states,
  canReview,
}: {
  template: CropActivityTemplate | null;
  choices: TimelineChoices;
  selections: TimelineSelections;
  multiSelections: {
    varieties: TemplateSelectionOption[];
    seasons: TemplateSelectionOption[];
    knowledgeSources: TemplateSelectionOption[];
  };
  states: TimelineState[];
  canReview: boolean;
}) {
  const t = useTranslations("cropActivityTemplates");
  const tr = useTranslations("stageTimelines");
  const router = useRouter();
  const saving = useRef(false);
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState("");
  const [version, setVersion] = useState(0);
  const {
    isOpen: statusOpen,
    openModal: openStatus,
    closeModal: closeStatus,
  } = useModal();
  const locked = !!template?.is_active && !canReview;
  const locales = [
    ...new Set([
      ...languages.map(({ id }) => id),
      ...Object.keys(template?.translations ?? {}),
    ]),
  ];
  const form = useForm<CropActivityTemplateFormValues>({
    defaultValues: template
      ? {
          crop_id: String(template.crop_id),
          category_id: String(template.category_id),
          crop_stage_id:
            template.crop_stage_id === null
              ? ""
              : String(template.crop_stage_id),
          variety_scope: template.variety_scope,
          crop_variety_ids: [...template.crop_variety_ids],
          season_scope: template.season_scope,
          season_ids: [...template.season_ids],
          knowledge_source_ids: [...template.knowledge_source_ids],
          schedule_type: template.schedule_type,
          schedule_basis: template.schedule_basis,
          start_offset_days: String(template.start_offset_days ?? ""),
          end_offset_days: String(template.end_offset_days ?? ""),
          activity_type: template.activity_type,
          allow_status_update: template.allow_status_update,
          allow_expenses: template.allow_expenses,
          allow_labour: template.allow_labour,
          allow_notes: template.allow_notes,
          allow_attachments: template.allow_attachments,
          allow_rescheduling: template.allow_rescheduling,
          smart_actions: [...template.smart_actions],
          priority: template.priority,
          region_scope: template.region_scope,
          region_ids: [...template.region_ids],
          translations: Object.fromEntries(
            locales.map((locale) => [
              locale,
              {
                title: template.translations[locale]?.title ?? "",
                description: template.translations[locale]?.description ?? "",
                instructions: template.translations[locale]?.instructions ?? "",
              },
            ]),
          ),
        }
      : emptyValues,
    mode: "onTouched",
  });
  const {
    control,
    register,
    getValues,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = form;
  const scope = useWatch({ control, name: "region_scope" });
  const busy = pending || isSubmitting || statusOpen;
  function submit(values: CropActivityTemplateFormValues) {
    if (saving.current || locked || statusOpen) return;
    saving.current = true;
    setFailure("");
    clearErrors();
    startTransition(async () => {
      try {
        const r = await saveCropActivityTemplate(template?.id ?? null, {
          crop_id: Number(values.crop_id),
          category_id: Number(values.category_id),
          crop_stage_id: values.crop_stage_id
            ? Number(values.crop_stage_id)
            : null,
          variety_scope: values.variety_scope,
          crop_variety_ids:
            values.variety_scope === "all" ? [] : [...values.crop_variety_ids],
          season_scope: values.season_scope,
          season_ids:
            values.season_scope === "all" ? [] : [...values.season_ids],
          knowledge_source_ids: [...values.knowledge_source_ids],
          schedule_type: values.schedule_type,
          schedule_basis: values.schedule_basis,
          start_offset_days:
            values.schedule_basis === "fixed_offsets"
              ? Number(values.start_offset_days)
              : null,
          end_offset_days:
            values.schedule_basis === "fixed_offsets"
              ? Number(values.end_offset_days)
              : null,
          activity_type: values.activity_type,
          allow_status_update: values.allow_status_update,
          allow_expenses: values.allow_expenses,
          allow_labour: values.allow_labour,
          allow_notes: values.allow_notes,
          allow_attachments: values.allow_attachments,
          allow_rescheduling: values.allow_rescheduling,
          smart_actions: [...values.smart_actions],
          priority: values.priority,
          region_scope: values.region_scope,
          region_ids:
            values.region_scope === "all" ? [] : [...values.region_ids],
          translations: Object.fromEntries(
            languages
              .filter(
                ({ id }) =>
                  requiredTemplateLocales.some((locale) => locale === id) ||
                  !!template?.translations[id] ||
                  !!values.translations[id].title.trim() ||
                  !!values.translations[id].description.trim() ||
                  !!values.translations[id].instructions.trim(),
              )
              .map(({ id }) => [
                id,
                {
                  title: values.translations[id].title.trim(),
                  description:
                    values.translations[id].description.trim() || null,
                  instructions:
                    values.translations[id].instructions.trim() || null,
                },
              ]),
          ),
        });
        if (!r.success || !r.data) {
          for (const [field, messages] of Object.entries(r.errors ?? {})) {
            if (!messages[0]) continue;
            switch (field) {
              case "crop_id":
              case "category_id":
              case "crop_stage_id":
              case "variety_scope":
              case "crop_variety_ids":
              case "season_scope":
              case "season_ids":
              case "knowledge_source_ids":
              case "schedule_type":
              case "schedule_basis":
              case "start_offset_days":
              case "end_offset_days":
              case "activity_type":
              case "allow_status_update":
              case "allow_expenses":
              case "allow_labour":
              case "allow_notes":
              case "allow_attachments":
              case "allow_rescheduling":
              case "smart_actions":
              case "priority":
              case "region_scope":
                setError(field, { type: "server", message: messages[0] });
                break;
              default:
                if (field === "region_ids" || field.startsWith("region_ids.")) {
                  setError("region_ids", {
                    type: "server",
                    message: messages[0],
                  });
                } else if (field.startsWith("crop_variety_ids.")) {
                  setError("crop_variety_ids", {
                    type: "server",
                    message: messages[0],
                  });
                } else if (field.startsWith("season_ids.")) {
                  setError("season_ids", {
                    type: "server",
                    message: messages[0],
                  });
                } else if (field.startsWith("knowledge_source_ids.")) {
                  setError("knowledge_source_ids", {
                    type: "server",
                    message: messages[0],
                  });
                } else if (field.startsWith("smart_actions.")) {
                  setError("smart_actions", {
                    type: "server",
                    message: messages[0],
                  });
                } else
                  for (const locale of locales) {
                    if (field === `translations.${locale}.title`)
                      setError(`translations.${locale}.title`, {
                        type: "server",
                        message: messages[0],
                      });
                    if (field === `translations.${locale}.description`)
                      setError(`translations.${locale}.description`, {
                        type: "server",
                        message: messages[0],
                      });
                    if (field === `translations.${locale}.instructions`)
                      setError(`translations.${locale}.instructions`, {
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
        if (!template) {
          reset(emptyValues);
          setVersion((value) => value + 1);
        } else reset(values);
        const warnings = r.data.publication_warnings
          ?.map((warning) => warning.message)
          .join(" ");
        toast.success(
          warnings
            ? t("feedback.withWarnings", {
                message: r.message || t("feedback.saved"),
                warnings,
              })
            : r.message || t("feedback.saved"),
          { duration: warnings ? 10000 : 4000 },
        );
        router.push("/admin/crop-activity-templates");
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
        {locked && (
          <p
            role="status"
            className="bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300 rounded-xl p-4 text-sm"
          >
            {t("form.activeReadOnly")}
          </p>
        )}
        {failure && (
          <p
            role="alert"
            className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-4 text-sm"
          >
            {failure}
          </p>
        )}
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-3">
          <fieldset
            disabled={busy || locked}
            className="min-w-0 space-y-5 disabled:opacity-70 xl:col-span-2"
          >
            <legend className="sr-only">{t("form.basic")}</legend>
            <CropActivityTemplateFields
              key={version}
              form={form}
              choices={choices}
              selections={selections}
              multiSelections={multiSelections}
              initialCrop={template ? String(template.crop_id) : ""}
              editing={!!template}
              busy={busy || locked}
            />
            <ComponentCard
              title={t("translations.title")}
              className={cardClass}
            >
              <CropActivityTemplateTranslations
                form={form}
                locales={locales}
                savedLocales={Object.keys(template?.translations ?? {})}
              />
            </ComponentCard>
          </fieldset>
          <aside className="min-w-0 space-y-5">
            <ComponentCard title={t("form.publication")} className={cardClass}>
              <FilterSelect
                {...register("priority", {
                  required: t("validation.priority"),
                  validate: (value) =>
                    templatePriorities.some((priority) => priority === value) ||
                    t("validation.priority"),
                })}
                id="template-priority"
                label={t("fields.priority")}
                className="h-11"
                disabled={busy || locked}
                aria-required="true"
                aria-invalid={!!errors.priority}
                aria-describedby="template-priority-error"
              >
                {templatePriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {t(`priorities.${priority}`)}
                  </option>
                ))}
              </FilterSelect>
              <p
                id="template-priority-error"
                role="alert"
                className="text-error-600 dark:text-error-400 text-xs"
              >
                {errors.priority?.message}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {t("form.activeLabel")}
                </span>
                <Badge color={template?.is_active ? "success" : "light"}>
                  {t(template?.is_active ? "active" : "inactive")}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
                {t(template ? "form.statusHelp" : "form.createInactive")}
              </p>
              {template && (template.is_active || canReview) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!saving.current) openStatus();
                  }}
                  className="border-brand-300 text-brand-600 dark:border-brand-800 dark:text-brand-300 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {t(
                    template.is_active
                      ? "actions.deactivate"
                      : "actions.activate",
                  )}
                </button>
              )}
            </ComponentCard>
            <Controller
              name="region_ids"
              control={control}
              rules={{
                validate: (ids) =>
                  getValues("region_scope") === "all" ||
                  validDistrictSelection(
                    ids,
                    states,
                    template?.region_ids ?? [],
                  ) ||
                  tr("validation.districts"),
              }}
              render={({ field }) => (
                <RegionScopeSelector
                  key={version}
                  scope={scope}
                  scopeInput={register("region_scope", {
                    required: tr("validation.scope"),
                  })}
                  states={states}
                  selectedIds={field.value}
                  onChange={field.onChange}
                  districtRef={field.ref}
                  busy={busy || locked}
                  scopeError={errors.region_scope?.message}
                  districtError={errors.region_ids?.message}
                />
              )}
            />
            <ComponentCard title={t("form.guidelines")} className={cardClass}>
              <ul className="marker:text-brand-500 list-disc space-y-3 ps-5 text-sm leading-6 text-gray-700 dark:text-gray-300">
                <li>{t("form.guideRelations")}</li>
                <li>{t("form.guideVarieties")}</li>
                <li>{t("form.guideSeasons")}</li>
                <li>{t("form.guideSources")}</li>
                <li>{t("form.guideSchedule")}</li>
                <li>{t("form.guideFeatures")}</li>
                <li>{t("form.guideSmartActions")}</li>
                <li>{t("form.guideRegions")}</li>
                <li>{t("form.guideLanguages")}</li>
                <li>{t("form.guideReview")}</li>
              </ul>
            </ComponentCard>
          </aside>
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!saving.current)
                router.push("/admin/crop-activity-templates");
            }}
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {t("cancel")}
          </button>
          {!locked && (
            <button
              type="submit"
              disabled={busy}
              className="bg-brand-500 hover:bg-brand-600 focus-visible:outline-brand-500 rounded-lg px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
            >
              {t(busy ? "saving" : template ? "form.update" : "form.save")}
            </button>
          )}
        </div>
      </form>
      {template && statusOpen && (
        <CropActivityTemplateConfirmDialog
          template={template}
          name={template.title ?? t("recordId", { id: template.id })}
          operation={template.is_active ? "deactivate" : "activate"}
          onClose={closeStatus}
        />
      )}
    </>
  );
}
