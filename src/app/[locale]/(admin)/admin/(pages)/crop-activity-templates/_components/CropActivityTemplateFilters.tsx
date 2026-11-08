"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import {
  templatePriorities,
  type CropActivityTemplateFilters as FilterValues,
} from "@/types/admin/cropActivityTemplate";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";

export default function CropActivityTemplateFilters({
  initialFilters,
  choices,
  selections,
}: {
  initialFilters: FilterValues;
  choices: TimelineChoices;
  selections: TimelineSelections;
}) {
  const t = useTranslations("cropActivityTemplates");
  const router = useRouter();
  const params = useSearchParams();
  const [values, setValues] = useState(initialFilters);
  const [pending, startTransition] = useTransition();
  function navigate(reset: boolean) {
    if (pending) return;
    const filters = reset
      ? {
          keyword: "",
          crop_id: "",
          category_id: "",
          crop_variety_id: "",
          crop_stage_id: "",
          season_id: "",
          priority: "",
          status: "",
        }
      : values;
    const query = new URLSearchParams(params.toString());
    query.delete("page");
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) query.set(key, value.trim());
      else query.delete(key);
    }
    if (reset)
      setValues({
        keyword: "",
        crop_id: "",
        category_id: "",
        crop_variety_id: "",
        crop_stage_id: "",
        season_id: "",
        priority: "",
        status: "",
      });
    startTransition(() =>
      router.push(
        `/admin/crop-activity-templates${query.size ? `?${query}` : ""}`,
        { scroll: false },
      ),
    );
  }
  const cropId = values.crop_id ? Number(values.crop_id) : null;
  const sameCrop = values.crop_id === initialFilters.crop_id;
  return (
    <form
      aria-label={t("filters.label")}
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(false);
      }}
      className="shadow-theme-xs rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <fieldset
        disabled={pending}
        className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-4"
      >
        <legend className="sr-only">{t("filters.label")}</legend>
        <div>
          <Label htmlFor="template-keyword">{t("filters.keyword")}</Label>
          <Input
            id="template-keyword"
            value={values.keyword}
            maxLength={150}
            placeholder={t("filters.placeholder")}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                keyword: event.target.value,
              }))
            }
          />
        </div>
        <TimelineRelationSelect
          kind="crop"
          id="template-filter-crop"
          label={t("fields.crop")}
          value={values.crop_id}
          onChange={(value) =>
            setValues((previous) =>
              previous.crop_id === value
                ? previous
                : {
                    ...previous,
                    crop_id: value,
                    crop_stage_id: "",
                    crop_variety_id: "",
                  },
            )
          }
          initialPage={choices.crop}
          initialSelection={selections.crop}
          disabled={pending}
          emptyLabel={t("filters.allCrops")}
        />
        <TimelineRelationSelect
          kind="category"
          id="template-filter-category"
          label={t("fields.category")}
          value={values.category_id}
          onChange={(value) =>
            setValues((previous) => ({ ...previous, category_id: value }))
          }
          initialPage={choices.category}
          initialSelection={selections.category}
          disabled={pending}
          emptyLabel={t("filters.allCategories")}
        />
        <TimelineRelationSelect
          key={`variety-${values.crop_id}`}
          kind="variety"
          id="template-filter-variety"
          label={t("fields.variety")}
          value={values.crop_variety_id}
          onChange={(value) =>
            setValues((previous) => ({ ...previous, crop_variety_id: value }))
          }
          cropId={cropId}
          initialPage={sameCrop ? choices.variety : undefined}
          initialSelection={sameCrop ? selections.variety : null}
          disabled={pending}
          emptyLabel={t("filters.allVarieties")}
        />
        <TimelineRelationSelect
          key={`stage-${values.crop_id}`}
          kind="stage"
          id="template-filter-stage"
          label={t("fields.stage")}
          value={values.crop_stage_id}
          onChange={(value) =>
            setValues((previous) => ({ ...previous, crop_stage_id: value }))
          }
          cropId={cropId}
          initialPage={sameCrop ? choices.stage : undefined}
          initialSelection={sameCrop ? selections.stage : null}
          disabled={pending}
          emptyLabel={t("filters.allStages")}
        />
        <TimelineRelationSelect
          kind="season"
          id="template-filter-season"
          label={t("fields.season")}
          value={values.season_id}
          onChange={(value) =>
            setValues((previous) => ({ ...previous, season_id: value }))
          }
          initialPage={choices.season}
          initialSelection={selections.season}
          disabled={pending}
          emptyLabel={t("filters.allSeasons")}
        />
        <FilterSelect
          id="template-filter-priority"
          label={t("fields.priority")}
          value={values.priority}
          className="h-11"
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
            setValues((previous) => ({
              ...previous,
              priority:
                templatePriorities.find(
                  (priority) => priority === event.target.value,
                ) ?? "",
            }))
          }
        >
          <option value="">{t("filters.allPriorities")}</option>
          {templatePriorities.map((priority) => (
            <option key={priority} value={priority}>
              {t(`priorities.${priority}`)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          id="template-filter-status"
          label={t("fields.status")}
          value={values.status}
          className="h-11"
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
            setValues((previous) => ({
              ...previous,
              status:
                event.target.value === "0" || event.target.value === "1"
                  ? event.target.value
                  : "",
            }))
          }
        >
          <option value="">{t("filters.allStatus")}</option>
          <option value="1">{t("active")}</option>
          <option value="0">{t("inactive")}</option>
        </FilterSelect>
        <div className="flex flex-wrap justify-end gap-3 md:col-span-2 2xl:col-span-4">
          <button
            type="submit"
            disabled={pending}
            className="bg-brand-500 hover:bg-brand-600 focus-visible:outline-brand-500 h-11 rounded-lg px-5 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
          >
            {t("filters.apply")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => navigate(true)}
            className="h-11 rounded-lg border border-gray-300 px-5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {t("filters.reset")}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
