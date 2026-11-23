"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import type { ActionResult } from "@/types/api";
import type { CropActivityTemplate } from "@/types/admin/cropActivityTemplate";
import BuilderDialog, { applyServerErrors } from "./BuilderDialog";

/** Creates an independent inactive copy (all locales) via the create API. */
export default function DuplicateActivityDialog({
  record,
  onClose,
  onConfirm,
  onDuplicated,
}: {
  record?: CropActivityTemplate;
  onClose: () => void;
  onConfirm: (
    record: CropActivityTemplate,
  ) => Promise<ActionResult<CropActivityTemplate>>;
  onDuplicated: (record: CropActivityTemplate) => void;
}) {
  const t = useTranslations("timelineBuilder");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  return (
    <BuilderDialog
      title={t("edit.duplicate")}
      description={record?.title ?? undefined}
      onClose={onClose}
      loading={!record}
      busy={busy}
      error={failure}
      submitLabel={t("duplicate.confirm")}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!record || busy) return;
        setBusy(true);
        setFailure("");
        const result = await onConfirm(record);
        setBusy(false);
        if (result.success && result.data) {
          toast.success(t("duplicate.done"));
          onDuplicated(result.data);
          return;
        }
        const message = applyServerErrors(
          result,
          () => false,
          t("feedback.saveFailed"),
        );
        setFailure(message);
        toast.error(message);
      }}
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t("duplicate.description", {
          locales: Object.keys(record?.translations ?? {}).length,
        })}
      </p>
    </BuilderDialog>
  );
}
