"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { updateCropActivityTemplateStatus } from "@/actions/admin/cropActivityTemplates";
import Label from "@/components/admin/form/Label";
import Switch from "@/components/admin/form/switch/Switch";
import Badge from "@/components/admin/ui/badge/Badge";
import {
  templatePriorities,
  type CropActivityTemplate,
  type TemplatePriority,
} from "@/types/admin/cropActivityTemplate";
import type { ActivityTiming, SaveSection } from "./types";
import BuilderDialog, { applyServerErrors } from "./BuilderDialog";

interface PublicationValues {
  priority: TemplatePriority;
  is_active: boolean;
}

function PublicationForm({
  record,
  timing,
  onClose,
  onSave,
  onStatus,
}: {
  record: CropActivityTemplate;
  timing?: ActivityTiming;
  onClose: () => void;
  onSave: SaveSection;
  onStatus: (record: CropActivityTemplate) => void;
}) {
  const t = useTranslations("timelineBuilder");
  const tt = useTranslations("cropActivityTemplates");
  const [failure, setFailure] = useState("");
  const configured = timing?.code !== "missing";
  const {
    control,
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<PublicationValues>({
    defaultValues: { priority: record.priority, is_active: record.is_active },
  });
  function fail(message: string) {
    setFailure(message);
    toast.error(message);
  }
  return (
    <BuilderDialog
      title={t("edit.publication")}
      description={record.title ?? undefined}
      onClose={onClose}
      busy={isSubmitting}
      dirty={isDirty}
      error={failure}
      onSubmit={handleSubmit(async (values) => {
        setFailure("");
        let current = record;
        // Priority is saved while the record still has its current status.
        if (values.priority !== record.priority) {
          const result = await onSave(
            record,
            { priority: values.priority },
            true,
          );
          if (!result.success || !result.data)
            return fail(
              applyServerErrors(result, () => false, t("feedback.saveFailed")),
            );
          current = result.data;
        }
        if (values.is_active !== record.is_active) {
          const result = await updateCropActivityTemplateStatus(
            record.id,
            values.is_active,
          );
          if (!result.success || !result.data)
            return fail(
              applyServerErrors(
                result,
                () => false,
                t("feedback.statusFailed"),
              ),
            );
          current = result.data;
        }
        toast.success(t("feedback.saved"));
        onStatus(current);
      })}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge color={configured ? "success" : "warning"}>
          {configured ? t("badges.configured") : t("badges.incomplete")}
        </Badge>
        <Badge color={record.is_active ? "success" : "light"}>
          {record.is_active ? t("badges.active") : t("badges.inactive")}
        </Badge>
      </div>
      {!configured && (
        <p className="bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300 rounded-lg p-3 text-sm">
          {t("publication.incomplete")}
        </p>
      )}
      <div>
        <Label htmlFor="builder-priority">{tt("fields.priority")}</Label>
        <select
          id="builder-priority"
          {...register("priority")}
          className="shadow-theme-xs h-9 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          {templatePriorities.map((priority) => (
            <option key={priority} value={priority}>
              {tt(`priorities.${priority}`)}
            </option>
          ))}
        </select>
      </div>
      <Controller
        name="is_active"
        control={control}
        render={({ field }) => (
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <Switch
              checked={field.value}
              onChange={field.onChange}
              // Incomplete records cannot be activated; deactivation is allowed.
              disabled={isSubmitting || (!configured && !record.is_active)}
              label={t("publication.active")}
            />
          </div>
        )}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("publication.note")}
      </p>
    </BuilderDialog>
  );
}

export default function PublicationDialog(props: {
  record?: CropActivityTemplate;
  timing?: ActivityTiming;
  onClose: () => void;
  onSave: SaveSection;
  onStatus: (record: CropActivityTemplate) => void;
}) {
  const t = useTranslations("timelineBuilder");
  const { record } = props;
  return record ? (
    <PublicationForm {...props} record={record} />
  ) : (
    <BuilderDialog
      title={t("edit.publication")}
      onClose={props.onClose}
      loading
    />
  );
}
