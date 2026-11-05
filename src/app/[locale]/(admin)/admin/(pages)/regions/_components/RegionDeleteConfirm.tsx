"use client";

import { useRef, useState } from "react";
import {
  Description,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { deleteRegion } from "@/actions/admin/regions";
import { CloseIcon } from "@/icons";
import { useRouter } from "@/i18n/navigation";
import type { Region } from "@/types/admin/region";

interface RegionDeleteConfirmProps {
  region: Region;
  onClose: () => void;
}

export default function RegionDeleteConfirm({
  region,
  onClose,
}: RegionDeleteConfirmProps) {
  const t = useTranslations("regions");
  const router = useRouter();
  const pending = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (!pending.current) onClose();
  }

  async function confirm() {
    if (pending.current) return;
    pending.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      const result = await deleteRegion(region.id);
      if (!result.success) {
        setError(result.message || t("feedback.deleteFailed"));
        return;
      }
      toast.success(result.message || t("feedback.deleted"));
      onClose();
      router.refresh();
    } catch {
      setError(t("feedback.deleteFailed"));
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open
      onClose={close}
      className="relative z-99999"
      aria-busy={isSubmitting}
    >
      <DialogBackdrop className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm dark:bg-gray-950/60" />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel className="shadow-theme-xl relative my-auto w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 dark:bg-gray-900">
          <button
            type="button"
            onClick={close}
            disabled={isSubmitting}
            aria-label={t("deleteDialog.close")}
            className="focus-visible:outline-brand-500 absolute end-5 top-5 flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 focus-visible:outline-2 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <CloseIcon aria-hidden="true" className="size-6" />
          </button>
          <DialogTitle className="pe-10 text-2xl font-semibold text-gray-900 dark:text-white">
            {t("deleteDialog.title")}
          </DialogTitle>
          <Description className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {t("deleteDialog.description", {
              name: region.name ?? t("unnamed"),
            })}
          </Description>
          {error && (
            <p
              role="alert"
              className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 mt-4 rounded-lg p-3 text-sm"
            >
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              data-autofocus
              disabled={isSubmitting}
              onClick={close}
              className="focus-visible:outline-brand-500 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            >
              {t("form.cancel")}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={confirm}
              className="bg-error-600 hover:bg-error-700 focus-visible:outline-error-500 dark:bg-error-600 dark:hover:bg-error-500 rounded-lg px-4 py-2 text-sm text-white focus-visible:outline-2 disabled:opacity-50"
            >
              {isSubmitting ? t("deleteDialog.deleting") : t("actions.delete")}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
