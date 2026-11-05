"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import type {
  StageTimelineFilters as FilterValues,
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import TimelineRelationSelect from "./TimelineRelationSelect";

export default function StageTimelineFilters({
  initialFilters,
  choices,
  selections,
}: {
  initialFilters: FilterValues;
  choices: TimelineChoices;
  selections: TimelineSelections;
}) {
  const t = useTranslations("stageTimelines");
  const router = useRouter();
  const params = useSearchParams();
  const [values, setValues] = useState(initialFilters);
  const [pending, startTransition] = useTransition();
  function navigate(reset: boolean) {
    if (pending) return;
    const query = new URLSearchParams(params.toString());
    query.delete("page");
    for (const [key, value] of Object.entries(
      reset
        ? {
            keyword: "",
            crop_id: "",
            crop_stage_id: "",
            crop_variety_id: "",
            season_id: "",
            status: "",
          }
        : values,
    )) {
      if (value.trim()) query.set(key, value.trim());
      else query.delete(key);
    }
    if (reset)
      setValues({
        keyword: "",
        crop_id: "",
        crop_stage_id: "",
        crop_variety_id: "",
        season_id: "",
        status: "",
      });
    startTransition(() =>
      router.push(
        `/admin/crop-stage-timelines${query.size ? `?${query}` : ""}`,
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
          <Label htmlFor="timeline-keyword">{t("filters.keyword")}</Label>
          <Input
            id="timeline-keyword"
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
          id="timeline-filter-crop"
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
          key={`stage-${values.crop_id}`}
          kind="stage"
          id="timeline-filter-stage"
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
          key={`variety-${values.crop_id}`}
          kind="variety"
          id="timeline-filter-variety"
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
          kind="season"
          id="timeline-filter-season"
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
          id="timeline-filter-status"
          label={t("fields.status")}
          value={values.status}
          className="h-11"
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
            setValues((previous) => ({
              ...previous,
              status:
                event.target.value === "1" || event.target.value === "0"
                  ? event.target.value
                  : "",
            }))
          }
        >
          <option value="">{t("filters.allStatus")}</option>
          <option value="1">{t("active")}</option>
          <option value="0">{t("inactive")}</option>
        </FilterSelect>
        <div className="flex gap-3 pt-7 md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 h-11 rounded-lg px-5 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
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
