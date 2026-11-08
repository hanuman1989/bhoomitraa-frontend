"use client";

import { useRef, useState, useTransition } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  deleteCropActivityTemplate,
  updateCropActivityTemplateStatus,
} from "@/actions/admin/cropActivityTemplates";
import type { CropActivityTemplateListItem } from "@/types/admin/cropActivityTemplate";

export default function CropActivityTemplateConfirmDialog({
  template,
  name,
  operation,
  onClose,
}: {
  template: CropActivityTemplateListItem;
  name: string;
  operation: "delete" | "activate" | "deactivate";
  onClose: () => void;
}) {
  const t = useTranslations("cropActivityTemplates");
  const busy = useRef(false);
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState("");
  function confirm() {
    if (busy.current) return;
    busy.current = true;
    setFailure("");
    startTransition(async () => {
      try {
        const result =
          operation === "delete"
            ? await deleteCropActivityTemplate(template.id)
            : await updateCropActivityTemplateStatus(
                template.id,
                operation === "activate",
              );
        if (!result.success) {
          const message =
            Object.values(result.errors ?? {})
              .flat()
              .join(" ") ||
            result.message ||
            t("feedback.actionFailed");
          setFailure(message);
          toast.error(message);
          return;
        }
        const message =
          result.message ||
          t(
            operation === "delete"
              ? "feedback.deleted"
              : "feedback.statusSaved",
          );
        const warnings = result.data?.publication_warnings
          ?.map((warning) => warning.message)
          .join(" ");
        toast.success(
          warnings
            ? t("feedback.withWarnings", { message, warnings })
            : message,
          { duration: warnings ? 10000 : 4000 },
        );
        onClose();
      } catch {
        setFailure(t("feedback.actionFailed"));
        toast.error(t("feedback.actionFailed"));
      } finally {
        busy.current = false;
      }
    });
  }
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy.current) onClose();
      }}
      className="relative z-99999"
    >
      <DialogBackdrop className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm" />
      <div className="fixed inset-0 overflow-y-auto p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel
            aria-busy={pending}
            className="shadow-theme-xl w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-gray-900"
          >
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              {t(`actions.${operation}`)}
            </DialogTitle>
            <Description className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
              {t(`confirm.${operation}`, { name })}
            </Description>
            {operation === "delete" && (
              <Description className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {t("confirm.history")}
              </Description>
            )}
            {failure && (
              <p
                role="alert"
                className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 mt-4 rounded-lg p-3 text-sm"
              >
                {failure}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                data-autofocus
                disabled={pending}
                onClick={() => {
                  if (!busy.current) onClose();
                }}
                className="focus-visible:outline-brand-500 rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirm}
                className={`focus-visible:outline-brand-500 rounded-lg px-5 py-2.5 text-sm font-medium text-white focus-visible:outline-2 disabled:opacity-50 ${operation === "delete" ? "bg-error-600 hover:bg-error-700" : "bg-brand-600 hover:bg-brand-700"}`}
              >
                {pending ? t("saving") : t(`actions.${operation}`)}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
