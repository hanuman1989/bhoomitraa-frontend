"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import RegionScopeSelector, {
  validDistrictSelection,
} from "@/components/admin/common/RegionScopeSelector";
import type {
  StageTimelineFormValues,
  TimelineState,
} from "@/types/admin/cropStageTimeline";

export default function StageTimelineRegions({
  form,
  states,
  savedIds,
  busy,
}: {
  form: UseFormReturn<StageTimelineFormValues>;
  states: TimelineState[];
  savedIds: number[];
  busy: boolean;
}) {
  const t = useTranslations("stageTimelines");
  const {
    control,
    register,
    getValues,
    formState: { errors },
  } = form;
  const scope = useWatch({ control, name: "region_scope" });
  return (
    <Controller
      name="region_ids"
      control={control}
      rules={{
        validate: (ids) =>
          getValues("region_scope") === "all" ||
          validDistrictSelection(ids, states, savedIds) ||
          t("validation.districts"),
      }}
      render={({ field }) => (
        <RegionScopeSelector
          scope={scope}
          scopeInput={register("region_scope", {
            required: t("validation.scope"),
          })}
          states={states}
          selectedIds={field.value}
          onChange={field.onChange}
          districtRef={field.ref}
          busy={busy}
          scopeError={errors.region_scope?.message}
          districtError={errors.region_ids?.message}
        />
      )}
    />
  );
}
