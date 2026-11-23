"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import Switch from "@/components/admin/form/switch/Switch";
import {
  CalenderIcon,
  ChatIcon,
  ClipboardCheckIcon,
  DollarLineIcon,
  FileIcon,
  GroupIcon,
} from "@/icons";
import type { CropActivityTemplate } from "@/types/admin/cropActivityTemplate";
import { featureFlags, type FeatureFlag, type SaveSection } from "./types";
import BuilderDialog, { applyServerErrors } from "./BuilderDialog";

type FeatureValues = Record<FeatureFlag, boolean>;

// Matches the icons of the Crop Activity Template form.
const featureIcons: Record<FeatureFlag, typeof ChatIcon> = {
  allow_status_update: ClipboardCheckIcon,
  allow_expenses: DollarLineIcon,
  allow_labour: GroupIcon,
  allow_notes: ChatIcon,
  allow_attachments: FileIcon,
  allow_rescheduling: CalenderIcon,
};

function FeatureForm({
  record,
  onClose,
  onSave,
}: {
  record: CropActivityTemplate;
  onClose: () => void;
  onSave: SaveSection;
}) {
  const t = useTranslations("timelineBuilder");
  const tt = useTranslations("cropActivityTemplates");
  const [failure, setFailure] = useState("");
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<FeatureValues>({
    defaultValues: Object.fromEntries(
      featureFlags.map(([flag]) => [flag, record[flag]]),
    ) as FeatureValues,
  });
  // Laravel rule: information disables all features, observation disables status.
  const locked = (flag: FeatureFlag) =>
    record.activity_type === "information" ||
    (record.activity_type === "observation" && flag === "allow_status_update");
  return (
    <BuilderDialog
      title={t("edit.features")}
      description={t("features.description")}
      onClose={onClose}
      busy={isSubmitting}
      dirty={isDirty}
      error={failure}
      onSubmit={handleSubmit(async (values) => {
        setFailure("");
        const result = await onSave(record, values);
        if (result.success) return;
        const message = applyServerErrors(
          result,
          () => false,
          t("feedback.saveFailed"),
        );
        setFailure(message);
        toast.error(message);
      })}
    >
      {record.activity_type !== "task" && (
        <p className="bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300 rounded-lg p-3 text-xs">
          {t("features.typeLimited", {
            type: tt(`activityTypes.${record.activity_type}`),
          })}
        </p>
      )}
      {/* Same cards as the Crop Activity Template form's Activity
          Configuration: icon and label first, switch aligned at the end. */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {featureFlags.map(([flag, label]) => {
          const Icon = featureIcons[flag];
          return (
            <Controller
              key={flag}
              name={flag}
              control={control}
              render={({ field }) => {
                const disabled = isSubmitting || locked(flag);
                return (
                  <div
                    className={`rounded-lg border p-3 ${
                      field.value
                        ? "border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950"
                        : "border-gray-200 dark:border-gray-700"
                    } ${disabled ? "opacity-60" : ""}`}
                  >
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={disabled}
                      label={
                        <span className="order-first flex min-w-0 flex-1 items-center gap-3">
                          <Icon
                            aria-hidden="true"
                            className="text-brand-600 dark:text-brand-400 size-5 shrink-0"
                          />
                          <span className="min-w-0 break-words">
                            {tt(`features.${label}`)}
                          </span>
                        </span>
                      }
                    />
                  </div>
                );
              }}
            />
          );
        })}
      </div>
    </BuilderDialog>
  );
}

export default function ActivityConfigurationDialog({
  record,
  onClose,
  onSave,
}: {
  record?: CropActivityTemplate;
  onClose: () => void;
  onSave: SaveSection;
}) {
  const t = useTranslations("timelineBuilder");
  return record ? (
    <FeatureForm record={record} onClose={onClose} onSave={onSave} />
  ) : (
    <BuilderDialog title={t("edit.features")} onClose={onClose} loading />
  );
}
