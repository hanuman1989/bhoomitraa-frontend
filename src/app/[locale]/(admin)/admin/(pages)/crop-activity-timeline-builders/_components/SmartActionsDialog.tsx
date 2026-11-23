"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  templateSmartActions,
  type CropActivityTemplate,
  type TemplateSmartAction,
} from "@/types/admin/cropActivityTemplate";
import {
  AgricultureIcon,
  BotIcon,
  FertilizerIcon,
  HarvestingIcon,
  LeafIcon,
  SeedIcon,
  WeatherIcon,
} from "@/icons";
import { smartActionGroups, type SaveSection } from "./types";
import BuilderDialog, { applyServerErrors } from "./BuilderDialog";

// Same group icons as the Crop Activity Template form's Smart Actions.
const groupIcons: Record<string, typeof LeafIcon> = {
  crop: LeafIcon,
  inputs: SeedIcon,
  care: FertilizerIcon,
  monitoring: WeatherIcon,
  expert: BotIcon,
  harvest: HarvestingIcon,
  operations: AgricultureIcon,
};

function ActionsForm({
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
  const [search, setSearch] = useState("");
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<{ smart_actions: TemplateSmartAction[] }>({
    defaultValues: { smart_actions: [...record.smart_actions] },
  });
  const chosen = useWatch({ control, name: "smart_actions" }) ?? [];
  const query = search.trim().toLowerCase();
  // Hidden choices stay mounted, so searching never deselects them.
  const matches = (action: TemplateSmartAction) =>
    !query || tt(`smartActions.items.${action}`).toLowerCase().includes(query);
  return (
    <BuilderDialog
      title={t("edit.actions")}
      description={t("actions.description")}
      onClose={onClose}
      busy={isSubmitting}
      dirty={isDirty}
      error={failure || errors.smart_actions?.message}
      onSubmit={handleSubmit(async ({ smart_actions }) => {
        setFailure("");
        // Persist stable keys in the canonical order, without duplicates.
        const result = await onSave(record, {
          smart_actions: templateSmartActions.filter((action) =>
            smart_actions.includes(action),
          ),
        });
        if (result.success) return;
        const message = applyServerErrors(
          result,
          (target, text) => {
            if (target !== "smart_actions") return false;
            setError("smart_actions", { type: "server", message: text });
            return true;
          },
          t("feedback.saveFailed"),
        );
        setFailure(message);
        toast.error(message);
      })}
    >
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("actions.search")}
        aria-label={t("actions.search")}
        className="shadow-theme-xs h-9 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:text-gray-100"
      />
      <p
        className="text-sm text-gray-600 dark:text-gray-400"
        aria-live="polite"
      >
        {t("actions.total", {
          count: chosen.length,
          total: templateSmartActions.length,
        })}
      </p>
      {smartActionGroups.map(({ name, actions }, index) => {
        const visible = actions.filter(matches);
        const Icon = groupIcons[name] ?? LeafIcon;
        return (
          <details
            key={name}
            open={!!query || index === 0}
            hidden={!!query && !visible.length}
            className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
              <Icon
                aria-hidden="true"
                className="text-brand-600 dark:text-brand-400 size-5 shrink-0"
              />
              {tt(`smartActions.groups.${name}`)}
              <span className="ms-auto text-xs font-normal text-gray-500 dark:text-gray-400">
                {tt("smartActions.selectedCount", {
                  count: actions.filter((action) => chosen.includes(action))
                    .length,
                })}
              </span>
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {actions.map((action) => (
                <label
                  key={action}
                  hidden={!matches(action)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    value={action}
                    {...register("smart_actions")}
                    className="accent-brand-600 size-4"
                  />
                  {tt(`smartActions.items.${action}`)}
                </label>
              ))}
            </div>
          </details>
        );
      })}
      <p className="bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950 dark:text-blue-light-300 rounded-lg p-3 text-xs">
        {t("actions.note")}
      </p>
    </BuilderDialog>
  );
}

export default function SmartActionsDialog({
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
    <ActionsForm record={record} onClose={onClose} onSave={onSave} />
  ) : (
    <BuilderDialog title={t("edit.actions")} onClose={onClose} loading />
  );
}
