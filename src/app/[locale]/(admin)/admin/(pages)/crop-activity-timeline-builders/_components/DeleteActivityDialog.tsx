"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { deleteCropActivityTemplate } from "@/actions/admin/cropActivityTemplates";
import type { CropActivityTemplateListItem } from "@/types/admin/cropActivityTemplate";
import BuilderDialog from "./BuilderDialog";

/** Confirmed delete through the existing endpoint; Laravel protects history. */
export default function DeleteActivityDialog({
  item,
  onClose,
  onDeleted,
}: {
  item?: CropActivityTemplateListItem;
  onClose: () => void;
  onDeleted: (id: number) => void;
}) {
  const t = useTranslations("timelineBuilder");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const name = item?.title ?? t("recordId", { id: item?.id ?? 0 });
  return (
    <BuilderDialog
      title={t("edit.delete")}
      onClose={onClose}
      loading={!item}
      busy={busy}
      error={failure}
      submitLabel={t("delete.confirm")}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!item || busy) return;
        setBusy(true);
        setFailure("");
        const result = await deleteCropActivityTemplate(item.id);
        setBusy(false);
        if (result.success) {
          toast.success(result.message || t("delete.done"));
          onDeleted(item.id);
          return;
        }
        const message = result.message || t("feedback.deleteFailed");
        setFailure(message);
        toast.error(message);
      }}
    >
      <p className="text-sm text-gray-700 dark:text-gray-300">
        {t("delete.description", { name })}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("delete.history")}
      </p>
    </BuilderDialog>
  );
}
