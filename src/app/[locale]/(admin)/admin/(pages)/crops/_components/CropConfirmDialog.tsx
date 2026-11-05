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
import { deleteCrop, updateCropStatus } from "@/actions/admin/crops";
import type { Crop } from "@/types/admin/crop";

export default function CropConfirmDialog({
  crop,
  operation,
  onClose,
  onChanged,
  onConfirm,
}: {
  crop: Crop;
  onClose: () => void;
  onChanged?: (crop: Crop) => void;
} & (
  | { operation: "removeImage"; onConfirm: () => void }
  | { operation: "delete" | "activate" | "deactivate"; onConfirm?: never }
)) {
  const t = useTranslations("crops");
  const busy = useRef(false);
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState("");
  function confirm() {
    if (busy.current) return;
    if (operation === "removeImage") {
      onConfirm();
      onClose();
      return;
    }
    busy.current = true;
    setFailure("");
    startTransition(async () => {
      try {
        const result =
          operation === "delete"
            ? await deleteCrop(crop.id)
            : await updateCropStatus(crop.id, operation === "activate");
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
        if (result.data) onChanged?.(result.data);
        toast.success(result.message || t("feedback.statusSaved"));
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
              {t(`confirm.${operation}`, { name: crop.name ?? crop.slug })}
            </Description>
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
                onClick={onClose}
                className="focus-visible:outline-brand-500 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
              >
                {t("form.cancel")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirm}
                className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white focus-visible:outline-2 disabled:opacity-50 ${operation === "delete" || operation === "removeImage" ? "bg-error-600 hover:bg-error-700 focus-visible:outline-error-500" : "bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500"}`}
              >
                {pending ? t("working") : t(`actions.${operation}`)}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
