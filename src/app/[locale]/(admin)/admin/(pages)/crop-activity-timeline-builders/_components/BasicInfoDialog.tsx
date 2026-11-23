"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import Label from "@/components/admin/form/Label";
import {
  templateActivityTypes,
  type CropActivityTemplate,
  type TemplateActivityType,
} from "@/types/admin/cropActivityTemplate";
import type { BuilderWorkspace, SaveSection as Save } from "./types";
import BuilderDialog from "./BuilderDialog";

interface BasicValues {
  crop_stage_id: string;
  category_id: string;
  activity_type: TemplateActivityType;
}
const selectClass =
  "shadow-theme-xs h-9 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

function BasicForm({
  record,
  workspace,
  onClose,
  onSave,
}: {
  record: CropActivityTemplate;
  workspace: BuilderWorkspace;
  onClose: () => void;
  onSave: Save;
}) {
  const t = useTranslations("timelineBuilder");
  const tt = useTranslations("cropActivityTemplates");
  const [failure, setFailure] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BasicValues>({
    defaultValues: {
      crop_stage_id:
        record.crop_stage_id === null ? "" : String(record.crop_stage_id),
      category_id: String(record.category_id),
      activity_type: record.activity_type,
    },
  });
  return (
    <BuilderDialog
      title={t("edit.basic")}
      description={record.title ?? undefined}
      onClose={onClose}
      busy={isSubmitting}
      dirty={isDirty}
      error={failure}
      onSubmit={handleSubmit(async (values) => {
        setFailure("");
        const typeChanged = values.activity_type !== record.activity_type;
        const result = await onSave(record, {
          crop_stage_id: values.crop_stage_id
            ? Number(values.crop_stage_id)
            : null,
          category_id: Number(values.category_id),
          activity_type: values.activity_type,
          // Laravel limits features by activity type; apply its defaults.
          ...(typeChanged && {
            allow_status_update: values.activity_type === "task",
            allow_expenses: false,
            allow_labour: false,
            allow_notes: values.activity_type !== "information",
            allow_attachments: false,
            allow_rescheduling: false,
          }),
        });
        if (result.success) return;
        const general: string[] = [];
        for (const [key, messages] of Object.entries(result.errors ?? {})) {
          if (["crop_stage_id", "category_id", "activity_type"].includes(key))
            setError(key as keyof BasicValues, {
              type: "server",
              message: messages[0],
            });
          else general.push(messages[0]);
        }
        const message =
          general[0] ?? result.message ?? t("feedback.saveFailed");
        setFailure(message);
        toast.error(message);
      })}
    >
      <div>
        <Label htmlFor="builder-basic-stage">
          {tt("fields.stageOptional")}
        </Label>
        <select
          id="builder-basic-stage"
          {...register("crop_stage_id", {
            validate: (value) =>
              !!value ||
              record.schedule_basis !== "growth_stage" ||
              t("validation.stageForSchedule"),
          })}
          aria-invalid={!!errors.crop_stage_id}
          className={selectClass}
        >
          <option value="">{t("noStage")}</option>
          {workspace.stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.sequence}. {stage.name ?? stage.code}
            </option>
          ))}
        </select>
        <p role="alert" className={errorClass}>
          {errors.crop_stage_id?.message}
        </p>
      </div>
      <div>
        <Label htmlFor="builder-basic-category">
          {tt("fields.category")}{" "}
          <span aria-hidden="true" className="text-error-600">
            *
          </span>
        </Label>
        <select
          id="builder-basic-category"
          {...register("category_id", { required: t("validation.category") })}
          aria-invalid={!!errors.category_id}
          className={selectClass}
        >
          {!workspace.categories.some(
            ({ id }) => id === record.category_id,
          ) && (
            <option value={record.category_id}>
              {record.category_name ??
                t("recordId", { id: record.category_id })}
            </option>
          )}
          {workspace.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name ?? t("recordId", { id: category.id })}
            </option>
          ))}
        </select>
        <p role="alert" className={errorClass}>
          {errors.category_id?.message}
        </p>
      </div>
      <div>
        <Label htmlFor="builder-basic-type">{tt("fields.activityType")}</Label>
        <select
          id="builder-basic-type"
          {...register("activity_type")}
          className={selectClass}
        >
          {templateActivityTypes.map((type) => (
            <option key={type} value={type}>
              {tt(`activityTypes.${type}`)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("basic.typeHelp")}
        </p>
        <p role="alert" className={errorClass}>
          {errors.activity_type?.message}
        </p>
      </div>
      <p className="bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950 dark:text-blue-light-300 rounded-lg p-3 text-xs">
        {t("basic.displayOrderUnavailable")}
      </p>
    </BuilderDialog>
  );
}

export default function BasicInfoDialog({
  record,
  workspace,
  onClose,
  onSave,
}: {
  record?: CropActivityTemplate;
  workspace: BuilderWorkspace;
  onClose: () => void;
  onSave: Save;
}) {
  const t = useTranslations("timelineBuilder");
  return record ? (
    <BasicForm
      record={record}
      workspace={workspace}
      onClose={onClose}
      onSave={onSave}
    />
  ) : (
    <BuilderDialog title={t("edit.basic")} onClose={onClose} loading />
  );
}
